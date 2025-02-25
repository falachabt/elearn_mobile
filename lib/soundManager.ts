// SoundManager.ts
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import type { SoundKey, SoundConfig, SoundItem } from '@/types/soundType';
import { SOUND_ASSETS } from "@/constants/songs";

class SoundManager {
    private static instance: SoundManager;
    private sounds: Map<SoundKey, SoundItem>;
    private isAudioEnabled: boolean;

    private constructor() {
        this.sounds = new Map();
        this.isAudioEnabled = false;
        this.initializeSounds();
    }

    public static getInstance(): SoundManager {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    private initializeSounds(): void {
        Object.keys(SOUND_ASSETS).forEach((key) => {
            this.sounds.set(key as SoundKey, {
                sound: null,
                isLoading: false,
                lastLoadAttempt: 0,
                config: {
                    volume: 1,
                    rate: 1,
                    shouldCorrectPitch: true,
                },
            });
        });
    }

    public async initialize(): Promise<void> {
        try {
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
            });
            this.isAudioEnabled = true;
        } catch (error) {
            console.warn('Failed to initialize audio:', error);
            this.isAudioEnabled = false;
        }
    }

    private async loadSound(key: SoundKey): Promise<boolean> {
        const soundItem = this.sounds.get(key);
        if (!soundItem) return false;

        try {
            const { sound } = await Audio.Sound.createAsync(
                SOUND_ASSETS[key],
                {
                    ...soundItem.config,
                    isLooping: false,
                    shouldPlay: false,
                },
                null
            );

            await sound.setVolumeAsync(soundItem.config.volume);

            this.sounds.set(key, {
                ...soundItem,
                sound,
                isLoading: false,
            });

            return true;
        } catch (error) {
            console.warn(`Failed to load sound ${key}:`, error);
            return false;
        }
    }

    public async preloadSounds(): Promise<void> {
        if (!this.isAudioEnabled) return;

        const loadPromises = Array.from(this.sounds.keys()).map(async (key) => {
            if (!this.sounds.get(key)?.sound) {
                await this.loadSound(key);
            }
        });

        await Promise.all(loadPromises);
    }

    public async playSound(key: SoundKey, config?: SoundConfig): Promise<void> {
        if (!this.isAudioEnabled) return;

        const soundItem = this.sounds.get(key);
        if (!soundItem) return;

        try {
            if (!soundItem.sound) {
                console.log(`Sound ${key} not loaded, loading...`);
                const loaded = await this.loadSound(key);
                if (!loaded) return;
            }

            console.log(`Playing sound ${key}...`);

            const sound = this.sounds.get(key)?.sound;
            if (sound) {
                if (config) {
                    if (config.volume !== undefined) {
                        await sound.setVolumeAsync(config.volume);
                    }
                    if (config.rate !== undefined) {
                        await sound.setRateAsync(
                            config.rate,
                            config.shouldCorrectPitch ?? true
                        );
                    }
                }

                await sound.setPositionAsync(0);
                await sound.setIsLoopingAsync(false);
                await sound.playAsync();
            }
        } catch (error) {
            console.warn(`Error playing sound ${key}:`, error);
        }
    }

    public async stopSound(key: SoundKey): Promise<void> {
        const soundItem = this.sounds.get(key);
        if (!soundItem?.sound) return;

        try {
            await soundItem.sound.stopAsync();
            await soundItem.sound.setPositionAsync(0);
        } catch (error) {
            console.warn(`Error stopping sound ${key}:`, error);
        }
    }

    public async unloadAll(): Promise<void> {
        for (const [key, soundItem] of this.sounds.entries()) {
            if (soundItem.sound) {
                try {
                    await soundItem.sound.unloadAsync();
                    this.sounds.set(key, {
                        ...soundItem,
                        sound: null,
                        isLoading: false,
                    });
                } catch (error) {
                    console.warn(`Error unloading sound ${key}:`, error);
                }
            }
        }
    }
}

export const soundManager = SoundManager.getInstance();
export default soundManager;