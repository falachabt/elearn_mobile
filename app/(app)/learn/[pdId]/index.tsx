import {Image, Platform, Pressable, ScrollView, StyleSheet, View} from "react-native";
import React, {useEffect, useMemo, useState} from "react";
import {ThemedText} from "@/components/ThemedText";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {useLocalSearchParams, useRouter} from "expo-router";
import useSWR from "swr";
import {supabase} from "@/lib/supabase";
import {theme} from "@/constants/theme";
import {useColorScheme} from "@/hooks/useColorScheme";
import {useAuth} from "@/contexts/auth";
import {HapticType, useHaptics} from "@/hooks/useHaptics";

interface ActionCard {
    id: string;
    title: string;
    subtitle?: string;
    progress?: {
        current: number;
        total: number;
        percentage: number;
    };
    icon: JSX.Element;
    route: string;
    color: string;
    rightContent?: React.ReactNode;
}


// Types pour les structures de données
interface Exercise {
    id: string;
}

interface Course {
    id: string;
    exercices?: Exercise[];
}

interface CourseLearningPath {
    id: string;
    courseId: string;
    courses?: Course;  // Note: This is a single course, not an array
}

interface QuizLearningPath {
    id: string;
    quizId: string;
}

interface School {
    id: string;
    name: string;
}

interface Concours {
    id: string;
    name: string;
    school?: School;
}

interface ConcoursLearningPath {
    concour?: Concours;
}

interface LearningPath {
    id: string;
    title: string;
    description?: string;
    course_count?: number;
    quiz_count?: number;
    duration?: number;
    course_learningpath: CourseLearningPath[];
    quiz_learningpath: QuizLearningPath[];
    concours_learningpaths?: ConcoursLearningPath;
}

interface CourseProgress {
    course_id: string;
    progress_percentage: number;
}

interface QuizAttempt {
    quiz_id: string;
}

interface ExerciceComplete {
    exercice_id: string;
}

interface ProgressResult {
    program: LearningPath;
    courseProgress: {
        completed: number;
        percentage: number;
    };
    quizProgress: {
        completed: number;
        percentage: number;
    };
    exercisesProgress: {
        completed: number;
        total: number;
        percentage: number;
    };
}

interface ProgressResult {
    program: LearningPath;
    courseProgress: {
        completed: number;
        percentage: number;
    };
    quizProgress: {
        completed: number;
        percentage: number;
    };
    exercisesProgress: {
        completed: number;
        total: number;
        percentage: number;
    };
}

