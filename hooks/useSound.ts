// hooks/useSound.ts
import { useState, useEffect } from 'react';
import { SoundKey } from "@/types/soundType";
import soundManager from "@/lib/soundManager";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEY_SETTINGS } from "@/constants/storage-keys";
import { AppState, AppStateStatus } from 'react-native';

interface SoundConfigs {
    correct: { volume: number; rate: number };
    wrong: { volume: number; rate: number };
    click: { volume: number; rate: number };
    notification: { volume: number; rate: number };
    nextLesson: { volume: number; rate: number };
    [key: string]: { volume: number; rate: number };
}

const DEFAULT_SOUND_CONFIGS: SoundConfigs = {
    correct: { volume: 0.7, rate: 1.0 },
    wrong: { volume: 1.0, rate: 0.9 },
    click: { volume: 1.0, rate: 1.1 },
    notification: { volume: 0.8, rate: 1.0 },
    nextLesson: { volume: 1.0, rate: 1.0 },

    // Add more sounds as needed
    streakIncrement: { volume: 1.0, rate: 1.0 },
    levelUp: { volume: 1.0, rate: 1.0 },
    achievement: { volume: 1.0, rate: 1.1 },
    quizComplete: { volume: 0.8, rate: 1.0 },
};

export const useSound = (customConfigs?: Partial<SoundConfigs>) => {
    const [isReady, setIsReady] = useState(false);
    const [soundsEnabled, setSoundsEnabled] = useState(true); // Default to true if setting not found
    const configs = { ...DEFAULT_SOUND_CONFIGS, ...customConfigs };

    // Load sound settings from AsyncStorage
    const loadSoundSettings = async () => {
        try {
            const storedSettings = await AsyncStorage.getItem(STORAGE_KEY_SETTINGS);
            if (storedSettings) {
                const settings = JSON.parse(storedSettings);
                // If soundsEnabled is explicitly set to false, use that value
                // Otherwise, default to true (assume sounds are enabled)
                setSoundsEnabled(settings.soundsEnabled !== false);
            }
        } catch (error) {
            console.error('Error loading sound settings:', error);
            // If there's an error, default to enabling sounds
            setSoundsEnabled(true);
        }
    };

    // Handle app state changes to check for settings updates
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
            // App has come to the foreground, reload settings
            loadSoundSettings();
        }
    };

    useEffect(() => {
        let isMounted = true;

        const initializeAudio = async () => {
            try {
                // Load user sound settings from AsyncStorage
                await loadSoundSettings();

                // Initialize the sound manager
                await soundManager.initialize();
                await soundManager.preloadSounds();

                if (isMounted) {
                    setIsReady(true);
                }
            } catch (error) {
                console.error('Failed to initialize audio:', error);
            }
        };

        // Set up AppState listener for detecting when app comes to foreground
        const subscription = AppState.addEventListener('change', handleAppStateChange);

        initializeAudio();

        return () => {
            isMounted = false;
            soundManager.unloadAll();

            // Clean up the AppState listener
            subscription.remove();
        };
    }, []);

    const playSound = async (soundKey: SoundKey) => {
        // Only play if sounds are enabled in settings and audio is ready
        if (!isReady || !soundsEnabled) return;

        try {
            await soundManager.playSound(soundKey, configs[soundKey]);
        } catch (error) {
            console.error(`Error playing ${soundKey}:`, error);
        }
    };

    // Predefined sound functions for common interactions
    const sounds = {
        playCorrect: () => playSound('correct'),
        playWrong: () => playSound('wrong'),
        playClick: () => playSound('click'),
        playNotification: () => playSound('notification'),
        playNextLesson: () => playSound('nextLesson'),
        // Additional interactive sounds
        // playStreakIncrement: () => playSound('streakIncrement'),
        // playLevelUp: () => playSound('levelUp'),
        // playAchievement: () => playSound('achievement'),
        // playQuizComplete: () => playSound('quizComplete'),
    };

    return {
        isReady,
        soundsEnabled,
        playSound,
        ...sounds,
    };
};