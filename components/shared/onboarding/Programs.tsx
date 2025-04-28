import {
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useColorScheme,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Pressable
} from 'react-native';
import { theme } from '@/constants/theme';
import * as Animatable from 'react-native-animatable';
import { ProgramCard } from '../ProgramCard';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/hooks/useCart';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useSWR from 'swr';
import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetScrollView,
  BottomSheetBackdropProps
} from "@gorhom/bottom-sheet";
import Animated from "react-native-reanimated";

interface Program {
  id: number;
  price: number;
  learning_path: {
    id: string;
    title: string;
    description: string;
    course_count: number;
    quiz_count: number;
    status: string;
    duration: string;
    image: {
      src: string;
    };
  };
  concour: {
    id: string;
    name: string;
    image: {
      url: string;
    };
    schoolId: string;
    city_id: string;
    cycle_id: string;
    nextDate: string;
  };
  exerciseCount?: number;
  archiveCount?: number;
  programDetails?: {
    courses: { id: number; name: string }[];
    quizzes: { id: string; name: string }[];
    exercises: { id: string; title: string }[];
    archives: { id: number; name: string; session: string }[];
  };
}

interface FilterOption {
  id: string;
  name: string;
}

interface ProgramsProps {
  knowsProgram: boolean;
  selectedPrograms: number[];
  setSelectedPrograms: React.Dispatch<React.SetStateAction<number[]>>;
}

// Define pricing plans (formulas)
const PRICING_PLANS = [
  {
    id: 'essential',
    name: 'Formule Essentielle',
    description: 'Première formation: 14 900 FCFA + 7900 FCFA pour toutes nouvelles souscriptions à une formation.',
    basePrice: 14900,
    additionalPrice: 7900,
    threshold: 1,
    color: 'green'
  },
  {
    id: 'advantage',
    name: 'Formule Avantage',
    description: 'Pack complet de trois formations',
    price: 24900,
    threshold: 3,
    color: 'orange',
    recommended: true
  },
  {
    id: 'excellence',
    name: 'Formule Excellence',
    description: 'Formations illimitées pendant 12 mois',
    price: 39500,
    threshold: 5,
    color: '#4F46E5'
  }
];

// Progress bar component for formula tracking
const FormulaProgressBar = ({planId, currentCount, threshold, color, isDark}: {planId: string, currentCount: number, threshold: number, color: string, isDark: boolean}) => {
  // Calculate progress percentage
  const progress = Math.min(currentCount / threshold, 1);

  // Dynamic width for progress bar
  const progressWidth = `${progress * 100}%`;

  return (
      <View style={styles.progressBarContainer}>
        <View style={[
          styles.progressBarBackground,
          isDark && styles.progressBarBackgroundDark
        ]}>
          <View
              style={[
                styles.progressBarFill,
                { width: progressWidth, backgroundColor: color }
              ]}
          />
        </View>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressText, isDark && styles.progressTextDark]}>
            {currentCount}
          </Text>
          <Text style={[styles.progressText, isDark && styles.progressTextDark]}>
            {threshold}
          </Text>
        </View>
      </View>
  );
};

// Optimized fetcher for programs
const optimizedProgramsFetcher = async () => {
  try {
    // Try using the stored procedure first
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_available_programs', {
        p_user_id: '00000000-0000-0000-0000-000000000000' // Default user ID if none provided
      });

      if (!rpcError && rpcData) {
        console.log('Successfully fetched programs via RPC');
        return rpcData;
      }
    } catch (rpcErr) {
      console.log('RPC fetch failed, falling back to standard query', rpcErr);
    }

    // Fallback to standard query with corrected filter for active schools
    console.log('Using standard query for active schools');

    // First, get all active schools
    const { data: activeSchools, error: schoolsError } = await supabase
        .from("schools")
        .select("id")
        .eq("isActive", true);

    if (schoolsError) throw schoolsError;

    const activeSchoolIds = activeSchools.map(school => school.id);

    // Get all programs with active schools
    const { data, error } = await supabase
        .from("concours_learningpaths")
        .select(`
        id, 
        price, 
        concour:concourId(
          id, 
          name, 
          school_id,
          image,
          city_id, 
          cycle_id, 
          nextDate
        ), 
        learning_path:learningPathId(
          id, 
          title, 
          description, 
          course_count, 
          quiz_count, 
          status, 
          duration, 
          image
        )
      `)
        .eq("isActive", true);

    if (error) throw error;

    // Filter programs by active schools
    const activePrograms = data.filter(program =>
        activeSchoolIds?.includes(program.concour.school_id)
    );

    // Process data with additional counts (exercises and archives)
    const processedData = await Promise.all(activePrograms.map(async program => {
      try {
        // Get learning path ID and concour ID
        const lpId = program.learning_path.id;
        const concourId = program.concour.id;

        // Get school data for each program
        const { data: schoolData } = await supabase
            .from("schools")
            .select("id, name")
            .eq("id", program.concour.school_id)
            .single();

        // Enrich with school data
        program.concour.school = schoolData;

        // Get course IDs
        const { data: coursesData } = await supabase
            .from("course_learningpath")
            .select("courseId")
            .eq("lpId", lpId);

        const courseIds = coursesData?.map(item => item.courseId) || [];

        // Calculate exercise count
        let exerciseCount = 0;
        if (courseIds.length > 0) {
          const { count } = await supabase
              .from("exercices")
              .select("id", { count: 'exact' })
              .in("course_id", courseIds);

          exerciseCount = count || 0;
        }

        // Calculate archive count
        const { count: archiveCount } = await supabase
            .from("concours_archives")
            .select("id", { count: 'exact' })
            .eq("concour_id", concourId);

        return {
          ...program,
          exerciseCount,
          archiveCount: archiveCount || 0
        };
      } catch (error) {
        console.error("Error calculating counts for program:", error);
        return program;
      }
    }));

    return processedData || [];
  } catch (error) {
    console.error("Error fetching programs:", error);
    throw error;
  }
};

// Fetcher for program details
const loadProgramDetails = async (programId: number) => {
  if (!programId) return null;

  try {
    // Try to use the stored procedure first
    try {
      const { data: procData, error: procError } = await supabase.rpc('get_program_details', {
        p_program_id: programId
      });

      if (!procError && procData) {
        return procData;
      }
    } catch (procErr) {
      console.log('RPC program details fetch failed, falling back to standard query', procErr);
    }

    // Fallback to standard implementation
    // Get learning path and concour IDs for this program
    const { data: programData } = await supabase
        .from("concours_learningpaths")
        .select(`learningPathId, concourId`)
        .eq("id", programId)
        .single();

    if (!programData) throw new Error("Program not found");
    const lpId = programData.learningPathId;
    const concourId = programData.concourId;

    return await fetchProgramDetails(lpId, concourId);
  } catch (error) {
    console.error(`Error loading details for program ${programId}:`, error);
    return null;
  }
};

// Original fetchProgramDetails function (used as fallback)
const fetchProgramDetails = async (lpId: string, concourId: string) => {
  try {
    // Fetch courses
    const { data: coursesData } = await supabase
        .from("course_learningpath")
        .select(`
        course:courseId(
          id, 
          name
        )
      `)
        .eq("lpId", lpId);

    // Fetch quizzes
    const { data: quizzesData } = await supabase
        .from("quiz_learningpath")
        .select(`
        quiz:quizId(
          id,
          name
        )
      `)
        .eq("lpId", lpId);

    // Fetch exercises (indirectly through courses)
    const courseIds = coursesData?.map(item => item.course?.id).filter(Boolean) || [];
    let exercisesData = [];
    if (courseIds.length > 0) {
      const { data: exercisesResult } = await supabase
          .from("exercices")
          .select("id, title")
          .in("course_id", courseIds);

      exercisesData = exercisesResult || [];
    }

    // Fetch archives
    const { data: archivesData } = await supabase
        .from("concours_archives")
        .select("id, name, session")
        .eq("concour_id", concourId);

    return {
      courses: coursesData?.map(item => item.course) || [],
      quizzes: quizzesData?.map(item => item.quiz) || [],
      exercises: exercisesData || [],
      archives: archivesData || []
    };
  } catch (error) {
    console.error("Error fetching program details:", error);
    return {
      courses: [],
      quizzes: [],
      exercises: [],
      archives: []
    };
  }
};

// Prefetch filter options
const prefetchFilterOptions = async () => {
  try {
    // Fetch all filter options in parallel
    const [cyclesResponse, citiesResponse, schoolsResponse] = await Promise.all([
      supabase.from("study_cycles").select("id, name").order("level"),
      supabase.from("cities").select("id, name").order("name"),
      supabase.from("schools").select("id, name").order("name")
    ]);

    return {
      cycles: cyclesResponse.data || [],
      cities: citiesResponse.data || [],
      schools: schoolsResponse.data || []
    };
  } catch (error) {
    console.error("Error prefetching filter options:", error);
    return {
      cycles: [],
      cities: [],
      schools: []
    };
  }
};

