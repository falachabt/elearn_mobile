import {useCallback, useEffect, useState} from "react";
import {ActivityIndicator, Platform, Pressable, useColorScheme, useWindowDimensions, View, StyleSheet} from "react-native";
import { useRef } from "react";
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createVideoPlayer, VideoView, type VideoSource } from 'expo-video';

import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/ThemedText';
import type { CourseVideos } from '@/types/type';
import { VideoPlaylist } from '@/components/shared/learn/VideoPlayList';
import { theme } from '@/constants/theme';
import { useSound } from '@/hooks/useSound';
import { useUser } from '@/contexts/useUserInfo';
import { HapticType, useHaptics } from '@/hooks/useHaptics';
import { trackEvent, Events } from '@/utils/analytics';
import { useCustomRouter } from "@/hooks/useCustomRouter";
import { posthogService } from '@/utils/posthogService';
import { logger } from '@/utils/logger';

// Locked Content Component
const LockedContent = ({ 
    isDarkMode, 
    onPurchase, 
    onBack,
}: { 
    isDarkMode: boolean, 
    onPurchase: () => void,
    onBack: () => void,
}) => (
    <View style={[styles.lockedContainer, isDarkMode && styles.lockedContainerDark]}>
        <MaterialCommunityIcons
            name="lock"
            size={64}
            color={isDarkMode ? "#6EE7B7" : "#65B741"}
        />
        <ThemedText style={[styles.lockedTitle, isDarkMode && styles.lockedTitleDark]}>
            Contenu verrouillé
        </ThemedText>
        <ThemedText style={[styles.lockedDescription, isDarkMode && styles.lockedDescriptionDark]}>
            Cette vidéo fait partie du contenu premium. Inscrivez-vous au programme pour accéder à toutes les vidéos.
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
            style={[styles.backToCourseButton, isDarkMode && styles.backToCourseButtonDark]}
            onPress={onBack}
        >
            <ThemedText style={[styles.backToCourseButtonText, isDarkMode && styles.backToCourseButtonTextDark]}>
                Retour au cours
            </ThemedText>
        </Pressable>
    </View>
);

