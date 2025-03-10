import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { HapticType, useHaptics } from '@/hooks/useHaptics';
import { theme } from '@/constants/theme';
import useSWR from 'swr';
import { supabase } from '@/lib/supabase';
import CourseCard from '@/components/shared/learn/CourseCard';
import CategoryFilter from '@/components/shared/learn/CategoryFilter';
import {CourseGridByCategory} from "@/components/shared/learn/CourseGrid";
import CourseList from "@/components/CourseList";
// import CourseGridByCategory from '@/components/shared/learn/CourseGrid';

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

interface Program {
  id: string;
  title: string;
  concours_learningpaths?: Array<{
    concour?: {
      name?: string;
      school?: {
        name?: string;
      }
    }
  }>;
}


const CourseScreen: React.FC<null> = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { pdId} = useLocalSearchParams();
  const { trigger } = useHaptics();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch program data
  const { data: program, isLoading: isLoadingProgram } = useSWR<Program>(
      pdId ? `program-index-${pdId}` : null,
      async () => {
        const { data } = await supabase
            .from('learning_paths')
            .select(`
          id, 
          title,
          concours_learningpaths(
            concour:concours(
              name,
              school:schools(name)
            )
          )
        `)
            .eq('id', pdId)
            .single();
        return data as Program;
      }
  );


  // Fetch courses data
  const { data: courses, isLoading: isLoadingCourses } = useSWR<CourseItem[]>(
      pdId ? `program-courses-${pdId}` : null,
      async () => {
        const { data } = await supabase
            .from('course_learningpath')
            .select(`
          id,
          lpId,
          course:courses(
            id,
            name,
            goals,
            category:courses_categories(id, name, icon),
            courses_content(id, name, "order"),
            course_videos(id)
          )
        `)
            .eq('lpId', pdId);
        // @ts-ignore
        return data as CourseItem[];
      }
  );

  const isLoading = isLoadingProgram || isLoadingCourses;

  // Extract unique categories from courses
  const categories = useCallback(() => {
    if (!courses) return [];

    const categoriesMap = new Map<string, Category>();

    courses.forEach(courseItem => {
      const category = courseItem.course?.category;
      if (category && !categoriesMap.has(category.name)) {
        categoriesMap.set(category.name, category);
      }

    });

    return Array.from(categoriesMap.values());
  }, [courses]);

  // Filter courses based on search query
  const filteredCourses = useCallback(() => {
    if (!courses) return [];

    return courses.filter(courseItem => {
      const course = courseItem.course;
      if (!course) return false;

      // Filter by search query
      const matchesSearch =
          course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (course.goals || []).some(goal =>
              goal.toLowerCase().includes(searchQuery.toLowerCase())
          );

      // Filter by category (if not 'all')
      const matchesCategory =
          selectedCategory === 'all' ||
          course.category?.name === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [courses, searchQuery, selectedCategory]);

  // Handle category selection
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  // Handle course press
  const handleCoursePress = (courseItem: CourseItem) => {
    trigger(HapticType.LIGHT);
    router.push(`/learn/${pdId}/course/${courseItem.course.id}`);
  };

  // Toggle view mode between grid and list
  const toggleViewMode = () => {
    trigger(HapticType.LIGHT);
    setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
  };

  // Clear search query
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Get program title and school
  const getProgramInfo = () => {
    // if (!program) {
    //   return { title: 'Programme', school: '' };
    // }

    // @ts-ignore
    const concours = program?.concours_learningpaths?.concour;
    const title = program?.title || 'Programme';
    const school = concours?.school?.name || '';
    const concoursName = concours?.name || '';


    return { title, school, concoursName };
  };

  const { title, school, concoursName } = getProgramInfo();

  // Render loading state
  if (isLoading) {
    return (
        <View style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}>
          <ActivityIndicator size="large" color={theme.color.primary[500]} />
          <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
            Chargement des cours...
          </Text>
        </View>
    );
  }

  return (
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
        {/* Header */}
        <View style={[styles.header, isDark && styles.headerDark]}>
          <Pressable
              style={styles.headerIcon}
              onPress={() => {
                trigger(HapticType.LIGHT);
                router.push(`/(app)/learn/${pdId}`);
              }}
          >
            <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color={isDark ? "#FFFFFF" : "#111827"}
            />
          </Pressable>

          <View style={styles.headerInfo}>
            <ThemedText style={styles.headerTitle} numberOfLines={1}>
              {program?.title}
            </ThemedText>
            {(school || concoursName) && (
                <ThemedText style={styles.headerSubtitle}>
                  {concoursName && <Text style={styles.concoursText}>{concoursName} • </Text>}
                  {school && <Text style={styles.schoolText}>{school}</Text>}
                </ThemedText>
            )}
          </View>

          <Pressable
              style={styles.viewModeButton}
              onPress={toggleViewMode}
          >
            <MaterialCommunityIcons
                name={viewMode === 'grid' ? 'view-list' : 'view-grid'}
                size={24}
                color={theme.color.primary[500]}
            />
          </Pressable>
        </View>

        {/* Search bar */}
        <View style={[styles.searchContainer, isDark && styles.searchContainerDark]}>
          <View style={[styles.searchBox, isDark && styles.searchBoxDark]}>
            <MaterialCommunityIcons
                name="magnify"
                size={20}
                color={isDark ? "#9CA3AF" : "#6B7280"}
            />
            <TextInput
                style={[styles.searchInput, isDark && styles.searchInputDark]}
                placeholder="Rechercher un cours..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
            />
            {searchQuery.length > 0 && (
                <Pressable
                    style={styles.clearButton}
                    onPress={clearSearch}
                >
                  <MaterialCommunityIcons
                      name="close-circle"
                      size={20}
                      color={isDark ? "#9CA3AF" : "#6B7280"}
                  />
                </Pressable>
            )}
          </View>
        </View>

        {/* Category filter */}
        <View style={{ height: 50, marginTop: 8 }}>

        <CategoryFilter
            id={"courses-categories-filter"}
            categories={categories()}
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
        />
        </View>

        {/* Course count */}
        <View style={[styles.courseCountContainer, isDark && styles.courseContContainerDark, { marginTop: 4 }]}>
          <ThemedText style={[styles.courseCountText, isDark && styles.courseCountTextDark]}>
            {filteredCourses().length} cours disponibles
          </ThemedText>
        </View>

        {/* Courses display (grid or list) */}
        {viewMode === 'grid' ? (
            <CourseGridByCategory
                courses={filteredCourses()}
                pdId={String(pdId)}
                selectedCategory={selectedCategory}
                onCoursePress={handleCoursePress}
            />
        ) : (
            <CourseList pdId={String(pdId)} courses={filteredCourses()} onCoursePress={handleCoursePress}  />
        )}
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingContainerDark: {
    backgroundColor: '#111827',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  loadingTextDark: {
    color: '#9CA3AF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerDark: {
    backgroundColor: '#1F2937',
    borderBottomColor: '#374151',
  },
  headerIcon: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  concoursText: {
    color: theme.color.primary[500],
  },
  schoolText: {
    fontWeight: '500',
  },
  viewModeButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainerDark: {
    backgroundColor: '#1F2937',
    borderBottomColor: '#374151',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchBoxDark: {
    backgroundColor: '#374151',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#111827',
  },
  searchInputDark: {
    color: '#FFFFFF',
  },
  clearButton: {
    padding: 4,
  },
  courseCountContainer: {

    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
  },
  courseContContainerDark: {
    backgroundColor: '#374151',
  },
  courseCountText: {
    fontSize: 14,
    fontWeight: '500',
  },
  courseCountTextDark: {
    color: '#D1D5DB',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
});

export default CourseScreen;