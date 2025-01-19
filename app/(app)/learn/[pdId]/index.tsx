import {
    View,
    ScrollView,
    StyleSheet,
    Pressable,
    Image,
    Platform,
    Text,
  } from "react-native";
  import React, { useState, useMemo, useEffect } from "react";
  import { ThemedText } from "@/components/ThemedText";
  import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
  import {
    useGlobalSearchParams,
    useLocalSearchParams,
    useRouter,
  } from "expo-router";
  import useSWR from "swr";
  import { supabase } from "@/lib/supabase";
  import TopBar from "@/components/TopBar";
  import { theme } from "@/constants/theme";
  
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
    const router = useRouter();
  
    // Simulate progress hooks
    const useSimulatedProgress = () => {
      const [progress, setProgress] = useState({
        courseProgress: Math.floor(Math.random() * 100),
        quizProgress: Math.floor(Math.random() * 100),
      });
      return progress;
    };


  
    const { data: program } = useSWR(
      id ? `program-${id}` : null,
      async () => {
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
      return data;
      },
      // { refreshInterval: 1000 }
    );

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
  
    const school = program?.concours_learningpaths?.[0]?.concour?.school;
    const concours = program?.concours_learningpaths?.[0]?.concour;
  
    // Ajout duuseState pour les cartes
    const [actionCards, setActionCards] = useState<ActionCard[]>([]);
  
    // Mettre à jour useEffect pour gérer les cartes
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
            route: `/(app)/learn/${id}/courses`,
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
          {
            id: "practice",
            title: "Quiz & Exercices",
            subtitle: "Testez vos connaissances",
            progress: {
              current: quizProgress,
              total: program.quiz_count || 0,
              percentage: (quizProgress / (program.quiz_count || 1)) * 100,
            },
            icon: (
              <MaterialCommunityIcons
                name="pencil-box-multiple"
                size={24}
                color="#2196F3"
              />
            ),
            route: `/(app)/learn/${id}/quizzes`,
            color: "#2196F3",
            rightContent: (
              <View style={styles.progressIndicator}>
                <ThemedText style={styles.progressText}>
                  {quizProgress}/{program.quiz_count || 0}
                </ThemedText>
                <ThemedText style={styles.progressLabel}>
                  quiz complétés
                </ThemedText>
              </View>
            ),
          },
          {
            id: "flashcards",
            title: "Flashcards",
            subtitle: "Mémorisez efficacement",
            icon: (
              <MaterialCommunityIcons
                name="card-text-outline"
                size={24}
                color="#9C27B0"
              />
            ),
            route: `/program/${id}/flashcards`,
            color: "#9C27B0",
          },
          {
            id: "pastExams",
            title: "Annales",
            subtitle: "Sujets des années précédentes",
            icon: (
              <MaterialCommunityIcons
                name="file-document-multiple"
                size={24}
                color="#FF9800"
              />
            ),
            route: `/program/${id}/past-exams`,
            color: "#FF9800",
          },
          {
            id: "leaderboard",
            title: "Classement",
            subtitle: "Votre position: 12/156",
            icon: (
              <MaterialCommunityIcons
                name="trophy-outline"
                size={24}
                color="#F44336"
              />
            ),
            route: `/program/${id}/leaderboard`,
            color: "#F44336",
            rightContent: (
              <View style={styles.rankIndicator}>
                <ThemedText style={[styles.progressText, { color: "#F44336" }]}>
                  Top 10%
                </ThemedText>
              </View>
            ),
          },
          {
            id: "statistics",
            title: "Statistiques",
            subtitle: "Suivez votre progression",
            icon: <Ionicons name="stats-chart" size={24} color="#673AB7" />,
            route: `/program/${id}/statistics`,
            color: "#673AB7",
          },
          // Nouvelle carte pour Constitution de dossier
          {
            id: "documents",
            title: "Constitution de dossier",
            subtitle: "Gérez vos documents",
            icon: (
              <MaterialCommunityIcons
                name="file-document-outline"
                size={24}
                color="#795548"
              />
            ),
            route: `/program/${id}/documents`,
            color: "#795548",
          },
          // ... autres cartes existantes
        ]);
      }else{

      }
    }, [program, courseProgress, quizProgress, id]);
  
    const ActionCard = ({ card }: { card: ActionCard }) => (
      <Pressable
        style={styles.card}
        onPress={() => router.push(card.route as any)}
      >
        <View style={styles.cardMain}>
          <View
            style={[styles.iconContainer, { backgroundColor: card.color + "10" }]}
          >
            {card.icon}
          </View>
          <View style={styles.cardContent}>
            <ThemedText style={styles.cardTitle}>{card.title}</ThemedText>
            {card.subtitle && (
              <ThemedText style={styles.cardSubtitle}>{card.subtitle}</ThemedText>
            )}
          </View>
          {card.rightContent}
        </View>
  
        {card.progress && (
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
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
      <View style={styles.container}>
        <TopBar userName="uu" xp={2} onChangeProgram={() => {}} streaks={0} />
        <ScrollView
          style={{ ...styles.container, marginBottom: 80 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Image
              source={{
                uri: `https://api.dicebear.com/9.x/thumbs/svg?seed=${program?.title}`,
              }}
              style={styles.headerImage}
            />
            <View style={styles.headerContent}>
              <ThemedText style={styles.programTitle}>
                {program?.title}
              </ThemedText>
              <ThemedText style={styles.concoursName}>
                {program?.concours_learningpaths?.[0]?.concour?.name} .
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
    header: {
      backgroundColor: "#FFFFFF",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: "#E5E7EB",
    },
    headerImage: {
      width: 100,
      height: 0,
      borderRadius: 50,
      marginBottom: 16,
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
    concoursInfo: {
      gap: 8,
    },
    concoursName: {
      fontSize: 16,
      color: "#4CAF50",
      fontWeight: "600",
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
    cardSubtitle: {
      fontSize: 13,
      color: "#6B7280",
      marginTop: 2,
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
  