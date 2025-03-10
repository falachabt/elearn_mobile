import {ActivityIndicator, Pressable, ScrollView, StyleSheet, View,} from "react-native";
import React, {useState} from "react";
import {ThemedText} from "@/components/ThemedText";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {useLocalSearchParams, useRouter} from "expo-router";
import useSWR from "swr";
import {supabase} from "@/lib/supabase";
import {theme} from "@/constants/theme";
import {useCourseProgress} from "@/hooks/useCourseProgress";
import {Courses, CoursesCategories, CoursesContent, CourseVideos,} from "@/types/type";
import {useColorScheme} from "@/hooks/useColorScheme";
import {useAuth} from "@/contexts/auth";
import {HapticType, useHaptics} from "@/hooks/useHaptics";

interface Course extends Courses {
    course_category: CoursesCategories;
    courses_content: CoursesContent[];
    course_videos: CourseVideos[];
}

type ViewType = "content" | "videos" | "quizzes";

// Simple Empty State Component
const EmptyState = ({type, isDark}: { type: ViewType; isDark: boolean; }) => {
    let icon: "file-document-outline" | "video-off-outline" | "help-circle-outline";
    let title: string;
    let description: string;

    switch (type) {
        case "content":
            icon = "file-document-outline";
            title = "Aucun contenu disponible";
            description = "Le contenu de ce cours est en cours de préparation.";
            break;
        case "videos":
            icon = "video-off-outline";
            title = "Aucune vidéo disponible";
            description = "Les vidéos de ce cours sont en cours de production.";
            break;
        case "quizzes":
            icon = "help-circle-outline";
            title = "Aucun quiz disponible";
            description = "Les quiz pour ce cours seront bientôt disponibles.";
            break;
    }

    return (
        <View style={styles.emptyStateContainer}>
            <MaterialCommunityIcons
                name={icon}
                size={48}
                color={isDark ? "#6EE7B7" : "#65B741"}
            />
            <ThemedText style={styles.emptyStateTitle}>{title}</ThemedText>
            <ThemedText style={styles.emptyStateDescription}>{description}</ThemedText>
        </View>
    );
};

