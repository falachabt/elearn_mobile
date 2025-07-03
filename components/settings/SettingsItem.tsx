import React from 'react';
import { View, Text, StyleSheet, Switch, Pressable, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { MaterialIconName } from '@/constants/iconNames';
import { HapticType, useHaptics } from '@/hooks/useHaptics';

interface SettingItemProps {
    icon: MaterialIconName;
    title: string;
    subtitle: string;
    value?: boolean;
    onToggle?: () => void;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
    isDark: boolean;
}

/**
 * SettingsItem component for rendering a setting item with an icon, title, subtitle, and a toggle switch or right component
 */
export const SettingsItem: React.FC<SettingItemProps> = ({
    icon,
    title,
    subtitle,
    value,
    onToggle,
    onPress,
    rightComponent,
    isDark
}) => {
    const { trigger } = useHaptics();

    // If onToggle is provided, render a setting item with a switch
    if (onToggle) {
        return (
            <View style={[styles.settingItem, isDark && styles.settingItemDark]}>
                <View style={styles.settingItemLeft}>
                    <View style={[styles.iconContainer, isDark && styles.iconContainerDark]}>
                        <MaterialCommunityIcons name={icon} size={24} color={theme.color.primary[500]} />
                    </View>
                    <View style={styles.settingTexts}>
                        <Text style={[styles.settingTitle, isDark && styles.settingTitleDark]}>{title}</Text>
                        <Text style={[styles.settingSubtitle, isDark && styles.settingSubtitleDark]}>{subtitle}</Text>
                    </View>
                </View>
                <Switch
                    value={value}
                    onValueChange={onToggle}
                    trackColor={{ false: '#E5E7EB', true: theme.color.primary[500] }}
                    thumbColor={Platform.OS === 'android' ? '#FFFFFF' : ''}
                />
            </View>
        );
    }

    // If onPress is provided, render a pressable setting item
    return (
        <Pressable
            style={[styles.settingItem, isDark && styles.settingItemDark]}
            onPress={() => {
                trigger(HapticType.LIGHT);
                if (onPress) onPress();
            }}
        >
            <View style={styles.settingItemLeft}>
                <View style={[styles.iconContainer, isDark && styles.iconContainerDark]}>
                    <MaterialCommunityIcons name={icon} size={24} color={theme.color.primary[500]} />
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
};

const styles = StyleSheet.create({
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
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
    },
    settingTitleDark: {
        color: '#FFFFFF',
    },
    settingSubtitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    settingSubtitleDark: {
        color: '#D1D5DB',
    },
});

export default SettingsItem;