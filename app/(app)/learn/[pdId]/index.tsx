import {Image, Platform, Pressable, ScrollView, StyleSheet, View,} from "react-native";
import React, {useEffect, useMemo, useState} from "react";
import {ThemedText} from "@/components/ThemedText";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {useLocalSearchParams, useRouter,} from "expo-router";
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

const ProgramDetails = () => {
  const local = useLocalSearchParams();
  const id = local.pdId;
  const { trigger } = useHaptics();

  
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuth();
  const [courseProgress, setCourseProgress] = useState<{
    completed: number;
    percentage: number;
  }>({ completed: 0, percentage: 0 });
  const [quizProgress, setQuizProgress] = useState<{
    completed: number;
    percentage: number;
  }>({ completed: 0, percentage: 0 });


  const { data: programData } = useSWR(id ? `program-${id}` : null, async () => {
    const { data, error } = await supabase
      .from("learning_paths")
      .select(
        `
          *,
          course_learningpath(*),
          quiz_learningpath(*),
          concours_learningpaths(
            concour:concours(
              *,
              school:schools(*)
            )
          )
          `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching program:", error);
      return null;
    }

    const { data: courseProgressData, error: courseProgressError } = await supabase
      .from("course_progress_summary")
      .select("*")
      .eq("user_id", user?.id)
      .in(
        "course_id",
        data?.course_learningpath?.map((c: any) => c.courseId) || []
      );

    const { data: quizData, error: quizError } = await supabase
      .from("quiz_attempts")
      .select("quiz_id, score, status")
      .eq("user_id", user?.id)
      .in(
        "quiz_id",
        data?.quiz_learningpath?.map((q: any) => q.quizId) || []
      )
      .eq("status", "completed")
      .gte("score", 70);

    if (courseProgressError || quizError) {
      console.error("Error fetching progress:", courseProgressError || quizError);
      return {
        program: data,
        courseProgress: {
          completed: 0,
          percentage: 0,
        },
        quizProgress: {
          completed: 0,
          percentage: 0,
        },
      };
    }

    const totalCourses = data?.course_learningpath?.length || 0;
    const totalCourseProgress =
      courseProgressData?.reduce((acc, course) => {
        return acc + Math.min(course.progress_percentage, 100);
      }, 0) || 0;

    const courseProgress = totalCourses
      ? (totalCourseProgress / (totalCourses * 100)) * 100
      : 0;
    const courseCompleted =
      courseProgressData?.filter((course) => course.progress_percentage === 100).length ||
      0;

    const totalQuizzes = data?.quiz_learningpath?.length || 0;

    const quizProgress =
      totalQuizzes && quizData
        ? (quizData.length / data?.quiz_learningpath?.length) * 100
        : 0;

    return {
      program: data,
      courseProgress: {
        completed: courseCompleted,
        percentage: courseProgress,
      },
      quizProgress: {
        completed: quizData?.length || 0,
        percentage: quizProgress,
      },
    };
  }, { revalidateOnFocus: true, revalidateOnReconnect: true, refreshInterval: 10000 });

  const program = programData?.program;

  useEffect(() => {
    if (programData) {
      setCourseProgress(programData.courseProgress);
      setQuizProgress(programData.quizProgress);
    }
  }, [programData]);

  // Get simulated progress
  // const {  } = useSimulatedProgress();

  // Calculate counts and total progress
  const totalCourses = program?.course_learningpath?.length || 0;
  const totalQuizzes = program?.quiz_learningpath?.length || 0;

  const totalProgress = useMemo(() => {
    if (!totalCourses && !totalQuizzes) return 0;
    return Math.round(
      (courseProgress?.percentage * totalCourses +
        quizProgress?.percentage * totalQuizzes) /
        (totalCourses + totalQuizzes)
    );
  }, [courseProgress, quizProgress, totalCourses, totalQuizzes]);

  const school = program?.concours_learningpaths?.[0]?.concour?.school;
  const concours = program?.concours_learningpaths?.[0]?.concour;

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
            total: program.quiz_learningpathh?.length || 0,
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
          icon: (
            <MaterialCommunityIcons
              name="card-text-outline"
              size={24}
              color={isDark ? "#E879F9" : "#9C27B0"}
            />
          ),
          route: `/(app)/learn/${id}/exercices`,
          color: isDark ? "#E879F9" : "#9C27B0",
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

        // {
        //   id: "leaderboard",
        //   title: "Classement",
        //   subtitle: "Votre position: 12/156",
        //   icon: (
        //     <MaterialCommunityIcons
        //       name="trophy-outline"
        //       size={24}
        //       color={isDark ? "#FCA5A5" : "#F44336"}
        //     />
        //   ),
        //   route: `/program/${id}/leaderboard`,
        //   color: isDark ? "#FCA5A5" : "#F44336",
        //   rightContent: (
        //     <View style={[styles.rankIndicator, isDark && styles.rankIndicatorDark]}>
        //       <ThemedText style={[styles.progressText, { color: isDark ? "#FCA5A5" : "#F44336" }]}>
        //         Top 10%
        //       </ThemedText>
        //     </View>
        //   ),
        // },
        // {
        //   id: "statistics",
        //   title: "Statistiques",
        //   subtitle: "Suivez votre progression",
        //   icon: <Ionicons name="stats-chart" size={24} color={isDark ? "#C4B5FD" : "#673AB7"} />,
        //   route: `/program/${id}/statistics`,
        //   color: isDark ? "#C4B5FD" : "#673AB7",
        // },
        // {
        //   id: "documents",
        //   title: "Constitution de dossier",
        //   subtitle: "Gérez vos documents",
        //   icon: (
        //     <MaterialCommunityIcons
        //       name="file-document-outline"
        //       size={24}
        //       color={isDark ? "#D6D3D1" : "#795548"}
        //     />
        //   ),
        //   route: `/program/${id}/documents`,
        //   color: isDark ? "#D6D3D1" : "#795548",
        // },
      ]);
    }
  }, [program, courseProgress, quizProgress, id, isDark]);

  const ActionCard = ({ card }: { card: ActionCard }) => (
    <Pressable
      style={[styles.card, isDark && styles.cardDark]}
      onPress={() =>
      {
        trigger(HapticType.LIGHT);
          router.push(card.route as any)}
      }
    >
      <View style={styles.cardMain}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: card.color + (isDark ? "20" : "10") },
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

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* <TopBar userName="uu" xp={2} onChangeProgram={() => {}} streaks={0} /> */}
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
            {program?.concours_learningpaths?.concour?.name}  .

            {program?.concours_learningpaths?.concour?.school?.name}
          </ThemedText>
        </View>
      </View>
      <ScrollView
        style={[
          styles.container,
          isDark && styles.containerDark,
          { marginBottom: 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardsContainer}>
          {actionCards.map((card) => (
            <ActionCard key={card.id} card={card} />
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
        shadowOffset: { width: 0, height: 1 },
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