const CourseDetail = () => {
    const router = useRouter();
    const {courseId, pdId} = useLocalSearchParams();
    const [selectedView, setSelectedView] = useState<ViewType>("content");
    const {sectionsProgress} = useCourseProgress(Number(courseId));
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const {user, session} = useAuth();
    const { trigger } = useHaptics();


    const {
        data: course,
        error: courseError,
        isLoading: courseLoading,
        mutate: mutateCourse,
    } = useSWR<Course>(courseId ? `course-${courseId}` : null, async () => {
        const {data} = await supabase
            .from("courses")
            .select(
                `
            *,
            category:courses_categories(*),
            courses_content(name, id, order),
            course_videos(*)
          `
            )
            .eq("id", courseId)
            .single();
        return data;
    });

    const {data: quizzes, mutate: mutateQuiz} = useSWR(
        courseId ? `quizzes-${courseId}` : null,
        async () => {
            const {data, error} = await supabase
                .from("quiz_courses")
                .select("quiz(*, questions:quiz_questions(id))")
                .eq("courseId", courseId)
            return data?.map((d: any) => d.quiz);
        }
    );

    const {data: quizProgress} = useSWR(
        user ? [`quiz-progress-${user.id}`, courseId, quizzes] : null,
        async (key: any, courseId: any) => {
            const {data, error} = await supabase
                .from("quiz_attempts")
                .select("id, status, score, quiz_id")
                .eq("user_id", user?.id)
                .in("quiz_id", quizzes?.map((q: any) => q.id) || [])
            console.log("quiz-progress", data)
            return data;
        }
    )

    const getHighestScore = (quizId: number) => {
        const quizAttempts = quizProgress?.filter((attempt) => attempt.quiz_id === quizId);
        if (!quizAttempts || quizAttempts.length === 0) return 0;
        const highestScore = Math.max(...quizAttempts.map((attempt) => attempt.score));
        return highestScore || 0;
    };

    if (courseLoading) {
        return (
            <View
                style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}
            >
                <ActivityIndicator
                    size="large"
                    color={isDark ? "#6EE7B7" : "#65B741"}
                />
                <ThemedText style={styles.loadingText}>Chargement du cours...</ThemedText>
            </View>
        );
    }

    if (courseError) {
        return (
            <View
                style={[styles.errorContainer, isDark && styles.errorContainerDark]}
            >
                <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={48}
                    color="#EF4444"
                />
                <ThemedText style={styles.errorText}>
                    Une erreur s'est produite lors du chargement du cours.
                </ThemedText>
                <Pressable
                    style={styles.retryButton}
                    onPress={() => mutateCourse()}
                >
                    <MaterialCommunityIcons name="refresh" size={16} color="#FFFFFF" style={styles.retryIcon}/>
                    <ThemedText style={styles.retryText}>Réessayer</ThemedText>
                </Pressable>
            </View>
        );
    }

    const sections =
        course?.courses_content?.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) ||
        [];
    const videos = course?.course_videos || [];

    const renderContent = () => {
        switch (selectedView) {
            case "content":
                if (sections.length === 0) {
                    return <EmptyState type="content" isDark={isDark}/>;
                }

                return sections.map((section, index) => {
                    const progress = sectionsProgress?.find(
                        (sp) => sp.sectionid == Number(section.id)
                    );
                    const progressPercentage = progress ? (progress.completed / progress.total) * 100 : 0;

                    return (
                        <Pressable
                            key={section.id}
                            style={[styles.contentItem, isDark && styles.contentItemDark]}
                            onPress={() => {
                                trigger(HapticType.SELECTION);
                                router.push(
                                    `/(app)/learn/${pdId}/courses/${courseId}/lessons/${section.id}`
                                );
                            }}
                        >
                            <View style={styles.contentHeader}>
                                <View style={[
                                    styles.sectionNumber,
                                    isDark ? styles.sectionNumberDark : styles.sectionNumberLight
                                ]}>
                                    <ThemedText style={styles.sectionNumberText}>{index + 1}</ThemedText>
                                </View>
                                <View style={styles.contentTextContainer}>
                                    <ThemedText
                                        style={[styles.contentTitle, isDark && styles.contentTitleDark]}
                                        numberOfLines={1}
                                    >
                                        {section.name}
                                        {/*{ (index < 4) && <PreloadWebView*/}
                                        {/*    uri={`https://elearn.ezadrive.com/webview/courseContent/${section.id}?theme=${isDark ? "dark" : "light"}`}*/}
                                        {/*    accessToken={session?.access_token}*/}
                                        {/*    isDark={isDark}*/}

                                        {/*/>}*/}
                                    </ThemedText>

                                    {progress && (
                                        <View style={styles.progressContainer}>
                                            <View style={[styles.progressBar, isDark && styles.progressBarDark]}>
                                                <View
                                                    style={[
                                                        styles.progressFill,
                                                        isDark && styles.progressFillDark,
                                                        {width: `${progressPercentage}%`}
                                                    ]}
                                                />
                                            </View>
                                            {/*<ThemedText style={styles.progressText}>*/}
                                            {/*    {progress.completed}/{progress.total} complété*/}
                                            {/*</ThemedText>*/}
                                        </View>
                                    )}
                                </View>
                                {progress && progress.completed === progress.total ? (
                                    <MaterialCommunityIcons
                                        name="check-circle"
                                        size={20}
                                        color={isDark ? "#6EE7B7" : "#65B741"}
                                    />
                                ) : (
                                    <MaterialCommunityIcons
                                        name="chevron-right"
                                        size={24}
                                        color={isDark ? "#9CA3AF" : "#6B7280"}
                                    />
                                )}
                            </View>
                        </Pressable>
                    );
                });

            case "videos":
                if (videos.length === 0) {
                    return <EmptyState type="videos" isDark={isDark}/>;
                }

                return videos.map((video, index) => (
                    <Pressable
                        key={video.id}
                        style={[styles.videoItem, isDark && styles.videoItemDark]}
                        onPress={() => {
                            trigger(HapticType.SELECTION);
                            router.push(
                                `/(app)/learn/${pdId}/courses/${courseId}/videos/${video.id}`
                            );
                        }}
                    >
                        <View style={styles.videoIconContainer}>
                            <MaterialCommunityIcons
                                name="play-circle"
                                size={28}
                                color={isDark ? "#6EE7B7" : "#65B741"}
                            />
                        </View>
                        <View style={styles.videoTextContent}>
                            <ThemedText
                                style={[styles.videoTitle, isDark && styles.videoTitleDark]}
                                numberOfLines={2}
                            >
                                {video.title || `Video ${index + 1}`}
                            </ThemedText>
                            <View style={styles.videoMetaContainer}>
                                <View style={styles.videoMetaItem}>
                                    <MaterialCommunityIcons
                                        name="clock-outline"
                                        size={14}
                                        color={isDark ? "#9CA3AF" : "#6B7280"}
                                    />
                                    <ThemedText style={styles.videoMetaText}>
                                        {Math.floor((video?.duration || 0) / 60)} min
                                    </ThemedText>
                                </View>
                            </View>
                        </View>
                        <MaterialCommunityIcons
                            name="chevron-right"
                            size={24}
                            color={isDark ? "#9CA3AF" : "#6B7280"}
                        />
                    </Pressable>
                ));

            case "quizzes":
                if (!quizzes || quizzes.length === 0) {
                    return <EmptyState type="quizzes" isDark={isDark}/>;
                }

                return quizzes.map((quiz, index) => quiz?.id && (
                    <Pressable
                        key={quiz.id + index}
                        style={[styles.quizItem, isDark && styles.quizItemDark]}
                        onPress={() =>
                        {
                            trigger(HapticType.SELECTION);
                            router.push(`/(app)/learn/${pdId}/quizzes/${quiz.id}`)
                        }
                        }
                    >
                        <View style={[
                            styles.quizIconContainer,
                            isDark ? styles.quizIconContainerDark : styles.quizIconContainerLight
                        ]}>
                            <MaterialCommunityIcons
                                name="help-circle-outline"
                                size={24}
                                color={isDark ? "#818CF8" : "#6366F1"}
                            />
                        </View>
                        <View style={styles.quizTextContent}>
                            <ThemedText
                                style={[styles.quizTitle, isDark && styles.quizTitleDark]}
                                numberOfLines={2}
                            >
                                {quiz?.name || `Quiz ${index + 1}`}
                            </ThemedText>
                            <View style={styles.quizMetaContainer}>
                                <View style={[
                                    styles.quizChip,
                                    isDark ? styles.quizChipDark : styles.quizChipLight
                                ]}>
                                    <ThemedText style={styles.quizChipText}>
                                        {quiz?.questions?.length || 0} questions
                                    </ThemedText>
                                </View>

                                {quiz?.estimated_time && (
                                    <View style={[
                                        styles.quizChip,
                                        isDark ? styles.quizChipDark : styles.quizChipLight
                                    ]}>
                                        <MaterialCommunityIcons
                                            name="clock-outline"
                                            size={14}
                                            color={isDark ? "#818CF8" : "#6366F1"}
                                            style={styles.quizChipIcon}
                                        />
                                        <ThemedText style={styles.quizChipText}>
                                            {quiz.estimated_time} min
                                        </ThemedText>
                                    </View>
                                )}

                                {(
                                    <View style={[
                                        styles.quizChip,
                                        isDark ? styles.quizChipDark : styles.quizChipLight
                                    ]}>
                                        <MaterialCommunityIcons
                                            name="star-outline"
                                            size={14}
                                            color={isDark ? "#818CF8" : "#6366F1"}
                                            style={styles.quizChipIcon}
                                        />
                                        <ThemedText style={styles.quizChipText}>
                                            Score le plus élevé: {getHighestScore(quiz.id)}%
                                        </ThemedText>
                                    </View>
                                )}
                            </View>
                        </View>
                        <MaterialCommunityIcons
                            name="chevron-right"
                            size={24}
                            color={isDark ? "#9CA3AF" : "#6B7280"}
                        />
                    </Pressable>
                ));
        }
    };

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <View style={[styles.header, isDark && styles.headerDark]}>
                <Pressable
                    style={styles.backButton}
                    onPress={() =>
                    {
                        trigger(HapticType.LIGHT);
                        router.push(`/(app)/learn/${pdId}/courses`)}
                    }
                >
                    <MaterialCommunityIcons
                        name="arrow-left"
                        size={24}
                        color={isDark ? "#FFFFFF" : "#111827"}
                    />
                </Pressable>
                <View style={styles.headerContent}>
                    <ThemedText
                        style={[styles.courseTitle, isDark && styles.courseTitleDark]}
                        numberOfLines={1}
                    >
                        {course?.name}
                    </ThemedText>
                    <ThemedText
                        style={[styles.courseInfo, isDark && styles.courseInfoDark]}
                    >
                        {course?.course_category?.name} • {sections.length} sections •{" "}
                        {videos.length} vidéos
                    </ThemedText>
                </View>
            </View>

            <View style={styles.tabsContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={[styles.chipContainer, isDark && styles.chipContainerDark]}
                    contentContainerStyle={styles.chipContent}
                >
                    <Pressable
                        style={[
                            styles.chip,
                            isDark && styles.chipDark,
                            selectedView === "content" && styles.selectedChip,
                            selectedView === "content" && isDark && styles.selectedChipDark,
                        ]}
                        onPress={() => setSelectedView("content")}
                    >
                        <MaterialCommunityIcons
                            name="text-box-outline"
                            size={18}
                            color={
                                selectedView === "content"
                                    ? "#FFFFFF"
                                    : isDark
                                        ? "#D1D5DB"
                                        : "#4B5563"
                            }
                        />
                        <ThemedText
                            style={[
                                styles.chipText,
                                isDark && styles.chipTextDark,
                                selectedView === "content" && styles.selectedChipText,
                            ]}
                        >
                            Contenu
                        </ThemedText>
                    </Pressable>

                    <Pressable
                        style={[
                            styles.chip,
                            isDark && styles.chipDark,
                            selectedView === "videos" && styles.selectedChip,
                            selectedView === "videos" && isDark && styles.selectedChipDark,
                        ]}
                        onPress={() => setSelectedView("videos")}
                    >
                        <MaterialCommunityIcons
                            name="play-circle-outline"
                            size={18}
                            color={
                                selectedView === "videos"
                                    ? "#FFFFFF"
                                    : isDark
                                        ? "#D1D5DB"
                                        : "#4B5563"
                            }
                        />
                        <ThemedText
                            style={[
                                styles.chipText,
                                isDark && styles.chipTextDark,
                                selectedView === "videos" && styles.selectedChipText,
                            ]}
                        >
                            Vidéos
                        </ThemedText>
                    </Pressable>

                    <Pressable
                        style={[
                            styles.chip,
                            isDark && styles.chipDark,
                            selectedView === "quizzes" && styles.selectedChip,
                            selectedView === "quizzes" && isDark && styles.selectedChipDark,
                        ]}
                        onPress={() => setSelectedView("quizzes")}
                    >
                        <MaterialCommunityIcons
                            name="help-circle-outline"
                            size={18}
                            color={
                                selectedView === "quizzes"
                                    ? "#FFFFFF"
                                    : isDark
                                        ? "#D1D5DB"
                                        : "#4B5563"
                            }
                        />
                        <ThemedText
                            style={[
                                styles.chipText,
                                isDark && styles.chipTextDark,
                                selectedView === "quizzes" && styles.selectedChipText,
                            ]}
                        >
                            Quiz
                        </ThemedText>
                    </Pressable>
                </ScrollView>
            </View>

            <ScrollView style={[styles.content, isDark && styles.contentDark]}>
                <View style={styles.contentContainer}>{renderContent()}</View>
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
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
    },
    loadingContainerDark: {
        backgroundColor: "#111827",
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: "#6B7280",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        backgroundColor: "#F9FAFB",
    },
    errorContainerDark: {
        backgroundColor: "#111827",
    },
    errorText: {
        color: "#EF4444",
        textAlign: "center",
        marginVertical: 16,
    },
    retryButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#65B741",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        marginTop: 16,
    },
    retryIcon: {
        marginRight: 8,
    },
    retryText: {
        color: "#FFFFFF",
        fontWeight: "600",
    },
    header: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerDark: {
        backgroundColor: "#1F2937",
        borderBottomColor: "#374151",
    },
    backButton: {
        marginRight: 12,
    },
    headerContent: {
        flex: 1,
    },
    courseTitle: {
        fontSize: 19,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 4,
    },
    courseTitleDark: {
        color: "#FFFFFF",
    },
    courseInfo: {
        fontSize: 14,
        color: "#6B7280",
    },
    courseInfoDark: {
        color: "#9CA3AF",
    },
    tabsContainer: {
        height: 60,
    },
    chipContainer: {
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    chipContainerDark: {
        backgroundColor: "#1F2937",
        borderBottomColor: "#374151",
    },
    chipContent: {
        paddingHorizontal: 16,
        gap: 8,
        height: "100%",
        alignItems: "center",
        flexDirection: "row",
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: theme.border.radius.small,
        gap: 6,
    },
    chipDark: {
        backgroundColor: "#374151",
    },
    selectedChip: {
        backgroundColor: "#65B741",
    },
    selectedChipDark: {
        backgroundColor: "#059669",
    },
    chipText: {
        fontSize: 14,
        color: "#4B5563",
        fontWeight: "500",
    },
    chipTextDark: {
        color: "#D1D5DB",
    },
    selectedChipText: {
        color: "#FFFFFF",
    },
    content: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    contentDark: {
        backgroundColor: "#111827",
    },
    contentContainer: {
        flexGrow: 1,
        paddingVertical: 16,
        paddingBottom: 60,
    },
    // Content section styles
    contentItem: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderRadius: 8,
        marginHorizontal: 16,
        marginBottom: 12,
        borderBottomWidth: 1,
        borderColor: "#E5E7EB",
        elevation: 1,
    },
    contentItemDark: {
        backgroundColor: "#1F2937",
        borderColor: "#374151",
    },
    contentHeader: {
        flexDirection: "row",
        alignItems: "center",
    },
    sectionNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    sectionNumberLight: {
        backgroundColor: "#F3F4F6",
    },
    sectionNumberDark: {
        backgroundColor: "#374151",
    },
    sectionNumberText: {
        fontSize: 14,
        fontWeight: "700",
    },
    contentTextContainer: {
        flex: 1,
        marginRight: 8,
    },
    contentTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
    },
    contentTitleDark: {
        color: "#FFFFFF",
    },
    progressContainer: {
        marginTop: 8,
        width: "100%",
    },
    progressBar: {
        height: 4,
        backgroundColor: "#E5E7EB",
        borderRadius: 2,
        overflow: "hidden",
        marginBottom: 4,
    },
    progressBarDark: {
        backgroundColor: "#374151",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#65B741",
        borderRadius: 2,
    },
    progressFillDark: {
        backgroundColor: "#059669",
    },
    progressText: {
        fontSize: 12,
        color: "#6B7280",
    },
    // Video styles
    videoItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderRadius: 8,
        marginHorizontal: 16,
        marginBottom: 12,
        elevation: 1,
    },
    videoItemDark: {
        backgroundColor: "#1F2937",
    },
    videoIconContainer: {
        marginRight: 12,
    },
    videoTextContent: {
        flex: 1,
        marginRight: 8,
    },
    videoTitle: {
        fontSize: 16,
        color: "#111827",
        fontWeight: "500",
        marginBottom: 4,
    },
    videoTitleDark: {
        color: "#F3F4F6",
    },
    videoMetaContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    videoMetaItem: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 12,
    },
    videoMetaText: {
        fontSize: 14,
        color: "#6B7280",
        marginLeft: 4,
    },
    // Quiz styles
    quizItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderRadius: 8,
        marginHorizontal: 16,
        marginBottom: 12,
        elevation: 1,
    },
    quizItemDark: {
        backgroundColor: "#1F2937",
    },
    quizIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 9,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    quizIconContainerLight: {
        backgroundColor: "#EEF2FF",
    },
    quizIconContainerDark: {
        backgroundColor: "rgba(99, 102, 241, 0.2)",
    },
    quizTextContent: {
        flex: 1,
        marginRight: 8,
    },
    quizTitle: {
        fontSize: 16,
        color: "#111827",
        fontWeight: "500",
        marginBottom: 8,
    },
    quizTitleDark: {
        color: "#F3F4F6",
    },
    quizMetaContainer: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
    },
    quizChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    quizChipLight: {
        backgroundColor: "#EEF2FF",
    },
    quizChipDark: {
        backgroundColor: "rgba(99, 102, 241, 0.2)",
    },
    quizChipIcon: {
        marginRight: 4,
    },
    quizChipText: {
        fontSize: 12,
        color: "#6366F1",
        fontWeight: "500",
    },
    // Empty states
    emptyStateContainer: {
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
        marginTop: 24,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginTop: 16,
        marginBottom: 8,
        textAlign: "center",
    },
    emptyStateDescription: {
        fontSize: 14,
        textAlign: "center",
        color: "#6B7280",
        maxWidth: "80%",
    },
});

export default CourseDetail;