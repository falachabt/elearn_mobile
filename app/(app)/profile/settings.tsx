import React, {useState, useEffect, ComponentProps} from 'react';
import {
    View,
    Text,
    StyleSheet,
    Switch,
    ScrollView,
    Pressable,
    TextInput,
    Alert,
    Modal,
    Platform
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import {theme} from '@/constants/theme';
import {useAuth} from '@/contexts/auth';
import {HapticType, useHaptics} from "@/hooks/useHaptics";
import {ThemedView} from '@/components/ThemedView';
import {ThemedText} from '@/components/ThemedText';
import {registerForPushNotificationsAsync} from "@/components/TestNotifications";
import {useColorScheme} from '@/hooks/useColorScheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SchedulableTriggerInputTypes} from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import reminderMessages from "@/constants/reminderMessages";



// TODO: check the notification udpates and the last update


// Storage keys
const STORAGE_KEY_SETTINGS = '@app_settings';
const STORAGE_KEY_LAST_UPDATE = '@last_notification_update';

// Type qui extrait le type exact accepté par la propriété 'name' de MaterialCommunityIcons
export type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// Objets constants avec les noms d'icônes typés
export const IconNames: Record<string, MaterialIconName> = {
    BELL_OUTLINE: 'bell-outline',
    CALENDAR_CLOCK: 'calendar-clock',
    CLOCK_TIME_FOUR_OUTLINE: 'clock-time-four-outline',
    TEST_TUBE: 'test-tube',
    EMAIL_OUTLINE: 'email-outline',
    VOLUME_HIGH: 'volume-high',
    VIBRATE: 'vibrate',
    THEME_LIGHT_DARK: 'theme-light-dark',
    DATA_MATRIX: 'data-matrix',
    WIFI: 'wifi',
    TRASH_CAN_OUTLINE: 'trash-can-outline',
    ACCOUNT_OUTLINE: 'account-outline',
    LOGOUT: 'logout',
    INFORMATION_OUTLINE: 'information-outline',
    SHIELD_CHECK_OUTLINE: 'shield-check-outline',
    CONTENT_SAVE_OUTLINE: 'content-save-outline',
    CLOSE: 'close',
    CLOCK_OUTLINE: 'clock-outline',
    VIEW_GRID: 'view-grid',
    CHEVRON_RIGHT: 'chevron-right'
} as const;


const SettingsScreen = () => {
    const {user, signOut} = useAuth();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const {trigger, loadHapticSettings} = useHaptics();

    // States for settings
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [dailyRemindersEnabled, setDailyRemindersEnabled] = useState(false);
    const [emailRemindersEnabled, setEmailRemindersEnabled] = useState(false);
    const [emailAddress, setEmailAddress] = useState(user?.email || '');
    const [reminderTime, setReminderTime] = useState(new Date(new Date().setHours(20, 0, 0, 0))); // Default 8:00 PM
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [soundsEnabled, setSoundsEnabled] = useState(true);
    const [hapticEnabled, setHapticEnabled] = useState(true);
    const [darkModeEnabled, setDarkModeEnabled] = useState(isDark);
    const [dataUsageOptimized, setDataUsageOptimized] = useState(true);
    const [downloadOverWifiOnly, setDownloadOverWifiOnly] = useState(true);

    // States for time picker modal
    const [showReminderModal, setShowReminderModal] = useState(false);

    // States for reminder days
    const [reminderDays, setReminderDays] = useState({
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false
    });

    // Load settings on mount
    useEffect(() => {
        loadSettings();
        checkNotificationPermissions();
    }, []);

    // Check notification permissions
    const checkNotificationPermissions = async () => {
        const {status} = await Notifications.getPermissionsAsync();
        setNotificationsEnabled(status === 'granted');
    };

    // Load settings from AsyncStorage
    const loadSettings = async () => {
        try {
            const storedSettings = await AsyncStorage.getItem(STORAGE_KEY_SETTINGS);
            if (storedSettings) {
                const settings = JSON.parse(storedSettings);
                setDailyRemindersEnabled(settings.dailyRemindersEnabled ?? false);
                setEmailRemindersEnabled(settings.emailRemindersEnabled ?? false);
                setEmailAddress(settings.emailAddress || user?.email || '');
                setReminderTime(new Date(settings.reminderTime || new Date().setHours(20, 0, 0, 0)));
                setReminderDays(settings.reminderDays || {
                    monday: true,
                    tuesday: true,
                    wednesday: true,
                    thursday: true,
                    friday: true,
                    saturday: false,
                    sunday: false
                });
                setSoundsEnabled(settings.soundsEnabled ?? true);
                setHapticEnabled(settings.hapticEnabled ?? true);
                setDataUsageOptimized(settings.dataUsageOptimized ?? true);
                setDownloadOverWifiOnly(settings.downloadOverWifiOnly ?? true);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    // Save settings to AsyncStorage
    const saveSettings = async () => {
        try {
            const settings = {
                notificationsEnabled,
                dailyRemindersEnabled,
                emailRemindersEnabled,
                emailAddress,
                reminderTime: reminderTime.toISOString(),
                reminderDays,
                soundsEnabled,
                hapticEnabled,
                darkModeEnabled,
                dataUsageOptimized,
                downloadOverWifiOnly
            };

            await AsyncStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));

            // udpate the hooks
            setTimeout(loadHapticSettings, 1000)
            setTimeout(loadHapticSettings, 1000)
           // await  loadHapticSettings();



            // Schedule or cancel notifications based on settings
            if (notificationsEnabled && dailyRemindersEnabled) {
                await scheduleReminderNotifications();
            } else {
                await Notifications.cancelAllScheduledNotificationsAsync();
            }

            Alert.alert('Succès', 'Vos préférences ont été enregistrées');
        } catch (error) {
            console.error('Error saving settings:', error);
            Alert.alert('Erreur', 'Une erreur est survenue lors de l\'enregistrement de vos préférences');
        }
    };

    // Schedule notifications based on user preferences
    const scheduleReminderNotifications = async () => {
        // Cancel existing notifications first
        await Notifications.cancelAllScheduledNotificationsAsync();

        // Don't schedule if notifications or daily reminders are disabled
        if (!notificationsEnabled || !dailyRemindersEnabled) return;

        // Get reminder days as array of weekday numbers (0-6, where 0 is Sunday)
        const reminderDayIndices = Object.entries(reminderDays)
            .map(([day, isEnabled]) => {
                // Convert our day names to weekday indices (Sunday is 0 in Date object)
                const dayMap: Record<string, number> = {
                    sunday: 0,
                    monday: 1,
                    tuesday: 2,
                    wednesday: 3,
                    thursday: 4,
                    friday: 5,
                    saturday: 6
                };
                return isEnabled ? dayMap[day] : -1;
            })
            .filter(idx => idx !== -1);

        // Get the hours and minutes from the reminderTime
        const hours = reminderTime.getHours();
        const minutes = reminderTime.getMinutes();

        // Schedule notifications for each enabled day
        for (const weekday of reminderDayIndices) {
            // Get a random message from the collection
            const randomIndex = Math.floor(Math.random() * reminderMessages.length);
            const randomMessage = reminderMessages[randomIndex];

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: randomMessage.title,
                    body: randomMessage.body,
                    data: {screen: 'home'},
                },
                trigger: {
                    type: SchedulableTriggerInputTypes.WEEKLY,
                    weekday: weekday + 1,
                    hour: hours,
                    minute: minutes,
                },
            });
        }
        await AsyncStorage.setItem(STORAGE_KEY_LAST_UPDATE, new Date().toISOString());
    };
    // Send a test notification
    const sendTestNotification = async () => {
        trigger(HapticType.LIGHT);

        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Notification de test 👋',
                    body: 'Vos notifications fonctionnent correctement!',
                    data: {test: true},
                },
                trigger: {
                    type: SchedulableTriggerInputTypes.DATE,
                    date: new Date(Date.now() + 1000),

                },
            });

            Alert.alert('Succès', 'Une notification de test a été envoyée. Vous devriez la recevoir dans quelques secondes.');
        } catch (error) {
            console.error('Error sending test notification:', error);
            Alert.alert('Erreur', 'Impossible d\'envoyer une notification de test.');
        }
    };

    // Handle toggle notifications
    const handleToggleNotifications = async () => {
        trigger(HapticType.LIGHT);
        if (!notificationsEnabled) {
            const token = await registerForPushNotificationsAsync();
            if (token) {
                setNotificationsEnabled(true);
            }
        } else {
            // Ideally, we can't programmatically disable notifications,
            // but we can update our app state
            setNotificationsEnabled(false);
            setDailyRemindersEnabled(false);
            await Notifications.cancelAllScheduledNotificationsAsync();
        }
    };

    // Handle toggle daily reminders
    const handleToggleDailyReminders = () => {
        trigger(HapticType.LIGHT);
        setDailyRemindersEnabled(!dailyRemindersEnabled);
    };

    // Handle toggle email reminders
    const handleToggleEmailReminders = () => {
        trigger(HapticType.LIGHT);
        setEmailRemindersEnabled(!emailRemindersEnabled);
    };

    // Handle time change in time picker
    const onTimeChange = (event: any, selectedDate?: Date) => {
        setShowTimePicker(false);
        if (selectedDate) {
            setReminderTime(selectedDate);
        }
    };

    // Format time for display
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    };

    // Toggle a specific day in reminder days
    const toggleReminderDay = (day: keyof typeof reminderDays) => {
        trigger(HapticType.LIGHT);
        setReminderDays(prev => ({
            ...prev,
            [day]: !prev[day]
        }));
    };

    // Handle other toggle functions
    const handleToggleSounds = () => {
        trigger(HapticType.LIGHT);
        setSoundsEnabled(!soundsEnabled);
    };

    const handleToggleHaptic = () => {
        trigger(HapticType.LIGHT);
        setHapticEnabled(!hapticEnabled);
    };

    const handleToggleDataOptimization = () => {
        trigger(HapticType.LIGHT);
        setDataUsageOptimized(!dataUsageOptimized);
    };

    const handleToggleWifiOnly = () => {
        trigger(HapticType.LIGHT);
        setDownloadOverWifiOnly(!downloadOverWifiOnly);
    };

    const handleSignOut = () => {
        trigger(HapticType.MEDIUM);
        signOut();
    };

    // Render a setting item with switch
    const renderSettingItem = (icon: MaterialIconName, title: string, subtitle: string, value: boolean, onToggle: () => void) => (
        <View style={[styles.settingItem, isDark && styles.settingItemDark]}>
            <View style={styles.settingItemLeft}>
                <View style={[styles.iconContainer, isDark && styles.iconContainerDark]}>

                    <MaterialCommunityIcons name={icon} size={24} color={theme.color.primary[500]}/>
                </View>
                <View style={styles.settingTexts}>
                    <Text style={[styles.settingTitle, isDark && styles.settingTitleDark]}>{title}</Text>
                    <Text style={[styles.settingSubtitle, isDark && styles.settingSubtitleDark]}>{subtitle}</Text>
                </View>
            </View>
            <Switch
                value={value}

                onValueChange={onToggle}
                trackColor={{false: '#E5E7EB', true: theme.color.primary[500]}}
                thumbColor={Platform.OS === 'android' ? '#FFFFFF' : ''}
            />
        </View>
    );

    // Render a setting item that's a button/pressable
    const renderPressableSettingItem = (icon: MaterialIconName, title: string, subtitle: string, onPress: () => void, rightComponent?: React.ReactNode) => (
        <Pressable
            style={[styles.settingItem, isDark && styles.settingItemDark]}
            onPress={() => {
                trigger(HapticType.LIGHT);
                onPress();
            }}
        >
            <View style={styles.settingItemLeft}>
                <View style={[styles.iconContainer, isDark && styles.iconContainerDark]}>
                    <MaterialCommunityIcons name={icon} size={24} color={theme.color.primary[500]}/>
                </View>
                <View style={styles.settingTexts}>
                    <Text style={[styles.settingTitle, isDark && styles.settingTitleDark]}>{title}</Text>
                    <Text style={[styles.settingSubtitle, isDark && styles.settingSubtitleDark]}>{subtitle}</Text>
                </View>
            </View>
            {rightComponent || (
                <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color={isDark ? '#CCCCCC' : '#6B7280'}
                />
            )}
        </Pressable>
    );

    return (
        <ThemedView style={styles.container}>
            <View style={[styles.header, isDark && styles.headerDark]}>
                <ThemedText style={[styles.title, isDark && styles.titleDark ]}>Paramètres</ThemedText>
                <ThemedText style={[styles.subtitle, isDark &&  styles.subtitleDark]}>
                    Configurez votre expérience d'apprentissage
                </ThemedText>
            </View>

            <ScrollView contentContainerStyle={[styles.content, isDark && styles.contentDark]}>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Notifications</Text>

                    {renderSettingItem(
                        'bell-outline',
                        'Notifications',
                        'Recevez des alertes importantes',
                        notificationsEnabled,
                        handleToggleNotifications
                    )}

                    {notificationsEnabled && renderSettingItem(
                        'calendar-clock',
                        'Rappels quotidiens',
                        'Soyez rappelé de votre objectif d\'apprentissage',
                        dailyRemindersEnabled,
                        handleToggleDailyReminders
                    )}

                    {notificationsEnabled && dailyRemindersEnabled && renderPressableSettingItem(
                        'clock-time-four-outline',
                        'Horaire des rappels',
                        `${formatTime(reminderTime)}`,
                        () => setShowReminderModal(true)
                    )}

                    {notificationsEnabled && renderPressableSettingItem(
                        'test-tube',
                        'Tester les notifications',
                        'Envoyez une notification de test',
                        sendTestNotification
                    )}

                    {renderSettingItem(
                        'email-outline',
                        'Rappels par email',
                        'Recevez des rappels par email',
                        emailRemindersEnabled,
                        handleToggleEmailReminders
                    )}

                    {emailRemindersEnabled && (
                        <View
                            style={[styles.settingItem, isDark && styles.settingItemDark, styles.emailInputContainer]}>
                            <TextInput
                                style={[styles.emailInput, isDark && styles.emailInputDark]}
                                placeholder="Adresse email"
                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                value={emailAddress}
                                onChangeText={setEmailAddress}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Préférences</Text>

                    {renderSettingItem(
                        'volume-high',
                        'Sons',
                        'Activer les effets sonores dans l\'application',
                        soundsEnabled,
                        handleToggleSounds
                    )}

                    {renderSettingItem(
                        'vibrate',
                        'Retour haptique',
                        'Vibrations tactiles lors des interactions',
                        hapticEnabled,
                        handleToggleHaptic
                    )}

                   {renderPressableSettingItem(
                        'theme-light-dark',
                        'Mode sombre',
                        'Le mode sombre s\'adapte automatiquement au thème de votre appareil',
                        () => {
                            trigger(HapticType.LIGHT);
                        },
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Données et stockage</Text>

                    {renderSettingItem(
                        'data-matrix',
                        'Optimisation des données',
                        'Réduire la consommation de données mobiles',
                        dataUsageOptimized,
                        handleToggleDataOptimization
                    )}

                    {renderSettingItem(
                        'wifi',
                        'Télécharger uniquement en Wi-Fi',
                        'Économisez vos données mobiles',
                        downloadOverWifiOnly,
                        handleToggleWifiOnly
                    )}

                    {renderPressableSettingItem(
                        'trash-can-outline',
                        'Vider le cache',
                        'Libérer de l\'espace de stockage',
                        () => {
                            Alert.alert(
                                'Vider le cache',
                                'Voulez-vous vraiment vider le cache de l\'application ? Cette action ne supprimera pas vos données d\'apprentissage.',
                                [
                                    {text: 'Annuler', style: 'cancel'},
                                    {
                                        text: 'Vider',
                                        style: 'destructive',
                                        onPress: () => {
                                            // Logic to clear cache would go here
                                            Alert.alert('Succès', 'Le cache a été vidé avec succès');
                                        }
                                    }
                                ]
                            );
                        }
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Compte</Text>

                    {renderPressableSettingItem(
                        'account-outline',
                        'Profil',
                        user?.email || 'Non connecté',
                        () => {
                        }
                    )}

                    {renderPressableSettingItem(
                        'logout',
                        'Déconnexion',
                        'Se déconnecter de l\'application',
                        handleSignOut,
                        null
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>À propos</Text>

                    {renderPressableSettingItem(
                        'information-outline',
                        'Version',
                        '1.0.0 (Build 42)',
                        () => {
                        }
                    )}

                    {renderPressableSettingItem(
                        'shield-check-outline',
                        'Politique de confidentialité',
                        'Consultez notre politique de confidentialité',
                        () => {
                        }
                    )}
                </View>

                {/* Save Button */}
                <Pressable
                    style={[styles.saveButton, isDark && styles.saveButtonDark]}
                    onPress={saveSettings}
                >
                    <MaterialCommunityIcons
                        name="content-save-outline"
                        size={20}
                        color="#FFFFFF"
                        style={styles.saveButtonIcon}
                    />
                    <Text style={styles.saveButtonText}>Enregistrer les modifications</Text>
                </Pressable>
            </ScrollView>

            {/* Reminder Settings Modal */}
            <Modal
                visible={showReminderModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowReminderModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>Horaire des
                                rappels</Text>
                            <Pressable onPress={() => setShowReminderModal(false)}>
                                <MaterialCommunityIcons
                                    name="close"
                                    size={24}
                                    color={isDark ? '#FFFFFF' : '#111827'}
                                />
                            </Pressable>
                        </View>

                        <View style={styles.modalSection}>
                            <Text style={[styles.modalSectionTitle, isDark && styles.modalSectionTitleDark]}>Heure de
                                rappel</Text>
                            <Pressable
                                style={[styles.timePickerButton, isDark && styles.timePickerButtonDark]}
                                onPress={() => setShowTimePicker(true)}
                            >
                                <MaterialCommunityIcons
                                    name="clock-outline"
                                    size={20}
                                    color={isDark ? theme.color.primary[400] : theme.color.primary[600]}
                                />
                                <Text style={[styles.timeText, isDark && styles.timeTextDark]}>
                                    {formatTime(reminderTime)}
                                </Text>
                            </Pressable>

                            {showTimePicker && (
                                <DateTimePicker
                                    value={reminderTime}
                                    mode="time"
                                    is24Hour={true}
                                    display="default"
                                    onChange={onTimeChange}
                                />
                            )}
                        </View>

                        <View style={styles.modalSection}>
                            <Text style={[styles.modalSectionTitle, isDark && styles.modalSectionTitleDark]}>Jours de
                                rappel</Text>
                            <View style={styles.daysContainer}>
                                <Pressable
                                    style={[
                                        styles.dayButton,
                                        reminderDays.monday && styles.selectedDayButton,
                                        isDark && styles.dayButtonDark,
                                        isDark && reminderDays.monday && styles.selectedDayButtonDark
                                    ]}
                                    onPress={() => toggleReminderDay('monday')}
                                >
                                    <Text style={[
                                        styles.dayText,
                                        isDark && styles.dayTextDark,
                                        reminderDays.monday && styles.selectedDayText
                                    ]}>
                                        L
                                    </Text>
                                </Pressable>

                                <Pressable
                                    style={[
                                        styles.dayButton,
                                        reminderDays.tuesday && styles.selectedDayButton,
                                        isDark && styles.dayButtonDark,
                                        isDark && reminderDays.tuesday && styles.selectedDayButtonDark
                                    ]}
                                    onPress={() => toggleReminderDay('tuesday')}
                                >
                                    <Text style={[
                                        styles.dayText,
                                        isDark && styles.dayTextDark,
                                        reminderDays.tuesday && styles.selectedDayText
                                    ]}>
                                        M
                                    </Text>
                                </Pressable>

                                <Pressable
                                    style={[
                                        styles.dayButton,
                                        reminderDays.wednesday && styles.selectedDayButton,
                                        isDark && styles.dayButtonDark,
                                        isDark && reminderDays.wednesday && styles.selectedDayButtonDark
                                    ]}
                                    onPress={() => toggleReminderDay('wednesday')}
                                >
                                    <Text style={[
                                        styles.dayText,
                                        isDark && styles.dayTextDark,
                                        reminderDays.wednesday && styles.selectedDayText
                                    ]}>
                                        M
                                    </Text>
                                </Pressable>

                                <Pressable
                                    style={[
                                        styles.dayButton,
                                        reminderDays.thursday && styles.selectedDayButton,
                                        isDark && styles.dayButtonDark,
                                        isDark && reminderDays.thursday && styles.selectedDayButtonDark
                                    ]}
                                    onPress={() => toggleReminderDay('thursday')}
                                >
                                    <Text style={[
                                        styles.dayText,
                                        isDark && styles.dayTextDark,
                                        reminderDays.thursday && styles.selectedDayText
                                    ]}>
                                        J
                                    </Text>
                                </Pressable>

                                <Pressable
                                    style={[
                                        styles.dayButton,
                                        reminderDays.friday && styles.selectedDayButton,
                                        isDark && styles.dayButtonDark,
                                        isDark && reminderDays.friday && styles.selectedDayButtonDark
                                    ]}
                                    onPress={() => toggleReminderDay('friday')}
                                >
                                    <Text style={[
                                        styles.dayText,
                                        isDark && styles.dayTextDark,
                                        reminderDays.friday && styles.selectedDayText
                                    ]}>
                                        V
                                    </Text>
                                </Pressable>

                                <Pressable
                                    style={[
                                        styles.dayButton,
                                        reminderDays.saturday && styles.selectedDayButton,
                                        isDark && styles.dayButtonDark,
                                        isDark && reminderDays.saturday && styles.selectedDayButtonDark
                                    ]}
                                    onPress={() => toggleReminderDay('saturday')}
                                >
                                    <Text style={[
                                        styles.dayText,
                                        isDark && styles.dayTextDark,
                                        reminderDays.saturday && styles.selectedDayText
                                    ]}>
                                        S
                                    </Text>
                                </Pressable>

                                <Pressable
                                    style={[
                                        styles.dayButton,
                                        reminderDays.sunday && styles.selectedDayButton,
                                        isDark && styles.dayButtonDark,
                                        isDark && reminderDays.sunday && styles.selectedDayButtonDark
                                    ]}
                                    onPress={() => toggleReminderDay('sunday')}
                                >
                                    <Text style={[
                                        styles.dayText,
                                        isDark && styles.dayTextDark,
                                        reminderDays.sunday && styles.selectedDayText
                                    ]}>
                                        D
                                    </Text>
                                </Pressable>
                            </View>
                        </View>

                        <Pressable
                            style={[styles.modalButton, isDark && styles.modalButtonDark]}
                            onPress={() => setShowReminderModal(false)}
                        >
                            <Text style={styles.modalButtonText}>Confirmer</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </ThemedView>
    );
};

export default SettingsScreen;
const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor: '#F9FAFB',
        marginBottom: 56
    },
    header: {
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderBottomColor: theme.color.dark.border,
    },
    title: {
        fontFamily : theme.typography.fontFamily,
fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    titleDark: {
        color: '#FFFFFF',
    },
    subtitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        color: '#6B7280',
        marginTop: 4,
    },
    subtitleDark: {
        color: '#D1D5DB',
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    contentDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionTitleDark: {
        color: '#FFFFFF',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: theme.border.radius.small,
        marginBottom: 8,
        borderWidth: theme.border.width.thin,
        borderColor: theme.color.border,
    },
    settingItemDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderColor: theme.color.dark.border,
    },
    settingItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${theme.color.primary[500]}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    iconContainerDark: {
        backgroundColor: `${theme.color.primary[500]}25`,
    },
    settingTexts: {
        flex: 1,
    },
    settingTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: '500',
        color: '#111827',
    },
    settingTitleDark: {
        color: '#FFFFFF',
    },
    settingSubtitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    settingSubtitleDark: {
        color: '#D1D5DB',
    },
    emailInputContainer: {
        padding: 12,
    },
    emailInput: {
        width: '100%',
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        color: '#111827',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 6,
    },
    emailInputDark: {
        color: '#FFFFFF',
        backgroundColor: '#374151',
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.color.primary[500],
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 8,
        marginTop: 16,
    },
    saveButtonDark: {
        backgroundColor: theme.color.primary[600],
    },
    saveButtonIcon: {
        marginRight: 8,
    },
    saveButtonText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: '500',
        color: '#FFFFFF',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 16,
    },
    modalContentDark: {
        backgroundColor: theme.color.dark.background.secondary,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    modalTitleDark: {
        color: '#FFFFFF',
    },
    modalSection: {
        marginBottom: 16,
    },
    modalSectionTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: '500',
        color: '#111827',
        marginBottom: 8,
    },
    modalSectionTitleDark: {
        color: '#FFFFFF',
    },
    timePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
    },
    timePickerButtonDark: {
        backgroundColor: '#374151',
    },
    timeText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        color: '#111827',
        marginLeft: 8,
    },
    timeTextDark: {
        color: '#FFFFFF',
    },
    daysContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    dayButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        margin: 4,
    },
    selectedDayButton: {
        backgroundColor: theme.color.primary[500],
    },
    dayButtonDark: {
        backgroundColor: '#374151',
    },
    selectedDayButtonDark: {
        backgroundColor: theme.color.primary[600],
    },
    dayText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        color: '#111827',
    },
    dayTextDark: {
        color: '#FFFFFF',
    },
    selectedDayText: {
        color: '#FFFFFF',
    },
    modalButton: {
        backgroundColor: theme.color.primary[500],
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonDark: {
        backgroundColor: theme.color.primary[600],
    },
    modalButtonText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: '500',
        color: '#FFFFFF',
    },
});
