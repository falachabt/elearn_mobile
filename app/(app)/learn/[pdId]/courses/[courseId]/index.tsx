import {ActivityIndicator, Pressable, ScrollView, StyleSheet, View,} from "react-native";
import React, {useState, useEffect} from "react";
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
import {useUser} from "@/contexts/useUserInfo";

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

    // Check if user is enrolled in this program
    const { isLearningPathEnrolled } = useUser();
    const isEnrolled = isLearningPathEnrolled(pdId);

    // Set preview mode based on enrollment status
    const [isPreviewMode, setIsPreviewMode] = useState<boolean>(!isEnrolled);

    // Update preview mode when enrollment status changes
    useEffect(() => {
        setIsPreviewMode(!isEnrolled);
    }, [isEnrolled]);

    // Handle purchase or enrollment flow
    const handlePurchaseFlow = () => {
        trigger(HapticType.SELECTION);
        router.push({
            pathname : `/(app)/(catalogue)/shop`,
            params : {
                selectedProgramId : pdId,
            }
        });
    };

    // Handle locked content access attempts
    const handleLockedContentAccess = (contentType: string) => {
        trigger(HapticType.NOTIFICATION_ERROR);
        // Show alert or navigate to purchase
        // Alert.alert(
        //     "Contenu verrouillé",
        //     `Vous devez vous inscrire à ce cours pour accéder à ce ${contentType}.`,
        //     [
        //         { text: "Annuler", style: "cancel" },
        //         { text: "S'inscrire", onPress: handlePurchaseFlow }
        //     ]
        // );
        handlePurchaseFlow();
    };

    // Get enrollment badge
    const getEnrollmentBadge = () => {
        if (isEnrolled) {
            return (
                <View style={[styles.enrollmentBadge, styles.enrolledBadge]}>
                    <MaterialCommunityIcons name="check-circle" size={14} color="#10B981" />
                    <ThemedText style={styles.enrolledBadgeText}>Inscrit</ThemedText>
                </View>
            );
        }
        return (
            <View style={[styles.enrollmentBadge, styles.previewBadge]}>
                <MaterialCommunityIcons name="eye-outline" size={14} color="#F59E0B" />
                <ThemedText style={styles.previewBadgeText}>Aperçu</ThemedText>
            </View>
        );
    };

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
                .select("quiz(id, name  , questions:quiz_questions(id))")
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
            return data;
        }
    )

    const getHighestScore = (quizId: number) => {
        const quizAttempts = quizProgress?.filter((attempt) => attempt.quiz_id === quizId);
        if (!quizAttempts || quizAttempts.length === 0) return 0;
        const highestScore = Math.max(...quizAttempts.map((attempt) => attempt.score));
        return highestScore || 0;
    };

    // Optional: Add a loading state while checking enrollment
    if (typeof isEnrolled === 'undefined') {
        return (
            <View style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}>
                <ActivityIndicator size="large" color={isDark ? "#6EE7B7" : "#65B741"} />
                <ThemedText style={styles.loadingText}>Vérification de l'inscription...</ThemedText>
            </View>
        );
    }

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

                // In preview mode, only show the first 2 sections
                const visibleSections = isPreviewMode ? sections.slice(0, 1) : sections;

                const sectionItems = visibleSections.map((section, index) => {
                    const progress = sectionsProgress?.find(
                        (sp) => sp.sectionid == Number(section.id)
                    );
                    const progressPercentage = progress ? (progress.completed / progress.total) * 100 : 0;

                    return (
                        <Pressable
                            key={section.id}
                            style={[styles.contentItem, isDark && styles.contentItemDark]}
                            onPress={() => {
                                if (isPreviewMode && index >= 2) {
                                    handleLockedContentAccess("section");
                                    return;
                                }
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

                // Add purchase banner if in preview mode
                if (isPreviewMode && sections.length > 1) {
                    return (
                        <>
                            {sectionItems}
                            <View style={[styles.previewBanner, isDark && styles.previewBannerDark]}>
                                <MaterialCommunityIcons
                                    name="lock"
                                    size={24}
                                    color={isDark ? "#6EE7B7" : "#65B741"}
                                />
                                <View style={styles.previewBannerTextContainer}>
                                    <ThemedText style={[styles.previewBannerTitle, isDark && styles.previewBannerTitleDark]}>
                                        Accédez à {sections.length - 1} sections supplémentaires
                                    </ThemedText>
                                    <ThemedText style={styles.previewBannerDescription}>
                                        Achetez ce cours pour débloquer tout le contenu
                                    </ThemedText>
                                </View>
                                <Pressable
                                    style={styles.previewBannerButton}
                                    onPress={handlePurchaseFlow}
                                >
                                    <ThemedText style={styles.previewBannerButtonText}>
                                        Acheter
                                    </ThemedText>
                                </Pressable>
                            </View>
                        </>
                    );
                }

                return sectionItems;

            case "videos":
                if (videos.length === 0) {
                    return <EmptyState type="videos" isDark={isDark}/>;
                }

                // In preview mode, only show the first video
                const visibleVideos = isPreviewMode ? videos.slice(0, 0) : videos;

                const videoItems = visibleVideos.map((video, index) => (
                    <Pressable
                        key={video.id}
                        style={[styles.videoItem, isDark && styles.videoItemDark]}
                        onPress={() => {
                            if (isPreviewMode && index >= 1) {
                                handleLockedContentAccess("vidéo");
                                return;
                            }
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

                // Add purchase banner if in preview mode
                if (isPreviewMode && videos.length > 0) {
                    return (
                        <>
                            {videoItems}
                            <View style={[styles.previewBanner, isDark && styles.previewBannerDark]}>
                                <MaterialCommunityIcons
                                    name="lock"
                                    size={24}
                                    color={isDark ? "#6EE7B7" : "#65B741"}
                                />
                                <View style={styles.previewBannerTextContainer}>
                                    <ThemedText style={[styles.previewBannerTitle, isDark && styles.previewBannerTitleDark]}>
                                        Accédez à {videos.length} vidéos
                                    </ThemedText>
                                    <ThemedText style={styles.previewBannerDescription}>
                                        Achetez ce programme pour débloquer toutes les vidéos
                                    </ThemedText>
                                </View>
                                <Pressable
                                    style={styles.previewBannerButton}
                                    onPress={handlePurchaseFlow}
                                >
                                    <ThemedText style={styles.previewBannerButtonText}>
                                        Acheter
                                    </ThemedText>
                                </Pressable>
                            </View>
                        </>
                    );
                }

                return videoItems;

            case "quizzes":
                if (!quizzes || quizzes.length === 0) {
                    return <EmptyState type="quizzes" isDark={isDark}/>;
                }

                // In preview mode, only show the first two quizzes
                const visibleQuizzes = isPreviewMode ? quizzes.slice(0, 0) : quizzes;

                const quizItems = visibleQuizzes.map((quiz, index) => quiz?.id && (
                    <Pressable
                        key={quiz.id + index}
                        style={[styles.quizItem, isDark && styles.quizItemDark]}
                        onPress={() => {
                            if (isPreviewMode && index >= 2) {
                                handleLockedContentAccess("quiz");
                                return;
                            }
                            trigger(HapticType.SELECTION);
                            router.push(`/(app)/learn/${pdId}/quizzes/${quiz.id}`)
                        }}
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
                            </View>
                        </View>
                        <MaterialCommunityIcons
                            name="chevron-right"
                            size={24}
                            color={isDark ? "#9CA3AF" : "#6B7280"}
                        />
                    </Pressable>
                ));

                // Add purchase banner if in preview mode
                if (isPreviewMode && quizzes.length > 0) {
                    return (
                        <>
                            {quizItems}
                            <View style={[styles.previewBanner, isDark && styles.previewBannerDark]}>
                                <MaterialCommunityIcons
                                    name="lock"
                                    size={24}
                                    color={isDark ? "#6EE7B7" : "#65B741"}
                                />
                                <View style={styles.previewBannerTextContainer}>
                                    <ThemedText style={[styles.previewBannerTitle, isDark && styles.previewBannerTitleDark]}>
                                        Accédez à {quizzes.length} quiz
                                    </ThemedText>
                                    <ThemedText style={styles.previewBannerDescription}>
                                        Achetez ce programme pour débloquer tous les quiz
                                    </ThemedText>
                                </View>
                                <Pressable
                                    style={styles.previewBannerButton}
                                    onPress={handlePurchaseFlow}
                                >
                                    <ThemedText style={styles.previewBannerButtonText}>
                                        Acheter
                                    </ThemedText>
                                </Pressable>
                            </View>
                        </>
                    );
                }

                return quizItems;
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
                    <View style={styles.headerTitleRow}>
                        <ThemedText
                            style={[styles.courseTitle, isDark && styles.courseTitleDark]}
                            numberOfLines={1}
                        >
                            {course?.name}
                        </ThemedText>
                        {getEnrollmentBadge()}
                    </View>
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
    previewBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1FAE5',
    },
    previewBannerDark: {
        backgroundColor: '#064E3B',
        borderColor: '#065F46',
    },
    previewBannerTextContainer: {
        flex: 1,
        marginLeft: 12,
        marginRight: 8,
    },
    previewBannerTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
        color: '#065F46',
        marginBottom: 2,
    },
    previewBannerTitleDark: {
        color: '#6EE7B7',
    },
    previewBannerDescription: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#047857',
    },
    previewBannerButton: {
        backgroundColor: '#10B981',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    previewBannerButtonText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
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
        fontFamily : theme.typography.fontFamily,
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
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    courseTitle: {
        fontFamily : theme.typography.fontFamily,
        fontSize: 19,
        fontWeight: "700",
        color: "#111827",
        flex: 1,
        marginRight: 8,
    },
    courseTitleDark: {
        color: "#FFFFFF",
    },
    courseInfo: {
        fontFamily : theme.typography.fontFamily,
        fontSize: 14,
        color: "#6B7280",
    },
    courseInfoDark: {
        color: "#9CA3AF",
    },
    enrollmentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    enrolledBadge: {
        backgroundColor: '#DCFCE7',
    },
    enrolledBadgeText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        fontWeight: '600',
        color: '#10B981',
        marginLeft: 4,
    },
    previewBadge: {
        backgroundColor: '#FEF3C7',
    },
    previewBadgeText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        fontWeight: '600',
        color: '#F59E0B',
        marginLeft: 4,
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
        fontFamily : theme.typography.fontFamily,
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
        fontFamily : theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: "700",
    },
    contentTextContainer: {
        flex: 1,
        marginRight: 8,
    },
    contentTitle: {
        fontFamily : theme.typography.fontFamily,
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
        fontFamily : theme.typography.fontFamily,
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
        fontFamily : theme.typography.fontFamily,
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
        fontFamily : theme.typography.fontFamily,
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
        fontFamily : theme.typography.fontFamily,
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
        fontFamily : theme.typography.fontFamily,
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
        fontFamily : theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: "600",
        marginTop: 16,
        marginBottom: 8,
        textAlign: "center",
    },
    emptyStateDescription: {
        fontFamily : theme.typography.fontFamily,
        fontSize: 14,
        textAlign: "center",
        color: "#6B7280",
        maxWidth: "80%",
    },
});

export default CourseDetail;
