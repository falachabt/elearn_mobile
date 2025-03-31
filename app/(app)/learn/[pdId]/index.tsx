import {Image, Platform, Pressable, ScrollView, StyleSheet, View} from "react-native";
import React, {useEffect, useState} from "react";
import {ThemedText} from "@/components/ThemedText";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {useLocalSearchParams, useRouter} from "expo-router";
import {theme} from "@/constants/theme";
import {useColorScheme} from "@/hooks/useColorScheme";
import {useAuth} from "@/contexts/auth";
import {HapticType, useHaptics} from "@/hooks/useHaptics";
import {useProgramProgress} from "@/hooks/useProgramProgress"; // Import the hook

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

// Types are already defined in the useProgramProgress hook, so we don't need to redefine them here

const ProgramDetails = () => {
    const local = useLocalSearchParams();
    const id = local.pdId as string;
    const {trigger} = useHaptics();
    const {user} = useAuth();

    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    // Use the centralized hook instead of direct SWR fetcher
    const {
        courseProgress,
        quizProgress,
        exercisesProgress,
        archiveProgress, // Renamed from archivesProgress to match hook naming
        totalProgress,
        program,
        isLoading,
        error
    } = useProgramProgress(id, user?.id || "");

    // Prepare action cards
    const [actionCards, setActionCards] = useState<ActionCard[]>([]);

    // Update actionCards when program or progress data changes
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
                        percentage: courseProgress?.percentage || 0,
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
                        percentage: quizProgress?.percentage || 0,
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
                    title: "Anciens sujets",
                    subtitle: "Sujets des années précédentes",
                    icon: (
                        <MaterialCommunityIcons
                            name="file-document-multiple"
                            size={24}
                            color={isDark ? "#FBBF24" : "#FF9800"}
                        />
                    ),
                    progress: {
                        current: archiveProgress?.completed || 0,
                        total: archiveProgress?.completed + (program.concours_learningpaths?.concour?.concours_archives?.length || 0) - (archiveProgress?.completed || 0),
                        percentage: archiveProgress?.percentage || 0,
                    },
                    route: `/(app)/learn/${id}/anales`,
                    color: isDark ? "#FBBF24" : "#FF9800",
                    rightContent: (
                        <View style={styles.progressIndicator}>
                            <ThemedText
                                style={[styles.progressText, isDark && styles.progressTextDark]}
                            >
                                {archiveProgress?.completed}/
                                {program.concours_learningpaths?.concour?.concours_archives?.length || 0}
                            </ThemedText>
                            <ThemedText
                                style={[
                                    styles.progressLabel,
                                    isDark && styles.progressLabelDark,
                                ]}
                            >
                                Anales revisés
                            </ThemedText>
                        </View>
                    ),
                },
            ]);
        }
    }, [program, courseProgress, quizProgress, exercisesProgress, archiveProgress, id, isDark]);

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
                        {"Programme - "} {program?.concours_learningpaths?.concour?.school?.sigle} l{program?.concours_learningpaths?.concour?.study_cycles?.level}
                    </ThemedText>
                    <ThemedText
                        style={[styles.concoursName, isDark && styles.concoursNameDark]}
                    >
                        {program?.concours_learningpaths?.concour?.name} .
                        {program?.concours_learningpaths?.concour?.school?.name}
                    </ThemedText>
                </View>
            </View>

            {/* Overall progress indicator - Uncomment if you want to show total progress */}
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
    // Styles remain unchanged
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