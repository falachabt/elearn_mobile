import {
    View,
    ScrollView,
    StyleSheet,
    Pressable,
    TextInput,
    ActivityIndicator,
} from "react-native";
import React, {useState, useMemo} from "react";
import {ThemedText} from "@/components/ThemedText";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {useRouter, useLocalSearchParams} from "expo-router";
import useSWR from "swr";
import {supabase} from "@/lib/supabase";
import {theme} from "@/constants/theme";
import {useColorScheme} from "@/hooks/useColorScheme";
import {useAuth} from "@/contexts/auth";

const QuizList = () => {
    const router = useRouter();
    const {pdId} = useLocalSearchParams();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const {user} = useAuth();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    const {data: program, isLoading: programLoading, error: programError} = useSWR(
        pdId ? `program-quizzes-${pdId}` : null,
        async () => {
            const {data, error} = await supabase
                .from("learning_paths")
                .select(
                    `
                    id,
                    title,
                    concours_learningpaths(
                        concour:concours(
                            name,
                            school:schools(name)
                        )
                    )
                    `
                )
                .eq("id", pdId)
                .single();

            console.log("error", error);
            if (error) throw error;
            return data;
        }
    );

    const {data: quizzes, isLoading: quizzesLoading, error: quizzesError} = useSWR(
        pdId ? `quizzes-${pdId}` : null,
        async () => {
            const {data, error} = await supabase
                .from("quiz_learningpath")
                .select(
                    `
                    *,
                    quiz:quiz(
                        *,
                        category:courses_categories(*),
                        quiz_questions(id),
                        course(*)
                    )
                    `
                )
                .eq("lpId", pdId);

            if (error) throw error;
            if (!data || data.length === 0) return [];

            const quizIds = data.map((quiz) => quiz.quizId);

            // Fetch pinned status for all quizzes
            const {data: quiz_pinned, error: pinnedError} = await supabase
                .from("quiz_pin")
                .select("*")
                .in("quiz_id", quizIds)
                .eq("user_id", user?.id);

            if (pinnedError) throw pinnedError;

            // Add pinned status to quiz data
            return data.map((quiz) => {
                const isPinned = quiz_pinned?.find((pinned) => pinned.quiz_id === quiz.quizId);
                return {
                    ...quiz,
                    isPinned: !!isPinned
                };
            });
        }
    );

    // Fetch quiz attempts to calculate progress
    const {data: attempts} = useSWR(
        pdId && quizzes ? `quiz-attempts-${pdId}-${user?.id}` : null,
        async () => {
            const quizIds = quizzes?.map(q => q.quizId);
            const {data, error} = await supabase
                .from("quiz_attempts")
                .select("*, quiz_id, score")
                .in("quiz_id", quizIds || [])
                .eq("user_id", user?.id)
                .eq("status", "completed");


            if (error) throw error;
            return data || [];
        },
        {
            // Only run this query after quizzes are loaded
            // enabled: !!quizzes && quizzes.length > 0
        }
    );

    // Calculate progress for each quiz
    const quizzesWithProgress = useMemo(() => {
        if (!quizzes || !attempts) return quizzes || [];

        return quizzes.map(quizItem => {
            const quizAttempts = attempts.filter(a => a.quiz_id === quizItem.quizId);

            // Calculate highest score as progress
            const highestScore = quizAttempts.length > 0
                ? Math.max(...quizAttempts.map(a => a.score || 0))
                : 0;

            return {
                ...quizItem,
                progress: highestScore
            };
        });
    }, [quizzes, attempts]);

    // Extract unique categories
    const categories = useMemo(() => {
        if (!quizzesWithProgress) return [];
        const uniqueCategories = new Set(
            quizzesWithProgress
                .map((quiz) => quiz.quiz?.category?.name)
                .filter(Boolean)
        );
        return Array.from(uniqueCategories);
    }, [quizzesWithProgress]);

    // Filter quizzes
    const filteredQuizzes = useMemo(() => {
        if (!quizzesWithProgress) return [];
        return quizzesWithProgress.filter((quizItem) => {
            const quiz = quizItem.quiz;
            if (!quiz) return false;
            const matchesSearch = quiz.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === "all" || quiz.category?.name === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [quizzesWithProgress, searchQuery, selectedCategory]);

    // Get program info
    const programName = useMemo(() => {
        if (!program) return "Loading...";
        return program.title || "Programme";
    }, [program]);

    const schoolInfo = useMemo(() => {
        if (!program || !program.concours_learningpaths ) {
            return { type: "N/A", name: "N/A" };
        }

        // @ts-ignore
        // TODO - Fix this
        const concour = program.concours_learningpaths?.concour;
        return {
            type: concour?.name || "N/A",
            name: concour?.school?.name || "N/A"
        };
    }, [program]);

    // Loading state
    if (programLoading || quizzesLoading) {
        return (
            <View style={[styles.container, isDark && styles.containerDark, styles.centerContent]}>
                <ActivityIndicator size="large" color={isDark ? "#818CF8" : "#2563EB"} />
                <ThemedText style={styles.loadingText}>Chargement des quiz...</ThemedText>
            </View>
        );
    }

    // Error state
    if (programError || quizzesError) {
        return (
            <View style={[styles.container, isDark && styles.containerDark, styles.centerContent]}>
                <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={48}
                    color="#EF4444"
                />
                <ThemedText style={styles.errorText}>
                    Une erreur s'est produite lors du chargement des données.
                </ThemedText>
                <Pressable
                    style={[styles.retryButton, isDark && styles.retryButtonDark]}
                    onPress={() => router.replace(`/(app)/learn/${pdId}/quizzes`)}
                >
                    <ThemedText style={styles.retryButtonText}>Réessayer</ThemedText>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <View style={[styles.programHeaderMain, isDark && styles.programHeaderMainDark]}>
                <View style={[styles.quizIcon, isDark && styles.quizIconDark]}>
                    <MaterialCommunityIcons
                        name="pencil-box-multiple"
                        size={24}
                        color={isDark ? "#818CF8" : "#2563EB"}
                    />
                </View>
                <View style={[styles.programHeader, isDark && styles.programHeaderDark]}>
                    <ThemedText style={[styles.programName, isDark && styles.programNameDark]}>
                        {programName}
                    </ThemedText>
                    <ThemedText style={[styles.schoolInfo, isDark && styles.schoolInfoDark]}>
                        {schoolInfo.type} • <ThemedText
                        style={[styles.schoolName, isDark && styles.schoolNameDark]}>{schoolInfo.name}</ThemedText>
                    </ThemedText>
                </View>
            </View>

            <View style={[styles.searchBox, isDark && styles.searchBoxDark]}>
                <MaterialCommunityIcons
                    name="magnify"
                    size={20}
                    color={isDark ? "#9CA3AF" : "#6B7280"}
                />
                <TextInput
                    style={[styles.searchInput, isDark && styles.searchInputDark]}
                    placeholder="Rechercher un quiz..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
                />
            </View>

            <View style={styles.categoryWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryContainer}
                >
                    <Pressable
                        style={[
                            styles.categoryChip,
                            isDark && styles.categoryChipDark,
                            selectedCategory === "all" && styles.selectedCategory,
                            selectedCategory === "all" && isDark && styles.selectedCategoryDark,
                        ]}
                        onPress={() => setSelectedCategory("all")}
                    >
                        <ThemedText
                            style={[
                                styles.categoryText,
                                isDark && styles.categoryTextDark,
                                selectedCategory === "all" && styles.selectedCategoryText,
                            ]}
                        >
                            Tout
                        </ThemedText>
                    </Pressable>

                    {categories.map((category) => (
                        <Pressable
                            key={category}
                            style={[
                                styles.categoryChip,
                                isDark && styles.categoryChipDark,
                                selectedCategory === category && styles.selectedCategory,
                                selectedCategory === category && isDark && styles.selectedCategoryDark,
                            ]}
                            onPress={() => setSelectedCategory(category)}
                        >
                            <ThemedText
                                style={[
                                    styles.categoryText,
                                    isDark && styles.categoryTextDark,
                                    selectedCategory === category && styles.selectedCategoryText,
                                ]}
                            >
                                {category}
                            </ThemedText>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>

            <ThemedText style={[styles.quizCount, isDark && styles.quizCountDark]}>
                {filteredQuizzes.length} quiz{filteredQuizzes.length !== 1 ? 's' : ''} disponible{filteredQuizzes.length !== 1 ? 's' : ''}
            </ThemedText>

            <ScrollView style={styles.quizList}>
                {filteredQuizzes.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons
                            name="file-search-outline"
                            size={48}
                            color={isDark ? "#818CF8" : "#2563EB"}
                        />
                        <ThemedText style={styles.emptyStateText}>
                            {searchQuery || selectedCategory !== "all"
                                ? "Aucun quiz ne correspond à votre recherche"
                                : "Aucun quiz disponible pour ce programme"}
                        </ThemedText>
                    </View>
                ) : (
                    filteredQuizzes.map((quizItem) => {
                        const questions = quizItem.quiz?.quiz_questions?.length || 0;
                        const relatedCourse = quizItem.quiz?.course?.name;
                        const progress = quizItem.progress || 0;

                        return (
                            <Pressable
                                key={quizItem.quiz?.id}
                                style={[styles.quizItem, isDark && styles.quizItemDark]}
                                onPress={() => router.push(`/(app)/learn/${pdId}/quizzes/${quizItem.quiz?.id}` as any)}
                            >
                                <View style={styles.quizContent}>
                                    <View style={styles.quizHeader}>
                                        <View style={[styles.quizItemIcon, isDark && styles.quizItemIconDark]}>
                                            <MaterialCommunityIcons
                                                name="pencil-box-multiple"
                                                size={24}
                                                color={isDark ? "#818CF8" : "#2563EB"}
                                            />
                                        </View>
                                        <View style={styles.quizTitleContainer}>
                                            <ThemedText
                                                style={[styles.quizTitle, isDark && styles.quizTitleDark]}
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                            >
                                                {quizItem.quiz?.name}
                                            </ThemedText>
                                            <ThemedText style={[styles.quizMetrics, isDark && styles.quizMetricsDark]}>
                                                {questions} question{questions !== 1 ? 's' : ''}
                                                {relatedCourse ? ` • Cours: ${relatedCourse}` : ' • Quiz indépendant'}
                                            </ThemedText>
                                        </View>
                                        <MaterialCommunityIcons
                                            name="chevron-right"
                                            size={24}
                                            color={isDark ? "#6B7280" : "#9CA3AF"}
                                        />
                                    </View>

                                    <View style={styles.badgeContainer}>
                                        {quizItem.isPinned && (
                                            <View style={styles.pinnedIndicator}>
                                                <MaterialCommunityIcons
                                                    name="pin"
                                                    size={16}
                                                    color={theme.color.primary[500]}
                                                />
                                                <ThemedText style={styles.pinnedText}>Épinglé</ThemedText>
                                            </View>
                                        )}

                                        {quizItem.quiz?.category?.name && (
                                            <View style={[styles.quizBadge, isDark && styles.quizBadgeDark]}>
                                                <ThemedText style={[styles.quizBadgeText, isDark && styles.quizBadgeTextDark]}>
                                                    {quizItem.quiz.category.name}
                                                </ThemedText>
                                            </View>
                                        )}
                                    </View>

                                    <View style={[styles.progressBar, isDark && styles.progressBarDark]}>
                                        <View
                                            style={[
                                                styles.progressFill,
                                                isDark && styles.progressFillDark,
                                                {width: `${progress}%`}
                                            ]}
                                        />
                                    </View>

                                    {progress > 0 && (
                                        <ThemedText style={styles.progressText}>
                                            {Math.round(progress)}% complété
                                        </ThemedText>
                                    )}
                                </View>
                            </Pressable>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
        paddingBottom: 80,
    },
    containerDark: {
        backgroundColor: "#111827",
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        textAlign: 'center',
    },
    errorText: {
        marginTop: 12,
        fontSize: 16,
        textAlign: 'center',
        color: '#EF4444',
        maxWidth: '80%',
    },
    retryButton: {
        marginTop: 16,
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#2563EB',
        borderRadius: 8,
    },
    retryButtonDark: {
        backgroundColor: '#3B82F6',
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontWeight: '500',
    },
    programHeaderMain: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    programHeaderMainDark: {
        backgroundColor: "#1F2937",
        borderBottomColor: "#374151",
    },
    programHeader: {
        backgroundColor: "#FFFFFF",
    },
    programHeaderDark: {
        backgroundColor: "#1F2937",
    },
    quizIcon: {
        width: 40,
        height: 40,
        backgroundColor: "#EFF6FF",
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    quizIconDark: {
        backgroundColor: "rgba(129, 140, 248, 0.2)",
    },
    programName: {
        fontSize: 19,
        fontWeight: "700",
        color: "#111827",
    },
    programNameDark: {
        color: "#FFFFFF",
    },
    schoolInfo: {
        fontSize: 14,
        color: "#2563EB",
        marginTop: 4,
    },
    schoolInfoDark: {
        color: "#818CF8",
    },
    schoolName: {
        color: "#2563EB",
    },
    schoolNameDark: {
        color: "#818CF8",
    },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
        margin: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    searchBoxDark: {
        backgroundColor: "#374151",
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: "#111827",
    },
    searchInputDark: {
        color: "#FFFFFF",
    },
    categoryWrapper: {
        height: 60,
    },
    categoryContainer: {
        paddingHorizontal: 16,
        gap: 16,
        flexDirection: "row",
        alignItems: "center",
    },
    categoryChip: {
        height: 40,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: theme.border.radius.small,
        backgroundColor: theme.color.gray[200],
        justifyContent: "center",
    },
    categoryChipDark: {
        backgroundColor: "#374151",
    },
    selectedCategory: {
        backgroundColor: "#2563EB",
    },
    selectedCategoryDark: {
        backgroundColor: "#3B82F6",
    },
    categoryText: {
        fontSize: 14,
        color: "#4B5563",
    },
    categoryTextDark: {
        color: "#D1D5DB",
    },
    selectedCategoryText: {
        color: "#FFFFFF",
    },
    quizCount: {
        fontSize: 14,
        color: "#6B7280",
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: "#F3F4F6",
    },
    quizCountDark: {
        color: "#9CA3AF",
        backgroundColor: "#1F2937",
    },
    quizList: {
        flex: 1,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyStateText: {
        textAlign: 'center',
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
    },
    quizItem: {
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    quizItemDark: {
        backgroundColor: "#1F2937",
        borderBottomColor: "#374151",
    },
    quizContent: {
        padding: 16,
    },
    quizHeader: {
        flexDirection: "row",
        alignItems: "center",
    },
    quizItemIcon: {
        width: 40,
        height: 40,
        backgroundColor: "#EFF6FF",
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    quizItemIconDark: {
        backgroundColor: "rgba(129, 140, 248, 0.2)",
    },
    quizTitleContainer: {
        flex: 1,
        marginRight: 8,
    },
    quizTitle: {
        fontSize: 16,
        fontWeight: "500",
        color: "#111827",
        marginBottom: 4,
        flexShrink: 1,
    },
    quizTitleDark: {
        color: "#FFFFFF",
    },
    quizMetrics: {
        fontSize: 12,
        color: "#6B7280",
    },
    quizMetricsDark: {
        color: "#9CA3AF",
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginTop: 8,
        gap: 8,
    },
    pinnedIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 4,
    },
    pinnedText: {
        fontSize: 12,
        color: theme.color.primary[500],
        fontWeight: '500',
    },
    quizBadge: {
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    quizBadgeDark: {
        backgroundColor: "#374151",
    },
    quizBadgeText: {
        fontSize: 12,
        color: "#4B5563",
    },
    quizBadgeTextDark: {
        color: "#D1D5DB",
    },
    progressBar: {
        height: 4,
        backgroundColor: "#E5E7EB",
        borderRadius: 2,
        overflow: "hidden",
        marginTop: 12,
    },
    progressBarDark: {
        backgroundColor: "#374151",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#2563EB",
        borderRadius: 2,
    },
    progressFillDark: {
        backgroundColor: "#3B82F6",
    },
    progressText: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
        textAlign: 'right',
    },
});

export default QuizList;