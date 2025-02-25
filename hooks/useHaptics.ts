// src/hooks/useHaptics.ts
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

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

export const useHaptics = (options: HapticOptions = { disableOnAndroid: false }) => {
    const isAndroid = Platform.OS === 'android';

    const triggerSingle = async (type: HapticType) => {
        if (isAndroid && options.disableOnAndroid) {
            return;
        }

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

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const triggerPattern = async (pattern: readonly HapticStep[]) => {
        if (isAndroid && options.disableOnAndroid) {
            return;
        }

        try {
            for (const step of pattern) {
                if (step.delay) {
                    await sleep(step.delay);
                }
                await triggerSingle(step.type);
            }
        } catch (error) {
            console.warn('Haptic pattern failed:', error);
        }
    };

    // Create your own custom pattern
    const createPattern = (steps: readonly HapticStep[]): HapticPatternDefinition => {
        return steps;
    };

    return {
        trigger: triggerSingle,
        triggerPattern,
        createPattern,
        patterns: HapticPatterns
    };
};
//
// // Enhanced HapticTouchable with pattern support
// import { TouchableOpacity, TouchableOpacityProps } from 'react-native';
//
// interface HapticTouchableProps extends TouchableOpacityProps {
//     hapticType?: HapticType;
//     hapticPattern?: readonly HapticStep[];
// }
//
// export const HapticTouchable: React.FC<HapticTouchableProps> = ({
//                                                                     hapticType,
//                                                                     hapticPattern,
//                                                                     onPress,
//                                                                     ...props
//                                                                 }) => {
//     const { trigger, triggerPattern } = useHaptics();
//
//     const handlePress = async (event: any) => {
//         if (hapticPattern) {
//             await triggerPattern(hapticPattern);
//         } else if (hapticType) {
//             await trigger(hapticType);
//         }
//
//         if (onPress) {
//             onPress(event);
//         }
//     };
//
//     return <TouchableOpacity {...props} onPress={handlePress} />;
// };