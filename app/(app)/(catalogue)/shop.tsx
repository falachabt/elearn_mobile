import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";
import { useCart } from "@/hooks/useCart";
import { Stack, useRouter } from "expo-router";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { supabase } from "@/lib/supabase";
import { ProgramCard } from "@/components/shared/catalogue/ProgramCard";
import { ProgramDetails } from "@/components/shared/ProgramDetails";
import { useAuth } from "@/contexts/auth";

export interface Course {
  id: number;
  price: number;
  course_count: number;
  quiz_count: number;
  learning_path: {
    title: string;
    description: string;
  };
  concour: {
    name: string;
    school: {
      name: string;
    };
  };
}

type FilterType = 'all' | 'school' | 'course';

export default function ShopPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const { cartItems, addToCart, removeFromCart } = useCart();
  const isDark = useColorScheme() === "dark";
  const router = useRouter();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const { user } = useAuth();

  const fetchCourses = async () => {
    try {
      const { data : userProgarm , error : errorUserProgarm } = await supabase.from("user_program_enrollments").select(`program_id`).eq("user_id", user?.id);
      console.log("user program", userProgarm);

      const { data, error } = await supabase
        .from("concours_learningpaths")
        .select(`
          *,
          learning_path:learning_paths(*),
          concour:concours(name, school:schools(name))
        `)
        .eq("isActive", true)
        .not("id", "in", `(${userProgarm?.map((item) => item.program_id).join(",")})` );

      if (error) throw error;
      setCourses(data);
      setFilteredCourses(data);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCartAction = async (course: Course) => {
    try {
      if (isInCart(course.id)) {
        await removeFromCart(course.id);
      } else {
        await addToCart(course.id, course.price);
      }
    } catch (error) {
      console.error("Cart action error:", error);
    }
  };

  const showProgramDetails = (program: Course) => {
    setSelectedProgram(program);
    bottomSheetRef.current?.present();
  };

  const isInCart = (id: number) =>
    cartItems.some((item) => item.program_id === id);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    filterCourses();
  }, [searchQuery, activeFilter, courses]);

  const filterCourses = () => {
    let filtered = [...courses];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(course => 
        course.learning_path.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.concour.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.concour.school.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    switch (activeFilter) {
      case 'school':
        filtered = filtered.sort((a, b) => 
          a.concour.school.name.localeCompare(b.concour.school.name)
        );
        break;
      case 'course':
        filtered = filtered.sort((a, b) => 
          a.course_count === b.course_count 
            ? 0 
            : a.course_count > b.course_count ? -1 : 1
        );
        break;
      default:
        // Keep original order for 'all'
        break;
    }

    setFilteredCourses(filtered);
  };

  const renderHeaderRight = () => (
    <TouchableOpacity
      style={styles.cartButton}
      onPress={() => router.push("/(app)/(catalogue)/cart")}
    >
      <MaterialCommunityIcons
        name="cart"
        size={24}
        color={isDark ? "#FFF" : "#000"}
      />
      {cartItems.length > 0 && (
        <View style={styles.cartBadge}>
          <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {(['all', 'school', 'course'] as FilterType[]).map((filter) => (
        <TouchableOpacity
          key={filter}
          style={[
            styles.filterButton,
            activeFilter === filter && styles.activeFilterButton,
            isDark && styles.filterButtonDark,
            activeFilter === filter && isDark && styles.activeFilterButtonDark,
          ]}
          onPress={() => setActiveFilter(filter)}
        >
          <Text 
            style={[
              styles.filterText,
              activeFilter === filter && styles.activeFilterText,
              isDark && styles.filterTextDark,
              activeFilter === filter && isDark && styles.activeFilterTextDark,
            ]}
          >
            {filter === 'all' ? 'Tous' : filter === 'school' ? 'École' : 'Cours'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={1}
        appearsOnIndex={2}
      />
    ),
    []
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="magnify"
        size={64}
        color={isDark ? theme.color.gray[400] : theme.color.gray[500]}
      />
      <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
        Aucun résultat trouvé
      </Text>
      <Text style={[styles.emptySubtext, isDark && styles.emptySubtextDark]}>
        Essayez avec d'autres mots-clés
      </Text>
      <TouchableOpacity
        style={[styles.resetButton, isDark && styles.resetButtonDark]}
        onPress={() => {
          setSearchQuery('');
          setActiveFilter('all');
          fetchCourses()
        }}
      >
        <Text style={styles.resetButtonText}>Réinitialiser la recherche</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.color.primary[500]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.headerView, isDark && styles.headerViewDark]}>
        <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
          Catalogue
        </Text>
        {renderHeaderRight()}
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, isDark && styles.searchInputContainerDark]}>
          <MaterialCommunityIcons 
            name="magnify" 
            size={24} 
            color={isDark ? theme.color.gray[400] : theme.color.gray[500]} 
          />
          <TextInput
            style={[styles.searchInput, isDark && styles.searchInputDark]}
            placeholder="Rechercher un cours, une école..."
            placeholderTextColor={isDark ? theme.color.gray[400] : theme.color.gray[500]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons 
                name="close-circle" 
                size={20} 
                color={isDark ? theme.color.gray[400] : theme.color.gray[500]} 
              />
            </TouchableOpacity>
          ) : null}
        </View>
        {renderFilters()}
      </View>

      <BottomSheetModalProvider>
        <FlatList
          data={filteredCourses}
          renderItem={({ item }) => (
            <ProgramCard
              title={item.learning_path.title}
              description={item.learning_path.description || ""}
              price={item.price}
              courseCount={item.course_count || 0}
              quizCount={item.quiz_count || 0}
              concoursName={item.concour.name}
              schoolName={item.concour.school.name}
              isSelected={isInCart(item.id)}
              isDark={isDark}
              onSelect={() => handleCartAction(item)}
              onPress={() => showProgramDetails(item)}
            />
          )}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmptyState}
        />

        <BottomSheetModal
          ref={bottomSheetRef}
          snapPoints={["65%"]}
          backdropComponent={renderBackdrop}
          backgroundStyle={[styles.bottomSheet, isDark && styles.bottomSheetDark]}
        >
          <BottomSheetView style={styles.contentContainer}>
            {selectedProgram && (
              <ProgramDetails
                program={selectedProgram}
                isInCart={isInCart(selectedProgram.id)}
                onAddToCart={() => handleCartAction(selectedProgram)}
                isDark={isDark}
              />
            )}
          </BottomSheetView>
        </BottomSheetModal>
      </BottomSheetModalProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.color.background,
  },
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    marginBottom: 50,
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  headerView: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomColor: theme.color.border,
    borderBottomWidth: theme.border.width.thin,
    padding: theme.spacing.medium,
    paddingHorizontal: theme.spacing.small,
    backgroundColor: "#F5F5F5",
  },
  headerViewDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderBottomColor: theme.color.dark.border,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xlarge,
    fontWeight: "700",
    color: theme.color.text,
  },
  headerTitleDark: {
    color: theme.color.gray[50],
  },
  searchContainer: {
    padding: theme.spacing.medium,
    gap: theme.spacing.medium,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.border.radius.medium,
    paddingHorizontal: theme.spacing.medium,
    height: 48,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  searchInputContainerDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.dark.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.spacing.small,
    fontSize: theme.typography.fontSize.medium,
    color: theme.color.text,
  },
  searchInputDark: {
    color: theme.color.gray[50],
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: theme.spacing.small,
  },
  filterButton: {
    paddingVertical: theme.spacing.small,
    paddingHorizontal: theme.spacing.medium,
    borderRadius: theme.border.radius.large,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  filterButtonDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.dark.border,
  },
  activeFilterButton: {
    backgroundColor: theme.color.primary[500],
    borderColor: theme.color.primary[500],
  },
  activeFilterButtonDark: {
    backgroundColor: theme.color.primary[600],
    borderColor: theme.color.primary[600],
  },
  filterText: {
    fontSize: theme.typography.fontSize.small,
    color: theme.color.text,
  },
  filterTextDark: {
    color: theme.color.gray[50],
  },
  activeFilterText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  activeFilterTextDark: {
    color: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    marginBottom: 10,
  },
  list: {
    padding: 16,
  },
  cartButton: {
    marginRight: 16,
    padding: 5,
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: theme.color.error,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  bottomSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderWidth: 60,
    borderColor: theme.color.dark.background.tertiary,
    borderTopRightRadius: 24,
  },
  bottomSheetDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xlarge,
    gap: theme.spacing.medium,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.large,
    fontWeight: '600',
    color: theme.color.text,
  },
  emptyTextDark: {
   color: theme.color.gray[50],
 },
 emptySubtext: {
   fontSize: theme.typography.fontSize.medium,
   color: theme.color.gray[500],
   textAlign: 'center',
 },
 emptySubtextDark: {
   color: theme.color.gray[400],
 },
 resetButton: {
   marginTop: theme.spacing.medium,
   paddingVertical: theme.spacing.small,
   paddingHorizontal: theme.spacing.large,
   backgroundColor: theme.color.primary[500],
   borderRadius: theme.border.radius.small,
 },
 resetButtonDark: {
   backgroundColor: theme.color.primary[600], 
 },
 resetButtonText: {
   color: '#FFFFFF',
   fontSize: theme.typography.fontSize.medium,
   fontWeight: '600',
 },
});