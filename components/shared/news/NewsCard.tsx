import React from 'react';
import {Image, Pressable, StyleSheet, Text, TouchableOpacity, useColorScheme, View} from 'react-native';
import {ResizeMode, Video} from 'expo-av';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import Animated, {
    Extrapolate,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';

import {theme} from '@/constants/theme';
import {HapticType, useHaptics} from "@/hooks/useHaptics";
import { trackEvent, Events } from '@/utils/analytics';


// Define types for the news card
export type NewsCardType = 'image' | 'video' | 'custom';

export interface NewsCardProps {
    id: string;
    type: NewsCardType;
    title: string;
    description: string;
    imageUrl?: string;
    videoUrl?: string;
    customComponent?: React.ReactNode;
    actionLabel?: string;
    actionUrl?: string;
    onPress?: () => void;
    startDate?: Date;
    endDate?: Date;
}

const NewsCard = ({ 
    id, 
    type, 
    title, 
    description, 
    imageUrl, 
    videoUrl, 
    customComponent, 
    actionLabel, 
    onPress 
}: NewsCardProps) => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const { trigger } = useHaptics();

    // Animation values
    const pressed = useSharedValue(0);

    const animatedCardStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {scale: interpolate(pressed.value, [0, 1], [1, 0.98], Extrapolate.CLAMP)},
            ],
        };
    });

    const handlePressIn = () => {
        pressed.value = withSpring(1);
    };

    const handlePressOut = () => {
        pressed.value = withSpring(0);
    };

    const handleCardPress = () => {
        trigger(HapticType.LIGHT);

        // Track news card CTA click event
        trackEvent(Events.CLICK_NEWS_CTA, {
            news_id: id,
            news_title: title,
            news_type: type,
            action_label: actionLabel || 'Click'
        });

        if (onPress) {
            onPress();
        }
    };

    const renderMedia = () => {
        switch (type) {
            case 'image':
                return imageUrl ? (
                    <Image 
                        source={{ uri: imageUrl }} 
                        style={styles.media} 
                        resizeMode="cover"
                    />
                ) : null;
            case 'video':
                return videoUrl ? (
                    <Video
                        source={{ uri: videoUrl }}
                        style={styles.media}
                        useNativeControls
                        resizeMode={ResizeMode.COVER}
                        isLooping
                        shouldPlay={false}
                    />
                ) : null;
            case 'custom':
                return customComponent ? (
                    <View style={styles.customContainer}>
                        {customComponent}
                    </View>
                ) : null;
            default:
                return null;
        }
    };

    return (
        <Animated.View style={[
            styles.cardContainer,
            animatedCardStyle,
            isDarkMode && styles.cardContainerDark
        ]}>
            <Pressable
                style={[
                    styles.card,
                    isDarkMode && styles.cardDark,
                ]}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handleCardPress}
                android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            >
                {/* Media content (image, video, or custom component) */}
                <View style={styles.mediaContainer}>
                    {renderMedia()}
                </View>

                {/* Content section */}
                <View style={styles.contentContainer}>
                    <Text 
                        style={[styles.title, isDarkMode && styles.titleDark]} 
                        numberOfLines={2}
                    >
                        {title}
                    </Text>
                    <Text 
                        style={[styles.description, isDarkMode && styles.descriptionDark]} 
                        numberOfLines={3}
                    >
                        {description}
                    </Text>

                    {/* Action button (if provided) */}
                    {actionLabel && (
                        <TouchableOpacity 
                            style={styles.actionButton}
                            onPress={handleCardPress}
                        >
                            <LinearGradient
                                colors={[theme.color.primary[500], theme.color.primary[700]]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.actionButtonGradient}
                            >
                                <Text style={styles.actionButtonText}>{actionLabel}</Text>
                                <MaterialCommunityIcons 
                                    name="arrow-right" 
                                    size={16} 
                                    color="#FFFFFF" 
                                />
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </View>
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        marginBottom: 16,
        borderRadius: theme.border.radius.small,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 1.5,
        backgroundColor: '#FFFFFF',
    },
    cardContainerDark: {
        backgroundColor: theme.color.dark.background.secondary,
    },
    card: {
        borderRadius: theme.border.radius.small,
        overflow: 'hidden',
    },
    cardDark: {
        backgroundColor: theme.color.dark.background.secondary,
    },
    mediaContainer: {
        width: '100%',
        height: 160,
        backgroundColor: '#F3F4F6',
    },
    media: {
        width: '100%',
        height: '100%',
    },
    customContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        padding: 16,
        // Removed fixed height to ensure all content is visible
    },
    title: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
        // Removed fixed height, using numberOfLines in the component instead
    },
    titleDark: {
        color: '#FFFFFF',
    },
    description: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 16,
        // Removed fixed height, using numberOfLines in the component instead
    },
    descriptionDark: {
        color: '#D1D5DB',
    },
    actionButton: {
        alignSelf: 'flex-start',
    },
    actionButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: theme.border.radius.small,
    },
    actionButtonText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
        marginRight: 8,
    },
});

export default React.memo(NewsCard);
