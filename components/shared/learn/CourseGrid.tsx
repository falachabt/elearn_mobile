import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Pressable, Text } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CompactCourseCard from './CourseCard';
import {theme} from "@/constants/theme";

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
    order_index?: number;
}

interface CategoryGroup {
    name: string;
    icon?: string;
    courses: CourseItem[];
}

interface CourseGridByCategoryProps {
    courses: CourseItem[];
    pdId: string;
    selectedCategory: string;
    onCoursePress?: (courseItem: CourseItem) => void;
    isEnrolled?: boolean;
}

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

    // Group courses by category
    const coursesByCategory = useMemo(() => {
        // If "all" is selected, show all categories
        if (selectedCategory === 'all') {
            const categoryMap = new Map<string, CategoryGroup>();

            // First, collect all categories with their icons
            courses.forEach(courseItem => {
                const categoryName = courseItem.course?.category?.name || 'Autres';
                const categoryIcon = courseItem.course?.category?.icon;

                if (!categoryMap.has(categoryName)) {
                    categoryMap.set(categoryName, {
                        name: categoryName,
                        icon: categoryIcon,
                        courses: []
                    });
                }

                categoryMap.get(categoryName)?.courses.push(courseItem);
            });

            // Sort courses within each category by order_index if available
            categoryMap.forEach((category) => {
                category.courses.sort((a, b) => {
                    // If both courses have order_index, sort by order_index
                    if (a.order_index !== undefined && b.order_index !== undefined) {
                        return a.order_index - b.order_index;
                    }
                    // If only one course has order_index, prioritize it
                    if (a.order_index !== undefined) return -1;
                    if (b.order_index !== undefined) return 1;
                    // If neither has order_index, maintain original order
                    return 0;
                });
            });

            // Convert map to array and sort alphabetically
            return Array.from(categoryMap.values())
                .sort((a, b) => a.name.localeCompare(b.name));
        }

        // Otherwise filter to show only the selected category
        const filteredCourses = courses.filter(
            courseItem => courseItem.course?.category?.name === selectedCategory
        );

        if (filteredCourses.length === 0) {
            return [];
        }

        // Sort filtered courses by order_index if available
        const sortedCourses = [...filteredCourses].sort((a, b) => {
            // If both courses have order_index, sort by order_index
            if (a.order_index !== undefined && b.order_index !== undefined) {
                return a.order_index - b.order_index;
            }
            // If only one course has order_index, prioritize it
            if (a.order_index !== undefined) return -1;
            if (b.order_index !== undefined) return 1;
            // If neither has order_index, maintain original order
            return 0;
        });

        // Return as a single category group
        return [{
            name: selectedCategory,
            icon: filteredCourses[0].course?.category?.icon,
            courses: sortedCourses
        }];
    }, [courses, selectedCategory]);

    // Handle course press
    const handleCoursePress = (courseItem: CourseItem) => {
        if (onCoursePress) {
            onCoursePress(courseItem);
        }
    };

    // Render an individual category section
    const renderCategorySection = ({ item }: { item: CategoryGroup }) => {
        // Skip rendering if the category has no courses
        if (item.courses.length === 0) {
            return null;
        }

        return (
            <View style={styles.categorySection}>
                <View style={styles.categoryHeader}>
                    <ThemedText style={styles.categoryTitle}>
                        {item.name}
                    </ThemedText>

                    {item.courses.length > 4 && (
                        <Pressable
                            style={styles.seeAllButton}
                        >
                            <ThemedText style={styles.seeAllText}>
                                Voir tout
                            </ThemedText>
                            <MaterialCommunityIcons
                                name="chevron-right"
                                size={16}
                                color={isDark ? "#9CA3AF" : "#6B7280"}
                            />
                        </Pressable>
                    )}
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.courseRow}
                >
                    {item.courses.map((courseItem, index) => (
                        <CompactCourseCard
                            key={`${courseItem.course.id}-${index}`}
                            courseItem={courseItem}
                            pdId={pdId}
                            index={index + 1}
                            isEnrolled={isEnrolled}
                            onPress={() => handleCoursePress(courseItem)}
                        />
                    ))}
                </ScrollView>
            </View>
        );
    };

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
        // flex : 1,
        flexGrow: 1,
        // overflow: 'scroll',
      // marginTop: 20,
        paddingBottom: 55,
        // marginBottom: 40,
    },
    categorySection: {
        marginBottom: 10,
    },
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    categoryTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: 'bold',
    },
    seeAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    seeAllText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        marginRight: 4,
        opacity: 0.8,
    },
    courseRow: {
        paddingLeft: 16,
        paddingRight: 4,
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

export default CourseGridByCategory;
