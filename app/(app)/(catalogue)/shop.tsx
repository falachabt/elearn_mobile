import React, {useEffect, useState, useRef, useCallback, useMemo} from "react";
import {
    View,
    Text,
    StyleSheet,
    useColorScheme,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    ScrollView,
    Modal,
    FlatList,
    Dimensions,
    GestureResponderEvent,
    ListRenderItemInfo
} from "react-native";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {theme} from "@/constants/theme";
import {useCart} from "@/hooks/useCart";
import {Stack, useRouter} from "expo-router";
import * as Animatable from 'react-native-animatable';
import {
    BottomSheetBackdrop,
    BottomSheetModal,
    BottomSheetModalProvider,
    BottomSheetBackdropProps
} from "@gorhom/bottom-sheet";
import {supabase} from "@/lib/supabase";
import {ProgramCard} from "@/components/shared/ProgramCard";
import {useAuth} from "@/contexts/auth";
import useSWR from 'swr';

// Define proper types for your data structures
export interface CourseItem {
    id: number;
    name: string;
}

export interface QuizItem {
    id: string;
    name: string;
}

export interface ExerciseItem {
    id: string;
    title: string;
}

export interface ArchiveItem {
    id: number;
    name: string;
    session: string;
}

export interface ProgramDetails {
    courses: CourseItem[];
    quizzes: QuizItem[];
    exercises: ExerciseItem[];
    archives: ArchiveItem[];
}

export interface School {
    id: string;
    name: string;
}

export interface Concour {
    id: string;
    name: string;
    schoolId?: string;
    school: School;
    city_id: string;
    cycle_id: string;
}

export interface LearningPath {
    id?: string | number;
    title: string;
    description: string;
    status: string;
    duration: string;
    course_count?: number;
    quiz_count?: number;
    image?: {
        src: string;
    };
}

export interface Course {
    id: number;
    price: number;
    course_count?: number;
    quiz_count?: number;
    exerciseCount?: number;
    archiveCount?: number;
    learning_path: LearningPath;
    concour: Concour;
    programDetails?: ProgramDetails;
}

export interface FilterOption {
    id: string;
    name: string;
}

export interface FilterOptions {
    cycles: FilterOption[];
    cities: FilterOption[];
    schools: FilterOption[];
}

export interface FilterOptionProps {
    item: FilterOption;
    selected: boolean;
    onSelect: () => void;
}

