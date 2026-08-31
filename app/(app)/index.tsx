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
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";

import CustomizableGoals from "@/components/CustimizableHomeScreenGoals";

import TopBar from "@/components/TopBar";
import WhatsAppContact from "@/components/WhatsappSupport";
import { SECONDARY_WHATSAPP_GROUPS } from "@/constants/secondaryWhatsAppGroups";
import { theme } from "@/constants/theme";
import { useUser } from "@/contexts/useUserInfo";
import { useAuth } from "@/contexts/auth";
import { checkAndUpdateNotifications } from "@/utils/notification-utils";
import { NavigationRoutes } from "@/contexts/NavigationContext";

import DailyTodoSection from "@/components/shared/DailyTodoSection";
import {
  HOME_MENU_TOUR_ID,
  getTourGuideConfig,
} from "@/constants/tourGuide";
import { useTabBarTourRefs } from "@/contexts/TabBarTourContext";
import { SUIVI_SEEN_KEY } from "./suivi";
import { getFeedPosts, deleteFeedPost, FeedPost } from "@/services/feed.service";
import { PostCard } from "@/components/shared/feed/PostCard";
import { CreatePostModal } from "@/components/shared/feed/CreatePostModal";
import { ImageViewerModal } from "@/components/shared/feed/ImageViewerModal";

const HORIZONTAL_PADDING = 16;

export default function Index() {
  const { user, toDayXp, toDayExo, toDayTime, lastCourse } = useUser();
  const { user: authUser } = useAuth();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDarkMode = colorScheme === "dark";
  const homeScrollRef = useRef<ScrollView>(null);
  const dailyTodoRef = useRef<View>(null);
  
  const hasAttemptedHomeTourRef = useRef(false);
  const [hasDailyTodo, setHasDailyTodo] = useState<boolean | null>(null);
  const [homeScrollY, setHomeScrollY] = useState(0);

  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [loadingFeed, setLoadingFeed] = useState<boolean>(true);
  const [refreshingFeed, setRefreshingFeed] = useState<boolean>(false);
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [imageViewerVisible, setImageViewerVisible] = useState<boolean>(false);

  const loadFeed = async () => {
    const posts = await getFeedPosts();
    setFeedPosts(posts || []);
    setLoadingFeed(false);
    setRefreshingFeed(false);
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const handleRefreshFeed = () => {
    setRefreshingFeed(true);
    loadFeed();
  };

  const handleDeletePost = (post: FeedPost) => {
    Alert.alert(
      "Supprimer la publication",
      "Es-tu sûr de vouloir supprimer cette publication ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            const success = await deleteFeedPost(post.id);
            if (success) {
              setFeedPosts((prev) => prev.filter((p) => p.id !== post.id));
            }
          },
        },
      ]
    );
  };
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

  useEffect(() => {
    checkAndUpdateNotifications();
  }, []);

  // Annonce "suivi personnalisé" : affichée une seule fois après login/inscription.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(SUIVI_SEEN_KEY)
      .then((seen) => {
        if (!cancelled && !seen) {
          router.replace("/(app)/suivi" as Href);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (
      hasAttemptedHomeTourRef.current ||
      hasDailyTodo === null ||
      
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
        refreshControl={
          <RefreshControl
            refreshing={refreshingFeed}
            onRefresh={handleRefreshFeed}
            colors={[theme.color.primary[500]]}
            tintColor={theme.color.primary[500]}
          />
        }
      >
        <View style={styles.header}>

        </View>
<TouchableOpacity
  activeOpacity={0.85}
  style={{
    backgroundColor: theme.color.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  }}
  onPress={() => setCreateModalVisible(true)}
>
  <MaterialCommunityIcons
    name="plus-circle"
    size={18}
    color="#FFFFFF"
  />
  <Text style={styles.createPostHeaderBtnText}>Poser une question</Text>
</TouchableOpacity>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mineConnectFiltersBar}>
          <TouchableOpacity style={styles.mineConnectFilterActive}>
            <MaterialCommunityIcons name="clock-outline" size={14} color="#FFFFFF" />
            <Text style={styles.mineConnectFilterActiveText}>Récent</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.mineConnectFilter, isDarkMode && styles.mineConnectFilterDark]}>
            <MaterialCommunityIcons name="newspaper-variant-outline" size={14} color={isDarkMode ? "#94A3B8" : "#64748B"} />
            <Text style={[styles.mineConnectFilterText, isDarkMode && styles.subTextDark]}>Actualité</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.mineConnectFilter, isDarkMode && styles.mineConnectFilterDark]}>
            <MaterialCommunityIcons name="help-circle-outline" size={14} color={isDarkMode ? "#94A3B8" : "#64748B"} />
            <Text style={[styles.mineConnectFilterText, isDarkMode && styles.subTextDark]}>Questions</Text>
          </TouchableOpacity>
        </ScrollView>
<View
  style={[
    styles.emptyNewsContainer,
    isDarkMode && styles.emptyNewsContainerDark,
  ]}
>
  <MaterialCommunityIcons
    name="forum-outline"
    size={64}
    color={isDarkMode ? '#334155' : '#E2E8F0'}
  />
  <Text
    style={[
      styles.emptyNewsText,
      isDarkMode && styles.emptyNewsTextDark,
      { fontWeight: '700', fontSize: 16, marginTop: 16 },
    ]}
  >
    Aucune publication pour l'instant
  </Text>
  <Text
    style={[
      styles.emptyNewsText,
      isDarkMode && styles.emptyNewsTextDark,
      { fontSize: 13, marginTop: 6, opacity: 0.7 },
    ]}
  >
    à poser une question ou partager un exercice à la communauté !
  </Text>
  <TouchableOpacity
    style={{
      marginTop: 20,
      backgroundColor: theme.color.primary[500],
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    }}
    onPress={() => setCreateModalVisible(true)}
  >
    <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
      Poster une question
    </Text>
  </TouchableOpacity>
</View>

{authUser?.id && (
  <CreatePostModal
    visible={createModalVisible}
    onClose={() => setCreateModalVisible(false)}
    onSuccess={loadFeed}
    userId={authUser.id}
    isDarkMode={isDarkMode}
  />
)}

{/* Modal de zoom/visualisation d'image */}
<ImageViewerModal
  visible={imageViewerVisible}
  imageUrl={selectedImageUrl}
  onClose={() => setImageViewerVisible(false)}
/>

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
  feedHeaderBanner: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  feedSubHeader: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontFamily: theme.typography.fontFamily,
  },
  createPostHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  createPostHeaderBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    fontFamily: theme.typography.fontFamily,
  },
  mineConnectFiltersBar: {
    marginBottom: 16,
  },
  mineConnectFilterActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  mineConnectFilterActiveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  mineConnectFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  mineConnectFilterDark: {
    backgroundColor: '#1E293B',
  },
  mineConnectFilterText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 13,
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
  subTextDark: {
    color: '#94A3B8',
  },
});
