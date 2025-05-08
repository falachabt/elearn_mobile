// components/ArchiveCard.tsx
import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, useColorScheme, Platform} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import {theme} from '@/constants/theme';
import {Archive} from '@/app/(app)/learn/[pdId]/anales';

interface ArchiveCardProps {
    item: Archive;
    isDark: boolean;
    onPin: (id: string) => void;
    onDownload: (file: Archive) => void;
    onView: (file: Archive) => void;
    onToggleComplete?: (id: string) => void;
    downloadState: {
        downloading: boolean;
        progress: number;
        localPath?: string;
    };
}

export const ArchiveCard: React.FC<ArchiveCardProps> = ({
                                                            item,
                                                            onPin,
                                                            onDownload,
                                                            onView,
                                                            onToggleComplete,
                                                            downloadState = {
                                                                downloading: false,
                                                                progress: 0,
                                                                localPath: ''
                                                            },
                                                        }) => {
    const {downloading, progress, localPath} = downloadState;
    const th = useColorScheme();
    const isDark = th === 'dark';

    // Format the date to only show the year
    const formatYear = (dateString: string) => {
        if (!dateString) return "";
        try {
            const date = new Date(dateString);
            return date.getFullYear().toString();
        } catch {
            return dateString;
        }
    };

    return (
        <Animatable.View
            animation="fadeIn"
            duration={500}
            style={[
                styles.card,
                isDark && styles.cardDark,
                item.is_completed && styles.cardCompleted,
                item.is_completed && isDark && styles.cardCompletedDark
            ]}
        >
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    <View style={[
                        styles.iconContainer,
                        item.is_completed && styles.iconContainerCompleted
                    ]}>
                        <MaterialCommunityIcons
                            name={item.is_completed ? "check-circle" : "file-document-outline"}
                            size={24}
                            color={item.is_completed ? theme.color.success[500] : theme.color.primary[500]}
                        />
                    </View>
                    <Text
                        numberOfLines={1}
                        style={[styles.cardTitle, isDark && styles.textDark]}
                    >
                        {item.name}
                    </Text>
                </View>

                <View style={styles.headerActions}>
                    {/* Completion Toggle Button */}
                    {onToggleComplete && (
                        <TouchableOpacity
                            onPress={() => onToggleComplete(item.id)}
                            style={styles.actionButton}
                        >
                            <MaterialCommunityIcons
                                name={item.is_completed ? "check-circle" : "circle-outline"}
                                size={24}
                                color={
                                    item.is_completed
                                        ? theme.color.primary[500]
                                        : isDark
                                            ? theme.color.gray[400]
                                            : theme.color.gray[600]
                                }
                            />
                        </TouchableOpacity>
                    )}

                    {/* Download Button */}
                    {Platform.OS !== 'web' && (
                        <TouchableOpacity
                            onPress={() => !downloading && onDownload(item)}
                            style={styles.actionButton}
                        >
                            {downloading ? (
                                <View style={styles.progressContainer}>
                                    <Text style={styles.progressText}>{Math.round(progress || 0)}%</Text>
                                </View>
                            ) : (
                                <MaterialCommunityIcons
                                    name={localPath ? "check-circle-outline" : "download-outline"}
                                    size={24}
                                    color={localPath ? theme.color.success[500] : theme.color.primary[500]}
                                />
                            )}
                        </TouchableOpacity>
                    )}

                    {/* Pin Button */}
                    <TouchableOpacity onPress={() => onPin(item.id)} style={styles.actionButton}>
                        <MaterialCommunityIcons
                            name={item.is_pinned ? "pin" : "pin-outline"}
                            size={24}
                            color={item.is_pinned ? "orange" : isDark ? theme.color.gray[100] : theme.color.gray[600]}
                        />
                    </TouchableOpacity>

                    {/* View Button */}
                    <TouchableOpacity
                        onPress={() => onView(item)}
                        style={styles.actionButton}
                    >
                        <MaterialCommunityIcons
                            name="eye-outline"
                            size={24}
                            color={theme.color.primary[500]}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[
                styles.footer,
                isDark && styles.footerDark,
                item.is_completed && styles.footerCompleted,
                item.is_completed && isDark && styles.footerCompletedDark
            ]}>
                <View style={styles.metaItem}>
                    <MaterialCommunityIcons
                        name={item.is_completed ? "check-circle" : "folder-outline"}
                        size={14}
                        color={
                            item.is_completed
                                ? theme.color.primary[500]
                                : isDark
                                    ? theme.color.gray[400]
                                    : theme.color.gray[600]
                        }
                    />
                    <Text style={[
                        styles.metaText,
                        isDark && styles.metaTextDark,
                        item.is_completed && styles.metaTextCompleted,
                        item.is_completed && isDark && styles.metaTextCompletedDark
                    ]}>
                        {item.is_completed ? "Terminé" : item.courses_categories?.name}
                    </Text>
                </View>

                <View style={styles.metaItem}>
                    <MaterialCommunityIcons
                        name="calendar-outline"
                        size={14}
                        color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
                    />
                    <Text style={[styles.metaText, isDark && styles.metaTextDark]}>
                        {formatYear(item.session)}
                    </Text>
                </View>
            </View>
        </Animatable.View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: theme.border.radius.small,
        borderWidth: 1,
        borderColor: theme.color.border,
        marginHorizontal: 16,
        marginBottom: 12,
        overflow: 'hidden',
    },
    cardDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderColor: theme.color.dark.border,
    },
    cardCompleted: {
        borderColor: theme.color.primary[600],
        borderWidth: 1,
    },
    cardCompletedDark: {
        borderColor: theme.color.primary["400"],
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.color.border,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    iconContainer: {
        marginRight: 12,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.color.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainerCompleted: {
        backgroundColor: theme.color.primary["500"],
    },
    cardTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        flex: 1,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: theme.color.border,
    },
    footerDark: {
        borderTopColor: theme.color.dark.border,
    },
    footerCompleted: {
        backgroundColor: theme.color.success[50],
        borderTopColor: theme.color.success[100],
    },
    footerCompletedDark: {
        backgroundColor: 'rgba(74, 222, 128, 0.1)',
        borderTopColor: theme.color.success[900],
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        color: theme.color.gray[600],
    },
    metaTextDark: {
        color: theme.color.gray[400],
    },
    metaTextCompleted: {
        color: theme.color.success[700],
        fontWeight: '500',
    },
    metaTextCompletedDark: {
        color: theme.color.primary[400],
    },
    textDark: {
        color: '#FFFFFF',
    },
    actionButton: {
        padding: 8,
        borderRadius: theme.border.radius.large,
        backgroundColor: 'transparent',
    },
    progressContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.color.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        fontWeight: '500',
        color: theme.color.primary[500],
    }
});