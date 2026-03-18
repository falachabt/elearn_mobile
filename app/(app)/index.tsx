import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, Link, useRouter } from "expo-router";
import React, { useEffect, useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
  Pressable,
} from "react-native";

import CustomizableGoals from "@/components/CustimizableHomeScreenGoals";
import NewsCard, { NewsCardProps } from "@/components/shared/news/NewsCard";
import NewsCardConcoursBlanc1 from "@/components/shared/news/NewsCardConcoursBlanc1";
import NewsCardExam from "@/components/shared/news/NewsCardExam";
import NewsItem from "@/components/shared/news/NewsItem";
import TopBar from "@/components/TopBar";
import WhatsAppContact from "@/components/WhatsappSupport";
import { theme } from "@/constants/theme";
import { useUser } from "@/contexts/useUserInfo";
import { useAuth } from "@/contexts/auth";
import { checkAndUpdateNotifications } from "@/utils/notification-utils";
import { NavigationRoutes } from "@/contexts/NavigationContext";
import { useActiveNews } from "@/hooks/useNews";

const HORIZONTAL_PADDING = 16;

export default function Index() {
  const { user, toDayXp, toDayExo, toDayTime, lastCourse } = useUser();
  const { user: authUser } = useAuth();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDarkMode = colorScheme === "dark";
  const streaks = 0;
  const xp = 0;

  // Déterminer si l'utilisateur est nouveau (inscrit il y a moins de 7 jours)
  const isNewUser = useMemo(() => {
    if (!authUser?.created_at) return true;
    const createdDate = new Date(authUser.created_at);
    const daysSinceCreation =
      (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreation <= 7;
  }, [authUser?.created_at]);

  // Fetch active news from database
  const { news: dbNews } = useActiveNews({
    userId: authUser?.id || "",
    userType: "concours",
    isNewUser,
    limit: 5,
  });

  // Sample news items for the news section
  const newsItems: NewsCardProps[] = [
    // Concours Blanc 1 registration card - always visible
    {
      id: "1",
      type: "custom",
      title: "Concours Blanc 2",
      description:
        "Inscris-toi maintenant pour participer au Concours Blanc 2 !",
      customComponent: <NewsCardConcoursBlanc1 />,
      endDate: new Date("2025-08-03T08:00:00Z"), // Set the end date for the card
      actionLabel: "S'inscrire maintenant",
      onPress: () => router.push("/concours-blanc-register"),
    },
    // Exam card - countdown to the official exam
    {
      id: "3",
      type: "custom",
      title: "Examen Concours Blanc 2",
      description:
        "Le concours Blanc 2 est ouvert, Donnez le meilleur de vous-même pour réussir !",
      customComponent: <NewsCardExam />,
      startDate: new Date("2025-08-03T08:00:00Z"), // Set the start date for the card
      endDate: new Date("2025-08-03T23:59:59Z"), // Set the end date for the card
      actionLabel: "Participer à l'examen",
      onPress: () => router.push("/concours-blanc-register"),
    },
  ];

  useEffect(() => {
    checkAndUpdateNotifications();
  }, []);

  const sortedNews = [...dbNews].sort((a, b) => {
    const featuredDelta =
      Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured));
    if (featuredDelta !== 0) return featuredDelta;

    const priorityDelta = (b.priority ?? 0) - (a.priority ?? 0);
    if (priorityDelta !== 0) return priorityDelta;

    const orderDelta =
      (a.display_order ?? Number.MAX_SAFE_INTEGER) -
      (b.display_order ?? Number.MAX_SAFE_INTEGER);
    if (orderDelta !== 0) return orderDelta;

    return (
      new Date(b.published_at ?? b.created_at ?? 0).getTime() -
      new Date(a.published_at ?? a.created_at ?? 0).getTime()
    );
  });

  return (
    <View style={isDarkMode ? styles.containerDark : styles.container}>
      <TopBar
        userName={`${user?.firstname ?? ""} ${user?.lastname ?? ""}`.trim()}
        streaks={streaks}
        xp={xp}
        onChangeProgram={() => {}}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text
            numberOfLines={1}
            style={isDarkMode ? styles.welcomeTitleDark : styles.welcomeTitle}
          >
            {new Date().getHours() < 12 ? "Bonjour" : "Bonsoir"}{" "}
            {user?.firstname} 👋
          </Text>
          <WhatsAppContact
            phoneNumber="+237 6 51 05 56 63"
            message="Bonjour, j'ai besoin d'aide"
          />
        </View>
        {/*<JustificationGenerator />*/}

        {/* Mission du jour */}
        <View style={[styles.missionCard, isDarkMode && styles.missionCardDark]}>
          <View style={styles.missionHeader}>
            <View style={styles.missionBadge}>
              <MaterialCommunityIcons name="lightning-bolt" size={14} color="#FFFFFF" />
              <Text style={styles.missionBadgeText}>Mission du jour</Text>
            </View>
            <Text style={[styles.missionDuration, isDarkMode && styles.textMutedDark]}>~15 min</Text>
          </View>
          <Text style={[styles.missionTitle, isDarkMode && styles.textDark]}>
            {lastCourse?.name ? `Reprends ton cours : ${lastCourse.name}` : "Commence ta première séance"}
          </Text>
          <View style={styles.missionActions}>
            <Pressable
              style={[styles.missionAction, isDarkMode && styles.missionActionDark]}
              onPress={() => {
                if (lastCourse?.id) {
                  router.push(
                    NavigationRoutes.learn.lesson(
                      String(lastCourse?.learning_path?.id),
                      String(lastCourse?.id),
                      String(lastCourse?.current_section),
                    ) as Href,
                  );
                } else {
                  router.push("/(app)/learn" as Href);
                }
              }}
            >
              <MaterialCommunityIcons name="play-circle-outline" size={20} color={theme.color.primary[500]} />
              <Text style={styles.missionActionText}>Cours</Text>
            </Pressable>
            <Pressable
              style={[styles.missionAction, isDarkMode && styles.missionActionDark]}
              onPress={() => router.push("/(app)/learn" as Href)}
            >
              <MaterialCommunityIcons name="head-question-outline" size={20} color={theme.color.primary[500]} />
              <Text style={styles.missionActionText}>Quiz</Text>
            </Pressable>
            <Pressable
              style={[styles.missionAction, isDarkMode && styles.missionActionDark]}
              onPress={() => router.push("/(app)/manuel/anciens-sujets" as Href)}
            >
              <MaterialCommunityIcons name="file-document-outline" size={20} color={theme.color.primary[500]} />
              <Text style={styles.missionActionText}>Sujet</Text>
            </Pressable>
          </View>
        </View>

        {/* Current Course */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text
              numberOfLines={1}
              style={isDarkMode ? styles.sectionTitleDark : styles.sectionTitle}
            >
              En cours
            </Text>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>
                <Link href={"/(app)/learn"}>Tout voir</Link>
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={
              isDarkMode
                ? styles.currentCourseCardDark
                : styles.currentCourseCard
            }
          >
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${
                      lastCourse?.course_progress_summary?.[0]
                        ?.progress_percentage ?? 0
                    }%`,
                  },
                ]}
              />
            </View>
            <View style={styles.courseContent}>
              <View style={styles.playIconContainer}>
                <MaterialCommunityIcons name="play" size={24} color="#FFF" />
              </View>
              <View style={styles.courseTitleContainer}>
                <Text
                  numberOfLines={1}
                  style={
                    isDarkMode ? styles.courseTitleDark : styles.courseTitle
                  }
                >
                  {lastCourse?.name ?? "Aucun cours en cours"}
                </Text>
                <Text
                  numberOfLines={1}
                  style={
                    isDarkMode
                      ? styles.lessonProgressDark
                      : styles.lessonProgress
                  }
                >
                  Leçon {JSON.stringify(lastCourse?.courses_content?.order)} •{" "}
                  {lastCourse?.course_progress_summary?.[0]
                    ?.progress_percentage ?? 0}{" "}
                  complété
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.continueButton,
                  !lastCourse?.id && { backgroundColor: "gray" },
                ]}
                disabled={!lastCourse?.id}
                onPress={() => {
                  router.push(
                    NavigationRoutes.learn.lesson(
                      String(lastCourse?.learning_path?.id),
                      String(lastCourse?.id),
                      String(lastCourse?.current_section),
                    ) as Href,
                  );
                }}
              >
                <Text style={styles.continueText}>Continuer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Daily Goals - Replaced with CustomizableGoals component */}
        <CustomizableGoals
          isDarkMode={isDarkMode}
          toDayXp={toDayXp}
          toDayExo={toDayExo}
          toDayTime={toDayTime}
        />

        {/* Weekly Progress */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text numberOfLines={1} style={isDarkMode ? styles.sectionTitleDark : styles.sectionTitle}>
              Ma semaine
            </Text>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>
                <Link href={"/(app)/profile/weekly-performance"}>Détails</Link>
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.weeklyRow]}>
            {[
              { label: "XP", value: toDayXp ?? 0, icon: "star-outline", unit: "xp" },
              { label: "Exercices", value: toDayExo ?? 0, icon: "pencil-outline", unit: "" },
              { label: "Temps", value: toDayTime ?? 0, icon: "clock-outline", unit: "min" },
            ].map((stat) => (
              <View key={stat.label} style={[styles.weeklyStatCard, isDarkMode && styles.weeklyStatCardDark]}>
                <MaterialCommunityIcons name={stat.icon as any} size={22} color={theme.color.primary[500]} />
                <Text style={[styles.weeklyStatValue, isDarkMode && styles.textDark]}>
                  {stat.value}{stat.unit}
                </Text>
                <Text style={[styles.weeklyStatLabel, isDarkMode && styles.textMutedDark]}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* News Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text
              numberOfLines={1}
              style={isDarkMode ? styles.sectionTitleDark : styles.sectionTitle}
            >
              Les actus
            </Text>
          </View>

          {/* All News in Horizontal Scroll */}
          {(() => {
            // Filtrer les actualités statiques par dates
            const filteredNewsItems = newsItems.filter((item) => {
              const now = new Date();
              if (item.startDate && now < item.startDate) return false;
              if (item.endDate && now > item.endDate) return false;
              return true;
            });

            // Vérifier s'il y a des actualités à afficher
            const hasNews =
              filteredNewsItems.length > 0 || (dbNews && dbNews.length > 0);

            return hasNews ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.newsScrollContainer}
              >
                {/* Static News Items (Concours Blanc, etc.) */}
                {filteredNewsItems.map((item) => (
                  <View key={item.id} style={styles.newsCardWrapper}>
                    <NewsCard {...item} />
                  </View>
                ))}

                {/* Dynamic News from Database */}
                {sortedNews.map((newsItem) => (
                  <View key={newsItem.id} style={styles.newsCardWrapper}>
                    <NewsItem news={newsItem} userId={authUser?.id || ""} />
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View
                style={[
                  styles.emptyNewsContainer,
                  isDarkMode && styles.emptyNewsContainerDark,
                ]}
              >
                <MaterialCommunityIcons
                  name="newspaper-variant-outline"
                  size={48}
                  color={isDarkMode ? "#666" : "#CCC"}
                />
                <Text
                  style={[
                    styles.emptyNewsText,
                    isDarkMode && styles.emptyNewsTextDark,
                  ]}
                >
                  Aucune actualité disponible pour le moment
                </Text>
              </View>
            );
          })()}
        </View>

        {/*/!* Learning Paths *!/*/}
        {/*<View style={[styles.section, styles.lastSection]}>*/}
        {/*    <View style={styles.sectionHeader}>*/}
        {/*        <Text numberOfLines={1} style={isDarkMode ? styles.sectionTitleDark : styles.sectionTitle}>*/}
        {/*            Parcours recommandés*/}
        {/*        </Text>*/}
        {/*        <TouchableOpacity style={styles.seeAllButton}>*/}
        {/*            <Text style={styles.seeAllText}> <Link href={"/(app)/learn"}>*/}
        {/*                Tout voir*/}
        {/*            </Link></Text>*/}
        {/*        </TouchableOpacity>*/}
        {/*    </View>*/}
        {/*    {*/}
        {/*        !userPrograms?.length && <NoProgram/>*/}
        {/*    }*/}
        {/*    <LearningPaths programs={[...userPrograms]} isDarkMode={isDarkMode}/>*/}

        {/*</View>*/}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  notificationContainer: {
    padding: 16,
    borderRadius: theme.border.radius.small,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  notificationText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    marginBottom: 8,
  },
  errorText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.error,
    marginBottom: 8,
  },
  notificationDetails: {
    marginTop: 8,
  },
  containerDark: {
    flex: 1,
    backgroundColor: theme.color.dark.background.primary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 80, // For bottom tab bar
  },
  header: {
    marginTop: 16,
    marginBottom: 24,
  },
  welcomeTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  welcomeTitleDark: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: "#666",
  },
  welcomeSubtitleDark: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: "#CCCCCC",
  },
  section: {
    marginBottom: 28,
  },
  lastSection: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  sectionTitleDark: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  seeAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  seeAllText: {
    color: theme.color.primary[500],
    fontWeight: "600",
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
  },
  currentCourseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.border.radius.small,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: "hidden",
  },
  currentCourseCardDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderRadius: theme.border.radius.small,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: 3,
    backgroundColor: "#EEE",
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.color.primary[500],
  },
  courseContent: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  playIconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.border.radius.small,
    backgroundColor: theme.color.primary[500],
    justifyContent: "center",
    alignItems: "center",
  },
  courseTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  courseTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  courseTitleDark: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  lessonProgress: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: "#666",
  },
  lessonProgressDark: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: "#CCCCCC",
  },
  newsScrollContainer: {
    paddingRight: HORIZONTAL_PADDING,
    paddingBottom: 8,
    gap: 12,
  },
  newsCardWrapper: {
    width: 280,
    height: 320,
  },
  emptyNewsContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: theme.border.radius.small,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  emptyNewsContainerDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  emptyNewsText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: "#999",
    marginTop: 12,
    textAlign: "center",
  },
  emptyNewsTextDark: {
    color: "#666",
  },
  continueButton: {
    backgroundColor: theme.color.primary[500],
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.border.radius.small,
  },
  continueText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
  },
  // Mission du jour
  missionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.border.radius.medium,
    padding: 16,
    marginBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: theme.color.primary[500],
  },
  missionCardDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  missionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  missionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.color.primary[500],
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    gap: 4,
  },
  missionBadgeText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "600",
  },
  missionDuration: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: "#6B7280",
  },
  missionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 14,
    lineHeight: 20,
  },
  missionActions: {
    flexDirection: "row",
    gap: 10,
  },
  missionAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: `${theme.color.primary[500]}12`,
  },
  missionActionDark: {
    backgroundColor: `${theme.color.primary[500]}20`,
  },
  missionActionText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    fontWeight: "600",
    color: theme.color.primary[500],
  },
  // Weekly progress
  weeklyRow: {
    flexDirection: "row",
    gap: 12,
  },
  weeklyStatCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: theme.border.radius.small,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 4,
  },
  weeklyStatCardDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  weeklyStatValue: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  weeklyStatLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    color: "#6B7280",
  },
  textDark: {
    color: "#FFFFFF",
  },
  textMutedDark: {
    color: "#94A3B8",
  },
});
