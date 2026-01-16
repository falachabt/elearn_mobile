import { useMemo } from 'react';

import { useCategories } from './global/useCategories';

import { CategoryGroup, CourseItem } from '@/types/course.type';

/**
 * Hook to group courses by category and sort them
 */
export const useCourseGrouping = (
  courses: CourseItem[],
  selectedCategory: string, 
  type: 'secondary' | 'prepa' = 'prepa'
) => {
  const { categories } = useCategories();
  // Group courses by category
  const coursesByCategory = useMemo(() => {
    // If "all" is selected, show all categories
    if (selectedCategory === 'all') {
      const categoryMap = new Map<string, CategoryGroup>();

    
      courses.forEach(courseItem => {
        let categoryName = "Autres";
        let categoryIcon = undefined;
        
        if (type === 'secondary') {
          categoryName = categories?.find(cat => cat.id === courseItem.course?.category)?.name || "Autres";
        } else {
          const category = courseItem.course?.category;
          if (category && typeof category === 'object') {
            categoryName = category.name || 'Autres';
            categoryIcon = category.icon;
          }
        }


        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, {
            name: categoryName,
            icon: categoryIcon || undefined,
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
            return (a.order_index || 0) - (b.order_index || 0);
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
    const filteredCourses = courses.filter(courseItem => {
      const category = courseItem.course?.category;
      if (type === 'secondary') {
        return categories?.find(cat => cat.id === category)?.name === selectedCategory;
      }
      return category && typeof category === 'object' && category.name === selectedCategory;
    });

    if (filteredCourses.length === 0) {
      return [];
    }

    // Sort filtered courses by order_index if available
    const sortedCourses = [...filteredCourses].sort((a, b) => {
      // If both courses have order_index, sort by order_index
      if (a.order_index !== undefined && b.order_index !== undefined) {
        return  (a.order_index || 0) - (b.order_index || 0);
      }
      // If only one course has order_index, prioritize it
      if (a.order_index !== undefined) return -1;
      if (b.order_index !== undefined) return 1;
      // If neither has order_index, maintain original order
      return 0;
    });

    // Return as a single category group
    const firstCategory = filteredCourses[0]?.course?.category;
    const categoryIcon = firstCategory && typeof firstCategory === 'object' ? firstCategory.icon : undefined;
    
    return [{
      name: selectedCategory,
      icon: categoryIcon,
      courses: sortedCourses
    }];
  }, [courses, selectedCategory]);

  return coursesByCategory;
};

export default useCourseGrouping;