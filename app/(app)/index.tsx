import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, Link, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  TourStep,
  useTourPersistence,
} from "@wrack/react-native-tour-guide";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

import CustomizableGoals from "@/components/CustimizableHomeScreenGoals";
import NewsCard, { NewsCardProps } from "@/components/shared/news/NewsCard";
import NewsCardConcoursBlanc1 from "@/components/shared/news/NewsCardConcoursBlanc1";
import NewsCardExam from "@/components/shared/news/NewsCardExam";
import NewsItem from "@/components/shared/news/NewsItem";
import TopBar from "@/components/TopBar";
import WhatsAppContact from "@/components/WhatsappSupport";
import { SECONDARY_WHATSAPP_GROUPS } from "@/constants/secondaryWhatsAppGroups";
import { theme } from "@/constants/theme";
import { useUser } from "@/contexts/useUserInfo";
import { useAuth } from "@/contexts/auth";
import { checkAndUpdateNotifications } from "@/utils/notification-utils";
import { NavigationRoutes } from "@/contexts/NavigationContext";
import { useActiveNews } from "@/hooks/useNews";
import DailyTodoSection from "@/components/shared/DailyTodoSection";
import {
  HOME_MENU_TOUR_ID,
  getTourGuideConfig,
} from "@/constants/tourGuide";
import { useTabBarTourRefs } from "@/contexts/TabBarTourContext";

const HORIZONTAL_PADDING = 16;

export default function Index() {
  const { user, toDayXp, toDayExo, toDayTime, lastCourse } = useUser();
  const { user: authUser } = useAuth();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDarkMode = colorScheme === "dark";
  const homeScrollRef = useRef<ScrollView>(null);
  const dailyTodoRef = useRef<View>(null);
  const newsSectionRef = useRef<View>(null);
  const hasAttemptedHomeTourRef = useRef(false);
  const [hasDailyTodo, setHasDailyTodo] = useState<boolean | null>(null);
  const [homeScrollY, setHomeScrollY] = useState(0);
  const {
    manuelTabRef,
    secondaryTabRef,
    learnTabRef,
    profileTabRef,
  } = useTabBarTourRefs();
  const { startTour: startHomeTour } = useTourPersistence(AsyncStorage);
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

  useEffect(() => {
    if (
      hasAttemptedHomeTourRef.current ||
      hasDailyTodo === null ||
      !newsSectionRef.current ||
      !manuelTabRef.current ||
      !secondaryTabRef.current ||
      !learnTabRef.current ||
      !profileTabRef.current
    ) {
      return;
    }

    hasAttemptedHomeTourRef.current = true;

    const steps: TourStep[] = [
      {
        id: "daily-todo",
        targetRef: dailyTodoRef,
        title: "Activites a faire aujourd'hui",
        description:
          "Ces activites s'actualisent chaque jour et sont proposees a tous les utilisateurs.",
        targetStyle: styles.tourCardTarget,
        spotlightPadding: 8,
        delayBefore: 350,
        active: hasDailyTodo,
      },
      {
        id: "news-section",
        targetRef: newsSectionRef,
        title: "Actualites importantes",
        description:
          "Les actualites presentent les informations importantes pour les bacheliers, les dates des concours et les evenements.",
        targetStyle: styles.tourSectionTarget,
        spotlightPadding: 8,
        scrollToTarget: {
          scrollRef: homeScrollRef,
          offset: 24,
          animated: true,
          getCurrentScrollOffset: () => homeScrollY,
        },
      },
      {
        id: "menu-manuel",
        targetRef: manuelTabRef,
        title: "Menu Manuel",
        description:
          "Utilisez ce menu pour acceder aux anciens sujets de concours.",
        targetStyle: styles.tourTabTarget,
        spotlightPadding: 8,
      },
      {
        id: "menu-college",
        targetRef: secondaryTabRef,
        title: "Espace College",
        description:
          "C'est l'acces aux cours, exercices et anciens sujets pour les eleves du secondaire.",
        targetStyle: styles.tourTabTarget,
        spotlightPadding: 8,
      },
      {
        id: "menu-prepa",
        targetRef: learnTabRef,
        title: "Espace Prepa",
        description:
          "Ici, on retrouve les cours, quiz, exercices et anciens sujets pour preparer les concours.",
        targetStyle: styles.tourTabTarget,
        spotlightPadding: 8,
      },
      {
        id: "menu-profile",
        targetRef: profileTabRef,
        title: "Menu Profil",
        description:
          "Dans le profil, on retrouve ses informations et on peut aussi configurer son heure de rappel et d'autres reglages.",
        targetStyle: styles.tourTabTarget,
        spotlightPadding: 8,
      },
    ];

    void startHomeTour(steps, {
      ...getTourGuideConfig(isDarkMode, HOME_MENU_TOUR_ID),
      scrollRef: homeScrollRef,
      getCurrentScrollOffset: () => homeScrollY,
    });
  }, [
    hasDailyTodo,
    homeScrollY,
    isDarkMode,
    learnTabRef,
    manuelTabRef,
    profileTabRef,
    secondaryTabRef,
    startHomeTour,
  ]);

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
        ref={homeScrollRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={(event) => {
          setHomeScrollY(event.nativeEvent.contentOffset.y);
        }}
        scrollEventThrottle={16}
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

        {/* À faire aujourd'hui */}
        <DailyTodoSection
          isDarkMode={isDarkMode}
          tourRef={dailyTodoRef}
          onVisibilityChange={setHasDailyTodo}
        />

        <View style={styles.whatsappSection}>
          <View style={styles.sectionHeader}>
            <Text
              numberOfLines={1}
              style={isDarkMode ? styles.sectionTitleDark : styles.sectionTitle}
            >
              Groupes WhatsApp
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.whatsappGroupsList}
          >
            {SECONDARY_WHATSAPP_GROUPS.map((group) => (
              <TouchableOpacity
                key={group.label}
                activeOpacity={0.9}
                style={[
                  styles.whatsappGroupChip,
                  isDarkMode && styles.whatsappGroupChipDark,
                ]}
                onPress={() => {
                  void Linking.openURL(group.url);
                }}
              >
                <MaterialCommunityIcons
                  name="whatsapp"
                  size={18}
                  color="#25D366"
                />
                <Text
                  style={[
                    styles.whatsappGroupChipText,
                    isDarkMode && styles.whatsappGroupChipTextDark,
                  ]}
                >
                  {group.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* News Section */}
        <View
          ref={newsSectionRef}
          collapsable={false}
          style={[styles.section, styles.tourSectionTarget]}
        >
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
  tourCardTarget: {
    borderRadius: 18,
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
  tourSectionTarget: {
    borderRadius: 18,
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
  whatsappSection: {
    marginBottom: 20,
  },
  whatsappGroupChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  whatsappGroupChipDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: "#1E5C45",
  },
  whatsappGroupsList: {
    paddingRight: HORIZONTAL_PADDING,
    gap: 8,
  },
  whatsappGroupChipText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "600",
    color: "#065F46",
  },
  whatsappGroupChipTextDark: {
    color: "#DCFCE7",
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
  tourTabTarget: {
    borderRadius: theme.border.radius.small,
  },
});
