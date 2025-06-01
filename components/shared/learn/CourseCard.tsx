import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { HapticType, useHaptics } from '@/hooks/useHaptics';
import { theme } from '@/constants/theme';
import { useCourseProgress } from '@/hooks/useCourseProgress';

// TypeScript interfaces
interface Category {
    id?: number;
    name: string;
    icon?: string;
}

interface CourseContent {
    id: number;
    name: string;
    order: number;
}

interface CourseVideo {
    id: number;
}

interface Course {
    id: number;
    name: string;
    category?: Category;
    courses_content?: CourseContent[];
    course_videos?: CourseVideo[];
    goals?: string[];
}

interface CourseItem {
    id?: number;
    lpId?: string;
    course: Course;
}

interface CourseCardProps {
    courseItem: CourseItem;
    pdId: string;
    index?: number;
    onPress?: () => void;
    isEnrolled?: boolean;
}

// Categories color themes
const CATEGORY_THEMES: Record<string, {
    primary: string;
    secondary: string;
    cardBg: string;
    icon: string;
}> = {
    'Anglais': {
        primary: '#1E3A8A',
        secondary: '#3B82F6',
        cardBg: '#1D4ED8',
        icon: 'book-alphabet'
    },
    'Mathématiques': {
        primary: '#3B82F6',
        secondary: '#93C5FD',
        cardBg: '#1E40AF',
        icon: 'function'
    },
    'Biologie': {
        primary: '#10B981',
        secondary: '#6EE7B7',
        cardBg: '#059669',
        icon: 'dna'
    },
    'Chimie': {
        primary: '#8B5CF6',
        secondary: '#C4B5FD',
        cardBg: '#5B21B6',
        icon: 'flask'
    },
    'Physique': {
        primary: '#EC4899',
        secondary: '#F9A8D4',
        cardBg: '#BE185D',
        icon: 'atom'
    },
    'Informatique': {
        primary: '#6366F1',
        secondary: '#A5B4FC',
        cardBg: '#4338CA',
        icon: 'code-tags'
    },
    'Histoire': {
        primary: '#F59E0B',
        secondary: '#FCD34D',
        cardBg: '#D97706',
        icon: 'book-open-page-variant'
    },
    'Géographie': {
        primary: '#14B8A6',
        secondary: '#5EEAD4',
        cardBg: '#0F766E',
        icon: 'earth'
    }
};

// Default theme for categories not in the list
const DEFAULT_THEME = {
    primary: '#6B7280',
    secondary: '#E5E7EB',
    cardBg: '#4B5563',
    icon: 'book-education'
};

