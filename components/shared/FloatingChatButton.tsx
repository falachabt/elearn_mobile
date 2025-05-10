import React, { useEffect, useState } from 'react';
import {
    TouchableOpacity,
    StyleSheet,
    View,
    useColorScheme,
    Animated,
    Easing,
    Text, Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { HapticType, useHaptics } from '@/hooks/useHaptics';
import { usePathname } from 'expo-router';
import { useSWRConfig } from 'swr';
import { theme } from '@/constants/theme';
import {getContextElementFromCache, useChatBox} from "@/contexts/chatBotContext";

interface ChatFabProps {
    position?: 'bottom-right' | 'bottom-left';
    size?: 'small' | 'medium' | 'large';
    showContextBadge?: boolean;
}

const ChatFab: React.FC<ChatFabProps> = ({
                                             position = 'bottom-right',
                                             size = 'medium',
                                             showContextBadge = true
                                         }) => {
    const isDark = useColorScheme() === 'dark';
    const { trigger } = useHaptics();
    const { openChat } = useChatBox();
    const pathname = usePathname();
    const { cache } = useSWRConfig();
    const [contextAvailable, setContextAvailable] = useState(false);

    // Animation values
    const scaleAnim = React.useRef(new Animated.Value(1)).current;
    const rotateAnim = React.useRef(new Animated.Value(0)).current;
    const badgePulseAnim = React.useRef(new Animated.Value(1)).current;

    // Check if there's valid context in the current route
    useEffect(() => {
        const contextElement = getContextElementFromCache(pathname, cache);
        setContextAvailable(!!contextElement);

        if (contextElement && showContextBadge) {
            // Start badge pulse animation when context is available
            Animated.loop(
                Animated.sequence([
                    Animated.timing(badgePulseAnim, {
                        toValue: 1.2,
                        duration: 1000,
                        easing: Easing.ease,
                        useNativeDriver: true
                    }),
                    Animated.timing(badgePulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        easing: Easing.ease,
                        useNativeDriver: true
                    })
                ])
            ).start();
        }
    }, [pathname, cache, showContextBadge]);

    // Handle animation on press
    const handlePressIn = () => {
        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: 0.9,
                duration: 100,
                useNativeDriver: true,
                easing: Easing.ease
            }),
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
                easing: Easing.ease
            })
        ]).start();
    };

    const handlePressOut = () => {
        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
                easing: Easing.elastic(1.2)
            }),
            Animated.timing(rotateAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
                easing: Easing.ease
            })
        ]).start();
    };

    // Handle chat open with context directly from SWR cache
    const handleOpenChat = () => {
        trigger(HapticType.LIGHT);

        // Get context element from SWR cache based on current route
        const contextElement = getContextElementFromCache(pathname, cache);

        // Open chat with context element if available
        openChat(contextElement ? [contextElement] : undefined);
    };

    // Calculate rotation
    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '15deg']
    });

    // Determine size values
    const sizeValues = {
        small: {
            buttonSize: 50,
            iconSize: 24
        },
        medium: {
            buttonSize: 60,
            iconSize: 28
        },
        large: {
            buttonSize: 70,
            iconSize: 32
        }
    };

    const { buttonSize, iconSize } = sizeValues[size];

    // Position styles
    const positionStyle = {
        'bottom-right': {
            bottom: 120,
            right: 20
        },
        'bottom-left': {
            bottom: 120,
            left: 20
        }
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    ...positionStyle[position],
                    transform: [
                        { scale: scaleAnim },
                        { rotate }
                    ]
                }
            ]}
        >
            <TouchableOpacity
                style={[
                    styles.button,
                    isDark && styles.buttonDark,
                    { width: buttonSize, height: buttonSize }
                ]}
                onPress={handleOpenChat}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.8}
            >
                <MaterialCommunityIcons
                    name="chat-outline"
                    size={iconSize}
                    color="#FFFFFF"
                />

                {/* Context available indicator */}
                {contextAvailable && showContextBadge && (
                    <Animated.View
                        style={[
                            styles.contextBadge,
                            {
                                transform: [{ scale: badgePulseAnim }]
                            }
                        ]}
                    >
                        <MaterialCommunityIcons
                            name="information-outline"
                            size={12}
                            color="#FFFFFF"
                        />
                    </Animated.View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        zIndex: 999,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 3,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    button: {
        backgroundColor: theme.color.primary[500],
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonDark: {
        backgroundColor: theme.color.primary[600],
    },
    contextBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#10B981',
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    contextBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    }
});

export default ChatFab;