import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
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
    Animated,
    ListRenderItemInfo,
    Pressable
} from "react-native";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {theme} from "@/constants/theme";
import {useCart} from "@/hooks/useCart";
import {useLocalSearchParams, useRouter} from "expo-router";
import * as Animatable from 'react-native-animatable';
import {
    BottomSheetBackdrop,
    BottomSheetModal,
    BottomSheetModalProvider,
    BottomSheetScrollView,
    BottomSheetBackdropProps
} from "@gorhom/bottom-sheet";
import {supabase} from "@/lib/supabase";
import {ProgramCard} from "@/components/shared/ProgramCard";
import {useAuth} from "@/contexts/auth";
import useSWR from 'swr';

// Types et interfaces (inchangés)
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
    image?: {
        url : string;
    };
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

// PARAMÈTRE DE MODE PRIX UNIQUE - Modifiez cette valeur pour activer/désactiver
// true = toutes les formations directement à 7900 FCFA (l'utilisateur a déjà fait son premier achat)
// false = système de formules normal


// Prix en mode prix unique
const FIXED_PRICE = 7900; // Prix de toutes les formations en mode prix fixe

// Définition des formules de prix (uniquement pour le mode formules)
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

// Fonctions fetcher (inchangées)
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
                    image,
                    city_id, 
                    cycle_id
                )
            `)
            .eq("isActive", true);

        if (fallbackError) throw fallbackError;

        // Calculate missing counts
        const programsWithCounts = await Promise.all((fallbackData as unknown as Course[]).map(async program => {
            try {
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
        // @ts-ignore
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
            courses: coursesData?.map(item => item.course) || [] as any,
            quizzes: quizzesData?.map(item => item.quiz) || [] as any,
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

// Composant de visualisation de progression des formules (utilisé seulement si mode prix fixe désactivé)
const FormulaProgressBar = ({planId, currentCount, threshold,color,isDark}: {planId: string, currentCount: number,threshold: number,color: string, isDark: boolean}) => {
    // Calcul du pourcentage de progression
    const progress = Math.min(currentCount / threshold, 1);

    // Largeur dynamique de la barre de progression
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
                        // @ts-ignore
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
    const FIXED_PRICE_MODE = (user?.user_program_enrollments?.length || 0) > 0 || false;
    
    // The user was redirected to this page with a specific program ID
    const { selectedProgramId } = useLocalSearchParams();

    console.log("selectedProgramId:", selectedProgramId);



    // État des filtres (inchangé)
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [selectedCycle, setSelectedCycle] = useState<string | null>(null);
    const [selectedCity, setSelectedCity] = useState<string | null>(null);
    const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<string>('default');

    // États pour le lazy loading (inchangés)
    const [displayCount, setDisplayCount] = useState<number>(10);
    const [loadingMore, setLoadingMore] = useState<boolean>(false);

    // États pour l'optimisation des performances (inchangés)
    const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
    const [showSkeleton, setShowSkeleton] = useState<boolean>(true);
    const programDetailsCache = useRef<Map<number, ProgramDetails>>(new Map());

    // États pour la promotion des tarifs (uniquement en mode formules)
    const [suggestedPlan, setSuggestedPlan] = useState<any>(null);
    const [cartIconPulse] = useState(new Animated.Value(1));

    // Configuration pour le bottom sheet des formules (uniquement en mode formules)
    const formulaDetailsRef = useRef<BottomSheetModal>(null);
    const formulaProgressRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['70%', '90%'], []);

    // Mémoriser les dépendances de filtrage pour éviter des re-rendus inutiles
    const filterDependencies = useMemo(() => ({
        searchQuery,
        selectedCycle,
        selectedCity,
        selectedSchool,
        sortBy
    }), [searchQuery, selectedCycle, selectedCity, selectedSchool, sortBy]);

    // Animation pour faire pulser l'icône du panier (uniquement en mode formules)
    useEffect(() => {
        if (!FIXED_PRICE_MODE && cartItems.length > 0) {
            const pulseAnimation = Animated.loop(
                Animated.sequence([
                    Animated.timing(cartIconPulse, {
                        toValue: 1.2,
                        duration: 800,
                        useNativeDriver: true
                    }),
                    Animated.timing(cartIconPulse, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true
                    })
                ])
            );

            // Appliquer l'animation seulement dans certains cas stratégiques
            if (cartItems.length === 2 || cartItems.length === 4) {
                pulseAnimation.start();
            }

            return () => {
                pulseAnimation.stop();
            };
        }
    }, [cartItems.length, cartIconPulse]);

    // 1. Récupération des programmes avec configuration SWR optimisée
    const { data: programs, error: programsError, isLoading: programsLoading } = useSWR(
        user?.id ? ['programs', user.id] : null,
        () => optimizedProgramsFetcher(user?.id as string),
        {
            revalidateOnFocus: false,
            dedupingInterval: 600000, // 10 minutes
            focusThrottleInterval: 5000, // 5 secondes
            errorRetryCount: 3,
            keepPreviousData: true,
            onSuccess: () => {
                setTimeout(() => setShowSkeleton(false), 300);
                setIsInitialLoad(false);
            }
        }
    );

    useEffect(() => {
        if (programs && programs.length > 0) {
            setShowSkeleton(false);
            setIsInitialLoad(false);
        }
    }, [programs]);

    // 2. Préchargement des options de filtrage en arrière-plan
    const { data: filterOptions, error: filterOptionsError } = useSWR<FilterOptions>(
        'filterOptions',
        prefetchFilterOptions,
        {
            revalidateOnFocus: false,
            dedupingInterval: 3600000, // 1 heure
            suspense: false,
        }
    );

    // Fonctions de calcul des prix (adaptées pour le mode prix fixe)
    const calculateTotalPrice = useCallback(() => {
        if (!cartItems.length) return 0;

        if (FIXED_PRICE_MODE) {
            // Mode prix fixe: toutes les formations directement au tarif réduit
            return cartItems.length * FIXED_PRICE;
        } else {
            // Mode formules
            const cartTotalBeforeFormula = cartItems.reduce((sum, item) => sum + item.price, 0);

            // Appliquer les formules selon le nombre d'items
            if (cartItems.length >= 5) {
                // Formule Excellence: prix fixe pour nombre illimité
                return PRICING_PLANS.find(plan => plan.id === 'excellence')?.price || 0;
            }
            else if (cartItems.length === 3) { // Exactement 3 pour Avantage
                // Formule Avantage: seulement pour exactement 3 formations
                return PRICING_PLANS.find(plan => plan.id === 'advantage')?.price || 0;
            }
            else if (cartItems.length > 0) {
                // Formule Essentielle: première formation + prix réduit pour les suivantes
                const essentialPlan = PRICING_PLANS.find(plan => plan.id === 'essential');
                const firstCoursePrice = essentialPlan?.basePrice || 0;
                const additionalCoursePrice = essentialPlan?.additionalPrice || 0;
                const additionalCourses = cartItems.length - 1;
                return firstCoursePrice + (additionalCourses * additionalCoursePrice);
            }

            return 0;
        }
    }, [cartItems]);

    // Détermine quelle formule est applicable (uniquement en mode formules)
    const getApplicableFormula = useCallback(() => {
        if (FIXED_PRICE_MODE) return null;

        if (cartItems.length >= 5) {
            return PRICING_PLANS.find(plan => plan.id === 'excellence');
        } else if (cartItems.length === 3) {
            return PRICING_PLANS.find(plan => plan.id === 'advantage');
        } else if (cartItems.length > 0) {
            return PRICING_PLANS.find(plan => plan.id === 'essential');
        }
        return null;
    }, [cartItems]);

    // Mise à jour des suggestions de formules (uniquement en mode formules)
    useEffect(() => {
        if (!FIXED_PRICE_MODE && cartItems.length > 0) {
            // Déterminer la meilleure formule
            const bestPlan = getApplicableFormula();

            if (bestPlan) {
                setSuggestedPlan(bestPlan);
            } else {
                setSuggestedPlan(null);
            }
        } else {
            setSuggestedPlan(null);
        }
    }, [cartItems, getApplicableFormula]);

    // 3. Mémoriser les courses filtrées pour éviter de recalculer
    const applyFiltersCallback = useCallback((coursesToFilter: Course[]): Course[] => {
        if (!coursesToFilter || coursesToFilter.length === 0) return [];

        let filtered = [...coursesToFilter];

        // Appliquer le filtre de recherche
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(course =>
                course?.learning_path?.title?.toLowerCase().includes(query) ||
                course?.concour?.name?.toLowerCase().includes(query) ||
                course?.concour?.school?.name?.toLowerCase().includes(query)
            );
        }

        // Appliquer le filtre de cycle
        if (selectedCycle) {
            filtered = filtered.filter(course => course?.concour?.cycle_id === selectedCycle);
        }

        // Appliquer le filtre de ville
        if (selectedCity) {
            filtered = filtered.filter(course => course?.concour?.city_id === selectedCity);
        }

        // Appliquer le filtre d'école
        if (selectedSchool) {
            filtered = filtered.filter(course => course?.concour?.school?.id === selectedSchool);
        }

        // Appliquer le tri
        switch(sortBy) {
            case 'price-asc':
                filtered.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                filtered.sort((a, b) => b.price - a.price);
                break;
            default:
                // Tri par nom d'école par défaut
                filtered.sort((a, b) =>
                    a.concour.school.name.localeCompare(b.concour.school.name)
                );
                break;
        }

        return filtered;
    }, [filterDependencies]);

    // 4. Obtenir les éléments affichés en fonction du compte d'affichage pour le défilement infini
    const getDisplayedItems = useCallback((allResults: Course[]): Course[] => {
        return allResults.slice(0, displayCount);
    }, [displayCount]);

    // 5. Appliquer les filtres et mettre à jour l'état lorsque les données ou les filtres changent
    useEffect(() => {
        if (programs) {
            const filtered = applyFiltersCallback(programs);
            setFilteredCourses(filtered);
            setDisplayCount(10); // Revenir au compte initial
        }
    }, [programs, applyFiltersCallback]);



    // Gestionnaires pour les bottom sheets (utilisé uniquement en mode formules)
    const handleFormulaDetailsClick = useCallback(() => {
        if (!FIXED_PRICE_MODE) {
            formulaDetailsRef.current?.present();
        }
    }, []);

    const handleFormulaProgressClick = useCallback(() => {
        if (!FIXED_PRICE_MODE) {
            formulaProgressRef.current?.present();
        }
    }, []);

    // Gestion du clic sur "Continuer vers le paiement"
    const handleContinueToPayment = useCallback(() => {
        formulaProgressRef.current?.dismiss();
        formulaDetailsRef.current?.dismiss();
        router.push("/(app)/(catalogue)/cart");
    }, [router]);

    const isInCart = useCallback((id: number): boolean =>
            cartItems.some((item) => item.program_id === id),
        [cartItems]);

    // Gestionnaires pour les interactions de l'utilisateur
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
    }, [cartItems, addToCart, removeFromCart, isInCart]);

    const resetFilters = useCallback((): void => {
        setSearchQuery('');
        setSelectedCycle(null);
        setSelectedCity(null);
        setSelectedSchool(null);
        setSortBy('default');
    }, []);

    // Fonction de chargement améliorée avec état de chargement
    const handleLoadMore = useCallback(async (): Promise<void> => {
        if (displayCount < filteredCourses.length && !loadingMore) {
            setLoadingMore(true);
            await new Promise(resolve => setTimeout(resolve, 300));
            setDisplayCount(prevCount => prevCount + 10);
            setLoadingMore(false);
        }
    }, [displayCount, filteredCourses.length, loadingMore]);

    // Gestion de la récupération des détails du programme
    const handleProgramExpand = useCallback(async (programId: number): Promise<any> => {
        // Vérifier si les détails sont déjà en cache
        if (programDetailsCache.current.has(programId)) {
            const cachedDetails = programDetailsCache.current.get(programId);
            setProgramDetailsMap(prev => ({
                ...prev,
                [programId]: cachedDetails
            }));
            return cachedDetails;
        }

        // Sinon, récupérer les détails et les mettre en cache
        try {
            const details = await loadProgramDetails(programId);
            if (details) {
                programDetailsCache.current.set(programId, details);
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


    useEffect(() => {
        if (selectedProgramId) {
            const selectPrograms = programs?.filter(program => program.learning_path.id == selectedProgramId);

            if (!selectPrograms || selectPrograms.length === 0) {
                console.warn(`No program found with ID: ${selectedProgramId}`);
                return;
            }
            if (selectPrograms && selectPrograms.length > 0) {
                // Set search query to match program name
                setSearchQuery(selectPrograms[0].learning_path.title);

                // Expand program details
                handleProgramExpand(selectPrograms[0].id);

                // Set relevant filters if available
                if (selectPrograms[0].concour) {
                    setSelectedCycle(selectPrograms[0].concour.cycle_id);
                    setSelectedCity(selectPrograms[0].concour.city_id);
                    setSelectedSchool(selectPrograms[0].concour.school?.id);
                }
            }
        }
    }, [selectedProgramId, handleProgramExpand]);

    // Rendu de l'arrière-plan amélioré avec animation de fondu
    const renderBackdrop = useCallback((props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={0.8}
            pressBehavior="close"
        />
    ), []);

    // Fonctions de rendu de l'interface utilisateur
    const renderHeaderRight = useCallback((): JSX.Element => {
        // Si mode prix fixe, afficher simplement l'icône du panier
        if (FIXED_PRICE_MODE) {
            return (
                <View style={styles.headerRightContainer}>
                    <TouchableOpacity
                        style={styles.cartButton}
                        onPress={() => router.push("/(app)/(catalogue)/cart")}
                    >
                        <MaterialCommunityIcons
                            name="cart"
                            size={24}
                            color={cartItems.length > 0 ? (isDark ? "#FFFFFF" : "#166534") : (isDark ? "#FFFFFF" : "#000000")}
                        />
                        {cartItems.length > 0 && (
                            <View style={[styles.cartBadge, { backgroundColor: isDark ? "#86EFAC" : "#166534" }]}>
                                <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            );
        }

        // En mode formules, afficher les badges et le panier
        const nextTierItems = cartItems.length < 3 ? 3 - cartItems.length : cartItems.length < 5 ? 5 - cartItems.length : 0;
        const hasEligibleAdvantage = cartItems.length === 3;
        const hasEligibleExcellence = cartItems.length >= 5;
        const formulaIconColor = suggestedPlan?.color || (isDark ? '#FFF' : '#000');

        return (
            <View style={styles.headerRightContainer}>
                {/* Bouton pour afficher les formules */}
                {cartItems.length > 0 && (
                    <TouchableOpacity
                        style={styles.packageButton}
                        onPress={handleFormulaProgressClick}
                    >
                        <MaterialCommunityIcons
                            name="tag-multiple"
                            size={24}
                            color={formulaIconColor}
                        />

                        {/* Afficher un badge approprié selon le statut */}
                        {(hasEligibleAdvantage || hasEligibleExcellence) ? (
                            <View style={[styles.formulaEligibleBadge, { backgroundColor: suggestedPlan?.color || '#166534' }]}>
                                <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                            </View>
                        ) : nextTierItems === 1 ? (
                            <View style={[styles.formulaAlmostBadge, { borderColor: suggestedPlan?.color || '#166534' }]}>
                                <Text style={[styles.formulaAlmostBadgeText, { color: suggestedPlan?.color || '#166534' }]}>
                                    +1
                                </Text>
                            </View>
                        ) : null}
                    </TouchableOpacity>
                )}

                {/* Bouton du panier avec animation */}
                <Animated.View style={{
                    transform: [{ scale: cartItems.length > 0 ? cartIconPulse : 1 }]
                }}>
                    <TouchableOpacity
                        style={styles.cartButton}
                        onPress={() => router.push("/(app)/(catalogue)/cart")}
                    >
                        <MaterialCommunityIcons
                            name="cart"
                            size={24}
                            color={cartItems.length > 0 ? (isDark ? "#FFFFFF" : "#166534") : (isDark ? "#FFFFFF" : "#000000")}
                        />
                        {cartItems.length > 0 && (
                            <View style={[styles.cartBadge, { backgroundColor: isDark ? "#86EFAC" : "#166534" }]}>
                                <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </View>
        );
    }, [
        cartItems.length,
        isDark,
        suggestedPlan,
        handleFormulaProgressClick,
        cartIconPulse,
        router
    ]);

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

    // Rendu du modal de filtre
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
                            {/* Filtre de cycle */}
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

                            {/* Filtre de ville */}
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

                            {/* Filtre d'école */}
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

                            {/* Tri */}
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

    // Bottom sheet de détails des formules (uniquement si mode formules)
    const renderFormulaDetailsSheet = useCallback(() => {
        if (FIXED_PRICE_MODE) return null;

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
                                {  PRICING_PLANS[2].price?.toLocaleString('fr-FR')} FCFA
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

                    {/* Bouton pour voir le panier */}
                    {cartItems.length > 0 && (
                        <TouchableOpacity
                            style={styles.viewCartButton}
                            onPress={handleContinueToPayment}
                        >
                            <MaterialCommunityIcons name="cart" size={20} color="#FFFFFF" />
                            <Text style={styles.viewCartButtonText}>
                                Voir mon panier ({cartItems.length})
                            </Text>
                        </TouchableOpacity>
                    )}
                </BottomSheetScrollView>
            </BottomSheetModal>
        );
    }, [
        isDark,
        snapPoints,
        renderBackdrop,
        cartItems.length,
        handleContinueToPayment
    ]);

    // Bottom sheet de progression vers les formules (uniquement si mode formules)
    const renderFormulaProgressSheet = useCallback(() => {
        if (FIXED_PRICE_MODE) return null;

        // Calcul du prix total actuel et avec les formules
        const currentTotal = cartItems.reduce((sum, item) => sum + item.price, 0) || 0;
        const formulaPrice = calculateTotalPrice();
        const savings = Math.max(0, currentTotal - formulaPrice);

        // Obtenir la formule applicable
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
                    {/* État actuel du panier */}
                    <View style={[styles.currentStatusCard, isDark && styles.currentStatusCardDark]}>
                        <Text style={[styles.currentStatusTitle, isDark && styles.currentStatusTitleDark]}>
                            Votre sélection actuelle
                        </Text>

                        <View style={styles.currentStatusDetails}>
                            <Text style={[styles.currentStatusText, isDark && styles.currentStatusTextDark]}>
                                {cartItems.length} formation{cartItems.length > 1 ? 's' : ''} dans votre panier
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
                                onPress={handleContinueToPayment}
                            >
                                <MaterialCommunityIcons name="cart" size={20} color="#FFFFFF" />
                                <Text style={styles.continueButtonText}>
                                    Voir mon panier
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Progression vers chaque formule */}
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
                            cartItems.length === 3 && { borderColor: PRICING_PLANS[1].color, borderWidth: 2 }
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
                            {cartItems.length === 3 && (
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
                                {cartItems.length < 3
                                    ? `Ajoutez ${3 - cartItems.length} formation${3 - cartItems.length > 1 ? 's' : ''} de plus pour débloquer cette formule`
                                    : 'Formule débloquée !'}
                            </Text>
                            <FormulaProgressBar
                                planId="advantage"
                                currentCount={Math.min(cartItems.length, 3)}
                                threshold={3}
                                color={PRICING_PLANS[1].color}
                                isDark={isDark}
                            />
                        </View>

                        {cartItems.length === 3 && (
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
                            cartItems.length >= 5 && { borderColor: PRICING_PLANS[2].color, borderWidth: 2 }
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
                            {cartItems.length >= 5 && (
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
                                {cartItems.length < 5
                                    ? `Ajoutez ${5 - cartItems.length} formation${5 - cartItems.length > 1 ? 's' : ''} de plus pour débloquer cette formule`
                                    : 'Formule débloquée !'}
                            </Text>
                            <FormulaProgressBar
                                planId="excellence"
                                currentCount={Math.min(cartItems.length, 5)}
                                threshold={5}
                                color={PRICING_PLANS[2].color}
                                isDark={isDark}
                            />
                        </View>

                        {cartItems.length >= 5 && (
                            <View style={[styles.savingsSummary, { backgroundColor: PRICING_PLANS[2].color + '15' }]}>
                                <MaterialCommunityIcons name="cash" size={18} color={PRICING_PLANS[2].color} />
                                <Text style={[styles.savingsSummaryText, { color: PRICING_PLANS[2].color }]}>
                                    Économie estimée: {(currentTotal - (PRICING_PLANS[2].price || 0)).toLocaleString('fr-FR')} FCFA
                                </Text>
                            </View>
                        )}
                    </Animatable.View>

                    {/* Bannière de prochaine étape si pertinent */}
                    {cartItems.length === 2 && (
                        <Animatable.View
                            animation="fadeIn"
                            style={[styles.nextStepBanner, { borderColor: PRICING_PLANS[1].color }]}
                        >
                            <MaterialCommunityIcons name="lightbulb-outline" size={24} color={PRICING_PLANS[1].color} />
                            <View style={styles.nextStepContent}>
                                <Text style={[styles.nextStepTitle, { color: PRICING_PLANS[1].color }]}>
                                    Plus qu'une formation !
                                </Text>
                                <Text style={[styles.nextStepDescription, isDark && styles.nextStepDescriptionDark]}>
                                    Ajoutez une formation supplémentaire pour débloquer la formule Avantage et économiser.
                                </Text>
                            </View>
                            <Pressable
                                style={[styles.nextStepButton, { backgroundColor: PRICING_PLANS[1].color }]}
                                onPress={() => {
                                    formulaProgressRef.current?.dismiss();
                                    // Redirection vers la liste des programmes
                                    setTimeout(() => router.replace('/(app)/(catalogue)/shop'), 300);
                                }}
                            >
                                <Text style={styles.nextStepButtonText}>
                                    Explorer
                                </Text>
                            </Pressable>
                        </Animatable.View>
                    )}

                    {cartItems.length === 4 && (
                        <Animatable.View
                            animation="fadeIn"
                            style={[styles.nextStepBanner, { borderColor: PRICING_PLANS[2].color }]}
                        >
                            <MaterialCommunityIcons name="lightbulb-outline" size={24} color={PRICING_PLANS[2].color} />
                            <View style={styles.nextStepContent}>
                                <Text style={[styles.nextStepTitle, { color: PRICING_PLANS[2].color }]}>
                                    Plus qu'une formation !
                                </Text>
                                <Text style={[styles.nextStepDescription, isDark && styles.nextStepDescriptionDark]}>
                                    Ajoutez une formation supplémentaire pour débloquer la formule Excellence et profiter d'un accès illimité.
                                </Text>
                            </View>
                            <Pressable
                                style={[styles.nextStepButton, { backgroundColor: PRICING_PLANS[2].color }]}
                                onPress={() => {
                                    formulaProgressRef.current?.dismiss();
                                    // Redirection vers la liste des programmes
                                    setTimeout(() => router.replace('/(app)/(catalogue)/shop'), 300);
                                }}
                            >
                                <Text style={styles.nextStepButtonText}>
                                    Explorer
                                </Text>
                            </Pressable>
                        </Animatable.View>
                    )}
                </BottomSheetScrollView>
            </BottomSheetModal>
        );
    }, [
        cartItems,
        isDark,
        snapPoints,
        renderBackdrop,
        calculateTotalPrice,
        getApplicableFormula,
        handleContinueToPayment,
        handleFormulaDetailsClick,
        router
    ]);

    // Bannière pour le mode prix unique (montré seulement avec ce mode)
    const renderFixedPriceBanner = useCallback(() => {
        if (!FIXED_PRICE_MODE) return null;

        return (
            <Animatable.View
                animation="fadeIn"
                style={[styles.priceBanner, isDark && styles.priceBannerDark]}
            >
                <MaterialCommunityIcons
                    name="tag-heart"
                    size={20}
                    color={isDark ? "#86EFAC" : "#166534"}
                />
                <Text style={[styles.priceBannerText, isDark && styles.priceBannerTextDark]}>
                    Tarif promotionnel : {FIXED_PRICE.toLocaleString('fr-FR')} FCFA par formation !
                </Text>
            </Animatable.View>
        );
    }, [isDark]);

    // Calcul des cours affichés une seule fois pour tous les rendus
    const displayedCourses = useMemo(() =>
            getDisplayedItems(filteredCourses),
        [filteredCourses, getDisplayedItems]);

    // Afficher les écrans squelettes pendant le chargement initial
    if (isInitialLoad && showSkeleton) {
        return <ProgramSkeletonScreen isDark={isDark} />;
    }

    // Afficher l'état d'erreur
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
        <BottomSheetModalProvider>
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
                            placeholderTextColor={isDark ? theme.color.gray[900] : theme.color.gray[500]}
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

                {/* Bannière pour le mode prix unique */}
                {renderFixedPriceBanner()}

                {/* Bannières pour les formules (uniquement en mode formules) */}
                {!FIXED_PRICE_MODE && cartItems.length === 2 && (
                    <Animatable.View
                        animation="fadeIn"
                        style={[styles.dealBanner, { backgroundColor: PRICING_PLANS[1].color + '20', borderColor: PRICING_PLANS[1].color }]}
                    >
                        <MaterialCommunityIcons name="tag-heart" size={20} color={PRICING_PLANS[1].color} />
                        <Text style={[styles.dealBannerText, { color: PRICING_PLANS[1].color }]}>
                            Plus qu'une formation pour débloquer la formule Avantage !
                        </Text>
                        <TouchableOpacity onPress={handleFormulaProgressClick}>
                            <Text style={[styles.dealBannerButton, { color: PRICING_PLANS[1].color }]}>
                                Voir
                            </Text>
                        </TouchableOpacity>
                    </Animatable.View>
                )}

                {!FIXED_PRICE_MODE && cartItems.length === 4 && (
                    <Animatable.View
                        animation="fadeIn"
                        style={[styles.dealBanner, { backgroundColor: PRICING_PLANS[2].color + '20', borderColor: PRICING_PLANS[2].color }]}
                    >
                        <MaterialCommunityIcons name="tag-heart" size={20} color={PRICING_PLANS[2].color} />
                        <Text style={[styles.dealBannerText, { color: PRICING_PLANS[2].color }]}>
                            Plus qu'une formation pour débloquer la formule Excellence !
                        </Text>
                        <TouchableOpacity onPress={handleFormulaProgressClick}>
                            <Text style={[styles.dealBannerButton, { color: PRICING_PLANS[2].color }]}>
                                Voir
                            </Text>
                        </TouchableOpacity>
                    </Animatable.View>
                )}

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
                                image={item.concour.image?.url}
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
                                features={[]} // Array vide pour la prop requise
                                // Si mode prix fixe activé, afficher directement le prix réduit pour toutes les formations
                                directDiscountPrice={
                                    FIXED_PRICE_MODE ? FIXED_PRICE : undefined
                                }
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
                </View>

                {renderFilterModal()}
                {renderFormulaDetailsSheet()}
                {renderFormulaProgressSheet()}
            </Animatable.View>
        </BottomSheetModalProvider>
    );
}

const styles = StyleSheet.create({
    // Styles existants
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
        fontFamily: theme.typography.fontFamily,
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
        color: theme.color.gray[800],
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
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.fontSize.large,
        fontWeight: "700",
        color: theme.color.text,
    },
    resultsTitleDark: {
        color: theme.color.gray[50],
    },
    resultsCount: {
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.fontSize.small,
        color: theme.color.gray[600],
    },
    resultsCountDark: {
        color: theme.color.gray[400],
    },
    cartButton: {
        padding: 5,
        position: "relative",
        marginRight: 7,
    },
    cartBadge: {
        position: "absolute",
        top: -8,
        right: -8,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: "center",
        justifyContent: "center",
    },
    cartBadgeText: {
        color: "#FFF",
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        fontWeight: "600",
    },
    errorText: {
        marginTop: 16,
        fontFamily: theme.typography.fontFamily,
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
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontFamily: theme.typography.fontFamily,
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
        fontFamily: theme.typography.fontFamily,
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
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.fontSize.medium,
        fontWeight: '600',
    },
    // Styles pour les filtres actifs
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
        fontFamily: theme.typography.fontFamily,
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
        fontFamily: theme.typography.fontFamily,
        fontSize: 13,
        color: theme.color.gray[800],
    },
    resetChipButtonTextDark: {
        color: theme.color.gray[300],
    },
    // Styles de modal
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
        fontFamily: theme.typography.fontFamily,
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
        fontFamily: theme.typography.fontFamily,
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
        fontFamily: theme.typography.fontFamily,
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
        fontFamily: theme.typography.fontFamily,
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
        fontFamily: theme.typography.fontFamily,
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
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    // Styles pour pagination et liste
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
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
    },
    endOfListIndicator: {
        padding: 16,
        alignItems: 'center',
    },
    endOfListText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: theme.color.gray[500],
        fontStyle: 'italic',
    },
    endOfListTextDark: {
        color: theme.color.gray[400],
    },
    // Styles pour skeleton
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
    },

    // Nouveaux styles pour les promotions des formules
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.color.background,
    },
    headerRightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    packageButton: {
        marginRight: 16,
        padding: 5,
        position: "relative",
    },
    formulaEligibleBadge: {
        position: "absolute",
        top: -8,
        right: -8,
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: 'row',
        paddingHorizontal: 4,
    },
    formulaAlmostBadge: {
        position: "absolute",
        top: -8,
        right: -8,
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
    },
    formulaAlmostBadgeText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 10,
        fontWeight: "600",
    },
    // Styles de bannière promo
    dealBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 10,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    dealBannerText: {
        flex: 1,
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        marginHorizontal: 8,
    },
    dealBannerButton: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    // Styles pour les bottom sheets
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
    // Styles pour la progression
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
    completionBadge: {
        position: 'absolute',
        right: 0,
        top: -16,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        gap: 4
    },
    completionBadgeText: {
        color: '#FFFFFF',
        fontFamily: theme.typography.fontFamily,
        fontSize: 10,
        fontWeight: '600'
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
    // Styles pour la bannière de prochaine étape
    nextStepBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginTop: 24,
        marginBottom: 16,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    nextStepContent: {
        flex: 1,
        marginLeft: 12,
        marginRight: 12
    },
    nextStepTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4
    },
    nextStepDescription: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 13,
        color: theme.color.gray[600]
    },
    nextStepDescriptionDark: {
        color: theme.color.gray[400]
    },
    nextStepButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8
    },
    nextStepButtonText: {
        color: '#FFFFFF',
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '600'
    },

    // Nouveaux styles pour le mode prix unique
    priceBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: '#F0FDF4',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#166534',
    },
    priceBannerDark: {
        backgroundColor: '#064E3B',
        borderColor: '#10B981',
    },
    priceBannerText: {
        flex: 1,
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '600',
        color: '#166534',
        marginLeft: 8,
    },
    priceBannerTextDark: {
        color: '#86EFAC',
    }
})