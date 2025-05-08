import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, BackHandler, useColorScheme, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import type { CourseVideos } from '@/types/type';
import { useVideoPlayer, VideoView } from 'expo-video';
import { VideoPlaylist } from '@/components/shared/learn/VideoPlayList';
import { theme } from '@/constants/theme';
import { useSound } from '@/hooks/useSound';

const VideoPlayerScreen = () => {
    const { videoId, courseId, pdId } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const [isLoading, setIsLoading] = useState(true);
    const [videos, setVideos] = useState<CourseVideos[]>([]);
    const [currentVideo, setCurrentVideo] = useState<CourseVideos | null>(null);
    const [currentVideoIndex, setCurrentVideoIndex] = useState<number>(-1);
    const [error, setError] = useState<string | null>(null);
    const [hasError, setHasError] = useState(false);
    const [isVideoDone, setIsVideoDone] = useState(false);
    const pathname = usePathname();
    const { playClick } = useSound();

    const videoSource = currentVideo ? `https://stream.mux.com/${currentVideo.mux_playback_id}.m3u8` : '';

    const player = useVideoPlayer(videoSource, player => {
        player.loop = false; // Changed from true to false to enable playlist behavior
        player.play();


        // Handle video ended event to play next video
        const endedListener = () => {
            setIsVideoDone(true);
        };

        player.addListener('playToEnd', endedListener);


        return () => {
            if (pathname === `/(app)/learn/${pdId}/courses/${courseId}/videos/${videoId}`) {
                player.pause();
            }
            player.removeListener('playToEnd', endedListener);
        };
    });

    useEffect(() => {
        // Auto-play next video when current one finishes
        if (isVideoDone && currentVideoIndex < videos.length - 1) {
            playNextVideo();
        }
    }, [isVideoDone]);

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const { data, error } = await supabase
                    .from('course_videos')
                    .select('*')
                    .eq('course_id', courseId)
                    .order('order_index', { ascending: true });

                if (error) throw error;
                setVideos(data);

                const currentIndex = data.findIndex(v => v.id === videoId);
                if (currentIndex !== -1) {
                    setCurrentVideo(data[currentIndex]);
                    setCurrentVideoIndex(currentIndex);
                }
            } catch (err) {
                setError('Error loading videos');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchVideos();

        return () => {
            if (player && player.pause && pathname === `/(app)/learn/${pdId}/courses/${courseId}/videos/${videoId}`) {
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
            router.push(`/(app)/learn/${pdId}/courses/${courseId}/videos/${nextVideo.id}`);
        }
    }, [currentVideoIndex, videos, player, pdId, courseId]);

    const handleVideoSelect = async (video: CourseVideos) => {
        playClick();
        if (player) {
            player.pause();
        }
        setIsVideoDone(false);
        router.push(`/(app)/learn/${pdId}/courses/${courseId}/videos/${video.id}`);
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
                        router.push(`/(app)/learn/${pdId}/courses/${courseId}`);
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
                <View style={styles.videoContainer}>
                    <VideoView
                        style={styles.video}
                        player={player}
                        allowsFullscreen
                        allowsPictureInPicture
                    />
                </View>

                {hasError && (
                    <ThemedText style={styles.errorText}>
                        An error occurred while loading the video
                    </ThemedText>
                )}


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
        backgroundColor: '#000000',
    },
    videoContainer: {
        width: '100%',
        aspectRatio: 16/9,
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
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        opacity: 0.6,
    },
});

export default VideoPlayerScreen;