// Optimized fetcher that gets programs with details in a single query
const optimizedProgramsFetcher = async (userId: string): Promise<Course[]> => {
    if (!userId) return [];

    try {
        // First, get user enrollments to filter out programs
        const { data: userEnrollments } = await supabase
            .from("user_program_enrollments")
            .select(`program_id`)
            .eq("user_id", userId);

        const userProgramIds = userEnrollments?.map(item => item.program_id) || [];

        // Try to use the stored procedure first
        try {
            const { data, error } = await supabase.rpc('get_available_programs', {
                p_user_id: userId
            });

            if (!error && data) {
                // Filter out enrolled programs if needed
                return (data as Course[]).filter(program => !userProgramIds.includes(program.id));
            }
        } catch (rpcError) {
            console.log("RPC error, falling back to standard query:", rpcError);
        }

        // Fallback to standard query if RPC fails
        console.log("Using standard query fallback");
        const { data: fallbackData, error: fallbackError } = await supabase
            .from("concours_learningpaths")
            .select(`
                id, 
                price, 
                learning_path:learningPathId(
                    id, 
                    title, 
                    description, 
                    course_count, 
                    quiz_count, 
                    status, 
                    duration, 
                    image
                ),
                concour:concourId(
                    id, 
                    name, 
                    school:school_id(id, name), 
                    city_id, 
                    cycle_id
                )
            `)
            .eq("isActive", true);

        if (fallbackError) throw fallbackError;

        // Calculate missing counts (slightly less efficient)
        const programsWithCounts = await Promise.all((fallbackData as Course[]).map(async program => {
            try {
                // Get exercise count
                const lpId = program.learning_path.id;
                const concourId = program.concour.id;

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

        // Filter out enrolled programs
        return programsWithCounts.filter(program => !userProgramIds.includes(program.id));
    } catch (error) {
        console.error("Error fetching programs:", error);
        throw error;
    }
};

// Load program details on-demand for a specific program
const loadProgramDetails = async (programId: number): Promise<ProgramDetails | null> => {
    if (!programId) return null;

    try {
        // Try to use the stored procedure if available
        const { data: procData, error: procError } = await supabase.rpc('get_program_details', {
            p_program_id: programId
        });

        // If the stored procedure exists and succeeds, use its data
        if (!procError && procData) {
            return procData as ProgramDetails;
        }

        // Otherwise, fall back to the original implementation
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
const fetchProgramDetails = async (lpId: string | number, concourId: string): Promise<ProgramDetails> => {
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

        // Fetch exercises
        const courseIds = coursesData?.map(item => item.course?.id).filter(Boolean) || [];
        let exercisesData: ExerciseItem[] = [];

        if (courseIds.length > 0) {
            const { data: exercisesResult } = await supabase
                .from("exercices")
                .select("id, title")
                .in("course_id", courseIds);

            exercisesData = exercisesResult as ExerciseItem[] || [];
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
            archives: archivesData as ArchiveItem[] || []
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

// Prefetch filter options in background
const prefetchFilterOptions = async (): Promise<FilterOptions> => {
    try {
        // Fetch all filter options in parallel
        const [cyclesResponse, citiesResponse, schoolsResponse] = await Promise.all([
            supabase.from("study_cycles").select("id, name").order("level"),
            supabase.from("cities").select("id, name").order("name"),
            supabase.from("schools").select("id, name").order("name")
        ]);

        return {
            cycles: cyclesResponse.data as FilterOption[] || [],
            cities: citiesResponse.data as FilterOption[] || [],
            schools: schoolsResponse.data as FilterOption[] || []
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

// Skeleton screen component
interface SkeletonProps {
    isDark: boolean;
}

function ProgramSkeletonScreen({ isDark }: SkeletonProps): JSX.Element {
    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <View style={[styles.headerView, isDark && styles.headerViewDark]}>
                <View style={styles.skeletonHeader} />
                <View style={styles.skeletonCartIcon} />
            </View>

            <View style={styles.searchContainer}>
                <View style={[styles.searchInputWrapper, styles.skeletonSearchBar]} />
                <View style={[styles.filterButton, styles.skeletonFilterButton]} />
            </View>

            <View style={styles.resultsContainer}>
                <View style={styles.resultsHeader}>
                    <View style={styles.skeletonResultsTitle} />
                    <View style={styles.skeletonResultsCount} />
                </View>

                {[1, 2, 3].map((i) => (
                    <View key={`skeleton-${i}`} style={[styles.skeletonCard, isDark && styles.skeletonCardDark]}>
                        <View style={styles.skeletonImage} />
                        <View style={styles.skeletonCardContent}>
                            <View style={styles.skeletonTitle} />
                            <View style={styles.skeletonSubtitle} />
                            <View style={styles.skeletonDescription} />
                            <View style={styles.skeletonStats} />
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

export default function ShopPage(): JSX.Element {
    const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [programDetailsMap, setProgramDetailsMap] = useState<Record<number, any>>({});
    const {cartItems, addToCart, removeFromCart} = useCart();
    const isDark = useColorScheme() === "dark";
    const router = useRouter();
    const {user} = useAuth();

    // Filter states
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [selectedCycle, setSelectedCycle] = useState<string | null>(null);
    const [selectedCity, setSelectedCity] = useState<string | null>(null);
    const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<string>('default');

    // Infinite scroll states
    const [displayCount, setDisplayCount] = useState<number>(10); // Initial number of items to show
    const [loadingMore, setLoadingMore] = useState<boolean>(false);

    // Performance Optimizations
    const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
    const [showSkeleton, setShowSkeleton] = useState<boolean>(true);
    const programDetailsCache = useRef<Map<number, ProgramDetails>>(new Map());

    // Memoize filter dependencies to prevent unnecessary re-renders
    const filterDependencies = useMemo(() => ({
        searchQuery,
        selectedCycle,
        selectedCity,
        selectedSchool,
        sortBy
    }), [searchQuery, selectedCycle, selectedCity, selectedSchool, sortBy]);

    // 1. Fetch programs with optimized SWR configuration
    const { data: programs, error: programsError, isLoading: programsLoading } = useSWR(
        user?.id ? ['programs', user.id] : null,
        () => optimizedProgramsFetcher(user?.id as string),
        {
            revalidateOnFocus: false,
            dedupingInterval: 600000, // 10 minutes
            focusThrottleInterval: 5000, // 5 seconds
            errorRetryCount: 3,
            keepPreviousData: true, // Keep showing previous data while fetching
            onSuccess: () => {
                // Hide skeleton after data is loaded
                setTimeout(() => setShowSkeleton(false), 300);
                setIsInitialLoad(false);
            }
        }
    );

    // 2. Prefetch filter options in the background
    const { data: filterOptions, error: filterOptionsError } = useSWR<FilterOptions>(
        'filterOptions',
        prefetchFilterOptions,
        {
            revalidateOnFocus: false,
            dedupingInterval: 3600000, // 1 hour
            suspense: false, // Don't block rendering
        }
    );

    // 3. Memoize the filtered courses to prevent recalculation
    const applyFiltersCallback = useCallback((coursesToFilter: Course[]): Course[] => {
        if (!coursesToFilter || coursesToFilter.length === 0) return [];

        let filtered = [...coursesToFilter];

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(course =>
                course?.learning_path?.title?.toLowerCase().includes(query) ||
                course?.concour?.name?.toLowerCase().includes(query) ||
                course?.concour?.school?.name?.toLowerCase().includes(query)
            );
        }

        // Apply cycle filter
        if (selectedCycle) {
            filtered = filtered.filter(course => course?.concour?.cycle_id === selectedCycle);
        }

        // Apply city filter
        if (selectedCity) {
            filtered = filtered.filter(course => course?.concour?.city_id === selectedCity);
        }

        // Apply school filter
        if (selectedSchool) {
            filtered = filtered.filter(course => course?.concour?.school?.id === selectedSchool);
        }

        // Apply sorting
        switch(sortBy) {
            case 'price-asc':
                filtered.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                filtered.sort((a, b) => b.price - a.price);
                break;
            default:
                // Sort by school name by default
                filtered.sort((a, b) =>
                    a.concour.school.name.localeCompare(b.concour.school.name)
                );
                break;
        }

        return filtered;
    }, [filterDependencies]);

    // 4. Get displayed items based on display count for infinite scroll
    const getDisplayedItems = useCallback((allResults: Course[]): Course[] => {
        return allResults.slice(0, displayCount);
    }, [displayCount]);

    // 5. Apply filters and update state when data or filters change
    useEffect(() => {
        if (programs) {
            const filtered = applyFiltersCallback(programs);
            setFilteredCourses(filtered);

            // Reset display count when filters change
            setDisplayCount(10); // Back to initial count
        }
    }, [programs, applyFiltersCallback]);

    // Handlers for user interactions
    const handleCartAction = useCallback(async (course: Course): Promise<void> => {
        try {
            if (isInCart(course.id)) {
                await removeFromCart(course.id);
            } else {
                await addToCart(course.id, course.price);
            }
        } catch (error) {
            console.error("Cart action error:", error);
        }
    }, [cartItems, addToCart, removeFromCart]);

    const isInCart = useCallback((id: number): boolean =>
            cartItems.some((item) => item.program_id === id),
        [cartItems]);

    const resetFilters = useCallback((): void => {
        setSearchQuery('');
        setSelectedCycle(null);
        setSelectedCity(null);
        setSelectedSchool(null);
        setSortBy('default');
    }, []);

    // Enhanced load more function with loading state
    const handleLoadMore = useCallback(async (): Promise<void> => {
        // Check if there are more items to display and not already loading
        if (displayCount < filteredCourses.length && !loadingMore) {
            setLoadingMore(true);

            // Simulate a slight delay for better UX
            await new Promise(resolve => setTimeout(resolve, 300));

            // Increase the number of items to display
            setDisplayCount(prevCount => prevCount + 10);
            setLoadingMore(false);
        }
    }, [displayCount, filteredCourses.length, loadingMore]);

    // Handle program details fetching
    const handleProgramExpand = useCallback(async (programId: number): Promise<any> => {
        // Check if we already have details cached
        if (programDetailsCache.current.has(programId)) {
            const cachedDetails = programDetailsCache.current.get(programId);
            // Also update state so the component re-renders
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

                // Also update state so component re-renders with details
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

    // UI rendering functions
    const renderHeaderRight = useCallback((): JSX.Element => (
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
    ), [cartItems.length, isDark, router]);

    const renderFilterOption = useCallback(({ item, selected, onSelect }: FilterOptionProps): JSX.Element => (
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

    const renderBackdrop = useCallback(
        (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
            />
        ),
        []
    );

    const renderEmptyState = useCallback((): JSX.Element => (
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
                Essayez avec d'autres mots-clés ou filtres
            </Text>
            <TouchableOpacity
                style={[styles.resetButton, isDark && styles.resetButtonDark]}
                onPress={resetFilters}
            >
                <Text style={styles.resetButtonText}>Réinitialiser la recherche</Text>
            </TouchableOpacity>
        </View>
    ), [isDark, resetFilters]);

    const renderActiveFilters = useCallback((): JSX.Element | null => {
        const hasActiveFilters = selectedCycle || selectedCity || selectedSchool || sortBy !== 'default';

        if (!hasActiveFilters || !filterOptions) return null;

        const { cycles, cities, schools } = filterOptions;

        return (
            <View style={styles.activeFiltersContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.activeFiltersScroll}
                >
                    {selectedCycle && (
                        <View style={[styles.filterChip, isDark && styles.filterChipDark]}>
                            <Text style={[styles.filterChipText, isDark && styles.filterChipTextDark]}>
                                {cycles.find(c => c.id === selectedCycle)?.name}
                            </Text>
                            <TouchableOpacity onPress={() => setSelectedCycle(null)}>
                                <MaterialCommunityIcons name="close" size={16} color={isDark ? theme.color.gray[300] : theme.color.gray[700]} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {selectedCity && (
                        <View style={[styles.filterChip, isDark && styles.filterChipDark]}>
                            <Text style={[styles.filterChipText, isDark && styles.filterChipTextDark]}>
                                {cities.find(c => c.id === selectedCity)?.name}
                            </Text>
                            <TouchableOpacity onPress={() => setSelectedCity(null)}>
                                <MaterialCommunityIcons name="close" size={16} color={isDark ? theme.color.gray[300] : theme.color.gray[700]} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {selectedSchool && (
                        <View style={[styles.filterChip, isDark && styles.filterChipDark]}>
                            <Text style={[styles.filterChipText, isDark && styles.filterChipTextDark]}>
                                {schools.find(s => s.id === selectedSchool)?.name}
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
                                    sortBy === 'price-desc' ? 'Prix ↓' : 'Par défaut'}
                            </Text>
                            <TouchableOpacity onPress={() => setSortBy('default')}>
                                <MaterialCommunityIcons name="close" size={16} color={isDark ? theme.color.gray[300] : theme.color.gray[700]} />
                            </TouchableOpacity>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.resetChipButton, isDark && styles.resetChipButtonDark]}
                        onPress={resetFilters}
                    >
                        <Text style={[styles.resetChipButtonText, isDark && styles.resetChipButtonTextDark]}>
                            Réinitialiser tout
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }, [filterOptions, selectedCycle, selectedCity, selectedSchool, sortBy, isDark, resetFilters]);

    // Render filter modal
    const renderFilterModal = useCallback((): JSX.Element | null => {
        if (!filterOptions) return null;

        return (
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
                                    renderItem={({ item }: { item: FilterOption }) => renderFilterOption({
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
                                    renderItem={({ item }: { item: FilterOption }) => renderFilterOption({
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
                                    renderItem={({ item }: { item: FilterOption }) => renderFilterOption({
                                        item,
                                        selected: selectedSchool === item.id,
                                        onSelect: () => setSelectedSchool(selectedSchool === item.id ? null : item.id)
                                    })}
                                    contentContainerStyle={styles.filterOptionsList}
                                />
                            </View>

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
        );
    }, [filterOptions, showFilters, isDark, selectedCycle, selectedCity, selectedSchool, sortBy, renderFilterOption, resetFilters]);

    // Compute displayed courses once, for all renders
    const displayedCourses = useMemo(() =>
            getDisplayedItems(filteredCourses),
        [filteredCourses, getDisplayedItems]);

    // Show skeleton screens during initial load
    if (isInitialLoad && showSkeleton) {
        return <ProgramSkeletonScreen isDark={isDark} />;
    }

    // Show error state
    if (programsError) {
        return (
            <View style={[styles.centerContainer, isDark && styles.containerDark]}>
                <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={64}
                    color={isDark ? theme.color.error[300] : theme.color.error[500]}
                />
                <Text style={[styles.errorText, isDark && styles.errorTextDark]}>
                    Une erreur est survenue
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
        <Animatable.View
            animation={isInitialLoad ? "fadeIn" : undefined}
            duration={500}
            style={[styles.container, isDark && styles.containerDark]}
        >
            <View style={[styles.headerView, isDark && styles.headerViewDark]}>
                <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
                    Catalogue
                </Text>
                {renderHeaderRight()}
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                    <MaterialCommunityIcons
                        name="magnify"
                        size={24}
                        color={isDark ? theme.color.gray[400] : theme.color.gray[500]}
                        style={styles.searchIcon}
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

            {renderActiveFilters()}

            <View style={styles.resultsContainer}>
                <View style={styles.resultsHeader}>
                    <Text style={[styles.resultsTitle, isDark && styles.resultsTitleDark]}>
                        Programmes disponibles
                    </Text>
                    <Text style={[styles.resultsCount, isDark && styles.resultsCountDark]}>
                        {filteredCourses.length} résultat{filteredCourses.length !== 1 ? 's' : ''}
                    </Text>
                </View>

                <BottomSheetModalProvider>
                    <FlatList
                        data={displayedCourses}
                        keyExtractor={(item) => `program-${item.id}`}
                        renderItem={({ item }: ListRenderItemInfo<Course>) => (
                            <ProgramCard
                                title={item.learning_path.title}
                                description={item.learning_path.description}
                                price={item.price}
                                level={item.learning_path.status || "Débutant"}
                                duration={item.learning_path.duration || "6 mois"}
                                image={item.learning_path.image?.src}
                                courseCount={item.learning_path.course_count || 0}
                                quizCount={item.learning_path.quiz_count || 0}
                                exerciseCount={item.exerciseCount || 0}
                                archiveCount={item.archiveCount || 0}
                                concoursName={item.concour.name}
                                schoolName={item.concour.school.name}
                                isSelected={isInCart(item.id)}
                                onSelect={() => handleCartAction(item)}
                                isDark={isDark}
                                programDetails={programDetailsMap[item.id]}
                                onExpand={() => handleProgramExpand(item.id)}
                                features={[]} // Add empty array for required prop
                            />
                        )}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={10}
                        maxToRenderPerBatch={10}
                        windowSize={10}
                        removeClippedSubviews={true}
                        onEndReached={
                            !loadingMore && displayedCourses.length < filteredCourses.length ? handleLoadMore : undefined
                        }
                        onEndReachedThreshold={0.3}
                        ListEmptyComponent={
                            programsLoading && !programs?.length ?
                                <ActivityIndicator size="large" color={theme.color.primary[500]} style={{marginTop: 40}} /> :
                                renderEmptyState()
                        }
                        ListFooterComponent={
                            programsLoading && (programs?.length || 0) > 0 ? (
                                <ActivityIndicator size="small" color={theme.color.primary[500]} style={{marginVertical: 20}} />
                            ) : loadingMore ? (
                                <View style={styles.loadingMoreContainer}>
                                    <ActivityIndicator size="small" color={theme.color.primary[500]} />
                                    <Text style={styles.loadingMoreText}>Chargement...</Text>
                                </View>
                            ) : displayedCourses.length < filteredCourses.length ? (
                                <TouchableOpacity
                                    style={styles.loadMoreButton}
                                    onPress={handleLoadMore}
                                    disabled={loadingMore}
                                >
                                    <Text style={styles.loadMoreButtonText}>
                                        Voir plus ({filteredCourses.length - displayedCourses.length} restants)
                                    </Text>
                                </TouchableOpacity>
                            ) : filteredCourses.length > 0 ? (
                                <View style={styles.endOfListIndicator}>
                                    <Text style={[styles.endOfListText, isDark && styles.endOfListTextDark]}>
                                        Fin des résultats
                                    </Text>
                                </View>
                            ) : null
                        }
                    />
                </BottomSheetModalProvider>
            </View>

            {renderFilterModal()}
        </Animatable.View>
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
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.medium,
        gap: 8,
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
    searchInput: {
        flex: 1,
        height: '100%',
        color: theme.color.text,
        marginLeft: theme.spacing.small,
    },
    searchInputDark: {
        color: theme.color.gray[50],
    },
    searchIcon: {
        marginRight: theme.spacing.small,
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
    resultsContainer: {
        flex: 1,
        paddingHorizontal: theme.spacing.medium,
    },
    resultsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.medium,
    },
    resultsTitle: {
        fontSize: theme.typography.fontSize.large,
        fontWeight: "700",
        color: theme.color.text,
    },
    resultsTitleDark: {
        color: theme.color.gray[50],
    },
    resultsCount: {
        fontSize: theme.typography.fontSize.small,
        color: theme.color.gray[600],
    },
    resultsCountDark: {
        color: theme.color.gray[400],
    },
    scrollContent: {
        paddingBottom: 60,
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
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: theme.color.gray[700],
    },
    loadingTextDark: {
        color: theme.color.gray[300],
    },
    errorText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
        color: theme.color.error[700],
        marginBottom: 16,
    },
    errorTextDark: {
        color: theme.color.error[300],
    },
    retryButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: theme.color.primary[500],
        borderRadius: 8,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.color.gray[800],
        marginTop: 16,
        marginBottom: 8,
    },
    emptyTextDark: {
        color: theme.color.gray[300],
    },
    emptySubtext: {
        fontSize: 14,
        color: theme.color.gray[600],
        textAlign: 'center',
        marginBottom: 16,
    },
    emptySubtextDark: {
        color: theme.color.gray[400],
    },
    resetButton: {
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
    // Active filters styles
    activeFiltersContainer: {
        marginBottom: theme.spacing.medium,
        paddingHorizontal: theme.spacing.medium,
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
        fontSize: 13,
        color: theme.color.gray[800],
        marginRight: 8,
    },
    filterChipTextDark: {
        color: theme.color.gray[300],
    },
    resetChipButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: theme.color.gray[200],
    },
    resetChipButtonDark: {
        backgroundColor: theme.color.gray[800],
    },
    resetChipButtonText: {
        fontSize: 13,
        color: theme.color.gray[800],
    },
    resetChipButtonTextDark: {
        color: theme.color.gray[300],
    },
    // Modal styles
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
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
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
    loadingMoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    loadingMoreText: {
        marginLeft: 8,
        color: theme.color.gray[600],
        fontSize: 14,
    },
    endOfListIndicator: {
        padding: 16,
        alignItems: 'center',
    },
    endOfListText: {
        fontSize: 14,
        color: theme.color.gray[500],
        fontStyle: 'italic',
    },
    endOfListTextDark: {
        color: theme.color.gray[400],
    },
    // Skeleton styles
    skeletonHeader: {
        width: 120,
        height: 24,
        backgroundColor: theme.color.gray[300],
        borderRadius: 4,
    },
    skeletonCartIcon: {
        width: 24,
        height: 24,
        backgroundColor: theme.color.gray[300],
        borderRadius: 12,
    },
    skeletonSearchBar: {
        backgroundColor: theme.color.gray[200],
    },
    skeletonFilterButton: {
        backgroundColor: theme.color.gray[200],
    },
    skeletonResultsTitle: {
        width: 180,
        height: 20,
        backgroundColor: theme.color.gray[300],
        borderRadius: 4,
    },
    skeletonResultsCount: {
        width: 80,
        height: 16,
        backgroundColor: theme.color.gray[300],
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
    skeletonCardDark: {
        backgroundColor: theme.color.dark.background.secondary,
    },
    skeletonImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: theme.color.gray[300],
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
        backgroundColor: theme.color.gray[300],
        borderRadius: 4,
    },
    skeletonSubtitle: {
        width: '50%',
        height: 14,
        backgroundColor: theme.color.gray[300],
        borderRadius: 4,
    },
    skeletonDescription: {
        width: '80%',
        height: 12,
        backgroundColor: theme.color.gray[300],
        borderRadius: 4,
    },
    skeletonStats: {
        width: '40%',
        height: 12,
        backgroundColor: theme.color.gray[300],
        borderRadius: 4,
    }
});