// Skeleton loader component
function ProgramSkeletonScreen({ isDark }) {
  return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputWrapper, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]} />
          <View style={[styles.filterButton, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]} />
        </View>

        <View style={styles.headerContainer}>
          <View style={[styles.skeletonText, { width: 200, height: 24 }]} />
          <View style={[styles.skeletonText, { width: 80, height: 18 }]} />
        </View>

        {[1, 2, 3].map((i) => (
            <View key={`skeleton-${i}`} style={[
              styles.skeletonCard,
              isDark && { backgroundColor: theme.color.dark.background.secondary }
            ]}>
              <View style={styles.skeletonImage} />
              <View style={styles.skeletonCardContent}>
                <View style={styles.skeletonTitle} />
                <View style={styles.skeletonSubtitle} />
                <View style={styles.skeletonDescription} />
                <View style={styles.skeletonFeatures} />
              </View>
            </View>
        ))}
      </View>
  );
}

const Programs: React.FC<ProgramsProps> = ({ knowsProgram, selectedPrograms, setSelectedPrograms }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // State management
  const [filteredPrograms, setFilteredPrograms] = useState<Program[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const { addToCart, removeFromCart } = useCart();

  // Program details cache
  const programDetailsCache = useRef(new Map());
  const [programDetailsMap, setProgramDetailsMap] = useState({});

  // Filter states
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [selectedCycle, setSelectedCycle] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [sortBy, setSortBy] = useState<string>('default');

  // Performance optimization states
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(true);

  // Pagination
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 10;

  // Formula sheet states
  const [suggestedPlan, setSuggestedPlan] = useState<any>(null);
  const formulaDetailsRef = useRef<BottomSheetModal>(null);
  const formulaProgressRef = useRef<BottomSheetModal>(null);
  const cartCheckoutRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['70%', '90%'], []);

  // Memoize filter dependencies to prevent unnecessary re-renders
  const filterDependencies = useMemo(() => ({
    searchQuery,
    selectedCycle,
    selectedCity,
    selectedSchool,
    sortBy,
    priceRange
  }), [searchQuery, selectedCycle, selectedCity, selectedSchool, sortBy, priceRange]);

  // 1. Fetch programs with optimized SWR configuration
  const { data: programs, error: programsError, isLoading: programsLoading } = useSWR(
      'programss',
      optimizedProgramsFetcher,
      {
        revalidateOnFocus: false,
        dedupingInterval: 600000, // 10 minutes
        focusThrottleInterval: 5000, // 5 seconds
        errorRetryCount: 3,
        keepPreviousData: true, // Keep showing previous data while fetching
        fallbackData: [], // Provide fallback data to prevent undefined
        onSuccess: (data) => {
          // Hide skeleton after data is loaded
          setTimeout(() => setShowSkeleton(false), 300);
          setIsInitialLoad(false);
        }
      }
  );

  // 2. Prefetch filter options in the background
  const { data: filterOptions, error: filterOptionsError } = useSWR(
      'filterOptions',
      prefetchFilterOptions,
      {
        revalidateOnFocus: false,
        dedupingInterval: 3600000, // 1 hour
        suspense: false
      }
  );

  // Function to calculate total price with formulas
  const calculateTotalPrice = useCallback(() => {
    if (!selectedPrograms?.length) return 0;

    // Find prices for selected programs
    const selectedProgramPrices = programs
        ?.filter(program => selectedPrograms?.includes(program.id))
        .map(program => program.price) || [];

    const cartTotalBeforeFormula = selectedProgramPrices.reduce((sum, price) => sum + price, 0);

    // Apply formulas based on item count
    if (selectedPrograms?.length >= 5) {
      // Excellence formula: fixed price for unlimited
      return PRICING_PLANS.find(plan => plan.id === 'excellence')?.price || 0;
    }
    else if (selectedPrograms?.length === 3) { // Exactly 3 for Advantage
      // Advantage formula: only for exactly 3 courses
      return PRICING_PLANS.find(plan => plan.id === 'advantage')?.price || 0;
    }
    else if (selectedPrograms?.length > 0) {
      // Essential formula: first course + reduced price for others
      const essentialPlan = PRICING_PLANS.find(plan => plan.id === 'essential');
      const firstCoursePrice = essentialPlan?.basePrice || 0;
      const additionalCoursePrice = essentialPlan?.additionalPrice || 0;
      const additionalCourses = selectedPrograms?.length - 1;
      return firstCoursePrice + (additionalCourses * additionalCoursePrice);
    }

    return 0;
  }, [selectedPrograms, programs]);

  // Get applicable formula
  const getApplicableFormula = useCallback(() => {
    if (selectedPrograms?.length >= 5) {
      return PRICING_PLANS.find(plan => plan.id === 'excellence');
    } else if (selectedPrograms?.length === 3) {
      return PRICING_PLANS.find(plan => plan.id === 'advantage');
    } else if (selectedPrograms?.length > 0) {
      return PRICING_PLANS.find(plan => plan.id === 'essential');
    }
    return null;
  }, [selectedPrograms]);

  // Backdrop component for bottom sheets
  const renderBackdrop = useCallback((props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.8}
          pressBehavior="close"
      />
  ), []);

  // Update formula suggestions when selected programs change
  useEffect(() => {
    if (selectedPrograms?.length > 0) {
      const bestPlan = getApplicableFormula();
      if (bestPlan) {
        setSuggestedPlan(bestPlan);
      } else {
        setSuggestedPlan(null);
      }
    } else {
      setSuggestedPlan(null);
    }

    // Update the total price
    setTotalPrice(calculateTotalPrice());
  }, [selectedPrograms, getApplicableFormula, calculateTotalPrice]);

  // 3. Memoize the filtered programs
  const applyFiltersCallback = useCallback((programsToFilter: Program[]) => {
    if (!programsToFilter || programsToFilter?.length === 0) return [];

    let filtered = [...programsToFilter];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(program =>
          program?.learning_path?.title?.toLowerCase()?.includes(query) ||
          program?.concour?.name?.toLowerCase()?.includes(query)
      );
    }

    // Apply cycle filter
    if (selectedCycle) {
      filtered = filtered.filter(program => program?.concour?.cycle_id === selectedCycle);
    }

    // Apply city filter
    if (selectedCity) {
      filtered = filtered.filter(program => program?.concour?.city_id === selectedCity);
    }

    // Apply school filter
    if (selectedSchool) {
      filtered = filtered.filter(program => program?.concour?.schoolId === selectedSchool);
    }

    // Apply price range filter
    filtered = filtered.filter(program =>
        program?.price >= priceRange[0] && program?.price <= priceRange[1]
    );

    // Apply sorting
    switch(sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'date':
        filtered.sort((a, b) => {
          const dateA = a.concour.nextDate ? new Date(a.concour.nextDate) : new Date();
          const dateB = b.concour.nextDate ? new Date(b.concour.nextDate) : new Date();
          return dateA.getTime() - dateB.getTime();
        });
        break;
      default:
        // Default sorting
        break;
    }

    return filtered;
  }, [filterDependencies]);

  // 4. Get paginated results for current page
  const getPaginatedResults = useCallback((allResults: Program[]) => {
    const startIndex = page * ITEMS_PER_PAGE;
    return allResults.slice(0, startIndex + ITEMS_PER_PAGE);
  }, [page, ITEMS_PER_PAGE]);

  // 5. Apply filters and update state when data or filters change
  useEffect(() => {
    if (programs) {
      // Use previous data during loading to prevent flashing
      const filtered = applyFiltersCallback(programs);
      setFilteredPrograms(filtered);

      // Only hide the skeleton after we have data
      if (isInitialLoad && programs?.length > 0) {
        setShowSkeleton(false);
        setIsInitialLoad(false);
      }

      // Reset to first page when filters change
      if (page !== 0) setPage(0);
    }
  }, [programs, applyFiltersCallback]);

  // Load more items when scrolling to the end
  const handleLoadMore = useCallback(() => {
    if ((page + 1) * ITEMS_PER_PAGE < filteredPrograms?.length) {
      setPage(prevPage => prevPage + 1);
    }
  }, [page, filteredPrograms?.length, ITEMS_PER_PAGE]);

  // Get displayed programs based on pagination
  const displayedPrograms = useMemo(() =>
          getPaginatedResults(filteredPrograms),
      [filteredPrograms, getPaginatedResults]);

  // Persist programs between renders
  const [prevPrograms, setPrevPrograms] = useState([]);

  // Keep previous data until new data arrives
  useEffect(() => {
    if (programs && programs?.length > 0) {
      setPrevPrograms(programs);
    }
  }, [programs]);

  // Handle program details loading
  const handleProgramExpand = useCallback(async (programId: number) => {
    // Check if we already have details cached
    if (programDetailsCache.current.has(programId)) {
      const cachedDetails = programDetailsCache.current.get(programId);
      // Update state so component re-renders
      setProgramDetailsMap(prev => ({
        ...prev,
        [programId]: cachedDetails
      }));
      return cachedDetails;
    }

    // If not, fetch details and cache them
    try {
      const details = await loadProgramDetails(programId);
      if (details) {
        // Cache for future use
        programDetailsCache.current.set(programId, details);

        // Update state so component re-renders with details
        setProgramDetailsMap(prev => ({
          ...prev,
          [programId]: details
        }));

        return details;
      }
    } catch (error) {
      console.error("Error loading program details:", error);
    }

    return null;
  }, []);

  const handleProgramSelect = async (program: Program) => {
    try {
      const programId = program?.id;
      if (!programId) return;

      if (selectedPrograms?.includes(programId)) {
        const newSelectedPrograms = selectedPrograms.filter(id => id !== programId);
        setSelectedPrograms(newSelectedPrograms);
        await removeFromCart(programId);
      } else {
        const newSelectedPrograms = [...(selectedPrograms || []), programId];
        setSelectedPrograms(newSelectedPrograms);
        await addToCart(programId, program.price || 0);
      }
    } catch (error) {
      console.error('Error managing cart:', error);
    }
  };

  const resetFilters = useCallback(() => {
    setSelectedCycle(null);
    setSelectedCity(null);
    setSelectedSchool(null);
    setPriceRange([0, 1000000]);
    setSortBy('default');
    setSearchQuery('');
    setPage(0);
  }, []);

  // Handlers for bottom sheets
  const handleFormulaDetailsClick = useCallback(() => {
    formulaDetailsRef.current?.present();
  }, []);

  const handleFormulaProgressClick = useCallback(() => {
    formulaProgressRef.current?.present();
  }, []);

  const handleCartCheckoutClick = useCallback(() => {
    cartCheckoutRef.current?.present();
  }, []);

  const renderFilterOption = useCallback(({ item, selected, onSelect }) => (
      <TouchableOpacity
          style={[
            styles.filterOption,
            selected && styles.filterOptionSelected,
            isDark && styles.filterOptionDark,
            selected && isDark && styles.filterOptionSelectedDark
          ]}
          onPress={onSelect}
      >
        <Text style={[
          styles.filterOptionText,
          selected && styles.filterOptionTextSelected,
          isDark && styles.filterOptionTextDark
        ]}>
          {item.name}
        </Text>
        {selected && (
            <MaterialCommunityIcons
                name="check"
                size={16}
                color={isDark ? theme.color.primary[300] : theme.color.primary[500]}
            />
        )}
      </TouchableOpacity>
  ), [isDark]);

  const renderEmptyState = useCallback(() => (
      <View style={styles.emptyResultsContainer}>
        <MaterialCommunityIcons
            name="magnify-scan"
            size={60}
            color={isDark ? theme.color.gray[600] : theme.color.gray[300]}
        />
        <Text style={[styles.emptyResultsText, isDark && styles.emptyResultsTextDark]}>
          Aucun programme trouvé
        </Text>
        <Text style={[styles.emptyResultsSubText, isDark && styles.emptyResultsSubTextDark]}>
          Essayez d'ajuster vos filtres ou votre recherche
        </Text>
        <TouchableOpacity
            style={[styles.resetButton, isDark && styles.resetButtonDark]}
            onPress={resetFilters}
        >
          <Text style={styles.resetButtonText}>Réinitialiser les filtres</Text>
        </TouchableOpacity>
      </View>
  ), [isDark, resetFilters]);

  // Formula details bottom sheet
  const renderFormulaDetailsSheet = useCallback(() => {
    return (
        <BottomSheetModal
            ref={formulaDetailsRef}
            index={1}
            snapPoints={snapPoints}
            backdropComponent={renderBackdrop}
            handleIndicatorStyle={styles.sheetHandle}
            backgroundStyle={[styles.sheetBackground, isDark && styles.sheetBackgroundDark]}
            enablePanDownToClose={true}
        >
          <View style={styles.packageHeader}>
            <Text style={[styles.packageTitle, isDark && styles.packageTitleDark]}>
              Nos formules d'abonnement
            </Text>
            <TouchableOpacity onPress={() => formulaDetailsRef.current?.dismiss()}>
              <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
              />
            </TouchableOpacity>
          </View>

          <BottomSheetScrollView contentContainerStyle={styles.packageScrollContent}>
            <Text style={[styles.formulasTitle, isDark && styles.formulasTitleDark]}>
              Choisissez la formule qui vous convient
            </Text>

            {/* Formule Essentielle */}
            <Animatable.View
                animation="fadeInUp"
                delay={100}
                style={[styles.packageCard, isDark && styles.packageCardDark]}
            >
              <View style={[styles.packageBadge, { backgroundColor: PRICING_PLANS[0].color }]}>
                <Text style={styles.packageBadgeText}>
                  À l'unité
                </Text>
              </View>

              <Text style={[styles.packageName, isDark && styles.packageNameDark]}>
                {PRICING_PLANS[0].name}
              </Text>

              <Text style={[styles.packageDescription, isDark && styles.packageDescriptionDark]}>
                {PRICING_PLANS[0].description}
              </Text>

              <View style={styles.pricingRow}>
                <Text style={[styles.packagePrice, isDark && styles.packagePriceDark]}>
                  À partir de {PRICING_PLANS[0].basePrice?.toLocaleString('fr-FR')} FCFA
                </Text>
              </View>

              <View style={styles.featuresList}>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons
                      name="check-circle"
                      size={18}
                      color={isDark ? PRICING_PLANS[0].color : PRICING_PLANS[0].color}
                  />
                  <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                    Première formation: {PRICING_PLANS[0].basePrice?.toLocaleString('fr-FR')} FCFA
                  </Text>
                </View>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons
                      name="check-circle"
                      size={18}
                      color={isDark ? PRICING_PLANS[0].color : PRICING_PLANS[0].color}
                  />
                  <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                    Formations supplémentaires: {PRICING_PLANS[0].additionalPrice?.toLocaleString('fr-FR')} FCFA chacune
                  </Text>
                </View>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons
                      name="check-circle"
                      size={18}
                      color={isDark ? PRICING_PLANS[0].color : PRICING_PLANS[0].color}
                  />
                  <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                    Paiement à l'unité
                  </Text>
                </View>
              </View>
            </Animatable.View>

            {/* Formule Avantage */}
            <Animatable.View
                animation="fadeInUp"
                delay={200}
                style={[
                  styles.packageCard,
                  isDark && styles.packageCardDark,
                  PRICING_PLANS[1].recommended && styles.recommendedCard,
                  { borderColor: PRICING_PLANS[1].color }
                ]}
            >
              <View style={[styles.packageBadge, { backgroundColor: PRICING_PLANS[1].color }]}>
                <Text style={styles.packageBadgeText}>
                  Recommandé
                </Text>
              </View>

              <Text style={[styles.packageName, isDark && styles.packageNameDark]}>
                {PRICING_PLANS[1].name}
              </Text>

              <Text style={[styles.packageDescription, isDark && styles.packageDescriptionDark]}>
                {PRICING_PLANS[1].description}
              </Text>

              <View style={styles.pricingRow}>
                <Text style={[styles.packagePrice, isDark && styles.packagePriceDark]}>
                  {PRICING_PLANS[1].price?.toLocaleString('fr-FR')} FCFA
                </Text>
              </View>

              <View style={styles.featuresList}>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons
                      name="check-circle"
                      size={18}
                      color={isDark ? PRICING_PLANS[1].color : PRICING_PLANS[1].color}
                  />
                  <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                    Pack de 3 formations au choix
                  </Text>
                </View>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons
                      name="check-circle"
                      size={18}
                      color={isDark ? PRICING_PLANS[1].color : PRICING_PLANS[1].color}
                  />
                  <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                    Économisez par rapport à l'achat à l'unité
                  </Text>
                </View>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons
                      name="check-circle"
                      size={18}
                      color={isDark ? PRICING_PLANS[1].color : PRICING_PLANS[1].color}
                  />
                  <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                    Accès à toutes les ressources
                  </Text>
                </View>
              </View>
            </Animatable.View>

            {/* Formule Excellence */}
            <Animatable.View
                animation="fadeInUp"
                delay={300}
                style={[
                  styles.packageCard,
                  isDark && styles.packageCardDark,
                  { borderColor: PRICING_PLANS[2].color }
                ]}
            >
              <View style={[styles.packageBadge, { backgroundColor: PRICING_PLANS[2].color }]}>
                <Text style={styles.packageBadgeText}>
                  Illimité
                </Text>
              </View>

              <Text style={[styles.packageName, isDark && styles.packageNameDark]}>
                {PRICING_PLANS[2].name}
              </Text>

              <Text style={[styles.packageDescription, isDark && styles.packageDescriptionDark]}>
                {PRICING_PLANS[2].description}
              </Text>

              <View style={styles.pricingRow}>
                <Text style={[styles.packagePrice, isDark && styles.packagePriceDark]}>
                  {PRICING_PLANS[2].price?.toLocaleString('fr-FR')} FCFA
                </Text>
              </View>

              <View style={styles.featuresList}>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons
                      name="check-circle"
                      size={18}
                      color={isDark ? PRICING_PLANS[2].color : PRICING_PLANS[2].color}
                  />
                  <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                    Accès illimité à toutes les formations pendant 12 mois
                  </Text>
                </View>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons
                      name="check-circle"
                      size={18}
                      color={isDark ? PRICING_PLANS[2].color : PRICING_PLANS[2].color}
                  />
                  <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                    Accès aux formations futures sans frais supplémentaires
                  </Text>
                </View>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons
                      name="check-circle"
                      size={18}
                      color={isDark ? PRICING_PLANS[2].color : PRICING_PLANS[2].color}
                  />
                  <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                    Accès à toutes les ressources premium
                  </Text>
                </View>
              </View>
            </Animatable.View>

            {/* Button to view cart */}
            {selectedPrograms?.length > 0 && (
                <TouchableOpacity
                    style={styles.viewCartButton}
                    onPress={handleCartCheckoutClick}
                >
                  <MaterialCommunityIcons name="cart" size={20} color="#FFFFFF" />
                  <Text style={styles.viewCartButtonText}>
                    Voir mon panier ({selectedPrograms?.length})
                  </Text>
                </TouchableOpacity>
            )}
          </BottomSheetScrollView>
        </BottomSheetModal>
    );
  }, [isDark, snapPoints, renderBackdrop, selectedPrograms?.length, handleCartCheckoutClick]);

  // Formula progress bottom sheet
  const renderFormulaProgressSheet = useCallback(() => {
    // Calculate current total and with formulas
    const currentTotal = programs
        ?.filter(program => selectedPrograms?.includes(program.id))
        .reduce((sum, program) => sum + program.price, 0) || 0;

    const formulaPrice = calculateTotalPrice();
    const savings = Math.max(0, currentTotal - formulaPrice);

    // Get applicable formula
    const applicableFormula = getApplicableFormula();

    return (
        <BottomSheetModal
            ref={formulaProgressRef}
            index={1}
            snapPoints={snapPoints}
            backdropComponent={renderBackdrop}
            handleIndicatorStyle={styles.sheetHandle}
            backgroundStyle={[styles.sheetBackground, isDark && styles.sheetBackgroundDark]}
            enablePanDownToClose={true}
        >
          <View style={styles.packageHeader}>
            <Text style={[styles.packageTitle, isDark && styles.packageTitleDark]}>
              Votre progression
            </Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                  style={styles.infoButton}
                  onPress={handleFormulaDetailsClick}
              >
                <MaterialCommunityIcons
                    name="information-outline"
                    size={22}
                    color={isDark ? theme.color.gray[300] : theme.color.gray[600]}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => formulaProgressRef.current?.dismiss()}>
                <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
                />
              </TouchableOpacity>
            </View>
          </View>

          <BottomSheetScrollView contentContainerStyle={styles.packageScrollContent}>
            {/* Current cart status */}
            <View style={[styles.currentStatusCard, isDark && styles.currentStatusCardDark]}>
              <Text style={[styles.currentStatusTitle, isDark && styles.currentStatusTitleDark]}>
                Votre sélection actuelle
              </Text>

              <View style={styles.currentStatusDetails}>
                <Text style={[styles.currentStatusText, isDark && styles.currentStatusTextDark]}>
                  {selectedPrograms?.length} programme{selectedPrograms?.length > 1 ? 's' : ''} dans votre panier
                </Text>

                <Text style={[styles.currentStatusPrice, isDark && styles.currentStatusPriceDark]}>
                  Prix total: {currentTotal.toLocaleString('fr-FR')} FCFA
                </Text>

                {applicableFormula && savings > 0 && (
                    <View style={[styles.savingsInfoContainer, { backgroundColor: applicableFormula.color + '20', borderColor: applicableFormula.color }]}>
                      <MaterialCommunityIcons name="information-outline" size={20} color={applicableFormula.color} />
                      <Text style={[styles.savingsInfoText, { color: applicableFormula.color }]}>
                        Avec la {applicableFormula.name}, vous économisez {savings.toLocaleString('fr-FR')} FCFA!
                      </Text>
                    </View>
                )}

                <TouchableOpacity
                    style={styles.continueButton}
                    onPress={handleCartCheckoutClick}
                >
                  <MaterialCommunityIcons name="cart" size={20} color="#FFFFFF" />
                  <Text style={styles.continueButtonText}>
                    Voir mon panier
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Progress toward each formula */}
            <Text style={[styles.progressTitle, isDark && styles.progressTitleDark]}>
              Votre progression vers chaque formule
            </Text>

            {/* Formule Avantage */}
            <Animatable.View
                animation="fadeInUp"
                delay={200}
                style={[
                  styles.progressCard,
                  isDark && styles.progressCardDark,
                  selectedPrograms?.length === 3 && { borderColor: PRICING_PLANS[1].color, borderWidth: 2 }
                ]}
            >
              <View style={styles.progressHeader}>
                <View>
                  <Text style={[styles.progressCardTitle, isDark && styles.progressCardTitleDark]}>
                    {PRICING_PLANS[1].name}
                  </Text>
                  <Text style={[styles.progressCardPrice, isDark && styles.progressCardPriceDark]}>
                    {PRICING_PLANS[1].price?.toLocaleString('fr-FR')} FCFA
                  </Text>
                </View>
                {selectedPrograms?.length === 3 && (
                    <View style={[styles.eligibilityBadge, {backgroundColor: PRICING_PLANS[1].color}]}>
                      <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                      <Text style={styles.eligibilityBadgeText}>Éligible</Text>
                    </View>
                )}
              </View>

              <Text style={[styles.progressCardDescription, isDark && styles.progressCardDescriptionDark]}>
                Pack de 3 formations à prix avantageux
              </Text>

              <View style={styles.progressBarWrapper}>
                <Text style={[styles.progressLabel, isDark && styles.progressLabelDark]}>
                  {selectedPrograms?.length < 3
                      ? `Ajoutez ${3 - selectedPrograms?.length} programme${3 - selectedPrograms?.length > 1 ? 's' : ''} de plus pour débloquer cette formule`
                      : 'Formule débloquée !'}
                </Text>
                <FormulaProgressBar
                    planId="advantage"
                    currentCount={Math.min(selectedPrograms?.length, 3)}
                    threshold={3}
                    color={PRICING_PLANS[1].color}
                    isDark={isDark}
                />
              </View>

              {selectedPrograms?.length === 3 && (
                  <View style={[styles.savingsSummary, { backgroundColor: PRICING_PLANS[1].color + '15' }]}>
                    <MaterialCommunityIcons name="cash" size={18} color={PRICING_PLANS[1].color} />
                    <Text style={[styles.savingsSummaryText, { color: PRICING_PLANS[1].color }]}>
                      Économie estimée: {(currentTotal - (PRICING_PLANS[1].price || 0))?.toLocaleString('fr-FR')} FCFA
                    </Text>
                  </View>
              )}
            </Animatable.View>

            {/* Formule Excellence */}
            <Animatable.View
                animation="fadeInUp"
                delay={300}
                style={[
                  styles.progressCard,
                  isDark && styles.progressCardDark,
                  selectedPrograms?.length >= 5 && { borderColor: PRICING_PLANS[2].color, borderWidth: 2 }
                ]}
            >
              <View style={styles.progressHeader}>
                <View>
                  <Text style={[styles.progressCardTitle, isDark && styles.progressCardTitleDark]}>
                    {PRICING_PLANS[2].name}
                  </Text>
                  <Text style={[styles.progressCardPrice, isDark && styles.progressCardPriceDark]}>
                    {PRICING_PLANS[2].price?.toLocaleString('fr-FR')} FCFA
                  </Text>
                </View>
                {selectedPrograms?.length >= 5 && (
                    <View style={[styles.eligibilityBadge, {backgroundColor: PRICING_PLANS[2].color}]}>
                      <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                      <Text style={styles.eligibilityBadgeText}>Éligible</Text>
                    </View>
                )}
              </View>

              <Text style={[styles.progressCardDescription, isDark && styles.progressCardDescriptionDark]}>
                Accès illimité à toutes les formations pendant 12 mois
              </Text>

              <View style={styles.progressBarWrapper}>
                <Text style={[styles.progressLabel, isDark && styles.progressLabelDark]}>
                  {selectedPrograms?.length < 5
                      ? `Ajoutez ${5 - selectedPrograms?.length} programme${5 - selectedPrograms?.length > 1 ? 's' : ''} de plus pour débloquer cette formule`
                      : 'Formule débloquée !'}
                </Text>
                <FormulaProgressBar
                    planId="excellence"
                    currentCount={Math.min(selectedPrograms?.length, 5)}
                    threshold={5}
                    color={PRICING_PLANS[2].color}
                    isDark={isDark}
                />
              </View>

              {selectedPrograms?.length >= 5 && (
                  <View style={[styles.savingsSummary, { backgroundColor: PRICING_PLANS[2].color + '15' }]}>
                    <MaterialCommunityIcons name="cash" size={18} color={PRICING_PLANS[2].color} />
                    <Text style={[styles.savingsSummaryText, { color: PRICING_PLANS[2].color }]}>
                      Économie estimée: {(currentTotal - (PRICING_PLANS[2].price || 0)).toLocaleString('fr-FR')} FCFA
                    </Text>
                  </View>
              )}
            </Animatable.View>

            {/* Guide message */}
            {selectedPrograms?.length > 0 && (
                <View style={styles.guideMessageContainer}>
                  <MaterialCommunityIcons
                      name="lightbulb-outline"
                      size={20}
                      color={isDark ? theme.color.primary[300] : theme.color.primary[600]}
                  />
                  <Text style={[styles.guideMessageText, isDark && styles.guideMessageTextDark]}>
                    Explorez nos formules pour trouver le meilleur rapport qualité-prix selon vos besoins.
                  </Text>
                </View>
            )}
          </BottomSheetScrollView>
        </BottomSheetModal>
    );
  }, [
    selectedPrograms,
    isDark,
    snapPoints,
    renderBackdrop,
    calculateTotalPrice,
    getApplicableFormula,
    handleFormulaDetailsClick,
    handleCartCheckoutClick,
    programs
  ]);

  // Cart and checkout bottom sheet
  const renderCartCheckoutSheet = useCallback(() => {
    // Get selected program details
    const selectedProgramDetails = programs
        ?.filter(program => selectedPrograms?.includes(program.id)) || [];

    const currentTotal = selectedProgramDetails.reduce((sum, program) => sum + program.price, 0) || 0;
    const formulaPrice = calculateTotalPrice();
    const savings = Math.max(0, currentTotal - formulaPrice);
    const applicableFormula = getApplicableFormula();

    return (
        <BottomSheetModal
            ref={cartCheckoutRef}
            index={1}
            snapPoints={snapPoints}
            backdropComponent={renderBackdrop}
            handleIndicatorStyle={styles.sheetHandle}
            backgroundStyle={[styles.sheetBackground, isDark && styles.sheetBackgroundDark]}
            enablePanDownToClose={true}
        >
          <View style={styles.packageHeader}>
            <Text style={[styles.packageTitle, isDark && styles.packageTitleDark]}>
              Votre panier
            </Text>
            <TouchableOpacity onPress={() => cartCheckoutRef.current?.dismiss()}>
              <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
              />
            </TouchableOpacity>
          </View>

          <BottomSheetScrollView contentContainerStyle={styles.packageScrollContent}>
            {selectedProgramDetails?.length > 0 ? (
                <>
                  {/* Cart summary section */}
                  <View style={[styles.cartSummaryCard, isDark && styles.cartSummaryCardDark]}>
                    <Text style={[styles.cartSummaryTitle, isDark && styles.cartSummaryTitleDark]}>
                      Récapitulatif de votre commande
                    </Text>

                    {applicableFormula && (
                        <View style={[styles.appliedFormulaContainer, { backgroundColor: applicableFormula.color + '15', borderColor: applicableFormula.color }]}>
                          <MaterialCommunityIcons name="tag" size={20} color={applicableFormula.color} />
                          <Text style={[styles.appliedFormulaText, { color: applicableFormula.color }]}>
                            {applicableFormula.name} appliquée
                          </Text>
                        </View>
                    )}

                    {/* List of selected programs */}
                    <View style={styles.selectedProgramsList}>
                      {selectedProgramDetails.map((program) => (
                          <View key={`cart-item-${program.id}`} style={styles.cartItemRow}>
                            <View style={styles.cartItemInfo}>
                              <Text style={[styles.cartItemTitle, isDark && styles.cartItemTitleDark]} numberOfLines={1}>
                                {program.learning_path.title}
                              </Text>
                              <Text style={[styles.cartItemSchool, isDark && styles.cartItemSchoolDark]} numberOfLines={1}>
                                {program.concour.name}
                              </Text>
                            </View>
                            <View style={styles.cartItemPrice}>
                              <Text style={[styles.cartItemPriceText, isDark && styles.cartItemPriceTextDark]}>
                                {program.price.toLocaleString('fr-FR')} FCFA
                              </Text>
                              <TouchableOpacity
                                  style={styles.removeItemButton}
                                  onPress={() => handleProgramSelect(program)}
                              >
                                <MaterialCommunityIcons
                                    name="close"
                                    size={18}
                                    color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                      ))}
                    </View>

                    {/* Price breakdown */}
                    <View style={styles.priceBreakdownContainer}>
                      <View style={styles.priceRow}>
                        <Text style={[styles.priceLabel, isDark && styles.priceLabelDark]}>
                          Sous-total
                        </Text>
                        <Text style={[styles.priceValue, isDark && styles.priceValueDark]}>
                          {currentTotal.toLocaleString('fr-FR')} FCFA
                        </Text>
                      </View>

                      {savings > 0 && (
                          <View style={styles.priceRow}>
                            <Text style={[styles.discountLabel, isDark && styles.discountLabelDark]}>
                              Réduction ({applicableFormula?.name})
                            </Text>
                            <Text style={[styles.discountValue, isDark && styles.discountValueDark]}>
                              -{savings.toLocaleString('fr-FR')} FCFA
                            </Text>
                          </View>
                      )}

                      <View style={[styles.totalRow, isDark && styles.totalRowDark]}>
                        <Text style={[styles.totalLabel, isDark && styles.totalLabelDark]}>
                          Total
                        </Text>
                        <Text style={[styles.totalValue, isDark && styles.totalValueDark]}>
                          {formulaPrice.toLocaleString('fr-FR')} FCFA
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Payment options */}
                  <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
                    Modes de paiement
                  </Text>

                  <View style={[styles.paymentOptionsCard, isDark && styles.paymentOptionsCardDark]}>
                    <TouchableOpacity style={styles.paymentOption}>
                      <MaterialCommunityIcons
                          name="cellphone"
                          size={24}
                          color={isDark ? theme.color.primary[300] : theme.color.primary[600]}
                      />
                      <Text style={[styles.paymentOptionText, isDark && styles.paymentOptionTextDark]}>
                        Orange Money
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.paymentOption}>
                      <MaterialCommunityIcons
                          name="cellphone"
                          size={24}
                          color={isDark ? theme.color.primary[300] : theme.color.primary[600]}
                      />
                      <Text style={[styles.paymentOptionText, isDark && styles.paymentOptionTextDark]}>
                        Mobile Money
                      </Text>
                    </TouchableOpacity>


                  </View>


                  {/* Secure payment message */}
                  <View style={styles.securePaymentContainer}>
                    <MaterialCommunityIcons
                        name="shield-check"
                        size={18}
                        color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
                    />
                    <Text style={[styles.securePaymentText, isDark && styles.securePaymentTextDark]}>
                      Paiement sécurisé & Protection des données
                    </Text>
                  </View>
                </>
            ) : (
                // Empty cart state
                <View style={styles.emptyCartContainer}>
                  <MaterialCommunityIcons
                      name="cart-outline"
                      size={64}
                      color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
                  />
                  <Text style={[styles.emptyCartTitle, isDark && styles.emptyCartTitleDark]}>
                    Votre panier est vide
                  </Text>
                  <Text style={[styles.emptyCartText, isDark && styles.emptyCartTextDark]}>
                    Ajoutez des programmes à votre panier pour continuer
                  </Text>
                  <TouchableOpacity
                      style={styles.browseButton}
                      onPress={() => cartCheckoutRef.current?.dismiss()}
                  >
                    <Text style={styles.browseButtonText}>
                      Parcourir les programmes
                    </Text>
                  </TouchableOpacity>
                </View>
            )}
          </BottomSheetScrollView>
        </BottomSheetModal>
    );
  }, [
    programs,
    selectedPrograms,
    isDark,
    snapPoints,
    renderBackdrop,
    calculateTotalPrice,
    getApplicableFormula,
    handleProgramSelect
  ]);

  // Show skeleton screen only during initial load, not on subsequent refreshes
  if (isInitialLoad && showSkeleton && !programs) {
    return <ProgramSkeletonScreen isDark={isDark} />;
  }

  // Show error state
  if (programsError) {
    return (
        <View style={[styles.loadingContainer, isDark && { backgroundColor: theme.color.dark.background.primary }]}>
          <MaterialCommunityIcons
              name="alert-circle-outline"
              size={60}
              color={isDark ? theme.color.error[300] : theme.color.error[500]}
          />
          <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
            Erreur lors du chargement des programmes. Veuillez réessayer.
          </Text>
          <TouchableOpacity
              style={styles.retryButton}
              onPress={() => window.location.reload()}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
    );
  }

  return (
      <BottomSheetModalProvider>
        <Animatable.View
            animation="fadeInUp"
            duration={800}
            style={[
              styles.programsContainer,
              isDark && styles.programsContainerDark
            ]}
        >
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <MaterialCommunityIcons
                  name="magnify"
                  size={20}
                  color={isDark ? theme.color.gray[400] : theme.color.gray[500]}
                  style={styles.searchIcon}
              />
              <TextInput
                  style={[
                    styles.searchInput,
                    isDark && styles.searchInputDark
                  ]}
                  placeholder="Rechercher des programmes..."
                  placeholderTextColor={isDark ? theme.color.gray[400] : theme.color.gray[500]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
              />
              {searchQuery !== '' && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <MaterialCommunityIcons
                        name="close-circle"
                        size={20}
                        color={isDark ? theme.color.gray[400] : theme.color.gray[500]}
                    />
                  </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
                style={[
                  styles.filterButton,
                  isDark && styles.filterButtonDark,
                  (selectedCycle || selectedCity || selectedSchool || sortBy !== 'default') && styles.filterButtonActive
                ]}
                onPress={() => setShowFilters(true)}
            >
              <MaterialCommunityIcons
                  name="filter-variant"
                  size={20}
                  color={
                    (selectedCycle || selectedCity || selectedSchool || sortBy !== 'default')
                        ? 'white'
                        : isDark
                            ? theme.color.gray[300]
                            : theme.color.gray[700]
                  }
              />
            </TouchableOpacity>
          </View>

          {/* Filter chips display */}
          {(selectedCycle || selectedCity || selectedSchool || sortBy !== 'default') && filterOptions && (
              <View style={styles.activeFiltersContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.activeFiltersScroll}
                >
                  {selectedCycle && (
                      <View style={[styles.filterChip, isDark && styles.filterChipDark]}>
                        <Text style={[styles.filterChipText, isDark && styles.filterChipTextDark]}>
                          {filterOptions.cycles.find(c => c.id === selectedCycle)?.name}
                        </Text>
                        <TouchableOpacity onPress={() => setSelectedCycle(null)}>
                          <MaterialCommunityIcons name="close" size={16} color={isDark ? theme.color.gray[300] : theme.color.gray[700]} />
                        </TouchableOpacity>
                      </View>
                  )}

                  {selectedCity && (
                      <View style={[styles.filterChip, isDark && styles.filterChipDark]}>
                        <Text style={[styles.filterChipText, isDark && styles.filterChipTextDark]}>
                          {filterOptions.cities.find(c => c.id === selectedCity)?.name}
                        </Text>
                        <TouchableOpacity onPress={() => setSelectedCity(null)}>
                          <MaterialCommunityIcons name="close" size={16} color={isDark ? theme.color.gray[300] : theme.color.gray[700]} />
                        </TouchableOpacity>
                      </View>
                  )}

                  {selectedSchool && (
                      <View style={[styles.filterChip, isDark && styles.filterChipDark]}>
                        <Text style={[styles.filterChipText, isDark && styles.filterChipTextDark]}>
                          {filterOptions.schools.find(s => s.id === selectedSchool)?.name}
                        </Text>
                        <TouchableOpacity onPress={() => setSelectedSchool(null)}>
                          <MaterialCommunityIcons name="close" size={16} color={isDark ? theme.color.gray[300] : theme.color.gray[700]} />
                        </TouchableOpacity>
                      </View>
                  )}

                  {sortBy !== 'default' && (
                      <View style={[styles.filterChip, isDark && styles.filterChipDark]}>
                        <Text style={[styles.filterChipText, isDark && styles.filterChipTextDark]}>
                          {sortBy === 'price-asc' ? 'Prix ↑' :
                              sortBy === 'price-desc' ? 'Prix ↓' :
                                  'Date ↑'}
                        </Text>
                        <TouchableOpacity onPress={() => setSortBy('default')}>
                          <MaterialCommunityIcons name="close" size={16} color={isDark ? theme.color.gray[300] : theme.color.gray[700]} />
                        </TouchableOpacity>
                      </View>
                  )}

                  <TouchableOpacity
                      style={[styles.resetButton, isDark && styles.resetButtonDark]}
                      onPress={resetFilters}
                  >
                    <Text style={[styles.resetButtonText, isDark && styles.resetButtonTextDark]}>
                      Réinitialiser
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
          )}

          <FlatList
              data={displayedPrograms}
              renderItem={({ item }) => (
                  <ProgramCard
                      key={`program-${item.id}`}
                      title={item.learning_path.title}
                      description={item.learning_path.description}
                      price={item.price}
                      features={[
                        `Cours: ${item.learning_path.course_count}`,
                        `Quiz: ${item.learning_path.quiz_count}`,
                        `Exercices: ${item.exerciseCount || 0}`,
                        `Archives: ${item.archiveCount || 0}`,
                      ]}
                      level={item.learning_path.status}
                      duration={item.learning_path.duration}
                      image={item.concour.image?.url}
                      courseCount={item.learning_path.course_count}
                      quizCount={item.learning_path.quiz_count}
                      exerciseCount={item.exerciseCount || 0}
                      archiveCount={item.archiveCount || 0}
                      concoursName={item.concour.name}
                      schoolName={item.concour.schoolId}
                      isSelected={selectedPrograms?.includes(item.id) || false}
                      onSelect={() => handleProgramSelect(item)}
                      isDark={isDark}
                      programDetails={programDetailsMap[item.id]}
                      onExpand={() => handleProgramExpand(item.id)}
                  />
              )}
              keyExtractor={item => `program-${item.id}`}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={() => (
                  <View style={styles.headerContainer}>
                    <Text style={[
                      styles.programsTitle,
                      isDark && styles.programsTitleDark
                    ]}>
                      {knowsProgram ? "Choisissez votre programme" : "Programmes recommandés pour vous"}
                    </Text>

                    <Text style={[
                      styles.resultsCount,
                      isDark && styles.resultsCountDark
                    ]}>
                      {filteredPrograms?.length || 0} résultat{(filteredPrograms?.length || 0) !== 1 ? 's' : ''}
                    </Text>
                  </View>
              )}
              ListEmptyComponent={
                programsLoading && !programs?.length ?
                    <ActivityIndicator size="large" color={theme.color.primary[500]} style={{marginTop: 40}} /> :
                    renderEmptyState()
              }
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              windowSize={5}
              removeClippedSubviews={true}
              onEndReached={
                displayedPrograms?.length < filteredPrograms?.length ? handleLoadMore : undefined
              }
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                programsLoading && programs?.length > 0 ? (
                    <ActivityIndicator size="small" color={theme.color.primary[500]} style={{marginVertical: 20}} />
                ) : displayedPrograms?.length < filteredPrograms?.length ? (
                    <TouchableOpacity
                        style={styles.loadMoreButton}
                        onPress={handleLoadMore}
                    >
                      <Text style={styles.loadMoreButtonText}>Voir plus</Text>
                    </TouchableOpacity>
                ) : filteredPrograms?.length > 0 ? (
                    <View style={styles.endOfListIndicator}>
                      <Text style={[styles.endOfListText, isDark && styles.endOfListTextDark]}>
                        Fin des résultats
                      </Text>
                    </View>
                ) : null
              }
          />

          {/* Modified total price container with bundle icons */}
          <View style={[
            styles.totalPriceContainer,
            isDark && styles.totalPriceContainerDark
          ]}>
            <View style={styles.totalPriceRow}>
              <View style={styles.totalPriceActions}>
                <TouchableOpacity
                    style={styles.formulaButton}
                    onPress={handleFormulaDetailsClick}
                >
                  <MaterialCommunityIcons
                      name="tag-multiple"
                      size={24}
                      color={isDark ? theme.color.primary[300] : theme.color.primary[500]}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.formulaButton}
                    onPress={handleFormulaProgressClick}
                >
                  <MaterialCommunityIcons
                      name="chart-bar"
                      size={24}
                      color={isDark ? theme.color.primary[300] : theme.color.primary[500]}
                  />
                  {suggestedPlan && (
                      <View style={[styles.formulaBadge, { backgroundColor: suggestedPlan.color }]}>
                        <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                      </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.cartButton}
                    onPress={handleCartCheckoutClick}
                >
                  <MaterialCommunityIcons
                      name="cart"
                      size={24}
                      color={isDark ? theme.color.primary[300] : theme.color.primary[500]}
                  />
                  {selectedPrograms?.length > 0 && (
                      <View style={styles.cartBadge}>
                        <Text style={styles.cartBadgeText}>{selectedPrograms?.length}</Text>
                      </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.totalPriceInfo}>
                <Text style={[styles.totalPriceLabel, isDark && styles.totalPriceLabelDark]}>
                  Total :
                </Text>
                <Text style={[styles.totalPriceText, isDark && styles.totalPriceTextDark]}>
                  {totalPrice.toLocaleString()} FCFA
                </Text>
              </View>
            </View>


          </View>

          {/* Filter Modal */}
          <Modal
              visible={showFilters}
              animationType="slide"
              transparent={true}
              onRequestClose={() => setShowFilters(false)}
          >
            <View style={[styles.modalContainer, isDark && styles.modalContainerDark]}>
              <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
                    Filtres
                  </Text>
                  <TouchableOpacity onPress={() => setShowFilters(false)}>
                    <MaterialCommunityIcons
                        name="close"
                        size={24}
                        color={isDark ? theme.color.gray[300] : theme.color.gray[700]}
                    />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScroll}>
                  {filterOptions && (
                      <>
                        {/* Cycle Filter */}
                        <View style={styles.filterSection}>
                          <Text style={[styles.filterSectionTitle, isDark && styles.filterSectionTitleDark]}>
                            Niveau d'étude
                          </Text>
                          <FlatList
                              data={filterOptions.cycles}
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              keyExtractor={(item) => item.id}
                              renderItem={({ item }) => renderFilterOption({
                                item,
                                selected: selectedCycle === item.id,
                                onSelect: () => setSelectedCycle(selectedCycle === item.id ? null : item.id)
                              })}
                              contentContainerStyle={styles.filterOptionsList}
                          />
                        </View>

                        {/* City Filter */}
                        <View style={styles.filterSection}>
                          <Text style={[styles.filterSectionTitle, isDark && styles.filterSectionTitleDark]}>
                            Ville
                          </Text>
                          <FlatList
                              data={filterOptions.cities}
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              keyExtractor={(item) => item.id}
                              renderItem={({ item }) => renderFilterOption({
                                item,
                                selected: selectedCity === item.id,
                                onSelect: () => setSelectedCity(selectedCity === item.id ? null : item.id)
                              })}
                              contentContainerStyle={styles.filterOptionsList}
                          />
                        </View>

                        {/* School Filter */}
                        <View style={styles.filterSection}>
                          <Text style={[styles.filterSectionTitle, isDark && styles.filterSectionTitleDark]}>
                            École
                          </Text>
                          <FlatList
                              data={filterOptions.schools}
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              keyExtractor={(item) => item.id}
                              renderItem={({ item }) => renderFilterOption({
                                item,
                                selected: selectedSchool === item.id,
                                onSelect: () => setSelectedSchool(selectedSchool === item.id ? null : item.id)
                              })}
                              contentContainerStyle={styles.filterOptionsList}
                          />
                        </View>
                      </>
                  )}

                  {/* Sort By */}
                  <View style={styles.filterSection}>
                    <Text style={[styles.filterSectionTitle, isDark && styles.filterSectionTitleDark]}>
                      Trier par
                    </Text>
                    <View style={styles.sortButtons}>
                      <TouchableOpacity
                          style={[
                            styles.sortButton,
                            sortBy === 'price-asc' && styles.sortButtonSelected,
                            isDark && styles.sortButtonDark,
                            sortBy === 'price-asc' && isDark && styles.sortButtonSelectedDark
                          ]}
                          onPress={() => setSortBy(sortBy === 'price-asc' ? 'default' : 'price-asc')}
                      >
                        <MaterialCommunityIcons
                            name="sort-ascending"
                            size={20}
                            color={
                              sortBy === 'price-asc'
                                  ? '#FFF'
                                  : isDark
                                      ? theme.color.gray[300]
                                      : theme.color.gray[700]
                            }
                        />
                        <Text style={[
                          styles.sortButtonText,
                          sortBy === 'price-asc' && styles.sortButtonTextSelected,
                          isDark && styles.sortButtonTextDark
                        ]}>
                          Prix ↑
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                          style={[
                            styles.sortButton,
                            sortBy === 'price-desc' && styles.sortButtonSelected,
                            isDark && styles.sortButtonDark,
                            sortBy === 'price-desc' && isDark && styles.sortButtonSelectedDark
                          ]}
                          onPress={() => setSortBy(sortBy === 'price-desc' ? 'default' : 'price-desc')}
                      >
                        <MaterialCommunityIcons
                            name="sort-descending"
                            size={20}
                            color={
                              sortBy === 'price-desc'
                                  ? '#FFF'
                                  : isDark
                                      ? theme.color.gray[300]
                                      : theme.color.gray[700]
                            }
                        />
                        <Text style={[
                          styles.sortButtonText,
                          sortBy === 'price-desc' && styles.sortButtonTextSelected,
                          isDark && styles.sortButtonTextDark
                        ]}>
                          Prix ↓
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                          style={[
                            styles.sortButton,
                            sortBy === 'date' && styles.sortButtonSelected,
                            isDark && styles.sortButtonDark,
                            sortBy === 'date' && isDark && styles.sortButtonSelectedDark
                          ]}
                          onPress={() => setSortBy(sortBy === 'date' ? 'default' : 'date')}
                      >
                        <MaterialCommunityIcons
                            name="calendar"
                            size={20}
                            color={
                              sortBy === 'date'
                                  ? '#FFF'
                                  : isDark
                                      ? theme.color.gray[300]
                                      : theme.color.gray[700]
                            }
                        />
                        <Text style={[
                          styles.sortButtonText,
                          sortBy === 'date' && styles.sortButtonTextSelected,
                          isDark && styles.sortButtonTextDark
                        ]}>
                          Date
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                      style={[styles.modalResetButton, isDark && styles.modalResetButtonDark]}
                      onPress={resetFilters}
                  >
                    <Text style={[styles.modalResetButtonText, isDark && styles.modalResetButtonTextDark]}>
                      Réinitialiser
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                      style={[styles.modalApplyButton, isDark && styles.modalApplyButtonDark]}
                      onPress={() => setShowFilters(false)}
                  >
                    <Text style={styles.modalApplyButtonText}>
                      Appliquer
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Include the formula details bottom sheet */}
          {renderFormulaDetailsSheet()}

          {/* Include the formula progress bottom sheet */}
          {renderFormulaProgressSheet()}

          {/* Include the cart checkout bottom sheet */}
          {renderCartCheckoutSheet()}
        </Animatable.View>
      </BottomSheetModalProvider>
  );
};