const CourseCard: React.FC<CourseCardProps> = ({
                                                   courseItem,
                                                   pdId,
                                                   index = 1,
                                                   onPress,
                                                   isEnrolled = false
                                               }) => {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { trigger } = useHaptics();

    const { course } = courseItem;
    const courseId = course?.id;
    const categoryName = course?.category?.name || 'Général';
    const courseName = course?.name || 'Cours sans titre';
    const courseContentsCount = course?.courses_content?.length || 0;
    const videoCount = course?.course_videos?.length || 0;

    // Get course progress
    const { progress } = useCourseProgress(courseId);

    // Get theme based on category
    const theme = CATEGORY_THEMES[categoryName] || DEFAULT_THEME;

    // Extract unit/course number and clean title
    const extractCourseInfo = (title: string): {
        unitNumber: string | null;
        courseNumber: string | null;
        cleanTitle: string;
    } => {
        // Try to extract "Unit X" pattern
        const unitRegex = /\b(unit|unité)\s+(\d+)\b/i;
        const unitMatch = title.match(unitRegex);

        // Try to extract "COURS X" pattern
        const courseRegex = /\b(cours)\s+(\d+)\b/i;
        const courseMatch = title.match(courseRegex);

        let cleanTitle = title;

        if (unitMatch) {
            cleanTitle = cleanTitle.replace(unitRegex, '').trim();
        }

        if (courseMatch) {
            cleanTitle = cleanTitle.replace(courseRegex, '').trim();
        }

        // Further clean the title if it contains a colon
        if (cleanTitle.includes(':')) {
            cleanTitle = cleanTitle.split(':')[1].trim();
        }

        return {
            unitNumber: unitMatch ? unitMatch[2] : null,
            courseNumber: courseMatch ? courseMatch[2] : null,
            cleanTitle
        };
    };

    const { unitNumber, courseNumber, cleanTitle } = extractCourseInfo(courseName);

    const handlePress = () => {
        trigger(HapticType.LIGHT);
            router.push(`/(app)/learn/${pdId}/courses/${courseId}`);
        // if (onPress) {
        //     onPress();
        // } else {
        // }
    };

    // Format course identifier (either unit or chapter number)
    const getCourseIdentifier = () => {
        if (unitNumber) {
            return `Unit ${unitNumber}`;
        } else if (courseNumber) {
            return `COURS ${courseNumber}`;
        } else {
            return `#${index}`;
        }
    };

    // Get category icon
    const getCategoryIcon = () => {
        if (course?.category?.icon) {
            return (
                <Image
                    source={{ uri: course.category.icon }}
                    style={styles.categoryIconImage}
                    resizeMode="contain"
                />
            );
        }

        return (
            <MaterialCommunityIcons
                // @ts-ignore
                name={theme.icon}
                size={24}
                color="#FFFFFF"
            />
        );
    };

    const getStatusIcon = () => {
        if (progress?.is_completed) {
            return (
                <View style={styles.completedBadge}>
                    <MaterialCommunityIcons
                        name="check-circle"
                        size={20}
                        color="#FFFFFF"
                    />
                </View>
            );
        }
        return null;
    };

    return (
        <Pressable
            style={[
                styles.card,
                { backgroundColor: theme.cardBg }
            ]}
            onPress={handlePress}
        >
            <View style={styles.cardTop}>
                <View style={styles.cardHeader}>
                    <Text style={styles.categoryTag}>@{categoryName}</Text>
                    <Text style={styles.indexNumber}>{getCourseIdentifier()}</Text>
                </View>

                <View style={styles.titleContainer}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                        {cleanTitle}
                    </Text>
                </View>

                <View style={styles.iconContainer}>
                    <View style={styles.iconCircle}>
                        {getCategoryIcon()}
                    </View>
                </View>

                {/* Completion Badge */}

            </View>

            <View style={styles.cardBottom}>
                <View style={styles.statsContainer}>
                    {getStatusIcon()}

                    {!isEnrolled && (
                        <View style={styles.previewBadge}>
                            <MaterialCommunityIcons
                                name="eye-outline"
                                size={12}
                                color="#FFFFFF"
                            />
                            <Text style={styles.previewText}>Aperçu</Text>
                        </View>
                    )}

                    <View style={styles.statItem}>
                        <MaterialCommunityIcons
                            name="file-document-outline"
                            size={16}
                            color="#FFFFFF"
                        />
                        <Text style={styles.statText}>
                            {courseContentsCount} leçons
                        </Text>
                    </View>

                    {videoCount > 0 && (
                        <>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <MaterialCommunityIcons
                                    name="play-circle-outline"
                                    size={16}
                                    color="#FFFFFF"
                                />
                                <Text style={styles.statText}>
                                    {videoCount} vidéos
                                </Text>
                            </View>
                        </>
                    )}
                </View>

                {/* Progress Bar - Only show for enrolled users */}
                {isEnrolled && (
                    <View style={styles.progressBarContainer}>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: progress?.progress_percentage !== undefined ? `${progress.progress_percentage}%` : '0%' }
                                ]}
                            />
                        </View>
                    </View>
                )}
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    card: {
        width: 220,
        height: 170, // Slightly taller to accommodate progress bar
        borderRadius: 8,
        overflow: 'hidden',
        marginRight: 12,
        marginBottom: 8,
    },
    previewBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderRadius: 12,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginRight: 8,
    },
    previewText: {
        color: '#FFFFFF',
        fontFamily: theme.typography.fontFamily,
        fontSize: 10,
        fontWeight: '600',
        marginLeft: 2,
    },
    cardTop: {
        flex: 1,
        padding: 12,
        position: 'relative',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    categoryTag: {
        fontFamily : theme.typography.fontFamily,
fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.9)',
    },
    indexNumber: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: 'bold',
        // marginRight: 30,
        color: 'rgba(255, 255, 255, 0.9)',
    },
    titleContainer: {
        flexShrink: 1,
        marginRight: 36,
    },
    cardTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
        lineHeight: 22,
    },
    iconContainer: {
        position: 'absolute',
        right: 10,
        bottom: 10,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryIconImage: {
        width: 24,
        height: 24,
    },
    cardBottom: {
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        height: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        marginHorizontal: 8,
    },
    statText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 12,
        color: 'rgba(255, 255, 255, 0.9)',
        marginLeft: 4,
    },
    completedBadge: {
        // position: 'absolute',
        // top: 8,
        // right: 8,
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderRadius: 12,
        width: 20,
        height: 20,
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressBarContainer: {
        marginTop: 8,
    },
    progressBar: {
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#65B741',
        borderRadius: 2,
    },
});

export default CourseCard;
