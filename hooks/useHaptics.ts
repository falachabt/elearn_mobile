// src/hooks/useHaptics.ts
import { Platform, AppState, AppStateStatus } from 'react-native';
import { useEffect, useState } from 'react';
import { STORAGE_KEY_SETTINGS } from "@/constants/storage-keys";

// Platform-specific imports
let Haptics: any = null;
let AsyncStorage: any = null;

// Only attempt to load native modules on non-web platforms
if (Platform.OS !== 'web') {
    try {
        // Dynamic imports to avoid bundling issues on web
        Haptics = require('expo-haptics');
        AsyncStorage = require('@react-native-async-storage/async-storage').default;
    } catch (e) {
        console.warn('Failed to load native haptics modules:', e);
    }
}

export enum HapticType {
    LIGHT = 'light',
    MEDIUM = 'medium',
    HEAVY = 'heavy',
    SUCCESS = 'success',
    WARNING = 'warning',
    ERROR = 'error',
    SELECTION = 'selection'
}

interface HapticOptions {
    disableOnAndroid?: boolean;
}

// Define the base type for a haptic step
export type HapticStep = {
    readonly type: HapticType;
    readonly delay?: number;
}

// Define patterns type with readonly arrays
type HapticPatternDefinition = readonly HapticStep[];

export const HapticPatterns = {
    DOUBLE_TAP: [
        { type: HapticType.LIGHT },
        { type: HapticType.LIGHT, delay: 100 }
    ],
    TRIPLE_TAP: [
        { type: HapticType.LIGHT },
        { type: HapticType.LIGHT, delay: 100 },
        { type: HapticType.LIGHT, delay: 100 }
    ],
    SUCCESS_CUSTOM: [
        { type: HapticType.LIGHT },
        { type: HapticType.MEDIUM, delay: 150 },
        { type: HapticType.SUCCESS, delay: 100 }
    ],
    ERROR_CUSTOM: [
        { type: HapticType.HEAVY },
        { type: HapticType.ERROR, delay: 100 }
    ],
    COUNTDOWN: [
        { type: HapticType.LIGHT },
        { type: HapticType.LIGHT, delay: 1000 },
        { type: HapticType.MEDIUM, delay: 1000 },
        { type: HapticType.HEAVY, delay: 1000 }
    ],
    CELEBRATION: [
        { type: HapticType.LIGHT },
        { type: HapticType.MEDIUM, delay: 50 },
        { type: HapticType.HEAVY, delay: 50 },
        { type: HapticType.SUCCESS, delay: 200 }
    ]
} as const;

// Cross-platform storage helper
const Storage = {
    getItem: async (key: string): Promise<string | null> => {
        if (Platform.OS === 'web') {
            try {
                return localStorage.getItem(key);
            } catch (e) {
                console.warn('localStorage not available', e);
                return null;
            }
        } else if (AsyncStorage) {
            return AsyncStorage.getItem(key);
        }
        return null;
    },

    setItem: async (key: string, value: string): Promise<void> => {
        if (Platform.OS === 'web') {
            try {
                localStorage.setItem(key, value);
            } catch (e) {
                console.warn('localStorage not available', e);
            }
        } else if (AsyncStorage) {
            await AsyncStorage.setItem(key, value);
        }
    }
};

export const useHaptics = (options: HapticOptions = { disableOnAndroid: false }) => {
    const isAndroid = Platform.OS === 'android';
    const isWeb = Platform.OS === 'web';
    const [hapticEnabled, setHapticEnabled] = useState(true);

    // Load haptic settings from storage
    const loadHapticSettings = async () => {
        try {
            const storedSettings = await Storage.getItem(STORAGE_KEY_SETTINGS);
            if (storedSettings) {
                const settings = JSON.parse(storedSettings);
                setHapticEnabled(settings.hapticEnabled !== false);
            }
        } catch (error) {
            console.error('Error loading haptic settings:', error);
            setHapticEnabled(true);
        }
    };

    // Handle app state changes to check for settings updates
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
            loadHapticSettings();
        }
    };

    useEffect(() => {
        // Load haptic settings on first mount
        loadHapticSettings();

        // Only set up AppState listener on mobile platforms
        if (!isWeb) {
            const subscription = AppState.addEventListener('change', handleAppStateChange);
            return () => {
                subscription.remove();
            };
        }

        return () => {};
    }, []);

    // Web vibration API implementation
    const webVibrate = (pattern: number | number[]): boolean => {
        if (isWeb && typeof window !== 'undefined' &&
            typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
                return navigator.vibrate(pattern);
            } catch (error) {
                console.warn('Web vibration failed:', error);
            }
        }
        return false;
    };

    // Convert HapticType to vibration duration for web
    const getVibrationDuration = (type: HapticType): number => {
        switch (type) {
            case HapticType.LIGHT: return 10;
            case HapticType.MEDIUM: return 20;
            case HapticType.HEAVY: return 30;
            case HapticType.SUCCESS: return 25;
            case HapticType.WARNING: return 20;
            case HapticType.ERROR: return 30;
            case HapticType.SELECTION: return 5;
            default: return 15;
        }
    };

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const triggerSingle = async (type: HapticType) => {
        // Don't trigger haptics if disabled in settings
        if (!hapticEnabled || (isAndroid && options.disableOnAndroid)) {
            return;
        }

        // Web implementation
        if (isWeb) {
            webVibrate(getVibrationDuration(type));
            return;
        }

        // Mobile implementation
        if (!Haptics) return; // Skip if haptics module is not available

        try {
            switch (type) {
                case HapticType.LIGHT:
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    break;
                case HapticType.MEDIUM:
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    break;
                case HapticType.HEAVY:
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    break;
                case HapticType.SUCCESS:
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    break;
                case HapticType.WARNING:
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    break;
                case HapticType.ERROR:
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    break;
                case HapticType.SELECTION:
                    await Haptics.selectionAsync();
                    break;
            }
        } catch (error) {
            console.warn('Haptics failed:', error);
        }
    };

    const triggerPattern = async (pattern: readonly HapticStep[]) => {
        // Don't trigger haptics if disabled in settings
        if (!hapticEnabled || (isAndroid && options.disableOnAndroid)) {
            return;
        }

        try {
            for (const step of pattern) {
                // Wait for the delay if specified
                if (step.delay) {
                    await sleep(step.delay);
                }

                // Then trigger the haptic
                if (isWeb) {
                    webVibrate(getVibrationDuration(step.type));
                } else {
                    await triggerSingle(step.type);
                }
            }
        } catch (error) {
            console.warn('Haptic pattern failed:', error);
        }
    };

    // Create a custom pattern
    const createPattern = (steps: readonly HapticStep[]): HapticPatternDefinition => {
        return steps;
    };

    return {
        trigger: triggerSingle,
        triggerPattern,
        createPattern,
        patterns: HapticPatterns,
        loadHapticSettings,
        hapticEnabled,
        isWebPlatform: isWeb // Expose platform information if needed
    };
};