import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  Platform,
} from "react-native";
import React, { useState, useMemo, useEffect } from "react";
import { ThemedText } from "@/components/ThemedText";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import TopBar from "@/components/TopBar";
import { theme } from "@/constants/theme";
import { useColorScheme } from "@/hooks/useColorScheme";

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
  const id = local.programId;
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Simulate progress hooks
  const useSimulatedProgress = () => {
    const [progress, setProgress] = useState({
      courseProgress: Math.floor(Math.random() * 100),
      quizProgress: Math.floor(Math.random() * 100),
    });
    return progress;
  };

  const { data: program } = useSWR(id ? `program-${id}` : null, async () => {
    const { data } = await supabase
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
      .single();
    return data;
  });

  // Get simulated progress
  const { courseProgress, quizProgress } = useSimulatedProgress();

  // Calculate counts and total progress
  const totalCourses = program?.course_learningpath?.length || 0;
  const totalQuizzes = program?.quiz_learningpath?.length || 0;

  const totalProgress = useMemo(() => {
    if (!totalCourses && !totalQuizzes) return 0;
    return Math.round(
      (courseProgress * totalCourses + quizProgress * totalQuizzes) /
        (totalCourses + totalQuizzes)
    );
  }, [courseProgress, quizProgress, totalCourses, totalQuizzes]);

  const [actionCards, setActionCards] = useState<ActionCard[]>([]);

  useEffect(() => {
    if (program) {
      setActionCards([
        {
          id: "courses",
          title: "Cours",
          subtitle: "Continuez votre apprentissage",
          progress: {
            current: courseProgress,
            total: program.course_count || 0,
            percentage: (courseProgress / (program.course_count || 1)) * 100,
          },
          icon: (
            <MaterialCommunityIcons
              name="book-open-page-variant"
              size={24}
              color="#4CAF50"
            />
          ),
          route: `/(app)/program/${id}/courses`,
          color: "#4CAF50",
          rightContent: (
            <View style={styles.progressIndicator}>
              <ThemedText style={styles.progressText}>
                {courseProgress}/{program.course_count || 0}
              </ThemedText>
              <ThemedText style={styles.progressLabel}>
                cours complétés
              </ThemedText>
            </View>
          ),
        },
        // ... other action cards remain the same
      ]);
    }
  }, [program, courseProgress, quizProgress, id]);

  const ActionCard = ({ card }: { card: ActionCard }) => (
    <Pressable
      style={[styles.card, isDark && styles.cardDark]}
      onPress={() => router.push(card.route as any)}
    >
      <View style={styles.cardMain}>
        <View
          style={[styles.iconContainer, { backgroundColor: card.color + "10" }]}
        >
          {card.icon}
        </View>
        <View style={styles.cardContent}>
          <ThemedText style={[styles.cardTitle, isDark && styles.cardTitleDark]}>
            {card.title}
          </ThemedText>
          {card.subtitle && (
            <ThemedText style={[styles.cardSubtitle, isDark && styles.cardSubtitleDark]}>
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
                  width: `${card.progress.percentage}%`,
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
      <TopBar userName="uu" xp={2} onChangeProgram={() => {}} streaks={0} />
      <ScrollView
        style={[styles.container, isDark && styles.containerDark, { marginBottom: 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, isDark && styles.headerDark]}>
          <Image
            source={{
              uri: `https://api.dicebear.com/9.x/thumbs/svg?seed=${program?.title}`,
            }}
            style={styles.headerImage}
          />
          <View style={styles.headerContent}>
            <ThemedText style={[styles.programTitle, isDark && styles.programTitleDark]}>
              {program?.title}
            </ThemedText>
            <ThemedText style={[styles.concoursName, isDark && styles.concoursNameDark]}>
              {program?.concours_learningpaths?.[0]?.concour?.name} .{" "}
              {program?.concours_learningpaths?.[0]?.concour?.school?.name}
            </ThemedText>
          </View>
        </View>

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
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerDark: {
    backgroundColor: "#1F2937",
    borderBottomColor: "#374151",
  },
  headerImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  headerContent: {
    flex: 1,
    justifyContent: "center",
  },
  programTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  programTitleDark: {
    color: "#FFFFFF",
  },
  concoursName: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "600",
  },
  concoursNameDark: {
    color: "#6EE7B7",
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
  progressLabel: {
    fontSize: 12,
    color: "#6B7280",
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
});

export default ProgramDetails;