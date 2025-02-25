// hooks/useSound.ts
import { useState, useEffect } from 'react';
import { SoundKey } from "@/types/soundType";
import soundManager from "@/lib/soundManager";

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
    const configs = { ...DEFAULT_SOUND_CONFIGS, ...customConfigs };

    useEffect(() => {
        let isMounted = true;

        const initializeAudio = async () => {
            try {
                await soundManager.initialize();
                await soundManager.preloadSounds();
                if (isMounted) {
                    setIsReady(true);
                }
            } catch (error) {
                console.error('Failed to initialize audio:', error);
            }
        };

        initializeAudio();

        return () => {
            isMounted = false;
            soundManager.unloadAll();
        };
    }, []);

    const playSound = async (soundKey: SoundKey) => {
        if (!isReady) return;

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
        playSound,
        ...sounds,
    };
};
