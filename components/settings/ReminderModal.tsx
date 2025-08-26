import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { theme } from '@/constants/theme';
import { HapticType, useHaptics } from '@/hooks/useHaptics';
import { ReminderDays } from '@/types/settings.type';

interface ReminderModalProps {
    visible: boolean;
    onClose: () => void;
    reminderTime: Date;
    setReminderTime: (time: Date) => void;
    reminderDays: ReminderDays;
    toggleReminderDay: (day: keyof ReminderDays) => void;
    isDark: boolean;
}

/**
 * ReminderModal component for configuring reminder settings
 */
export const ReminderModal: React.FC<ReminderModalProps> = ({
    visible,
    onClose,
    reminderTime,
    setReminderTime,
    reminderDays,
    toggleReminderDay,
    isDark
}) => {
    const { trigger } = useHaptics();
    const [showTimePicker, setShowTimePicker] = useState(false);

    // Format time for display
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Handle time change in time picker
    const onTimeChange = (event: any, selectedDate?: Date) => {
        setShowTimePicker(false);
        if (selectedDate) {
            setReminderTime(selectedDate);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
                            Horaire des rappels
                        </Text>
                        <Pressable onPress={onClose}>
                            <MaterialCommunityIcons
                                name="close"
                                size={24}
                                color={isDark ? '#FFFFFF' : '#111827'}
                            />
                        </Pressable>
                    </View>

                    <View style={styles.modalSection}>
                        <Text style={[styles.modalSectionTitle, isDark && styles.modalSectionTitleDark]}>
                            Heure de rappel
                        </Text>
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
                        <Text style={[styles.modalSectionTitle, isDark && styles.modalSectionTitleDark]}>
                            Jours de rappel
                        </Text>
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
                        onPress={onClose}
                    >
                        <Text style={styles.modalButtonText}>Confirmer</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
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
        fontFamily: theme.typography.fontFamily,
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
        fontFamily: theme.typography.fontFamily,
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
        fontFamily: theme.typography.fontFamily,
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
        fontFamily: theme.typography.fontFamily,
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
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '500',
        color: '#FFFFFF',
    },
});

export default ReminderModal;
