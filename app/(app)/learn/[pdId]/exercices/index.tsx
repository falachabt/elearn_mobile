import React, {useState, useEffect} from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    useColorScheme,
} from "react-native";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {ScrollView} from "react-native-gesture-handler";
import {supabase} from "@/lib/supabase";
import {useRouter, useLocalSearchParams} from "expo-router";
import {theme} from "@/constants/theme";
import {useAuth} from "@/contexts/auth";
import useSWR from "swr";

// Types
interface Exercise {
    id: string;
    title: string;
    description: string;
    content: any;
    correction: any;
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
    const scheme = useColorScheme();
    const isDark = scheme === "dark";

    const fetcher = async () => {
        const courseRes = await supabase
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
            .eq("lpId", pdId);

        if (courseRes.error) throw courseRes.error;

        const pathRes = await supabase
            .from("learning_paths")
            .select("title")
            .eq("id", pdId)
            .single();

        if (pathRes.error) throw pathRes.error;

        const courseIds = courseRes.data?.map((course) => course.courseId) || [];

        const exerciseRes = await supabase
            .from("exercices")
            .select(`
                  *,
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

        const uniqueCategories = [
            "Tout",
            ...new Set(
                exerciseRes.data
                    .map((exercise) => exercise.course?.courses_categories?.name)
                    .filter(Boolean)
            ),
        ];

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

    const {data, error, isLoading, mutate} = useSWR(`exercises/${pdId}`, fetcher);

    const getFilteredExercises = () => {
        if (!data?.exercises) return [];
        return data.exercises.filter((exercise) => {
            const matchesSearch =
                exercise.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                exercise.description?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCategory =
                !selectedCategory ||
                selectedCategory === "Tout" ||
                exercise.course?.courses_categories?.name === selectedCategory;

            const matchesFilter =
                filterType === "all" ||
                (filterType === "pinned" && exercise.is_pinned) ||
                (filterType === "uncompleted" && !exercise.is_completed);

            return matchesSearch && matchesCategory && matchesFilter;
        });
    };

    const handleViewExercise = (exercise: Exercise) => {
        router.push({
            pathname: "/(app)/learn/[pdId]/exercices/[exerciceId]",
            params: {
                pdId: String(pdId),
                exerciceId: exercise.id,
            },
        });
    };

    const ExerciseCard = ({exercise}: { exercise: Exercise }) => {
        const handlePin = async (e: any) => {
            e.stopPropagation();
            const newPinState = !exercise.is_pinned;
            mutate(
                data
                    ? {
                        ...data,
                        exercises: data.exercises.map((ex) =>
                            ex.id === exercise.id ? {...ex, is_pinned: newPinState} : ex
                        ),
                    }
                    : {
                        pathName: "", // Valeur par défaut
                        categories: [], // Valeur par défaut
                        exercises: [], // Valeur par défaut
                    },
                false
            );
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
                    // console.error("Error updating pin state:", error);
                } else {
                    // console.log("Pin state updated successfully:", updatedData);
                    await mutate();
                }
            } catch (error) {
                // console.error("Unexpected error updating pin state:", error);
            }
        };

        const handleComplete = async (e: any) => {
            e.stopPropagation();
            const newCompletionState = !exercise.is_completed;
            mutate(
                data
                    ? {
                        ...data,
                        exercises: data.exercises.map((ex) =>
                            ex.id === exercise.id
                                ? {...ex, is_completed: newCompletionState}
                                : ex
                        ),
                    }
                    : {
                        pathName: "", // Valeur par défaut
                        categories: [], // Valeur par défaut
                        exercises: [], // Valeur par défaut
                    },
                false
            );
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
                    // console.error("Error updating completion state:", error);
                } else {
                    await mutate();
                    // console.log("Completion state updated successfully:", updatedData);
                }
            } catch (error) {
                // console.error("Unexpected error updating completion state:", error);
            }
        };

        return (
            <TouchableOpacity
                style={[styles.exerciseCard, isDark && styles.exerciseCardDark]}
                onPress={() => handleViewExercise(exercise)}
            >
                <View style={styles.exerciseHeader}>
                    <Text style={[styles.exerciseTitle, isDark && styles.textDark]}>
                        {exercise.title}
                    </Text>
                    <Text style={[styles.courseName, isDark && styles.textDark]}>
                        {exercise.course?.name}
                    </Text>
                </View>

                <Text
                    style={[styles.exerciseDescription, isDark && styles.textDark]}
                    numberOfLines={2}
                >
                    {exercise.description}
                </Text>

                <View style={styles.exerciseFooter}>
                    <View style={[styles.categoryTag, isDark && styles.categoryTagDark]}>
                        <Text style={[styles.categoryText, isDark && styles.textDark]}>
                            {exercise.course?.courses_categories?.name || "Non catégorisé"}
                        </Text>
                    </View>
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            onPress={handlePin}
                            style={styles.actionButton}
                        >
                            <MaterialCommunityIcons
                                name={exercise.is_pinned ? "pin" : "pin-outline"}
                                size={20}
                                color={
                                    exercise.is_pinned
                                        ? theme.color.primary[500]
                                        : isDark
                                            ? theme.color.gray[400]
                                            : theme.color.gray[600]
                                }
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleComplete}
                            style={styles.actionButton}
                        >
                            <MaterialCommunityIcons
                                name={
                                    exercise.is_completed
                                        ? "check-circle"
                                        : "check-circle-outline"
                                }
                                size={20}
                                color={
                                    exercise.is_completed
                                        ? theme.color.primary[500]
                                        : isDark
                                            ? theme.color.gray[400]
                                            : theme.color.gray[600]
                                }
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
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

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
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
                <Text style={[styles.headerTitle, isDark && styles.textDark]}>
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

                {/* Categories */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesContainer}
                    style={styles.categoriesScroll}
                >
                    {data?.categories.map((category) => (
                        <TouchableOpacity
                            key={category}
                            style={[
                                styles.categoryChip,
                                isDark && styles.categoryChipDark,
                                selectedCategory === category && styles.selectedCategoryChip,
                            ]}
                            onPress={() => setSelectedCategory(category)}
                        >
                            <Text
                                style={[
                                    styles.categoryText,
                                    selectedCategory === category &&
                                    styles.selectedCategoryText,
                                    isDark && styles.textDark,
                                ]}
                            >
                                {category}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
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

            {/* Exercises List */}
            <FlatList
                data={getFilteredExercises()}
                renderItem={({item}) => <ExerciseCard exercise={item}/>}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
            />
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
        fontSize: 20,
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
        fontSize: 16,
        color: "#1A1A1A",
    },
    categoriesScroll: {
        maxHeight: 60,
    },
    categoriesContainer: {
        paddingHorizontal: 16,
        paddingVertical: 0,
        height: 48,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: theme.border.radius.small,
        backgroundColor: theme.color.gray[100],
        marginRight: 8,
        height: 40,
    },
    categoryChipDark: {
        backgroundColor: theme.color.dark.background.secondary,
    },
    selectedCategoryChip: {
        backgroundColor: theme.color.primary[500],
    },
    categoryText: {
        fontSize: 14,
        color: theme.color.gray[600],
    },
    selectedCategoryText: {
        color: "#FFFFFF",
    },
    textDark: {
        color: "#FFFFFF",
    },
    listContainer: {
        flexGrow: 1,
        padding: 16,
        gap: 16,
    },
    loader: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    exerciseCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: theme.border.radius.small,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.color.border,
    },
    exerciseCardDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderColor: theme.color.dark.border,
    },
    exerciseHeader: {
        marginBottom: 8,
    },
    exerciseTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1A1A1A",
        marginBottom: 4,
    },
    courseName: {
        fontSize: 14,
        color: theme.color.gray[600],
    },
    exerciseDescription: {
        fontSize: 14,
        color: theme.color.gray[600],
        marginBottom: 12,
    },
    exerciseFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
    },
    categoryTag: {
        backgroundColor: theme.color.gray[100],
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: theme.border.radius.large,
    },
    categoryTagDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    actionButton: {
        padding: 8,
        borderRadius: theme.border.radius.small,
        backgroundColor: theme.color.gray[100],
    },
    actionButtons: {
        flexDirection: "row",
        gap: 8,
    },
    dateText: {
        fontSize: 12,
        color: theme.color.gray[500],
    },
});

export default ExercisesList;