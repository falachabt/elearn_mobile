// notificationService.js
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SchedulableTriggerInputTypes} from 'expo-notifications';
import reminderMessages from '@/constants/reminderMessages';

// Storage keys
const STORAGE_KEY_SETTINGS = '@app_settings';
const STORAGE_KEY_LAST_UPDATE = '@last_notification_update';
const RECAP_STORAGE_KEY = '@app_recap_status';
const UPDATE_INTERVAL_DAYS = 6; // Update messages if it's been 6+ days

/**
 * Check and update scheduled notifications if needed
 * This can be called from App.js, a background task, or on app launch
 * @returns {Promise<boolean>} - True if notifications were updated, false otherwise
 */
export const checkAndUpdateNotifications = async () => {
    try {
        // Check if we need to update notifications based on time passed
        const shouldUpdate = await shouldUpdateNotifications();
        if (!shouldUpdate) {
            return false;
        }

        console.log('Updating notifications...');

        // Load user settings
        const settingsJson = await AsyncStorage.getItem(STORAGE_KEY_SETTINGS);
        if (!settingsJson) {
            return false;
        }

        const settings = JSON.parse(settingsJson);

        // Only proceed if notifications and daily reminders are enabled
        if (!settings.notificationsEnabled || !settings.dailyRemindersEnabled) {
            return false;
        }

        // Get the reminder configuration
        const reminderTime = new Date(settings.reminderTime);
        const reminderDays = settings.reminderDays;

        // Update the notifications with new random messages
        await updateReminderNotifications(reminderTime, reminderDays);

        // Save the current time as the last update time
        await AsyncStorage.setItem(STORAGE_KEY_LAST_UPDATE, new Date().toISOString());

        return true;
    } catch (error) {
        console.error('Error in checkAndUpdateNotifications:', error);
        return false;
    }
};

/**
 * Check if we should update notifications based on time since last update
 * @returns {Promise<boolean>} - True if we should update notifications
 */
const shouldUpdateNotifications = async () => {
    try {
        const lastUpdateStr = await AsyncStorage.getItem(STORAGE_KEY_LAST_UPDATE);

        // If we've never updated before, we should definitely update
        if (!lastUpdateStr) {
            return true;
        }

        const lastUpdate = new Date(lastUpdateStr);
        const now = new Date();

        // Calculate difference in days
        // @ts-ignore
        const diffTime = Math.abs(now - lastUpdate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Return true if it's been more than UPDATE_INTERVAL_DAYS since last update
        return diffDays >= UPDATE_INTERVAL_DAYS;
    } catch (error) {
        console.error('Error checking if notifications should update:', error);
        // On error, default to updating (safer option)
        return true;
    }
};

/**
 * Update reminder notifications with new random messages
 * @param {Date} reminderTime - Time for the reminders
 * @param {Object} reminderDays - Object with days of week enabled
 * @returns {Promise<void>}
 */
const updateReminderNotifications = async (reminderTime: Date, reminderDays: { [s: string]: unknown; } | ArrayLike<unknown>) => {
    // Cancel existing notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Get reminder days as array of weekday numbers (0-6, where 0 is Sunday)
    // const reminderDayIndices = Object.entries(reminderDays)
    //     .map(([day, isEnabled]) => {
    //         // Convert our day names to weekday indices (Sunday is 0 in Date object)
    //         const dayMap = {
    //             sunday: 0,
    //             monday: 1,
    //             tuesday: 2,
    //             wednesday: 3,
    //             thursday: 4,
    //             friday: 5,
    //             saturday: 6
    //         };
    //         return isEnabled ? dayMap[day] : -1;
    //     })
    //     .filter(idx => idx !== -1);
    const reminderDayIndices = Object.entries(reminderDays)
        .map(([day, isEnabled]) => {
            // Vérifier que day est une clé valide de dayMap
            const dayMap = {
                sunday: 0,
                monday: 1,
                tuesday: 2,
                wednesday: 3,
                thursday: 4,
                friday: 5,
                saturday: 6
            };

            if (day in dayMap) {
                return isEnabled ? dayMap[day as keyof typeof dayMap] : -1;
            }
            return -1;
        })
        .filter(idx => idx !== -1);

    // Get the hours and minutes from the reminderTime
    const hours = reminderTime.getHours();
    const minutes = reminderTime.getMinutes();

    // Track used message indices to avoid duplicates in the same update
    const usedIndices = new Set();

    // Schedule notifications for each enabled day
    for (const weekday of reminderDayIndices) {
        // Find a message we haven't used yet in this batch
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * reminderMessages.length);
        } while (usedIndices.has(randomIndex) && usedIndices.size < reminderMessages.length);

        // If we've used all messages (unlikely with 100+ messages), just use any
        usedIndices.add(randomIndex);
        const randomMessage = reminderMessages[randomIndex];

        await Notifications.scheduleNotificationAsync({
            content: {
                title: randomMessage.title,
                body: randomMessage.body,
                data: {screen: 'home'},
            },
            trigger: {
                type: SchedulableTriggerInputTypes.WEEKLY,
                weekday: weekday + 1, // Adjust for Expo's 1-7 weekday format
                hour: hours,
                minute: minutes,
            },
        });
    }

    console.log('Notifications updated with fresh messages');
};

