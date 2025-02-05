import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ScrollView } from "react-native-gesture-handler";
import { supabase } from "@/lib/supabase";
import { useRouter, useLocalSearchParams } from "expo-router";
import { theme } from "@/constants/theme";

// TODO : add pined and completed state to the

// Types
interface Exercise {
  id: string;
  title: string;
  description: string;
  content: any;
  correction: any;
  created_at: string;
  course_id: number;
  course?: {
    name: string;
    category: string;
    courses_categories?: {
      name: string;
      description: string;
    }
  }
}


type FilterType = 'all' | 'recent';

export const ExercisesList = () => {
  const params = useLocalSearchParams();
    const pdId = params["pdId"];
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [pathName, setPathName] = useState("");
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  useEffect(() => {
    fetchData();
  }, [pdId]);

  const fetchData = async () => {
    try {

      // First get all courses associated with this learning path
      const {data: coursesData, error: coursesError} = await supabase
          .from('course_learningpath')
          .select(`
          courseId,
          courses!inner (
            id,
            name,
            category,
            courses_categories (
              id,
              name,
              description
            )
          )
        `)
          .eq('lpId', pdId);

      if (coursesError) {
        console.error("Error fetching courses:", coursesError);
        return;
      }

      // Get the learning path name
      const {data: pathData, error: pathError} = await supabase
          .from('learning_paths')
          .select('title')
          .eq('id', pdId)
          .single();

      if (pathError) {
        console.error("Error fetching learning path:", pathError);
        return;
      }
      setPathName(pathData?.title || "");

      // Get all exercises for these courses
      const courseIds = coursesData?.map(course => course.courseId) || [];

      const {data: exercisesData, error: exercisesError} = await supabase
          .from('exercices')
          .select(`
          *,
          course:courses!inner (
            name,
            category,
            courses_categories (
              name,
              description
            )
          )
        `)
          .in('course_id', courseIds);

      if (exercisesError) {
        console.error("Error fetching exercises:", exercisesError);
        return;
      }

      // Get unique categories
      const uniqueCategories = [
        "Tout",
        ...new Set(
            exercisesData
                .map((exercise) => exercise.course?.courses_categories?.name)
                .filter(Boolean)
        ),
      ];

      setExercises(exercisesData);
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Unexpected error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredExercises = () => {
    return exercises.filter((exercise) => {
      const matchesSearch = 
        exercise.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exercise.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = 
        !selectedCategory || 
        selectedCategory === "Tout" || 
        exercise.course?.courses_categories?.name === selectedCategory;
      
      const matchesFilter = filterType === 'all' || 
        (filterType === 'recent' && new Date(exercise.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

      return matchesSearch && matchesCategory && matchesFilter;
    });
  };

  const handleViewExercise = (exercise: Exercise) => {
    router.push({
      pathname: "/(app)/learn/[pdId]/exercices/[exerciceId]",
      params: {
        pdId: String(pdId),
        exerciceId: exercise.id,
      },
    });
  };

  const ExerciseCard = ({ exercise }: { exercise: Exercise }) => {
    const [isPinned, setIsPinned] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
  
    const handlePin = (e: any) => {
      e.stopPropagation();
      setIsPinned(!isPinned);
      // TODO: Add logic to save pin state
    };
  
    const handleComplete = (e: any) => {
      e.stopPropagation();
      setIsCompleted(!isCompleted);
      // TODO: Add logic to save completion state
    };
  
    return (
      <TouchableOpacity
        style={[styles.exerciseCard, isDark && styles.exerciseCardDark]}
        onPress={() => handleViewExercise(exercise)}
      >
        <View style={styles.exerciseHeader}>
          <Text style={[styles.exerciseTitle, isDark && styles.textDark]}>
            {exercise.title}
          </Text>
          <Text style={[styles.courseName, isDark && styles.textDark]}>
            {exercise.course?.name}
          </Text>
        </View>
        
        <Text 
          style={[styles.exerciseDescription, isDark && styles.textDark]}
          numberOfLines={2}
        >
          {exercise.description}
        </Text>
  
        <View style={styles.exerciseFooter}>
          <View style={[styles.categoryTag, isDark && styles.categoryTagDark]}>
            <Text style={[styles.categoryText, isDark && styles.textDark]}>
              {exercise.course?.courses_categories?.name || "Non catégorisé"}
            </Text>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              onPress={handlePin}
              style={styles.actionButton}
            >
              <MaterialCommunityIcons
                name={isPinned ? "pin" : "pin-outline"}
                size={20}
                color={isPinned ? theme.color.primary[500] : (isDark ? theme.color.gray[400] : theme.color.gray[600])}
              />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleComplete}
              style={styles.actionButton}
            >
              <MaterialCommunityIcons
                name={isCompleted ? "check-circle" : "check-circle-outline"}
                size={20}
                color={isCompleted ? theme.color.primary[500] : (isDark ? theme.color.gray[400] : theme.color.gray[600])}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={"white"}
            // color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.textDark]}>
          {pathName}
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterButtonsContainer}
        >
          <TouchableOpacity
            style={[
              styles.filterButton,
              isDark && styles.filterButtonDark,
              filterType === 'all' && styles.filterButtonActive,
            ]}
            onPress={() => setFilterType('all')}
          >
            <MaterialCommunityIcons
              name="format-list-bulleted"
              size={20}
              color={filterType === 'all' ? '#FFFFFF' : (isDark ? theme.color.gray[400] : theme.color.gray[600])}
            />
            <Text
              style={[
                styles.filterButtonText,
                isDark && styles.filterButtonTextDark,
                filterType === 'all' && styles.filterButtonTextActive,
              ]}
            >
              Tout
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              isDark && styles.filterButtonDark,
              filterType === 'recent' && styles.filterButtonActive,
            ]}
            onPress={() => setFilterType('recent')}
          >
            <MaterialCommunityIcons
              name="clock-outline"
              size={20}
              color={filterType === 'recent' ? '#FFFFFF' : (isDark ? theme.color.gray[400] : theme.color.gray[600])}
            />
            <Text
              style={[
                styles.filterButtonText,
                isDark && styles.filterButtonTextDark,
                filterType === 'recent' && styles.filterButtonTextActive,
              ]}
            >
              Récent
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
          style={styles.categoriesScroll}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                isDark && styles.categoryChipDark,
                selectedCategory === category && styles.selectedCategoryChip,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.selectedCategoryText,
                  isDark && styles.textDark,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, isDark && styles.searchBoxDark]}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
          />
          <TextInput
            placeholder="Rechercher un exercice..."
            placeholderTextColor={
              isDark ? theme.color.gray[400] : theme.color.gray[600]
            }
            style={[styles.searchInput, isDark && styles.textDark]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Exercises List */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={theme.color.primary[500]}
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={getFilteredExercises()}
          renderItem={({ item }) => <ExerciseCard exercise={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    marginBottom: 60,
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
    backgroundColor: theme.color.primary[500],
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    // color: "#1A1A1A",
    color: "#FFFFFF",
    flex: 1,
  },
  filtersContainer: {
    paddingTop: 8,
  },
  filterButtonsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.border.radius.small,
    backgroundColor: theme.color.gray[100],
    gap: 8,
  },
  filterButtonDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  filterButtonActive: {
    backgroundColor: theme.color.primary[500],
  },
  filterButtonText: {
    fontSize: 14,
    color: theme.color.gray[600],
  },
  filterButtonTextDark: {
    color: theme.color.gray[400],
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  searchContainer: {
    padding: 16,
    paddingTop: 0,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.color.gray[100],
    borderRadius: theme.border.radius.small,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchBoxDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#1A1A1A",
  },
  categoriesScroll: {
    maxHeight: 60,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 0,
    height: 48,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.border.radius.small,
    backgroundColor: theme.color.gray[100],
    marginRight: 8,
    height: 40,
  },
  categoryChipDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  selectedCategoryChip: {
    backgroundColor: theme.color.primary[500],
  },
  categoryText: {
    fontSize: 14,
    color: theme.color.gray[600],
  },
  selectedCategoryText: {
    color: "#FFFFFF",
  },
  textDark: {
    color: "#FFFFFF",
  },
  listContainer: {
    flexGrow: 1,
    padding: 16,
    gap: 16,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  exerciseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.border.radius.small,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  exerciseCardDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.dark.border,
  },
  exerciseHeader: {
    marginBottom: 8,
  },
  exerciseTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  courseName: {
    fontSize: 14,
    color: theme.color.gray[600],
  },
  exerciseDescription: {
    fontSize: 14,
    color: theme.color.gray[600],
    marginBottom: 12,
  },
  exerciseFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  categoryTag: {
    backgroundColor: theme.color.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.border.radius.large,
  },
  categoryTagDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  actionButton: {
    padding: 8,
    borderRadius: theme.border.radius.small,
    backgroundColor: theme.color.gray[100],
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  dateText: {
    fontSize: 12,
    color: theme.color.gray[500],
  },
});

export default ExercisesList;