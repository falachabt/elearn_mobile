import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, Link, useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  TourStep,
  useTourPersistence,
} from "@wrack/react-native-tour-guide";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { getFeedPosts, getTrendingFeedPosts, deleteFeedPost, toggleLikePost, votePollOption, FeedPost, FEED_PAGE_SIZE } from "@/services/feed.service";
import { PostCard } from "@/components/shared/feed/PostCard";
import { CreatePostModal } from "@/components/shared/feed/CreatePostModal";
import { ImageViewerModal } from "@/components/shared/feed/ImageViewerModal";
import { UserProfileBottomSheet } from "@/components/shared/feed/UserProfileBottomSheet";
import { ConfirmDeleteBottomSheet } from "@/components/shared/feed/ConfirmDeleteBottomSheet";
import CountrySelectBottomSheet from "@/components/ui/CountrySelectBottomSheet";
import { type CountryOption } from "@/services/countries.service";
import { supabase } from "@/lib/supabase";

const HORIZONTAL_PADDING = 16;

export default function Index() {
  const { user, toDayXp, toDayExo, toDayTime, lastCourse } = useUser();
  const { user: authUser, mutateUser } = useAuth();

  const needsCountryPrompt = !!authUser?.onboarding_done && !authUser?.country_id;

  const handleSelectCountry = async (country: CountryOption) => {
    if (!authUser?.id) return;
    await supabase
      .from('accounts')
      .update({ country_id: country.id, country: country.name })
      .eq('id', authUser.id);
    await mutateUser();
  };
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
  const [loadingMoreFeed, setLoadingMoreFeed] = useState<boolean>(false);
  const [hasMoreFeed, setHasMoreFeed] = useState<boolean>(true);
  const [feedMode, setFeedMode] = useState<'recent' | 'trending'>('recent');
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [imageViewerVisible, setImageViewerVisible] = useState<boolean>(false);
  const [profileSheetUserId, setProfileSheetUserId] = useState<string | null>(null);
  const [postPendingDelete, setPostPendingDelete] = useState<FeedPost | null>(null);
  const [deletingPost, setDeletingPost] = useState<boolean>(false);

  const loadFeed = async () => {
    setLoadingFeed(true);
    const posts =
      feedMode === 'trending'
        ? await getTrendingFeedPosts(authUser?.authId)
        : await getFeedPosts(authUser?.authId);
    setFeedPosts(posts || []);
    setHasMoreFeed(feedMode === 'recent' && (posts?.length ?? 0) === FEED_PAGE_SIZE);
    setLoadingFeed(false);
    setRefreshingFeed(false);
  };

  const loadMoreFeedPosts = async () => {
    if (feedMode !== 'recent' || loadingMoreFeed || !hasMoreFeed || feedPosts.length === 0) return;
    setLoadingMoreFeed(true);
    const lastPost = feedPosts[feedPosts.length - 1];
    const morePosts = await getFeedPosts(authUser?.authId, {
      beforeCreatedAt: lastPost.created_at,
    });
    setFeedPosts((prev) => [...prev, ...(morePosts || [])]);
    setHasMoreFeed((morePosts?.length ?? 0) === FEED_PAGE_SIZE);
    setLoadingMoreFeed(false);
  };

  const handleToggleLike = async (post: FeedPost) => {
    if (!authUser?.authId) return;
    const wasLiked = !!post.liked_by_me;

    // Mise à jour optimiste
    setFeedPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              liked_by_me: !wasLiked,
              likes_count: (p.likes_count || 0) + (wasLiked ? -1 : 1),
            }
          : p
      )
    );

    await toggleLikePost(post.id, authUser.authId, wasLiked);
  };

  const handleVotePoll = async (post: FeedPost, optionId: string) => {
    if (!authUser?.authId || post.poll_voted_option_id) return;

    // Mise à jour optimiste : on marque le vote et incrémente l'option choisie
    setFeedPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              poll_voted_option_id: optionId,
              poll_total_votes: (p.poll_total_votes ?? 0) + 1,
              poll_options: p.poll_options?.map((o) =>
                o.id === optionId ? { ...o, votes_count: o.votes_count + 1 } : o
              ),
            }
          : p
      )
    );

    await votePollOption(post.id, optionId, authUser.authId);
  };

  useEffect(() => {
    loadFeed();
  }, [authUser?.authId, feedMode]);

  // Recharge le feed à chaque retour sur l'onglet Home (app rouverte,
  // retour depuis le détail d'un post, etc.) sans attendre un pull manuel.
  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [authUser?.authId, feedMode])
  );

  const handleRefreshFeed = () => {
    setRefreshingFeed(true);
    loadFeed();
  };

  const handleDeletePost = (post: FeedPost) => {
    setPostPendingDelete(post);
  };

  const confirmDeletePost = async () => {
    if (!postPendingDelete) return;
    setDeletingPost(true);
    const success = await deleteFeedPost(postPendingDelete.id);
    if (success) {
      setFeedPosts((prev) => prev.filter((p) => p.id !== postPendingDelete.id));
    }
    setDeletingPost(false);
    setPostPendingDelete(null);
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

      <View style={[styles.feedModeRow, isDarkMode && styles.feedModeRowDark]}>
        <TouchableOpacity
          style={[styles.feedModeBtn, feedMode === 'recent' && styles.feedModeBtnActive]}
          onPress={() => setFeedMode('recent')}
        >
          <Text style={[styles.feedModeBtnText, feedMode === 'recent' && styles.feedModeBtnTextActive]}>
            Récent
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.feedModeBtn, feedMode === 'trending' && styles.feedModeBtnActive]}
          onPress={() => setFeedMode('trending')}
        >
          <MaterialCommunityIcons
            name="fire"
            size={15}
            color={feedMode === 'trending' ? '#FFFFFF' : theme.color.primary[500]}
          />
          <Text style={[styles.feedModeBtnText, feedMode === 'trending' && styles.feedModeBtnTextActive]}>
            Tendance
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={homeScrollRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={(event) => {
          const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
          setHomeScrollY(contentOffset.y);
          const distanceToBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
          if (distanceToBottom < 400) {
            loadMoreFeedPosts();
          }
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
{loadingFeed ? (
  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
    <ActivityIndicator size="large" color={theme.color.primary[500]} />
  </View>
) : feedPosts.length > 0 ? (
  <View style={{ marginTop: 12 }}>
    {feedPosts.map((post) => (
      <PostCard
        key={post.id}
        post={post}
        isDarkMode={isDarkMode}
        currentUserId={authUser?.authId}
        onPressPost={(p) => router.push(`/post/${p.id}`)}
        onPressDelete={handleDeletePost}
        onPressImage={(images, index) => {
          setSelectedImages(images);
          setSelectedImageIndex(index);
          setImageViewerVisible(true);
        }}
        onPressAuthor={(authorId) => setProfileSheetUserId(authorId)}
        onToggleLike={handleToggleLike}
        onVotePoll={handleVotePoll}
      />
    ))}
    {loadingMoreFeed && (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={theme.color.primary[500]} />
      </View>
    )}
  </View>
) : (
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
)}

{authUser?.id && (
  <CreatePostModal
    visible={createModalVisible}
    onClose={() => setCreateModalVisible(false)}
    onSuccess={loadFeed}
    userId={authUser.authId}
    isDarkMode={isDarkMode}
  />
)}

{/* Modal de zoom/visualisation d'image */}
<ImageViewerModal
  visible={imageViewerVisible}
  images={selectedImages}
  initialIndex={selectedImageIndex}
  onClose={() => setImageViewerVisible(false)}
/>

{/* Profil public (bottom sheet) au clic sur l'avatar d'un auteur */}
<UserProfileBottomSheet
  visible={!!profileSheetUserId}
  userId={profileSheetUserId}
  onClose={() => setProfileSheetUserId(null)}
  isDarkMode={isDarkMode}
/>

<ConfirmDeleteBottomSheet
  visible={!!postPendingDelete}
  loading={deletingPost}
  onCancel={() => setPostPendingDelete(null)}
  onConfirm={confirmDeletePost}
  isDarkMode={isDarkMode}
/>

<CountrySelectBottomSheet
  visible={needsCountryPrompt}
  dismissable={false}
  onSelect={handleSelectCountry}
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

      {homeScrollY > 300 && (
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.fabBackToTop}
          onPress={() => homeScrollRef.current?.scrollTo({ y: 0, animated: true })}
        >
          <MaterialCommunityIcons name="arrow-up" size={22} color={theme.color.primary[500]} />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.fab}
        onPress={() => setCreateModalVisible(true)}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>
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
  feedModeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
  },
  feedModeRowDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  feedModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  feedModeBtnActive: {
    backgroundColor: theme.color.primary[500],
  },
  feedModeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.color.primary[500],
  },
  feedModeBtnTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 12,
    paddingBottom: 80, // For bottom tab bar
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 65 + 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.color.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  fabBackToTop: {
    position: 'absolute',
    right: 26,
    bottom: 65 + 16 + 56 + 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
});
