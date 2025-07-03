// Type definitions for settings-related components

// Reminder days type
export interface ReminderDays {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
}

// Settings storage type
export interface AppSettings {
    notificationsEnabled: boolean;
    dailyRemindersEnabled: boolean;
    emailRemindersEnabled: boolean;
    emailAddress: string;
    reminderTime: string; // ISO string
    reminderDays: ReminderDays;
    soundsEnabled: boolean;
    hapticEnabled: boolean;
    darkModeEnabled: boolean;
    dataUsageOptimized: boolean;
    downloadOverWifiOnly: boolean;
}