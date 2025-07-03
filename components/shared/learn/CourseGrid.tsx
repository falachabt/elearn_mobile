import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList, Text } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from "@/constants/theme";
import { CourseItem, CourseGridByCategoryProps } from '@/types/course.type';
import { useCourseGrouping } from '@/hooks/useCourseGrouping';
import CategorySection from './CategorySection';

/**
 * CourseGridByCategory component displaying courses in a grid grouped by category
 * with horizontal scrolling per category
 */
export const CourseGridByCategory: React.FC<CourseGridByCategoryProps> = ({
                                                                              courses,
                                                                              pdId,
                                                                              selectedCategory,
                                                                              onCoursePress,
                                                                              isEnrolled = false,
                                                                          }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    // Use the custom hook to group courses by category
    const coursesByCategory = useCourseGrouping(courses, selectedCategory);

    // Handle course press - memoized to prevent recreation on each render
    const handleCoursePress = useCallback((courseItem: CourseItem) => {
        if (onCoursePress) {
            onCoursePress(courseItem);
        }
    }, [onCoursePress]);

    // If no courses are found for the selected category
    if (coursesByCategory.length === 0) {
        return (
            <View style={[styles.emptyContainer, isDark && styles.emptyContainerDark]}>
                <MaterialCommunityIcons
                    name="book-open-variant"
                    size={48}
                    color={isDark ? "#4B5563" : "#9CA3AF"}
                />
                <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
                    Aucun cours disponible dans cette catégorie
                </Text>
            </View>
        );
    }

    // Render category section using the CategorySection component
    const renderCategorySection = useCallback(({  item } : { item : any}) => (
        <CategorySection
            item={item}
            pdId={pdId}
            isEnrolled={isEnrolled}
            isDark={isDark}
            onCoursePress={handleCoursePress}
        />
    ), [pdId, isEnrolled, isDark, handleCoursePress]);

    return (
        <FlatList
            data={coursesByCategory}
            renderItem={renderCategorySection}
            keyExtractor={(item) => `category-${item.name}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
        />
    );
};

const styles = StyleSheet.create({
    contentContainer: {
        flexGrow: 1,
        paddingBottom: 55,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyContainerDark: {
        backgroundColor: '#111827',
    },
    emptyText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        textAlign: 'center',
        marginTop: 16,
        color: '#6B7280',
    },
    emptyTextDark: {
        color: '#9CA3AF',
    },
});

export default React.memo(CourseGridByCategory);