const programFetcher = async (id: string, user: any): Promise<ProgressResult | null> => {
    if (!id) return null;

    // Step 1: Fetch the program data first to get the course and quiz IDs
    const { data: rawProgramData, error: programError } = await supabase
        .from("learning_paths")
        .select(
            `
            id,
            title,
            description,
            course_count,
            quiz_count,
            duration,
            course_learningpath(
                id, 
                courseId,
                courses(
                    id, 
                    exercices(id)
                )
            ),
            quiz_learningpath(
                id, 
                quizId
            ),
            concours_learningpaths(
                concour:concours(
                    id,
                    name,
                    school:schools(
                        id,
                        name
                    )
                )
            )
            `
        )
        .eq("id", id)
        .single();

    if (programError) {
        console.error("Error fetching program:", programError);
        throw programError;
    }

    // Properly cast the data to our type
    const programData = rawProgramData as unknown as LearningPath;

    // Extract relevant IDs from the program data
    const relevantCourseIds = programData.course_learningpath.map(c => c.courseId).filter(Boolean);
    const relevantQuizIds = programData.quiz_learningpath.map(q => q.quizId).filter(Boolean);

    // Extract all exercise IDs from the program data
    const allExerciseIds: string[] = [];
    programData.course_learningpath.forEach(courseLP => {
        const exercises = courseLP.courses?.exercices || [];
        exercises.forEach(exercise => {
            if (exercise.id) {
                allExerciseIds.push(exercise.id);
            }
        });
    });

    // If no user is logged in, return program data with zero progress
    if (!user?.id) {
        return {
            program: programData,
            courseProgress: { completed: 0, percentage: 0 },
            quizProgress: { completed: 0, percentage: 0 },
            exercisesProgress: { completed: 0, total: allExerciseIds.length, percentage: 0 }
        };
    }

    // Step 2: Fetch only the necessary progress data in parallel
    const [courseProgressData, quizData, exerciseData] = await Promise.all([
        // Fetch only relevant course progress
        supabase
            .from("course_progress_summary")
            .select("course_id, progress_percentage")
            .eq("user_id", user.id)
            .in("course_id", relevantCourseIds)
            .then(({ data, error }) => {
                if (error) {
                    console.error("Error fetching course progress:", error);
                    return [];
                }
                return data as CourseProgress[] || [];
            }),

        // Fetch only relevant quiz attempts
        supabase
            .from("quiz_attempts")
            .select("quiz_id")
            .eq("user_id", user.id)
            .eq("status", "completed")
            .gte("score", 70)
            .in("quiz_id", relevantQuizIds)
            .then(({ data, error }) => {
                if (error) {
                    console.error("Error fetching quiz attempts:", error);
                    return [];
                }
                return data as QuizAttempt[] || [];
            }),

        // Fetch only relevant completed exercises
        supabase
            .from("exercices_complete")
            .select("exercice_id")
            .eq("user_id", user.id)
            .eq("is_completed", true)
            .in("exercice_id", allExerciseIds)
            .then(({ data, error }) => {
                if (error) {
                    console.error("Error fetching completed exercises:", error);
                    return [];
                }
                return data as ExerciceComplete[] || [];
            })
    ]);

    // Create a set of completed exercise IDs
    const completedExerciseIds = new Set(
        exerciseData.map(exercise => exercise.exercice_id)
    );

    // Calculate course progress
    const totalCourses = programData.course_learningpath.length || 0;
    const totalCourseProgress =
        courseProgressData.reduce((acc, course) => {
            return acc + Math.min(course.progress_percentage, 100);
        }, 0) || 0;

    const courseProgress = totalCourses
        ? (totalCourseProgress / (totalCourses * 100)) * 100
        : 0;
    const courseCompleted =
        courseProgressData.filter(course => course.progress_percentage === 100).length || 0;

    // Calculate quiz progress
    const totalQuizzes = programData.quiz_learningpath.length || 0;
    const quizProgress =
        totalQuizzes && quizData.length
            ? (quizData.length / totalQuizzes) * 100
            : 0;

    // Calculate exercises progress
    const totalExercises = allExerciseIds.length;
    const completedExercises = completedExerciseIds.size;
    const exercisesProgress = totalExercises
        ? (completedExercises / totalExercises) * 100
        : 0;

    return {
        program: programData,
        courseProgress: {
            completed: courseCompleted,
            percentage: courseProgress,
        },
        quizProgress: {
            completed: quizData?.length || 0,
            percentage: quizProgress,
        },
        exercisesProgress: {
            completed: completedExercises,
            total: totalExercises,
            percentage: exercisesProgress
        }
    };
};

