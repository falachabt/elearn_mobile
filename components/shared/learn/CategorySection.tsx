import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import CompactCourseCard from './CourseCard';
import { CategoryGroup, CourseItem } from '@/types/course.type';

interface CategorySectionProps {
  item: CategoryGroup;
  pdId: string;
  isEnrolled?: boolean;
  isDark: boolean;
  onCoursePress: (courseItem: CourseItem) => void;
}

/**
 * CategorySection component for rendering a single category with its courses
 */
const CategorySection: React.FC<CategorySectionProps> = ({
  item,
  pdId,
  isEnrolled = false,
  isDark,
  onCoursePress
}) => {
  // Skip rendering if the category has no courses
  if (item.courses.length === 0) {
    return null;
  }

  // Handle course press - memoized to prevent recreation on each render
  const handleCoursePress = useCallback((courseItem: CourseItem) => {
    if (onCoursePress) {
      onCoursePress(courseItem);
    }
  }, [onCoursePress]);

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

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.courseRow}
        data={item.courses}
        keyExtractor={(courseItem, index) => `${courseItem.course.id}-${index}`}
        renderItem={({ item: courseItem, index }) => (
          <CompactCourseCard
            courseItem={courseItem}
            pdId={pdId}
            index={index + 1}
            isEnrolled={isEnrolled}
            onPress={() => handleCoursePress(courseItem)}
          />
        )}
        removeClippedSubviews={true}
        initialNumToRender={5}
        maxToRenderPerBatch={3}
        windowSize={5}
      />
    </View>
  );
};

const styles = StyleSheet.create({
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  seeAllText: {
    fontSize: 14,
    marginRight: 4,
    opacity: 0.8,
  },
  courseRow: {
    paddingLeft: 16,
    paddingRight: 4,
  },
});

export default React.memo(CategorySection);