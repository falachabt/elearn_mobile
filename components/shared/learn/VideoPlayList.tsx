import React from 'react';
import { View, StyleSheet, FlatList, Pressable, useColorScheme } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import type { CourseVideos } from '@/types/type';
import { theme } from '@/constants/theme';

interface VideoPlaylistProps {
    videos: CourseVideos[];
    currentVideo: CourseVideos | null;
    onVideoSelect: (video: CourseVideos) => void;
}

export const VideoPlaylist: React.FC<VideoPlaylistProps> = ({ 
    videos, 
    currentVideo, 
    onVideoSelect 
}) => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const renderItem = ({ item, index }: { item: CourseVideos; index: number }) => {
        const isActive = item.id === currentVideo?.id;

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.playlistItem,
                    isActive && styles.playlistItemActive,
                    pressed && styles.playlistItemPressed,
                    isDarkMode ? styles.playlistItemDark : styles.playlistItemLight,
                ]}
                onPress={() => onVideoSelect(item)}
            >
                {/* Left side - Video number and status */}
                <View style={styles.itemLeftContainer}>
                    <View style={[
                        styles.numberContainer,
                        isActive && styles.numberContainerActive,
                        isDarkMode ? styles.numberContainerDark : styles.numberContainerLight,
                    ]}>
                        {isActive ? (
                            <MaterialCommunityIcons 
                                name="play" 
                                size={16} 
                                color="#FFFFFF" 
                            />
                        ) : (
                            <ThemedText style={styles.numberText}>
                                {(index + 1).toString().padStart(2, '0')}
                            </ThemedText>
                        )}
                    </View>
                </View>

                {/* Middle - Video title and duration */}
                <View style={styles.itemMiddleContainer}>
                    <ThemedText 
                        style={[
                            styles.videoTitle,
                            isActive && styles.videoTitleActive,
                            isDarkMode ? styles.videoTitleDark : styles.videoTitleLight,
                        ]}
                        numberOfLines={2}
                    >
                        {item.title || `Video ${item.order_index}`}
                    </ThemedText>
                    
                    {/* You can add duration here if available in your CourseVideos type */}
                    <ThemedText style={styles.videoDuration}>
                        {item.duration || '00:00'}
                    </ThemedText>
                </View>

                {/* Right side - Status indicators */}
                <View style={styles.itemRightContainer}>
                    {isActive ? (
                        <View style={styles.playingIndicator}>
                            <ThemedText style={styles.playingText}>NOW PLAYING</ThemedText>
                        </View>
                    ) : (
                        <MaterialCommunityIcons 
                            name="chevron-right" 
                            size={24} 
                            color="#64748B" 
                        />
                    )}
                </View>
            </Pressable>
        );
    };

    return (
        <FlatList
            data={videos}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            style={[styles.playlist, isDarkMode ? styles.playlistDark : styles.playlistLight]}
            contentContainerStyle={styles.playlistContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
    );
};

const styles = StyleSheet.create({
    playlist: {
        flex: 1,
        marginBottom: 70,
    },
    playlistLight: {
        backgroundColor: theme.color.light.background.primary,
    },
    playlistDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    playlistContent: {
        paddingVertical: 8,
    },
    playlistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginHorizontal: 8,
        marginVertical: 4,
        borderRadius: 12,
        elevation: 2,
    },
    playlistItemLight: {
        backgroundColor: theme.color.light.background.secondary,
    },
    playlistItemDark: {
        backgroundColor: theme.color.dark.background.secondary,
    },
    playlistItemActive: {
        borderWidth: 1,
        borderColor: theme.color.primary[500],
    },
    playlistItemPressed: {
        opacity: 0.7,
        transform: [{ scale: 0.98 }],
    },
    itemLeftContainer: {
        marginRight: 12,
    },
    numberContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    numberContainerLight: {
        backgroundColor: theme.color.gray[900],
    },
    numberContainerDark: {
        backgroundColor: theme.color.dark.background.tertiary,
    },
    numberContainerActive: {
        backgroundColor: theme.color.primary[500],
    },
    numberText: {
        color: '#94A3B8',
        fontSize: 14,
        fontWeight: '600',
    },
    itemMiddleContainer: {
        flex: 1,
        marginRight: 12,
    },
    videoTitle: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    videoTitleLight: {
        color: theme.color.light.text.primary,
    },
    videoTitleDark: {
        color: theme.color.dark.text.primary,
    },
    videoTitleActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    videoDuration: {
        fontSize: 14,
        color: '#64748B',
    },
    itemRightContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 80,
    },
    playingIndicator: {
        backgroundColor: '#134E4A',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    playingText: {
        color: '#2DD4BF',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    separator: {
        height: 1,
        backgroundColor: 'transparent',
    },
});