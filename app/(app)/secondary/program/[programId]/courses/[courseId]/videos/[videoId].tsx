import { useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";

import { supabase } from "@/lib/supabase";
import { ThemedText } from "@/components/ThemedText";
import type { CourseVideos } from "@/types/type";
import { VideoPlaylist } from "@/components/shared/learn/VideoPlayList";
import { theme } from "@/constants/theme";
import { useSound } from "@/hooks/useSound";
import { useUser } from "@/contexts/useUserInfo";
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import { trackEvent, Events } from "@/utils/analytics";
import { useCustomRouter } from "@/hooks/useCustomRouter";
import {
  ActivityIndicator,
  Pressable,
  useColorScheme,
  View,
  StyleSheet,
} from "react-native";
import { useCallback, useEffect, useState } from "react";

// Locked Content Component
const LockedContent = ({
  isDarkMode,
  onPurchase,
  onBack,
  programId,
  courseId,
}: {
  isDarkMode: boolean;
  onPurchase: () => void;
  onBack: () => void;
  programId: string;
  courseId: string;
}) => (
  <View
    style={[styles.lockedContainer, isDarkMode && styles.lockedContainerDark]}
  >
    <MaterialCommunityIcons
      name="lock"
      size={64}
      color={isDarkMode ? "#6EE7B7" : "#65B741"}
    />
    <ThemedText
      style={[styles.lockedTitle, isDarkMode && styles.lockedTitleDark]}
    >
      Contenu verrouillé
    </ThemedText>
    <ThemedText
      style={[
        styles.lockedDescription,
        isDarkMode && styles.lockedDescriptionDark,
      ]}
    >
      Cette vidéo fait partie du contenu premium. Inscrivez-vous au programme
      pour accéder à toutes les vidéos.
    </ThemedText>
    <Pressable
      style={[styles.purchaseButton, isDarkMode && styles.purchaseButtonDark]}
      onPress={onPurchase}
    >
      <MaterialCommunityIcons name="cart" size={20} color="#FFFFFF" />
      <ThemedText style={styles.purchaseButtonText}>
        S'inscrire au programme
      </ThemedText>
    </Pressable>
    <Pressable
      style={[
        styles.backToCourseButton,
        isDarkMode && styles.backToCourseButtonDark,
      ]}
      onPress={onBack}
    >
      <ThemedText
        style={[
          styles.backToCourseButtonText,
          isDarkMode && styles.backToCourseButtonTextDark,
        ]}
      >
        Retour au cours
      </ThemedText>
    </Pressable>
  </View>
);

const SecondaryVideoPlayerScreen = () => {
  const { videoId, courseId, programId } = useLocalSearchParams();
  const router = useCustomRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const [isLoading, setIsLoading] = useState(true);
  const [videos, setVideos] = useState<CourseVideos[]>([]);
  const [currentVideo, setCurrentVideo] = useState<CourseVideos | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);
  const [isVideoDone, setIsVideoDone] = useState(false);
  const { playClick } = useSound();
  const { trigger } = useHaptics();
  const { isSecondaryProgramEnrolled } = useUser();

  // Check if user is enrolled in this program
  const isEnrolled = isSecondaryProgramEnrolled(String(programId));

  // Handle purchase flow
  const handlePurchaseFlow = () => {
    trigger(HapticType.SELECTION);
    router.push(`/(app)/secondary/program/${programId}`);
  };

  const videoSource = currentVideo
    ? `https://stream.mux.com/${currentVideo.mux_playback_id}.m3u8`
    : "";

  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = false;
    player.play();

    // Track video start event
    if (currentVideo) {
      trackEvent(Events.START_VIDEO, {
        video_id: currentVideo.id,
        video_title: currentVideo.title,
        course_id: courseId,
        program_id: programId,
      });
    }
  });

  useEffect(() => {
    if (player && currentVideo) {
      const subscription = player.addListener("statusChange", (status) => {
        if (status === "readyToPlay" && !isVideoDone) {
          setIsVideoDone(false);
        }
      });

      return () => {
        subscription.remove();
      };
    }
  }, [player, currentVideo, isVideoDone]);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data: videosData, error: videosError } = await supabase
          .from("course_videos")
          .select("*")
          .eq("course", courseId)
          .order("order", { ascending: true });

        if (videosError) throw videosError;

        setVideos(videosData || []);

        const currentVideoData = videosData?.find(
          (v) => v.id === Number(videoId)
        );
        if (currentVideoData) {
          setCurrentVideo(currentVideoData);
          const index = videosData?.findIndex((v) => v.id === Number(videoId));
          setCurrentVideoIndex(index ?? -1);
        }
      } catch (err) {
        console.error("Error fetching videos:", err);
        setError("Failed to load videos");
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId && videoId) {
      fetchVideos();
    }
  }, [courseId, videoId]);

  useEffect(() => {
    return () => {
      if (player) {
        player.pause();
        player.release();
      }
    };
  }, [courseId, videoId]);

  const playNextVideo = useCallback(() => {
    if (currentVideoIndex < videos.length - 1) {
      playClick();
      const nextVideo = videos[currentVideoIndex + 1];
      if (player) {
        player.pause();
      }
      setIsVideoDone(false);
      router.push(
        `/(app)/secondary/program/${programId}/courses/${courseId}/videos/${nextVideo.id}`
      );
    }
  }, [currentVideoIndex, videos, player, programId, courseId]);

  const handleVideoSelect = async (video: CourseVideos) => {
    playClick();
    if (player) {
      player.pause();
    }
    setIsVideoDone(false);
    router.push(
      `/(app)/secondary/program/${programId}/courses/${courseId}/videos/${video.id}`
    );
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          isDarkMode && styles.loadingContainerDark,
        ]}
      >
        <ActivityIndicator size="large" color={theme.color.primary[500]} />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.errorContainer,
          isDarkMode && styles.errorContainerDark,
        ]}
      >
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </View>
    );
  }

  // Optional: Add a loading state while checking enrollment
  if (typeof isEnrolled === "undefined") {
    return (
      <View
        style={[
          styles.loadingContainer,
          isDarkMode && styles.loadingContainerDark,
        ]}
      >
        <ActivityIndicator size="large" color={theme.color.primary[500]} />
        <ThemedText style={styles.loadingText}>
          Vérification de l'inscription...
        </ThemedText>
      </View>
    );
  }

  // Check if user is not enrolled and this is not the first video
  if (!isEnrolled && currentVideoIndex > 0) {
    return (
      <LockedContent
        isDarkMode={isDarkMode}
        onPurchase={handlePurchaseFlow}
        onBack={() =>
          router.push(`/(app)/secondary/program/${programId}/courses/${courseId}`)
        }
        programId={String(programId)}
        courseId={String(courseId)}
      />
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <Pressable
          style={[styles.backButton, isDarkMode && styles.backButtonDark]}
          onPress={() => {
            playClick();
            if (player) {
              player.pause();
            }
            router.push(
              `/(app)/secondary/program/${programId}/courses/${courseId}`
            );
          }}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={
              isDarkMode
                ? theme.color.dark.text.primary
                : theme.color.light.text.primary
            }
          />
        </Pressable>
        <View style={styles.headerContent}>
          <ThemedText
            style={[styles.title, isDarkMode && styles.titleDark]}
            numberOfLines={1}
          >
            {currentVideo?.title || "Video Player"}
          </ThemedText>
        </View>
      </View>

      <View style={styles.videoWrapper}>
        <View style={styles.videoContainer}>
          <VideoView
            style={styles.video}
            player={player}
            allowsFullscreen
            allowsPictureInPicture
          />
        </View>
      </View>

      {/* Video info section */}
      <View style={[styles.videoInfo, isDarkMode && styles.videoInfoDark]}>
        <ThemedText style={styles.videoTitle}>
          {currentVideo?.title}
        </ThemedText>
        <ThemedText style={styles.videoDescription}>
          {currentVideo?.description}
        </ThemedText>
        <View style={styles.progress}>
          <ThemedText style={styles.progressText}>
            {currentVideoIndex + 1} of {videos.length}
          </ThemedText>
        </View>
      </View>

      <VideoPlaylist
        videos={videos}
        currentVideo={currentVideo}
        onVideoSelect={handleVideoSelect}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color.light.background.primary,
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.color.light.background.primary,
  },
  loadingContainerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: theme.color.light.background.primary,
  },
  errorContainerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  errorText: {
    color: theme.color.error,
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
  },
  header: {
    backgroundColor: theme.color.light.background.secondary,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: theme.color.light.border,
  },
  headerDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderBottomColor: theme.color.dark.border,
  },
  backButton: {
    marginRight: 12,
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.color.light.background.tertiary,
  },
  backButtonDark: {
    backgroundColor: theme.color.dark.background.tertiary,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "600",
    color: theme.color.light.text.primary,
  },
  titleDark: {
    color: theme.color.dark.text.primary,
  },
  videoWrapper: {
    width: "100%",
    backgroundColor: "#000000",
  },
  videoContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000000",
    position: "relative",
  },
  video: {
    flex: 1,
  },
  videoInfo: {
    padding: 16,
    backgroundColor: theme.color.light.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.light.border,
  },
  videoInfoDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderBottomColor: theme.color.dark.border,
  },
  videoTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  videoDescription: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
  },
  progress: {
    marginTop: 8,
  },
  progressText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    opacity: 0.6,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: theme.color.light.background.primary,
  },
  lockedContainerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  lockedTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 24,
    fontWeight: "700",
    color: theme.color.light.text.primary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  lockedTitleDark: {
    color: theme.color.dark.text.primary,
  },
  lockedDescription: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: theme.color.light.text.secondary,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
    maxWidth: "80%",
  },
  lockedDescriptionDark: {
    color: theme.color.dark.text.secondary,
  },
  purchaseButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  purchaseButtonDark: {
    backgroundColor: "#059669",
  },
  purchaseButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  backToCourseButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  backToCourseButtonDark: {
    borderColor: "#4B5563",
  },
  backToCourseButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  backToCourseButtonTextDark: {
    color: "#9CA3AF",
  },
  loadingText: {
    marginTop: 16,
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: theme.color.light.text.secondary,
  },
});

export default SecondaryVideoPlayerScreen;
