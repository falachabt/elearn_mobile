import React, {useState} from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from "react-native";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {ScrollView} from "react-native-gesture-handler";
import {supabase} from "@/lib/supabase";
import {useLocalSearchParams, useRouter} from "expo-router";
import {theme} from "@/constants/theme";
import {useAuth} from "@/contexts/auth";
import useSWR from "swr";
import CategoryFilter from "@/components/shared/learn/CategoryFilter";
import {HapticType, useHaptics} from "@/hooks/useHaptics";
import ExerciseCard from "@/components/shared/learn/exercices/ExerciceCard";
import FloatingChatButton from "@/components/shared/FloatingChatButton";
import ChatBox from "@/components/shared/ChatBox";

// Types
interface Exercise {
    id: string;
    title: string;
    description: string;
    created_at: string;
    course_id: number;
    is_pinned: boolean;
    is_completed: boolean;
    course?: {
        name: string;
        category: string;
        courses_categories?: {
            name: string;
            description: string;
        };
    };
}

type FilterType = "all" | "pinned" | "uncompleted";



export const ExercisesList = () => {
    const params = useLocalSearchParams();
    const pdId = params["pdId"];
    const router = useRouter();
    const {user} = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<FilterType>("all");
    const {trigger} = useHaptics();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const [chatVisible, setChatVisible] = useState(false);

    const handleOpenChat = () => {
        setChatVisible(true);
    };
  
    const handleCloseChat = () => {
        setChatVisible(false);
    };

    const fetcher = async () => {
        // Run all database queries in parallel
        const [courseRes, pathRes] = await Promise.all([
            // Fetch course learning path data
            supabase
                .from("course_learningpath")
                .select(`
        courseId,
        courses!inner (
            id,
            name,
            category,
            courses_categories (
                id,
                name,
                description
            )
        )
      `)
                .eq("lpId", pdId),

            // Fetch learning path title
            supabase
                .from("learning_paths")
                .select("title, concour:concours_learningpaths(id, concours(id, name, study_cycles(id, name), school:schools(id, name, sigle)))")
                .eq("id", pdId)
                .single()
        ]);

        if (courseRes.error) throw courseRes.error;
        if (pathRes.error) throw pathRes.error;

        // Extract course IDs for the next query
        const courseIds = courseRes.data?.map((course) => course.courseId) || [];

        // Now fetch the exercises data
        const exerciseRes = await supabase
            .from("exercices")
            .select(`
      id, title, description, created_at, course_id,
      course:courses!inner (
          name,
          category,
          courses_categories (
              name,
              description
          )
      ),
      exercices_pin (is_pinned),
      exercices_complete (is_completed)
    `)
            .in("course_id", courseIds)
            .eq("exercices_pin.user_id", user?.id)
            .eq("exercices_complete.user_id", user?.id);

        if (exerciseRes.error) throw exerciseRes.error;

        // Process categories
        const allCategories = exerciseRes.data
            // @ts-ignore
            .map((exercise) => exercise.course?.courses_categories)
            .filter(Boolean);

        const categoryMap = new Map();

        allCategories.forEach((category) => {
            if (category && category.name) {
                categoryMap.set(category.name, {
                    id: category.id,
                    name: category.name,
                    description: category.description
                });
            }
        });

        const uniqueCategories = Array.from(categoryMap.values());

        return {
            pathName: pathRes.data.title || "",
            categories: uniqueCategories,
            exercises: exerciseRes.data.map((ex) => ({
                ...ex,
                is_pinned: ex.exercices_pin[0]?.is_pinned,
                is_completed: ex.exercices_complete[0]?.is_completed,
            })),
        };
    };

    const {data, error, isLoading, mutate} = useSWR(`exercises/${pdId}`, fetcher, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        refreshWhenHidden: false,
        refreshInterval: 30000,
    });

    const getFilteredExercises = () => {
        if (!data?.exercises) return [];
        return data.exercises.filter((exercise) => {
            const matchesSearch =
                exercise.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                exercise.description?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCategory =
                !selectedCategory ||
                selectedCategory === "all" ||
                // @ts-ignore
                exercise.course?.courses_categories?.name === selectedCategory;

            const matchesFilter =
                filterType === "all" ||
                (filterType === "pinned" && exercise.is_pinned) ||
                (filterType === "uncompleted" && !exercise.is_completed);

            return matchesSearch && matchesCategory && matchesFilter;
        });
    };

    const handleViewExercise = (exercise: Exercise) => {
        trigger(HapticType.SELECTION);
        router.push({
            pathname: "/(app)/learn/[pdId]/exercices/[exerciceId]",
            params: {
                pdId: String(pdId),
                exerciceId: exercise.id,
            },
        });
    };

    const handlePin = async (exercise: Exercise, e: any) => {
        e.stopPropagation();
        const newPinState = !exercise.is_pinned;

        // Optimistic update
        mutate(
            data
                ? {
                    ...data,
                    exercises: data.exercises.map((ex) =>
                        ex.id === exercise.id ? {...ex, is_pinned: newPinState} : ex
                    ),
                }
                : {
                    pathName: "",
                    categories: [],
                    exercises: [],
                },
            false
        );

        trigger(HapticType.SUCCESS);

        try {
            const userId = user?.id;

            const {data: updatedData, error} = await supabase
                .from("exercices_pin")
                .upsert(
                    {
                        user_id: userId,
                        exercice_id: exercise.id,
                        is_pinned: newPinState,
                    },
                    {onConflict: ["user_id", "exercice_id"].join(",")}
                );

            if (error) {
                console.error("Error updating pin state:", error);
            } else {
                await mutate();
            }
        } catch (error) {
            console.error("Unexpected error updating pin state:", error);
        }
    };

    const handleComplete = async (exercise: Exercise, e: any) => {
        e.stopPropagation();
        const newCompletionState = !exercise.is_completed;

        // Optimistic update
        mutate(
            data
                ? {
                    ...data,
                    exercises: data.exercises.map((ex) =>
                        ex.id === exercise.id ? {...ex, is_completed: newCompletionState} : ex
                    ),
                }
                : {
                    pathName: "",
                    categories: [],
                    exercises: [],
                },
            false
        );

        trigger(HapticType.SUCCESS);

        try {
            const userId = user?.id;

            const {data: updatedData, error} = await supabase
                .from("exercices_complete")
                .upsert(
                    {
                        user_id: userId,
                        exercice_id: exercise.id,
                        is_completed: newCompletionState,
                    },
                    {onConflict: ["user_id", "exercice_id"].join(",")}
                );

            if (error) {
                console.error("Error updating completion state:", error);
            } else {
                await mutate();
            }
        } catch (error) {
            console.error("Unexpected error updating completion state:", error);
        }
    };

    if (isLoading) {
        return (
            <ActivityIndicator
                size="large"
                color={theme.color.primary[500]}
                style={styles.loader}
            />
        );
    }

    if (error) {
        console.error("Error fetching data:", error);
        return null;
    }

    const filteredExercises = getFilteredExercises();

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>

        <FloatingChatButton 
            onPress={handleOpenChat} 
            isDark={isDark} 
        />
        <ChatBox 
            visible={chatVisible}
            onClose={handleCloseChat}
            isDark={isDark}
            coursesData={[]} // We don't have course data directly here
            programTitle={data?.pathName || ''}
            customContext={
                filteredExercises.length > 0 
                  ? `
            Programme d'exercices: ${data?.pathName || ''}
            
            Liste des exercices disponibles:
            ${filteredExercises.map((exercise, index) => `
            ${index + 1}. Titre: ${exercise.title}
               Description: ${exercise.description || 'Pas de description'}
               Catégorie: ${exercise.course?.courses_categories?.name || 'Non catégorisé'}
               Complété: ${exercise.is_completed ? 'Oui' : 'Non'}
            `).join('')}
                  `
                  : `Programme d'exercices: ${data?.pathName || ''}\n\nAucun exercice disponible pour le moment.`
              }
        />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <MaterialCommunityIcons
                        name="arrow-left"
                        size={24}
                        color={"white"}
                    />
                </TouchableOpacity>
                <Text numberOfLines={2} style={[styles.headerTitle, isDark && styles.textDark]}>
                    {data?.pathName}
                </Text>
            </View>

            {/* Filters */}
            <View style={styles.filtersContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterButtonsContainer}
                >
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            isDark && styles.filterButtonDark,
                            filterType === "all" && styles.filterButtonActive,
                        ]}
                        onPress={() => setFilterType("all")}
                    >
                        <MaterialCommunityIcons
                            name="format-list-bulleted"
                            size={20}
                            color={
                                filterType === "all"
                                    ? "#FFFFFF"
                                    : isDark
                                        ? theme.color.gray[400]
                                        : theme.color.gray[600]
                            }
                        />
                        <Text
                            style={[
                                styles.filterButtonText,
                                isDark && styles.filterButtonTextDark,
                                filterType === "all" && styles.filterButtonTextActive,
                            ]}
                        >
                            Tout
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            isDark && styles.filterButtonDark,
                            filterType === "pinned" && styles.filterButtonActive,
                        ]}
                        onPress={() => setFilterType("pinned")}
                    >
                        <MaterialCommunityIcons
                            name="pin"
                            size={20}
                            color={
                                filterType === "pinned"
                                    ? "#FFFFFF"
                                    : isDark
                                        ? theme.color.gray[400]
                                        : theme.color.gray[600]
                            }
                        />
                        <Text
                            style={[
                                styles.filterButtonText,
                                isDark && styles.filterButtonTextDark,
                                filterType === "pinned" && styles.filterButtonTextActive,
                            ]}
                        >
                            Épinglé
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            isDark && styles.filterButtonDark,
                            filterType === "uncompleted" && styles.filterButtonActive,
                        ]}
                        onPress={() => setFilterType("uncompleted")}
                    >
                        <MaterialCommunityIcons
                            name="alert-circle-outline"
                            size={20}
                            color={
                                filterType === "uncompleted"
                                    ? "#FFFFFF"
                                    : isDark
                                        ? theme.color.gray[400]
                                        : theme.color.gray[600]
                            }
                        />
                        <Text
                            style={[
                                styles.filterButtonText,
                                isDark && styles.filterButtonTextDark,
                                filterType === "uncompleted" &&
                                styles.filterButtonTextActive,
                            ]}
                        >
                            Non Complété
                        </Text>
                    </TouchableOpacity>
                </ScrollView>

                <CategoryFilter
                    key={"exercice-categories-filter"}
                    id={"exercice-categories-filter"}
                    categories={data?.categories || []}
                    selectedCategory={selectedCategory || ""}
                    onSelectCategory={(category) => {
                        setSelectedCategory(category)
                    }}
                />
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <View style={[styles.searchBox, isDark && styles.searchBoxDark]}>
                    <MaterialCommunityIcons
                        name="magnify"
                        size={20}
                        color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
                    />
                    <TextInput
                        placeholder="Rechercher un exercice..."
                        placeholderTextColor={
                            isDark ? theme.color.gray[400] : theme.color.gray[600]
                        }
                        style={[styles.searchInput, isDark && styles.textDark]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {/* Display result count when filtering */}
            {(searchQuery || selectedCategory || filterType !== "all") && (
                <View style={styles.resultCountContainer}>
                    <Text style={[styles.resultCountText, isDark && styles.textDark]}>
                        {filteredExercises.length} exercice{filteredExercises.length !== 1 ? 's' : ''} trouvé{filteredExercises.length !== 1 ? 's' : ''}
                    </Text>
                </View>
            )}

            {/* Exercises List with Enhanced Cards */}
            {/* TODO fix the type issue and remove the unknow */}
            {filteredExercises.length > 0 ? (
                <FlatList
                    data={filteredExercises}
                    renderItem={({item}) => (
                        <ExerciseCard
                            exercise={item as unknown as Exercise}
                            onPress={() => handleViewExercise(item as unknown as Exercise)}
                            onPinPress={(e) => handlePin(item as unknown as Exercise, e)}
                            onCompletePress={(e) => handleComplete(item as unknown as Exercise, e)}
                        />
                    )}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.emptyStateContainer}>
                    <MaterialCommunityIcons
                        name="notebook-outline"
                        size={80}
                        color={isDark ? theme.color.gray[700] : theme.color.gray[300]}
                    />
                    <Text style={[styles.emptyStateTitle, isDark && styles.textDark]}>
                        Aucun exercice trouvé
                    </Text>
                    <Text style={[styles.emptyStateDescription, isDark && styles.emptyStateDescriptionDark]}>
                        Essayez de modifier vos filtres ou votre recherche
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        marginBottom: 60,
    },
    containerDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.color.border,
        backgroundColor: theme.color.primary[500],
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: "600",
        color: "#FFFFFF",
        flex: 1,
    },
    filtersContainer: {
        paddingTop: 8,
    },
    filterButtonsContainer: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        flexDirection: "row",
        gap: 8,
    },
    filterButton: {
        flexDirection: "row",
        alignItems: "center",
        lineHeight: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: theme.border.radius.small,
        backgroundColor: theme.color.gray[100],
        gap: 8,
    },
    filterButtonDark: {
        backgroundColor: theme.color.dark.background.secondary,
    },
    filterButtonActive: {
        backgroundColor: theme.color.primary[500],
    },
    filterButtonText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        lineHeight: 24,
        color: theme.color.gray[600],
    },
    filterButtonTextDark: {
        color: theme.color.gray[400],
    },
    filterButtonTextActive: {
        color: "#FFFFFF",
    },
    searchContainer: {
        padding: 16,
        paddingTop: 0,
    },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.color.gray[100],
        borderRadius: theme.border.radius.small,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    searchBoxDark: {
        backgroundColor: theme.color.dark.background.secondary,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: "#1A1A1A",
    },
    resultCountContainer: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    resultCountText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: theme.color.gray[600],
        fontStyle: "italic",
    },
    listContainer: {
        flexGrow: 1,
        padding: 16,
        paddingTop: 8,
    },
    loader: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    textDark: {
        color: "#FFFFFF",
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
    },
    emptyStateTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: "600",
        color: "#1A1A1A",
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateDescription: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: theme.color.gray[600],
        textAlign: "center",
    },
    emptyStateDescriptionDark: {
        color: theme.color.gray[400],
    },
});

export default ExercisesList;