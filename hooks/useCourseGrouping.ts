import { useMemo } from 'react';
import { CourseItem, CategoryGroup } from '@/types/course.type';

/**
 * Hook to group courses by category and sort them
 */
export const useCourseGrouping = (
  courses: CourseItem[],
  selectedCategory: string
) => {
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

  return coursesByCategory;
};

export default useCourseGrouping;