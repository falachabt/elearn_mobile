import React, {useEffect, useMemo, useState} from "react";
import {useRouter, useLocalSearchParams} from "expo-router";
import {
    ScrollView,
    StyleSheet,
    View,
    Pressable,
    ActivityIndicator,
    Platform,
    StatusBar,
} from "react-native";
import {ThemedText} from "@/components/ThemedText";
import {useColorScheme} from "@/hooks/useColorScheme";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {theme} from "@/constants/theme";
import useSWR from "swr";
import {supabase} from "@/lib/supabase";
import {CoursesCategories, Quiz, Tags} from "@/types/type";
import {useAuth} from "@/contexts/auth";
import QuizAttemptsList from "@/components/shared/learn/quiz/QuizAttempList";


interface Q extends Quiz {
    quiz_category: CoursesCategories;
    quiz_tags: {
        tags: Tags;
    }[];
    quiz_questions: { count: number }[];
    quiz_courses: { courses: { id: number; name: string } }[];
}

const QuizDetail = () => {
    const router = useRouter();
    const {quizId, pdId} = useLocalSearchParams();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const [isPinned, setPinned] = useState(false);
    const [showFullDesc, setShowFullDesc] = useState(false);
    const [showAllPrereqs, setShowAllPrereqs] = useState(false);
    const {user} = useAuth();

    const {data: isQuizPinned, mutate: mutateQuizPin} = useSWR(quizId ? `quiz-pin-${quizId}` : null, async () => {
        const {data} = await supabase
            .from("quiz_pin")
            .select("*")
            .eq("quiz_id", quizId)
            .eq("user_id", user?.id)
            .maybeSingle();

        return data;

    });

    const {data: quizAttempts} = useSWR(quizId ? `quiz-attempts-${quizId}-${user?.id}` : null, async () => {

            const {data} = await supabase
                .from("quiz_attempts")
                .select("*, quiz(quiz_questions(count))")
                .eq("quiz_id", quizId)
                .eq("user_id", user?.id)
                .eq("status", "completed"); // Only fetch completed attempts

            const {data: quiz_pin} = await supabase
                .from("quiz_pin")
                .select("*")
                .eq("quiz_id", quizId)
                .eq("user_id", user?.id)
                .maybeSingle();


            console.log("hey", quiz_pin);

            return data;
        }
    );

    const { data: quiz, error: quizError, isLoading: quizLoading,} = useSWR<Q>(quizId ? `quiz-${quizId}` : null, async () => {

        const {data} = await supabase
            .from("quiz")
            .select(
                "*, quiz_questions(count), category(name), quiz_tags(tags(id,name)), quiz_courses(courses(id,name))"
            )
            .eq("id", quizId)
            .single();

        return data;
    });

    const createQuizAttempt = async () => {
        try {
            const {data: attempt, error} = await supabase
                .from("quiz_attempts")
                .insert([
                    {
                        quiz_id: quizId,
                        user_id: user?.id, // Get current user ID
                        start_time: new Date().toISOString(),
                        end_time: new Date(Date.now() + 30 * 60000).toISOString(),
                        status: "in_progress",
                    },
                ])
                .select()
                .single();

            if (error) throw error;

            // Navigate to the quiz play page with attempt ID
            router.push(`/(app)/learn/${pdId}/quizzes/${quizId}/${attempt.id}`);
        } catch (error) {
            console.error("Error creating quiz attempt:", error);
            // Handle error (show toast/alert)
        }
    };

    const triggerQuizPin = async () => {
        try {
            setPinned(!isPinned);
            if (isPinned) {
                await supabase
                    .from("quiz_pin")
                    .delete()
                    .eq("quiz_id", quizId)
                    .eq("user_id", user?.id);
            } else {
                await supabase
                    .from("quiz_pin")
                    .insert([{quiz_id: quizId, user_id: user?.id, is_pinned: true}]);
            }

           await  mutateQuizPin();
        } catch (error) {
            console.error("Error pinning quiz:", error);
            // Handle error (show toast/alert)
        }
    }

    const {averageSuccess, averageDuration} = useMemo(() => {
        if (!quizAttempts || quizAttempts.length === 0) {
            return {averageSuccess: 0, averageDuration: 0};
        }

        // Calculate success rate
        const totalSuccessRate = quizAttempts.reduce((sum: any, attempt: { score: any; }) => {
            // Assuming score is a percentage stored in the attempt
            return sum + (attempt.score || 0);
        }, 0);
        const averageSuccess = totalSuccessRate / quizAttempts.length;

        // Calculate average duration in minutes
        const totalDuration = quizAttempts.reduce((sum: number, attempt: {
            start_time: string | number | Date;
            end_time: string | number | Date;
        }) => {
            const startTime = new Date(attempt.start_time);
            const endTime = new Date(attempt.end_time);
            const durationInMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
            return sum + durationInMinutes;
        }, 0);
        const averageDuration = totalDuration / quizAttempts.length;

        return {
            averageSuccess,
            averageDuration: Math.round(averageDuration), // Round to nearest minute
        };
    }, [quizAttempts]);


    const formatDuration = (minutes: number) => {
        if (minutes === 0) return "--";
        if (minutes < 60) return `${minutes}min`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0
            ? `${hours}h${remainingMinutes}min`
            : `${hours}h`;
    };

    // Format the success rate for display
    const formatSuccessRate = (rate: number) => {
        if (rate === 0) return "0%";
        return `${Math.round(rate)}%`;
    };


    useEffect(() => {
        if (isQuizPinned) {
            setPinned(true);
        } else {
            setPinned(false);
        }
    }, [isQuizPinned]);


    const StatCard = ({icon, value, label,}: { icon: string; value: string; label: string; }) => (
        <View style={[styles.statCard, isDark && styles.statCardDark]}>
            <MaterialCommunityIcons
                name={icon as any}
                size={24}
                color={theme.color.primary[500]}
            />
            <ThemedText style={styles.statValue}>{value}</ThemedText>
            <ThemedText style={styles.statLabel}>{label}</ThemedText>
        </View>
    );

    const description = quiz?.description || "---";

    if (quizLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.color.primary[500]}/>
            </View>
        );
    }

    if (quizError) {
        return (
            <View style={styles.centerContainer}>
                <MaterialCommunityIcons name="alert-circle" size={48} color="#EF4444"/>
                <ThemedText style={styles.errorText}>
                    Une erreur s'est produite lors du chargement du quiz.
                </ThemedText>
            </View>
        );
    }

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"}/>

            <View style={[styles.header, isDark && styles.headerDark]}>
                <Pressable
                    onPress={() => router.back()}
                    style={styles.backButton}
                    hitSlop={8}
                >
                    <MaterialCommunityIcons
                        name="arrow-left"
                        size={24}
                        color={isDark ? "#FFFFFF" : "#111827"}
                    />
                </Pressable>

                <ThemedText style={styles.headerTitle} numberOfLines={1}>
                    {quiz?.name}
                </ThemedText>

                <Pressable
                    onPress={() => triggerQuizPin()}
                    style={styles.pinButton}
                    hitSlop={8}
                >
                    <MaterialCommunityIcons
                        name={isPinned ? "pin" : "pin-outline"}
                        size={24}
                        color={theme.color.primary[500]}
                    />
                </Pressable>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.statsGrid}>
                    <StatCard
                        icon="help-circle-outline"
                        value={quiz?.quiz_questions[0].count?.toString() || "--"}
                        label="Questions"
                    />
                    <StatCard icon="clock-outline" value={formatDuration(averageDuration)} label="Duration"/>
                    <StatCard icon="trophy-outline" value={formatSuccessRate(averageSuccess)} label="Success"/>
                </View>

                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Description</ThemedText>
                    <View style={[styles.card, isDark && styles.cardDark]}>
                        <ThemedText
                            style={styles.description}
                            numberOfLines={showFullDesc ? undefined : 3}
                        >
                            {description}
                        </ThemedText>
                        {description.length > 150 && (
                            <Pressable
                                onPress={() => setShowFullDesc(!showFullDesc)}
                                style={styles.showMoreButton}
                            >
                                <ThemedText style={styles.showMoreText}>
                                    {showFullDesc ? "Afficher moins" : "Afficher plus"}
                                </ThemedText>
                            </Pressable>
                        )}
                    </View>
                </View>

                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Prérequis</ThemedText>
                    {(showAllPrereqs
                            ? quiz?.quiz_courses ?? []
                            : quiz?.quiz_courses?.slice(0, 2) ?? []
                    ).map((prereq, index) => (
                        <Pressable
                            key={index}
                            style={[styles.prerequisiteItem, isDark && styles.cardDark]}
                            onPress={() => {
                                router.push(`/(app)/learn/${pdId}/courses/${prereq.courses.id}`)
                            }}
                        >
                            <MaterialCommunityIcons
                                name="check-circle"
                                size={20}
                                color={theme.color.primary[500]}
                            />

                            <ThemedText style={styles.prerequisiteText}>
                                {prereq.courses?.name}
                            </ThemedText>
                        </Pressable>
                    ))}
                    {(quiz?.quiz_courses?.length ?? 0) > 2 && (
                        <Pressable
                            onPress={() => setShowAllPrereqs(!showAllPrereqs)}
                            style={[
                                styles.showMorePrereqs,
                                isDark && styles.showMorePrereqsDark,
                            ]}
                        >
                            <ThemedText style={styles.showMoreText}>
                                {showAllPrereqs
                                    ? "Afficher moins"
                                    : `Afficher ${(quiz?.quiz_courses?.length ?? 0) - 2} autres`}
                            </ThemedText>
                            <MaterialCommunityIcons
                                name={showAllPrereqs ? "chevron-up" : "chevron-down"}
                                size={20}
                                color={theme.color.primary[500]}
                            />
                        </Pressable>
                    )}
                </View>

                <View style={[styles.section]}>
                    <ThemedText style={styles.sectionTitle}>Tags</ThemedText>
                    <View style={styles.tagsContainer}>
                        {quiz?.quiz_tags.map((tag, index) => (
                            <View key={index} style={[styles.tag, isDark && styles.tagDark]}>
                                <ThemedText style={styles.tagText}>
                                    #{tag.tags?.name}
                                </ThemedText>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={[styles.section, styles.lastSection]}>
                    <ThemedText style={styles.sectionTitle}>{" Essaies "} </ThemedText>
                    <QuizAttemptsList
                        quizId={String(quizId)}
                        isDark={isDark}
                        onAttemptPress={(a) => {
                            router.push(`/(app)/learn/${pdId}/quizzes/${quizId}/${a.id}`);
                        }}
                    />
                </View>
            </ScrollView>

            <View style={[styles.footer, isDark && styles.footerDark]}>
                <Pressable
                    style={styles.startButton}
                    onPress={() => createQuizAttempt()}
                >
                    <MaterialCommunityIcons
                        name="play-circle"
                        size={24}
                        color="#FFFFFF"
                    />
                    <ThemedText style={styles.startButtonText}>Commencer</ThemedText>
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
        paddingBottom: 50, // For tab bar
    },
    containerDark: {
        backgroundColor: "#111827",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: Platform.OS === "ios" ? 48 : 16,
        paddingBottom: 8,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerDark: {
        backgroundColor: "#1F2937",
        borderBottomColor: "#374151",
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: "600",
        textAlign: "center",
        marginHorizontal: 16,
    },
    backButton: {
        padding: 8,
        borderRadius: theme.border.radius.small,
        backgroundColor: "rgba(0,0,0,0.05)",
    },
    pinButton: {
        padding: 8,
    },
    scrollContent: {
        padding: 16,
    },
    statsGrid: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        padding: 16,
        backgroundColor: "#FFFFFF",
        borderRadius: theme.border.radius.small,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: {width: 0, height: 1},
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    statCardDark: {
        backgroundColor: "#374151",
    },
    statValue: {
        fontSize: 20,
        fontWeight: "600",
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 4,
    },
    section: {
        marginBottom: 24,
    },
    lastSection: {
        marginBottom: 100,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "600",
        marginBottom: 12,
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: theme.border.radius.small,
        padding: 16,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: {width: 0, height: 1},
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    cardDark: {
        backgroundColor: "#374151",
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
    },
    showMoreButton: {
        marginTop: 8,
        alignSelf: "flex-start",
    },
    showMoreText: {
        color: theme.color.primary[500],
        fontWeight: "500",
    },
    prerequisiteItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderRadius: theme.border.radius.small,
        marginBottom: 8,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: {width: 0, height: 1},
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    prerequisiteText: {
        fontSize: 16,
        flex: 1,
    },
    showMorePrereqs: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        borderRadius: theme.border.radius.small,
        backgroundColor: "#F3F4F6",
        gap: 8,
        marginTop: 8,
    },
    showMorePrereqsDark: {
        backgroundColor: "#374151",
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    tag: {
        backgroundColor: "#F3F4F6",
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    tagDark: {
        backgroundColor: "#374151",
    },
    tagText: {
        fontSize: 14,
    },
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#FFFFFF",
        marginBottom: Platform.OS === "ios" ? 0 : 60,
        padding: 16,
        paddingBottom: Platform.OS === "ios" ? 32 : 16,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: {width: 0, height: -2},
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    footerDark: {
        backgroundColor: "#1F2937",
    },
    startButton: {
        backgroundColor: theme.color.primary[500],
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    startButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorText: {
        color: "#EF4444",
        marginTop: 8,
        textAlign: "center",
    },
});

export default QuizDetail;