const ProgramDetails = () => {
    const local = useLocalSearchParams();
    const id = local.pdId as string;
    const {trigger} = useHaptics();
    const {user} = useAuth();

    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    // Use SWR for data fetching with automatic revalidation
    const {data: programData, error} = useSWR(
        id ? `program-${id}` : null,
        () => programFetcher(id, user),
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            refreshInterval: 10000
        }
    );

    const [courseProgress, setCourseProgress] = useState({
        completed: 0,
        percentage: 0
    });
    const [quizProgress, setQuizProgress] = useState({
        completed: 0,
        percentage: 0
    });
    const [exercisesProgress, setExercisesProgress] = useState({
        completed: 0,
        total: 0,
        percentage: 0
    });

    // Update local state when programData changes
    useEffect(() => {
        if (programData) {
            setCourseProgress(programData.courseProgress);
            setQuizProgress(programData.quizProgress);
            setExercisesProgress(programData.exercisesProgress);
        }
    }, [programData]);

    // Calculate total progress
    const program = programData?.program;
    const totalCourses = program?.course_learningpath?.length || 0;
    const totalQuizzes = program?.quiz_learningpath?.length || 0;

    // Add proper null checks for exercisesProgress in the totalProgress calculation
    const totalProgress = useMemo(() => {
        // Make sure all required values exist
        if (!programData) return 0;

        const totalCourses = program?.course_learningpath?.length || 0;
        const totalQuizzes = program?.quiz_learningpath?.length || 0;
        const totalExercises = exercisesProgress?.total || 0;

        if (!totalCourses && !totalQuizzes && !totalExercises) return 0;

        // Define weights for each component
        const componentsWeight = {
            courses: totalCourses > 0 ? 0.5 : 0,
            quizzes: totalQuizzes > 0 ? 0.3 : 0,
            exercises: totalExercises > 0 ? 0.2 : 0
        };

        // Normalize weights if any component is missing
        const totalWeight = componentsWeight.courses + componentsWeight.quizzes + componentsWeight.exercises;

        if (totalWeight === 0) return 0;

        const normalizedWeights = {
            courses: componentsWeight.courses / totalWeight,
            quizzes: componentsWeight.quizzes / totalWeight,
            exercises: componentsWeight.exercises / totalWeight
        };

        // Use optional chaining and nullish coalescing to safely access values
        return Math.round(
            ((courseProgress?.percentage || 0) * normalizedWeights.courses) +
            ((quizProgress?.percentage || 0) * normalizedWeights.quizzes) +
            ((exercisesProgress?.percentage || 0) * normalizedWeights.exercises)
        );
    }, [courseProgress, quizProgress, exercisesProgress, program]);

    // Add null checks for actionCards that use exercisesProgress
    useEffect(() => {
        if (program) {
            setActionCards([
                // ... other cards
                {
                    id: "exos",
                    title: "Exercices de révision",
                    subtitle: "Mémorisez efficacement",
                    progress: {
                        current: exercisesProgress?.completed || 0,
                        total: exercisesProgress?.total || 0,
                        percentage: exercisesProgress?.percentage || 0,
                    },
                    icon: (
                        <MaterialCommunityIcons
                            name="card-text-outline"
                            size={24}
                            color={isDark ? "#E879F9" : "#9C27B0"}
                        />
                    ),
                    route: `/(app)/learn/${id}/exercices`,
                    color: isDark ? "#E879F9" : "#9C27B0",
                    rightContent: (
                        <View style={styles.progressIndicator}>
                            <ThemedText
                                style={[styles.progressText, isDark && styles.progressTextDark]}
                            >
                                {exercisesProgress?.completed || 0}/
                                {exercisesProgress?.total || 0}
                            </ThemedText>
                            <ThemedText
                                style={[
                                    styles.progressLabel,
                                    isDark && styles.progressLabelDark,
                                ]}
                            >
                                exercices complétés
                            </ThemedText>
                        </View>
                    ),
                },
                // ... other cards
            ]);
        }
    }, [program, courseProgress, quizProgress, exercisesProgress, id, isDark]);
    // Prepare action cards
    const [actionCards, setActionCards] = useState<ActionCard[]>([]);

    useEffect(() => {
        if (program) {
            setActionCards([
                {
                    id: "courses",
                    title: "Cours",
                    subtitle: "Continuez votre apprentissage",
                    progress: {
                        current: courseProgress?.completed || 0,
                        total: program.course_count || 0,
                        percentage: courseProgress?.percentage,
                    },
                    icon: (
                        <MaterialCommunityIcons
                            name="book-open-page-variant"
                            size={24}
                            color={isDark ? "#6EE7B7" : "#4CAF50"}
                        />
                    ),
                    route: `/(app)/learn/${id}/courses`,
                    color: isDark ? "#6EE7B7" : "#4CAF50",
                    rightContent: (
                        <View style={styles.progressIndicator}>
                            <ThemedText
                                style={[styles.progressText, isDark && styles.progressTextDark]}
                            >
                                {courseProgress?.completed}/
                                {program.course_learningpath?.length || 0}
                            </ThemedText>
                            <ThemedText
                                style={[
                                    styles.progressLabel,
                                    isDark && styles.progressLabelDark,
                                ]}
                            >
                                cours complétés
                            </ThemedText>
                        </View>
                    ),
                },
                {
                    id: "practice",
                    title: "Quiz",
                    subtitle: "Testez vos connaissances",
                    progress: {
                        current: quizProgress?.completed || 0,
                        total: program.quiz_learningpath?.length || 0,
                        percentage: quizProgress?.percentage,
                    },
                    icon: (
                        <MaterialCommunityIcons
                            name="pencil-box-multiple"
                            size={24}
                            color={isDark ? "#60A5FA" : "#2196F3"}
                        />
                    ),
                    route: `/(app)/learn/${id}/quizzes`,
                    color: isDark ? "#60A5FA" : "#2196F3",
                    rightContent: (
                        <View style={styles.progressIndicator}>
                            <ThemedText
                                style={[styles.progressText, isDark && styles.progressTextDark]}
                            >
                                {quizProgress?.completed}/
                                {program.quiz_learningpath?.length || 0}
                            </ThemedText>
                            <ThemedText
                                style={[
                                    styles.progressLabel,
                                    isDark && styles.progressLabelDark,
                                ]}
                            >
                                quiz complétés
                            </ThemedText>
                        </View>
                    ),
                },
                {
                    id: "exos",
                    title: "Exercices de révision",
                    subtitle: "Mémorisez efficacement",
                    progress: {
                        current: exercisesProgress?.completed || 0,
                        total: exercisesProgress?.total || 0,
                        percentage: exercisesProgress?.percentage || 0,
                    },
                    icon: (
                        <MaterialCommunityIcons
                            name="card-text-outline"
                            size={24}
                            color={isDark ? "#E879F9" : "#9C27B0"}
                        />
                    ),
                    route: `/(app)/learn/${id}/exercices`,
                    color: isDark ? "#E879F9" : "#9C27B0",
                    rightContent: (
                        <View style={styles.progressIndicator}>
                            <ThemedText
                                style={[styles.progressText, isDark && styles.progressTextDark]}
                            >
                                {exercisesProgress?.completed}/
                                {exercisesProgress?.total || 0}
                            </ThemedText>
                            <ThemedText
                                style={[
                                    styles.progressLabel,
                                    isDark && styles.progressLabelDark,
                                ]}
                            >
                                exercices complétés
                            </ThemedText>
                        </View>
                    ),
                },
                {
                    id: "pastExams",
                    title: "Annales",
                    subtitle: "Sujets des années précédentes",
                    icon: (
                        <MaterialCommunityIcons
                            name="file-document-multiple"
                            size={24}
                            color={isDark ? "#FBBF24" : "#FF9800"}
                        />
                    ),
                    route: `/(app)/learn/${id}/anales`,
                    color: isDark ? "#FBBF24" : "#FF9800",
                },
            ]);
        }
    }, [program, courseProgress, quizProgress, exercisesProgress, id, isDark]);

    // Render individual action card
    const ActionCard = ({card}: { card: ActionCard }) => (
        <Pressable
            style={[styles.card, isDark && styles.cardDark]}
            onPress={() => {
                trigger(HapticType.LIGHT);
                router.push(card.route as any);
            }}
        >
            <View style={styles.cardMain}>
                <View
                    style={[
                        styles.iconContainer,
                        {backgroundColor: card.color + (isDark ? "20" : "10")},
                    ]}
                >
                    {card.icon}
                </View>
                <View style={styles.cardContent}>
                    <ThemedText
                        style={[styles.cardTitle, isDark && styles.cardTitleDark]}
                    >
                        {card.title}
                    </ThemedText>
                    {card.subtitle && (
                        <ThemedText
                            style={[styles.cardSubtitle, isDark && styles.cardSubtitleDark]}
                        >
                            {card.subtitle}
                        </ThemedText>
                    )}
                </View>
                {card.rightContent}
            </View>

            {card.progress && (
                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, isDark && styles.progressBarDark]}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${card.progress?.percentage}%`,
                                    backgroundColor: card.color,
                                },
                            ]}
                        />
                    </View>
                </View>
            )}
        </Pressable>
    );

    // Render main component
    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <View style={[styles.header, isDark && styles.headerDark]}>
                <Image
                    source={{
                        uri: `https://api.dicebear.com/9.x/thumbs/png?seed=${program?.title}`,
                    }}
                    style={styles.headerImage}
                />
                <View style={styles.headerContent}>
                    <ThemedText
                        style={[styles.programTitle, isDark && styles.programTitleDark]}
                    >
                        {program?.title}
                    </ThemedText>
                    <ThemedText
                        style={[styles.concoursName, isDark && styles.concoursNameDark]}
                    >
                        {program?.concours_learningpaths?.concour?.name} .
                        {program?.concours_learningpaths?.concour?.school?.name}
                    </ThemedText>
                </View>
            </View>

            {/* Overall progress indicator */}
            {/*<View style={styles.overallProgressContainer}>*/}
            {/*    <ThemedText style={styles.overallProgressLabel}>*/}
            {/*        Progression globale: {totalProgress}%*/}
            {/*    </ThemedText>*/}
            {/*    <View style={[styles.progressBar, isDark && styles.progressBarDark, styles.overallProgressBar]}>*/}
            {/*        <View*/}
            {/*            style={[*/}
            {/*                styles.progressFill,*/}
            {/*                {*/}
            {/*                    width: `${totalProgress}%`,*/}
            {/*                    backgroundColor: isDark ? "#6EE7B7" : "#4CAF50",*/}
            {/*                },*/}
            {/*            ]}*/}
            {/*        />*/}
            {/*    </View>*/}
            {/*</View>*/}

            <ScrollView
                style={[
                    styles.container,
                    isDark && styles.containerDark,
                    {marginBottom: 80},
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.cardsContainer}>
                    {actionCards.map((card) => (
                        <ActionCard key={card.id} card={card}/>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    containerDark: {
        backgroundColor: "#111827",
    },
    header: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        display: "flex",
        flexDirection: "row",
        gap: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderBottomColor: "#374151",
    },
    headerImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    headerContent: {
        flex: 1,
        justifyContent: "center",
    },
    schoolInfo: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    schoolLogo: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
    },
    schoolName: {
        fontSize: 14,
        color: "#6B7280",
        fontWeight: "500",
    },
    programTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#111827",
        marginBottom: 8,
    },
    programTitleDark: {
        color: "#FFFFFF",
    },
    concoursInfo: {
        gap: 8,
    },
    concoursName: {
        fontSize: 16,
        color: "#4CAF50",
        fontWeight: "600",
    },
    concoursNameDark: {
        color: "#6EE7B7",
    },
    dateContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    dateText: {
        fontSize: 14,
        color: "#4B5563",
    },
    overallProgressContainer: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    overallProgressLabel: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 8,
    },
    overallProgressBar: {
        height: 6,
    },
    cardsContainer: {
        padding: 16,
        gap: 12,
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
    cardMain: {
        flexDirection: "row",
        alignItems: "center",
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    cardContent: {
        flex: 1,
        marginLeft: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
    },
    cardTitleDark: {
        color: "#FFFFFF",
    },
    cardSubtitle: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 2,
    },
    cardSubtitleDark: {
        color: "#9CA3AF",
    },
    progressIndicator: {
        alignItems: "flex-end",
    },
    progressText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#4B5563",
    },
    progressTextDark: {
        color: "#D1D5DB",
    },
    progressLabel: {
        fontSize: 12,
        color: "#6B7280",
    },
    progressLabelDark: {
        color: "#9CA3AF",
    },
    progressBarContainer: {
        marginTop: 12,
    },
    progressBar: {
        height: 4,
        backgroundColor: "#E5E7EB",
        borderRadius: 2,
        overflow: "hidden",
    },
    progressBarDark: {
        backgroundColor: "#4B5563",
    },
    progressFill: {
        height: "100%",
        borderRadius: 2,
    },
    rankIndicator: {
        backgroundColor: "#FEE2E2",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    rankIndicatorDark: {
        backgroundColor: "rgba(252, 165, 165, 0.2)",
    },
});

export default ProgramDetails;