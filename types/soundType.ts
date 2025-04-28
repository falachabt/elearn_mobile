import {Audio} from "expo-av";

export type SoundKey = 'correct' | 'wrong' | 'click' | 'notification' | 'nextLesson';

export interface SoundConfig {
    volume?: number;
    rate?: number;
    shouldCorrectPitch?: boolean;
}

export interface SoundItem {
    sound: Audio.Sound | null;
    isLoading: boolean;
    lastLoadAttempt: number;
    config: Required<SoundConfig>;
}