const VideoPlayerScreen = () => {
    const { videoId, courseId, pdId } = useLocalSearchParams();
    const videoIdParam = Array.isArray(videoId) ? videoId[0] : videoId;
    const courseIdParam = Array.isArray(courseId) ? courseId[0] : courseId;
    const pdIdParam = Array.isArray(pdId) ? pdId[0] : pdId;
    const router = useCustomRouter();
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const { width, height } = useWindowDimensions();
    const [isLoading, setIsLoading] = useState(true);
    const [videos, setVideos] = useState<CourseVideos[]>([]);
    const [currentVideo, setCurrentVideo] = useState<CourseVideos | null>(null);
    const [currentVideoIndex, setCurrentVideoIndex] = useState<number>(-1);
    const [error, setError] = useState<string | null>(null);
    const [isVideoDone, setIsVideoDone] = useState(false);
    const { playClick } = useSound();
    const { trigger } = useHaptics();
    const [isEnrolled, setIsEnrolled] = useState(false);
    const { isLearningPathEnrolled } = useUser();

    // Check if user is enrolled in this program
    useEffect(() => {
        if (!pdIdParam) return;
        const checkEnrollment = async () => {
            const enrolled = await isLearningPathEnrolled(String(pdIdParam));
            setIsEnrolled(enrolled);
        };
        checkEnrollment();
    }, [pdIdParam, isLearningPathEnrolled]);

    // Handle purchase flow
    const handlePurchaseFlow = () => {
        trigger(HapticType.SELECTION);
        router.navigateToShop(String(pdIdParam));
    };

    const playerRef = useRef<ReturnType<typeof createVideoPlayer> | null>(null);
    if (!playerRef.current) {
        playerRef.current = createVideoPlayer(null);
        playerRef.current.loop = false;
    }

    const player = playerRef.current;
    const videoSource: VideoSource = !currentVideo
        ? null
        : Platform.OS === 'web'
            ? currentVideo.url
            : currentVideo.mux_playback_id
                ? `https://stream.mux.com/${currentVideo.mux_playback_id}.m3u8`
                : currentVideo.url;
    const videoHeight = Math.min(width * (9 / 16), height * (Platform.OS === 'web' ? 0.42 : 0.36));

    // Helper function to track video progress
    const trackVideoProgress = (progressPercent: number) => {
        if (currentVideo) {
            trackEvent(Events.VIDEO_PROGRESS, {
                video_id: currentVideo.id,
                video_title: currentVideo.title ?? '',
                course_id: String(courseIdParam ?? ''),
                learning_path_id: String(pdIdParam ?? ''),
                progress_percent: progressPercent
            });
        }
    };

    useEffect(() => {
        let isMounted = true;

        const loadVideo = async () => {
            try {
                player.pause();
                await player.replaceAsync(videoSource);

                if (!isMounted || !currentVideo) {
                    return;
                }

                posthogService.trackVideoPlayed(
                    String(currentVideo.id),
                    String(courseIdParam)
                );

                player.play();
            } catch (err) {
                if (isMounted) {
                    logger.error('Error loading video player source:', err);
                    setError('Error loading video');
                }
            }
        };

        void loadVideo();

        return () => {
            isMounted = false;
            player.pause();
        };
    }, [player, videoSource, currentVideo, courseIdParam]);

    useEffect(() => {
        if (!currentVideo) {
            return;
        }

        let lastProgressTracked = 0;
        player.timeUpdateEventInterval = 1;

        const timeUpdateSubscription = player.addListener('timeUpdate', ({ currentTime }) => {
            if (!player.duration) {
                return;
            }

            const progressPercent = Math.floor((currentTime / player.duration) * 100);

            if (progressPercent >= 25 && lastProgressTracked < 25) {
                lastProgressTracked = 25;
                trackVideoProgress(25);
            } else if (progressPercent >= 50 && lastProgressTracked < 50) {
                lastProgressTracked = 50;
                trackVideoProgress(50);
            } else if (progressPercent >= 75 && lastProgressTracked < 75) {
                lastProgressTracked = 75;
                trackVideoProgress(75);
            }
        });

        const endedSubscription = player.addListener('playToEnd', () => {
            setIsVideoDone(true);

            if (player.duration) {
                posthogService.trackVideoCompleted(
                    String(currentVideo.id),
                    Math.floor(player.duration)
                );
            }
        });

        return () => {
            timeUpdateSubscription.remove();
            endedSubscription.remove();
            player.timeUpdateEventInterval = 0;
        };
    }, [player, currentVideo, courseIdParam, pdIdParam]);

    useEffect(() => {
        return () => {
            player.pause();
            player.release();
        };
    }, [player]);

    useEffect(() => {
        // Auto-play next video when current one finishes
        if (isVideoDone && currentVideoIndex < videos.length - 1) {
            playNextVideo();
        }
    }, [isVideoDone]);

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                setIsLoading(true);
                setError(null);
                setCurrentVideo(null);
                setCurrentVideoIndex(-1);
                setIsVideoDone(false);

                if (!courseIdParam || !videoIdParam) {
                    setError('Video parameters are missing');
                    return;
                }

                const { data, error } = await supabase
                    .from('course_videos')
                    .select('*')
                    .eq('course_id', Number(courseIdParam))
                    .order('order_index', { ascending: true });

                if (error) throw error;
                const videoList = (data || []) as unknown as CourseVideos[];
                setVideos(videoList);

                const currentIndex = videoList.findIndex(v => v.id === videoIdParam);
                if (currentIndex !== -1) {
                    setCurrentVideo(videoList[currentIndex]);
                    setCurrentVideoIndex(currentIndex);
                } else {
                    setError('Video not found');
                }
            } catch (err) {
                setError('Error loading videos');
                logger.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchVideos();
    }, [courseIdParam, videoIdParam]);


    const playNextVideo = useCallback(() => {
        if (currentVideoIndex < videos.length - 1) {
            playClick();
            const nextVideo = videos[currentVideoIndex + 1];
            if (player) {
                player.pause();
            }
            setIsVideoDone(false);
            router.push(`/(app)/learn/${pdIdParam}/courses/${courseIdParam}/videos/${nextVideo.id}`);
        }
    }, [currentVideoIndex, videos, player, pdIdParam, courseIdParam]);

    const handleVideoSelect = async (video: CourseVideos) => {
        playClick();
        if (player) {
            player.pause();
        }
        setIsVideoDone(false);
        router.push(`/(app)/learn/${pdIdParam}/courses/${courseIdParam}/videos/${video.id}`);
    };

    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, isDarkMode && styles.loadingContainerDark]}>
                <ActivityIndicator size="large" color={theme.color.primary[500]} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.errorContainer, isDarkMode && styles.errorContainerDark]}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
        );
    }

    // Optional: Add a loading state while checking enrollment
    if (typeof isEnrolled === 'undefined') {
        return (
            <View style={[styles.loadingContainer, isDarkMode && styles.loadingContainerDark]}>
                <ActivityIndicator size="large" color={theme.color.primary[500]} />
                <ThemedText style={styles.loadingText}>Vérification de l'inscription...</ThemedText>
            </View>
        );
    }

    // Check if user is not enrolled and this is not the first video
    if (!isEnrolled && currentVideoIndex > 0) {
        return (
            <LockedContent 
                isDarkMode={isDarkMode} 
                onPurchase={handlePurchaseFlow}
                onBack={() => router.push(`/(app)/learn/${pdIdParam}/courses/${courseIdParam}`)}
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
                        router.push(`/(app)/learn/${pdIdParam}/courses/${courseIdParam}`);
                    }}
                >
                    <MaterialCommunityIcons name="arrow-left" size={24} color={isDarkMode ? theme.color.dark.text.primary : theme.color.light.text.primary} />
                </Pressable>
                <View style={styles.headerContent}>
                    <ThemedText style={[styles.title, isDarkMode && styles.titleDark]} numberOfLines={1}>
                        {currentVideo?.title || 'Video Player'}
                    </ThemedText>
                </View>
            </View>

            <View style={styles.videoWrapper}>
                <View style={[styles.videoContainer, { height: videoHeight }]}>
                    <VideoView
                        style={styles.video}
                        player={player}
                        fullscreenOptions={{ enable: true }}
                        allowsPictureInPicture
                    />
                </View>

                {/*{hasError && (*/}
                {/*    <ThemedText style={styles.errorText}>*/}
                {/*        An error occurred while loading the video*/}
                {/*    </ThemedText>*/}
                {/*)}*/}


            </View>

            {/* Video info section */}
            <View style={[styles.videoInfo, isDarkMode && styles.videoInfoDark]}>
                <ThemedText style={styles.videoTitle}>{currentVideo?.title}</ThemedText>
                <ThemedText style={styles.videoDescription}>{currentVideo?.description}</ThemedText>
                <View style={styles.progress}>
                    <ThemedText style={styles.progressText}>
                        {currentVideoIndex + 1} of {videos.length}
                    </ThemedText>
                </View>
            </View>

            <View style={styles.playlistContainer}>
                <VideoPlaylist
                    videos={videos}
                    currentVideo={currentVideo}
                    onVideoSelect={handleVideoSelect}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        minHeight: 0,
        backgroundColor: theme.color.light.background.primary,
    },
    containerDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.color.light.background.primary,
    },
    loadingContainerDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: theme.color.light.background.primary,
    },
    errorContainerDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    errorText: {
        color: theme.color.error,
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
    },
    header: {
        backgroundColor: theme.color.light.background.secondary,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
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
        fontFamily : theme.typography.fontFamily,
fontSize: 18,
        fontWeight: '600',
        color: theme.color.light.text.primary,
    },
    titleDark: {
        color: theme.color.dark.text.primary,
    },
    videoWrapper: {
        width: '100%',
        flexShrink: 0,
        backgroundColor: '#000000',
    },
    videoContainer: {
        width: '100%',
        backgroundColor: '#000000',
        position: 'relative',
    },
    video: {
        flex: 1,
    },
    playlistControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
        backgroundColor: '#000000',
    },
    navButton: {
        padding: 12,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        marginHorizontal: 20,
    },
    navButtonDark: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    navButtonDisabled: {
        opacity: 0.5,
    },
    videoInfo: {
        padding: 16,
        flexShrink: 0,
        backgroundColor: theme.color.light.background.secondary,
        borderBottomWidth: 1,
        borderBottomColor: theme.color.light.border,
    },
    videoInfoDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderBottomColor: theme.color.dark.border,
    },
    videoTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    videoDescription: {
        fontFamily : theme.typography.fontFamily,
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
    playlistContainer: {
        flex: 1,
        minHeight: 0,
    },
    lockedContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        backgroundColor: theme.color.light.background.primary,
    },
    lockedContainerDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    lockedTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 24,
        fontWeight: '700',
        color: theme.color.light.text.primary,
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    lockedTitleDark: {
        color: theme.color.dark.text.primary,
    },
    lockedDescription: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: theme.color.light.text.secondary,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
        maxWidth: '80%',
    },
    lockedDescriptionDark: {
        color: theme.color.dark.text.secondary,
    },
    purchaseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10B981',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    purchaseButtonDark: {
        backgroundColor: '#059669',
    },
    purchaseButtonText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 8,
    },
    backToCourseButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    backToCourseButtonDark: {
        borderColor: '#4B5563',
    },
    backToCourseButtonText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    backToCourseButtonTextDark: {
        color: '#9CA3AF',
    },
    loadingText: {
        marginTop: 16,
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: theme.color.light.text.secondary,
    },
});

export default VideoPlayerScreen;