export default Programs;

const styles = StyleSheet.create({
  programsContainer: {
    flex: 1,
  },
  programsContainerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.medium,
  },
  programsTitle: {
    fontFamily : theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.xlarge,
    fontWeight: "700",
    color: theme.color.text,
  },
  programsTitleDark: {
    color: theme.color.gray[50],
  },
  resultsCount: {
    fontFamily : theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.small,
    color: theme.color.gray[600],
  },
  resultsCountDark: {
    color: theme.color.gray[400],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.small,
    gap: 8,
    paddingVertical: theme.spacing.medium,
  },
  searchInputWrapper: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: theme.spacing.small,
    backgroundColor: theme.color.gray[50],
  },
  searchIcon: {
    marginRight: theme.spacing.small,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: theme.color.text,
  },
  searchInputDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.gray[700],
    color: theme.color.gray[50],
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.color.gray[100],
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  filterButtonDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.gray[700],
  },
  filterButtonActive: {
    backgroundColor: theme.color.primary[500],
    borderColor: theme.color.primary[500],
  },
  activeFiltersContainer: {
    marginBottom: theme.spacing.medium,
  },
  activeFiltersScroll: {
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.color.gray[100],
    borderWidth: 1,
    borderColor: theme.color.gray[200],
    marginRight: 8,
  },
  filterChipDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.gray[700],
  },
  filterChipText: {
    fontFamily : theme.typography.fontFamily,
    fontSize: 13,
    color: theme.color.gray[800],
    marginRight: 8,
  },
  filterChipTextDark: {
    color: theme.color.gray[300],
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.color.gray[200],
  },
  resetButtonDark: {
    backgroundColor: theme.color.gray[800],
  },
  resetButtonText: {
    fontFamily : theme.typography.fontFamily,
    fontSize: 13,
    color: theme.color.gray[800],
  },
  resetButtonTextDark: {
    color: theme.color.gray[300],
  },
  totalPriceContainer: {
    padding: theme.spacing.medium,
    borderTopWidth: 1,
    borderColor: theme.color.border,
  },
  totalPriceContainerDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.gray[700],
  },
  totalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalPriceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  formulaButton: {
    position: 'relative',
  },
  formulaBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartButton: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: theme.color.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  totalPriceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalPriceLabel: {
    fontFamily : theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.medium,
    color: theme.color.text,
  },
  totalPriceLabelDark: {
    color: theme.color.gray[300],
  },
  totalPriceText: {
    fontFamily : theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.large,
    fontWeight: "600",
    color: theme.color.text,
  },
  totalPriceTextDark: {
    color: theme.color.gray[50],
  },
  emptyResultsContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyResultsText: {
    fontFamily : theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: '600',
    color: theme.color.gray[800],
    marginTop: 16,
    marginBottom: 8,
  },
  emptyResultsTextDark: {
    color: theme.color.gray[300],
  },
  emptyResultsSubText: {
    fontFamily : theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[600],
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyResultsSubTextDark: {
    color: theme.color.gray[400],
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainerDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  modalContentDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.gray[200],
  },
  modalTitle: {
    fontFamily : theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: '600',
    color: theme.color.gray[900],
  },
  modalTitleDark: {
    color: theme.color.gray[50],
  },
  modalScroll: {
    marginBottom: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontFamily : theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: theme.color.gray[900],
    marginBottom: 12,
  },
  filterSectionTitleDark: {
    color: theme.color.gray[100],
  },
  filterOptionsList: {
    paddingRight: 16,
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: theme.color.gray[100],
    borderWidth: 1,
    borderColor: theme.color.gray[200],
    marginRight: 8,
  },
  filterOptionDark: {
    backgroundColor: theme.color.gray[800],
    borderColor: theme.color.gray[700],
  },
  filterOptionSelected: {
    backgroundColor: theme.color.primary[100],
    borderColor: theme.color.primary[500],
  },
  filterOptionSelectedDark: {
    backgroundColor: theme.color.primary[900],
    borderColor: theme.color.primary[700],
  },
  filterOptionText: {
    fontFamily : theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[700],
    marginRight: 8,
  },
  filterOptionTextDark: {
    color: theme.color.gray[300],
  },
  filterOptionTextSelected: {
    color: theme.color.primary[700],
    fontWeight: '500',
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.color.gray[100],
    borderWidth: 1,
    borderColor: theme.color.gray[200],
  },
  sortButtonDark: {
    backgroundColor: theme.color.gray[800],
    borderColor: theme.color.gray[700],
  },
  sortButtonSelected: {
    backgroundColor: theme.color.primary[500],
    borderColor: theme.color.primary[500],
  },
  sortButtonSelectedDark: {
    backgroundColor: theme.color.primary[600],
    borderColor: theme.color.primary[700],
  },
  sortButtonText: {
    fontFamily : theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[700],
    marginLeft: 8,
  },
  sortButtonTextDark: {
    color: theme.color.gray[300],
  },
  sortButtonTextSelected: {
    color: 'white',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.color.gray[200],
    paddingTop: 16,
  },
  modalResetButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: theme.color.gray[100],
    borderWidth: 1,
    borderColor: theme.color.gray[300],
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  modalResetButtonDark: {
    backgroundColor: theme.color.gray[800],
    borderColor: theme.color.gray[700],
  },
  modalResetButtonText: {
    fontFamily : theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: theme.color.gray[700],
  },
  modalResetButtonTextDark: {
    color: theme.color.gray[300],
  },
  modalApplyButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: theme.color.primary[500],
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  modalApplyButtonDark: {
    backgroundColor: theme.color.primary[600],
  },
  modalApplyButtonText: {
    fontFamily : theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontFamily : theme.typography.fontFamily,
    fontSize: 16,
    color: theme.color.gray[700],
  },
  loadingTextDark: {
    color: theme.color.gray[300],
  },
  // Pagination and list styles
  listContent: {
    paddingBottom: 80,
  },
  loadMoreButton: {
    padding: 12,
    backgroundColor: theme.color.primary[50],
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 16,
    marginHorizontal: 24,
    borderWidth: 1,
    borderColor: theme.color.primary[100],
  },
  loadMoreButtonText: {
    color: theme.color.primary[700],
    fontWeight: '600',
  },
  endOfListIndicator: {
    padding: 16,
    alignItems: 'center',
  },
  endOfListText: {
    fontFamily : theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[500],
    fontStyle: 'italic',
  },
  endOfListTextDark: {
    color: theme.color.gray[400],
  },
  // Error and retry styles
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: theme.color.primary[500],
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontFamily : theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
  },
  // Skeleton styles
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  skeletonText: {
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  skeletonCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  skeletonImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  skeletonCardContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
    gap: 8,
  },
  skeletonTitle: {
    width: '70%',
    height: 18,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  skeletonSubtitle: {
    width: '50%',
    height: 14,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  skeletonDescription: {
    width: '80%',
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  skeletonFeatures: {
    width: '40%',
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },

  // Bottom sheet styles
  sheetHandle: {
    backgroundColor: theme.color.gray[400],
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8
  },
  sheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetBackgroundDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.gray[200],
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoButton: {
    marginRight: 12,
  },
  packageScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  packageTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: '600',
    color: theme.color.gray[800]
  },
  packageTitleDark: {
    color: theme.color.gray[50]
  },
  formulasTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: '600',
    color: theme.color.gray[800],
    marginBottom: 16
  },
  formulasTitleDark: {
    color: theme.color.gray[50]
  },
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.color.gray[200],
    position: 'relative',
    overflow: 'hidden'
  },
  packageCardDark: {
    backgroundColor: theme.color.dark.background.primary,
    borderColor: theme.color.gray[700]
  },
  recommendedCard: {
    borderWidth: 2
  },
  packageBadge: {
    position: 'absolute',
    right: 0,
    top: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12
  },
  packageBadgeText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  packageName: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '700',
    color: theme.color.gray[800],
    marginBottom: 8,
    marginTop: 8
  },
  packageNameDark: {
    color: theme.color.gray[50]
  },
  packageDescription: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[600],
    marginBottom: 16
  },
  packageDescriptionDark: {
    color: theme.color.gray[400]
  },
  pricingRow: {
    marginBottom: 16
  },
  packagePrice: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 20,
    fontWeight: '700',
    color: theme.color.gray[800]
  },
  packagePriceDark: {
    color: theme.color.gray[50]
  },
  featuresList: {
    gap: 12
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  featureText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[700]
  },
  featureTextDark: {
    color: theme.color.gray[300]
  },
  viewCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.primary[500],
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 16
  },
  viewCartButtonText: {
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  continueButton: {
    backgroundColor: theme.color.primary[500],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8
  },
  currentStatusCard: {
    backgroundColor: theme.color.gray[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.color.gray[200]
  },
  currentStatusCardDark: {
    backgroundColor: theme.color.dark.background.primary,
    borderColor: theme.color.gray[700]
  },
  currentStatusTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: theme.color.gray[800],
    marginBottom: 12
  },
  currentStatusTitleDark: {
    color: theme.color.gray[100]
  },
  currentStatusDetails: {
    gap: 8
  },
  currentStatusText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[600]
  },
  currentStatusTextDark: {
    color: theme.color.gray[300]
  },
  currentStatusPrice: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: theme.color.gray[800]
  },
  currentStatusPriceDark: {
    color: theme.color.gray[50]
  },
  savingsInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8
  },
  savingsInfoText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    marginLeft: 8
  },
  progressTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: '600',
    color: theme.color.gray[800],
    marginBottom: 16
  },
  progressTitleDark: {
    color: theme.color.gray[50]
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.color.gray[200],
  },
  progressCardDark: {
    backgroundColor: theme.color.dark.background.primary,
    borderColor: theme.color.gray[700]
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  progressCardTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '700',
    color: theme.color.gray[800]
  },
  progressCardTitleDark: {
    color: theme.color.gray[50]
  },
  progressCardPrice: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[700],
    marginTop: 2
  },
  progressCardPriceDark: {
    color: theme.color.gray[300]
  },
  progressCardDescription: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[600],
    marginBottom: 16
  },
  progressCardDescriptionDark: {
    color: theme.color.gray[400]
  },
  eligibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  eligibilityBadgeText: {
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: '600'
  },
  progressBarWrapper: {
    marginBottom: 12
  },
  progressLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    color: theme.color.gray[700],
    marginBottom: 8
  },
  progressLabelDark: {
    color: theme.color.gray[300]
  },
  progressBarContainer: {
    marginBottom: 4
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: theme.color.gray[200],
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4
  },
  progressBarBackgroundDark: {
    backgroundColor: theme.color.gray[700]
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  progressText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: theme.color.gray[700]
  },
  progressTextDark: {
    color: theme.color.gray[400]
  },
  savingsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8
  },
  savingsSummaryText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    fontWeight: '600'
  },
  guideMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.color.primary[50],
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.color.primary[100],
    gap: 8
  },
  guideMessageText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[700]
  },
  guideMessageTextDark: {
    color: theme.color.gray[300]
  },

  // Cart checkout styles
  cartSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.color.gray[200]
  },
  cartSummaryCardDark: {
    backgroundColor: theme.color.dark.background.primary,
    borderColor: theme.color.gray[700]
  },
  cartSummaryTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: theme.color.gray[800],
    marginBottom: 16
  },
  cartSummaryTitleDark: {
    color: theme.color.gray[100]
  },
  appliedFormulaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16
  },
  appliedFormulaText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8
  },
  selectedProgramsList: {
    gap: 12,
    marginBottom: 16
  },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.gray[200]
  },
  cartItemInfo: {
    flex: 1,
    paddingRight: 8
  },
  cartItemTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: theme.color.gray[800],
    marginBottom: 4
  },
  cartItemTitleDark: {
    color: theme.color.gray[100]
  },
  cartItemSchool: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: theme.color.gray[600]
  },
  cartItemSchoolDark: {
    color: theme.color.gray[400]
  },
  cartItemPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  cartItemPriceText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: theme.color.gray[800]
  },
  cartItemPriceTextDark: {
    color: theme.color.gray[100]
  },
  removeItemButton: {
    padding: 4
  },
  priceBreakdownContainer: {
    gap: 8
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  priceLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[700]
  },
  priceLabelDark: {
    color: theme.color.gray[300]
  },
  priceValue: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[800]
  },
  priceValueDark: {
    color: theme.color.gray[100]
  },
  discountLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.success[600]
  },
  discountLabelDark: {
    color: theme.color.success[400]
  },
  discountValue: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.success[600],
    fontWeight: '600'
  },
  discountValueDark: {
    color: theme.color.success[400]
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.color.gray[200]
  },
  totalRowDark: {
    borderTopColor: theme.color.gray[700]
  },
  totalLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '700',
    color: theme.color.gray[800]
  },
  totalLabelDark: {
    color: theme.color.gray[100]
  },
  totalValue: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: '700',
    color: theme.color.gray[800]
  },
  totalValueDark: {
    color: theme.color.gray[100]
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: theme.color.gray[800],
    marginBottom: 12
  },
  sectionTitleDark: {
    color: theme.color.gray[100]
  },
  paymentOptionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.color.gray[200]
  },
  paymentOptionsCardDark: {
    backgroundColor: theme.color.dark.background.primary,
    borderColor: theme.color.gray[700]
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.gray[200],
    gap: 12
  },
  paymentOptionText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[800]
  },
  paymentOptionTextDark: {
    color: theme.color.gray[100]
  },
  securePaymentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  securePaymentText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: theme.color.gray[600]
  },
  securePaymentTextDark: {
    color: theme.color.gray[400]
  },
  emptyCartContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyCartTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: '600',
    color: theme.color.gray[800],
    marginTop: 16,
    marginBottom: 8
  },
  emptyCartTitleDark: {
    color: theme.color.gray[300]
  },
  emptyCartText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[600],
    textAlign: 'center',
    marginBottom: 24
  },
  emptyCartTextDark: {
    color: theme.color.gray[400]
  },
  browseButton: {
    backgroundColor: theme.color.primary[500],
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: '600'
  },
});