/**
 * Force an immediate update of notifications regardless of time passed
 * Useful for manual refresh or when changing notification settings
 * @returns {Promise<boolean>} - True if update was successful
 */
export const forceUpdateNotifications = async () => {
    try {
        const settingsJson = await AsyncStorage.getItem(STORAGE_KEY_SETTINGS);
        if (!settingsJson) {
            return false;
        }

        const settings = JSON.parse(settingsJson);

        if (!settings.notificationsEnabled || !settings.dailyRemindersEnabled) {
            await Notifications.cancelAllScheduledNotificationsAsync();
            return true;
        }

        const reminderTime = new Date(settings.reminderTime);
        const reminderDays = settings.reminderDays;

        await updateReminderNotifications(reminderTime, reminderDays);
        await AsyncStorage.setItem(STORAGE_KEY_LAST_UPDATE, new Date().toISOString());

        return true;
    } catch (error) {
        console.error('Error forcing notification update:', error);
        return false;
    }
};


export const checkAndTriggerWeeklyRecap = async () => {
    try {
        const today = new Date();
        const isMonday = today.getDay() === 1; // 0 = Sunday, 1 = Monday

        const lastRecapStatusStr = await AsyncStorage.getItem(RECAP_STORAGE_KEY);
        let lastRecapStatus = lastRecapStatusStr ? JSON.parse(lastRecapStatusStr) : { lastGenerated: null };

        const startOfThisWeek = new Date(today);
        startOfThisWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Set to Monday
        startOfThisWeek.setHours(0, 0, 0, 0);

        if (isMonday && (!lastRecapStatus.lastGenerated || new Date(lastRecapStatus.lastGenerated) < startOfThisWeek)) {
            const endOfLastWeek = new Date(startOfThisWeek);
            endOfLastWeek.setDate(startOfThisWeek.getDate() - 1);
            endOfLastWeek.setHours(23, 59, 59, 999);

            const startOfLastWeek = new Date(endOfLastWeek);
            startOfLastWeek.setDate(endOfLastWeek.getDate() - 6);
            startOfLastWeek.setHours(0, 0, 0, 0);

            const newRecapStatus = {
                available: true,
                periodStart: startOfLastWeek.toISOString(),
                periodEnd: endOfLastWeek.toISOString(),
                lastGenerated: today.toISOString(),
            };
            await AsyncStorage.setItem(RECAP_STORAGE_KEY, JSON.stringify(newRecapStatus));
            console.log('Weekly recap triggered for period:', startOfLastWeek, 'to', endOfLastWeek);
        }
    } catch (error) {
        console.error('Error triggering weekly recap:', error);
    }
};