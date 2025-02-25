import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, BackHandler, useColorScheme } from 'react-native';
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import type { CourseVideos } from '@/types/type';
import { useVideoPlayer, VideoView } from 'expo-video';
import { VideoPlaylist } from '@/components/shared/learn/VideoPlayList';
import { theme } from '@/constants/theme';

const VideoPlayerScreen = () => {
    const { videoId, courseId } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const [isLoading, setIsLoading] = useState(true);
    const [videos, setVideos] = useState<CourseVideos[]>([]);
    const [currentVideo, setCurrentVideo] = useState<CourseVideos | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasError, setHasError] = useState(false);
    const pathname = usePathname()

    const videoSource = currentVideo ? `https://stream.mux.com/${currentVideo.mux_playback_id}.m3u8` : '';
    
    const player = useVideoPlayer(videoSource, player => {
        player.loop = true;
        player.play();
        return () => {
            if ( pathname === `/(app)/learn/${courseId}/courses/${courseId}/videos/${videoId}`) {
                player.pause();
            }
        };
    });

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
                
                const current = data.find(v => v.id === videoId);
                if (current) {
                    setCurrentVideo(current);
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
            if (player && player.pause && pathname === `/(app)/learn/${courseId}/courses/${courseId}/videos/${videoId}`) {
                player.pause();
            }
        };
    }, [courseId, videoId]);

    const handleVideoSelect = async (video: CourseVideos) => {
        if (player) {
            player.pause();
        }
        router.push(`/(app)/learn/${courseId}/courses/${courseId}/videos/${video.id}`);
    };

    // useEffect(() => {
    //     const backAction = () => {
    //         if (player) {
    //             player.pause();
    //         }
    //         router.push(`/(app)/learn/${courseId}/courses/${courseId}`);
    //         return true;
    //     };

    //     const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    //     return () => {
    //         backHandler.remove();
    //         if (player && pathname === `/(app)/learn/${courseId}/courses/${courseId}/videos/${videoId}`) {
    //             player.pause();
    //         }
    //     };
    // }, []);

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
                        if (player) {
                            player.pause();
                        }
                        router.push(`/(app)/learn/${courseId}/courses/${courseId}`);
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
});

export default VideoPlayerScreen;
