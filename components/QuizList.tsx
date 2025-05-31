import React, {useState, useMemo, useEffect, useRef} from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    ScrollView,
    ActivityIndicator,
    SafeAreaView,
    Animated,
    FlatList,
    Easing
} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useColorScheme} from '@/hooks/useColorScheme';
import {ThemedText} from '@/components/ThemedText';
import {HapticType, useHaptics} from '@/hooks/useHaptics';
import {theme} from '@/constants/theme';
import useSWR from 'swr';
import {supabase} from '@/lib/supabase';
import {useAuth} from '@/contexts/auth';
import EnhancedQuizCard from '@/components/shared/learn/quiz/QuizCard';
import EnhancedQuizRowItem from '@/components/shared/learn/quiz/QuizRowItem';
import EnhancedQuizCategoryFilter from '@/components/shared/learn/quiz/QuizCategoryFilter';
import {useUser} from "@/contexts/useUserInfo";

// ==========================
// Types
// ==========================

interface Category {
    id?: number;
    name: string;
}

interface QuizQuestion {
    id: number;
}

interface Course {
    id: number;
    name: string;
}

interface Quiz {
    id: number;
    name: string;
    category?: Category;
    quiz_questions?: QuizQuestion[];
    course?: Course;
}

interface QuizItem {
    quizId: number;
    lpId: string;
    quiz: Quiz;
    isPinned?: boolean;
    progress?: number;
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

// ==========================
// Skeleton Loading Component
// ==========================

const QuizSkeleton = ({isDark}: { isDark: boolean }) => {
    // Animation for the skeleton loading effect
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.ease,
                    useNativeDriver: false,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0,
                    duration: 1000,
                    easing: Easing.ease,
                    useNativeDriver: false,
                })
            ])
        ).start();
    }, []);

    const backgroundColor = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: isDark
            ? ['rgba(55, 65, 81, 0.8)', 'rgba(75, 85, 99, 0.8)']
            : ['rgba(229, 231, 235, 0.8)', 'rgba(209, 213, 219, 0.8)']
    });

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            {/* Header Skeleton */}
            <View style={[styles.header, isDark && styles.headerDark]}>
                <Animated.View style={[styles.skeletonCircle, {backgroundColor}]}/>
                <View style={{flex: 1, marginLeft: 16}}>
                    <Animated.View style={[styles.skeletonLine, {width: '70%', height: 20, backgroundColor}]}/>
                    <Animated.View
                        style={[styles.skeletonLine, {width: '40%', height: 16, marginTop: 8, backgroundColor}]}/>
                </View>
            </View>

            {/* Search Skeleton */}
            <View style={[styles.searchContainer, isDark && styles.searchContainerDark]}>
                <Animated.View style={[styles.searchBox, isDark && styles.searchBoxDark, {backgroundColor}]}/>
            </View>

            {/* Category Filter Skeleton */}
            <View style={{height: 56, marginTop: 8}}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{paddingHorizontal: 16, gap: 8}}
                >
                    {[1, 2, 3, 4, 5].map((_, index) => (
                        <Animated.View
                            key={index}
                            style={[styles.skeletonCategory, {width: 80 + index * 20, backgroundColor}]}
                        />
                    ))}
                </ScrollView>
            </View>

            {/* Quiz Count Skeleton */}
            <View style={[styles.quizCountContainer, isDark && styles.quizCountContainerDark]}>
                <Animated.View style={[styles.skeletonLine, {width: 120, height: 14, backgroundColor}]}/>
            </View>

            {/* Quiz Items Skeleton */}
            <ScrollView style={{flex: 1}}>
                {[1, 2, 3, 4, 5, 6].map((_, index) => (
                    <View key={index} style={[styles.quizItem, isDark && styles.quizItemDark]}>
                        <View style={styles.quizContent}>
                            <View style={styles.quizHeader}>
                                <Animated.View style={[styles.skeletonQuizIcon, {backgroundColor}]}/>
                                <View style={{flex: 1, marginLeft: 12}}>
                                    <Animated.View
                                        style={[styles.skeletonLine, {width: '80%', height: 16, backgroundColor}]}/>
                                    <Animated.View style={[styles.skeletonLine, {
                                        width: '60%',
                                        height: 12,
                                        marginTop: 8,
                                        backgroundColor
                                    }]}/>
                                </View>
                                <Animated.View
                                    style={[styles.skeletonCircle, {width: 24, height: 24, backgroundColor}]}/>
                            </View>

                            <View style={styles.badgeContainer}>
                                <Animated.View style={[styles.skeletonBadge, {width: 80, backgroundColor}]}/>
                            </View>

                            <Animated.View
                                style={[styles.progressBar, isDark && styles.progressBarDark, {backgroundColor}]}/>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

// ==========================
// Empty State Component
// ==========================

const EmptyState = ({searchQuery, selectedCategory, isDark}) => {
    return (
        <View style={styles.emptyState}>
            <MaterialCommunityIcons
                name="file-search-outline"
                size={64}
                color={isDark ? "#818CF8" : "#2563EB"}
            />
            <ThemedText style={[styles.emptyStateTitle, isDark && {color: '#D1D5DB'}]}>
                {searchQuery || selectedCategory !== "all"
                    ? "Aucun quiz trouvé"
                    : "Aucun quiz disponible"}
            </ThemedText>
            <ThemedText style={[styles.emptyStateText, isDark && {color: '#9CA3AF'}]}>
                {searchQuery || selectedCategory !== "all"
                    ? "Essayez de modifier vos critères de recherche"
                    : "Revenez plus tard pour voir les nouveaux quiz"}
            </ThemedText>
        </View>
    );
};

// ==========================
// Error State Component
// ==========================

const ErrorState = ({onRetry, isDark}) => {
    return (
        <View style={[styles.centerContent, isDark && {backgroundColor: "#111827"}]}>
            <MaterialCommunityIcons
                name="alert-circle-outline"
                size={64}
                color="#EF4444"
            />
            <ThemedText style={styles.errorTitle}>
                Impossible de charger les quiz
            </ThemedText>
            <ThemedText style={styles.errorText}>
                Une erreur s'est produite lors du chargement des données. Veuillez réessayer.
            </ThemedText>
            <Pressable
                style={[styles.retryButton, isDark && styles.retryButtonDark]}
                onPress={onRetry}
            >
                <MaterialCommunityIcons name="reload" size={20} color="#FFFFFF" style={{marginRight: 8}}/>
                <ThemedText style={styles.retryButtonText}>Réessayer</ThemedText>
            </Pressable>
        </View>
    );
};

// ==========================
// Main Quiz Screen Component
// ==========================

const EnhancedQuizScreen = () => {
    const router = useRouter();
    const {pdId} = useLocalSearchParams();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list'); // Add view mode toggle
    const {user} = useAuth();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const {trigger} = useHaptics();
    const {isLearningPathEnrolled} = useUser();
    const isEnrolled = isLearningPathEnrolled(pdId as string);


    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Fetch program data
    const {data: program, isLoading: programLoading, error: programError, mutate: reloadProgram} = useSWR(
        pdId ? `program-quizzes-${pdId}` : null,
        async () => {
            const {data, error} = await supabase
                .from("learning_paths")
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
                .eq("id", pdId)
                .single();

            if (error) throw error;
            return data as Program;
        }
    );

    // Fetch quizzes data
    const {data: quizzes, isLoading: quizzesLoading, error: quizzesError, mutate: reloadQuizzes} = useSWR(
        pdId ? `quizzes-${pdId}` : null,
        async () => {
            const {data, error} = await supabase
                .from("quiz_learningpath")
                .select(`
          *,
          quiz:quiz(
            *,
            category:courses_categories(*),
            quiz_questions(id),
            course(*)
          )
        `)
                .eq("lpId", pdId);

            if (error) throw error;
            if (!data || data.length === 0) return [];

            const quizIds = data.map((quiz) => quiz.quizId);

            // Fetch pinned status for all quizzes
            const {data: quiz_pinned, error: pinnedError} = await supabase
                .from("quiz_pin")
                .select("*")
                .in("quiz_id", quizIds)
                .eq("user_id", user?.id);

            if (pinnedError) throw pinnedError;

            // Add pinned status to quiz data
            return data.map((quiz) => {
                const isPinned = quiz_pinned?.find((pinned) => pinned.quiz_id === quiz.quizId);
                return {
                    ...quiz,
                    isPinned: !!isPinned
                };
            }) as QuizItem[];
        }
    );

    // Fetch quiz attempts to calculate progress
    const {data: attempts} = useSWR(
        pdId && quizzes ? `quiz-attempts-${pdId}-${user?.id}` : null,
        async () => {
            const quizIds = quizzes?.map(q => q.quizId);
            const {data, error} = await supabase
                .from("quiz_attempts")
                .select("*, quiz_id, score")
                .in("quiz_id", quizIds || [])
                .eq("user_id", user?.id)
                .eq("status", "completed");

            if (error) throw error;
            return data || [];
        }
    );

    // Fade in content when data loads
    useEffect(() => {
        if (!programLoading && !quizzesLoading) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease)
            }).start();
        }
    }, [programLoading, quizzesLoading]);

    // Calculate progress for each quiz
    const quizzesWithProgress = useMemo(() => {
        if (!quizzes || !attempts) return quizzes || [];

        return quizzes.map(quizItem => {
            const quizAttempts = attempts.filter(a => a.quiz_id === quizItem.quizId);

            // Calculate highest score as progress
            const highestScore = quizAttempts.length > 0
                ? Math.max(...quizAttempts.map(a => a.score || 0))
                : 0;

            return {
                ...quizItem,
                progress: highestScore
            };
        });
    }, [quizzes, attempts]);

    // Extract unique categories from quizzes
    const categories = useMemo(() => {
        if (!quizzesWithProgress) return [];
        const uniqueCategories = new Set(
            quizzesWithProgress
                .map((quiz) => quiz.quiz?.category?.name)
                .filter(Boolean)
        );
        return Array.from(uniqueCategories);
    }, [quizzesWithProgress]);

    // Filter quizzes based on search and category
    const filteredQuizzes = useMemo(() => {
        if (!quizzesWithProgress) return [];
        const filteredList = quizzesWithProgress.filter((quizItem) => {
            const quiz = quizItem.quiz;
            if (!quiz) return false;
            const matchesSearch = quiz.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === "all" || quiz.category?.name === selectedCategory;
            return matchesSearch && matchesCategory;
        });
        return isEnrolled ? filteredList : filteredList.slice(0, 2);
    }, [quizzesWithProgress, searchQuery, selectedCategory, isEnrolled]);

    // Handle quiz press
    const handleQuizPress = (quizItem) => {
        trigger(HapticType.SELECTION);
        router.push(`/(app)/learn/${pdId}/quizzes/${quizItem.quiz?.id}`);
    };

    // Handle back button press
    const handleBackPress = () => {
        trigger(HapticType.LIGHT);
        router.back();
    };

    // Toggle view mode between list and grid
    const toggleViewMode = () => {
        trigger(HapticType.LIGHT);
        setViewMode(prev => prev === 'list' ? 'grid' : 'list');
    };

    // Clear search
    const clearSearch = () => {
        setSearchQuery('');
    };

    // Retry loading data
    const handleRetry = () => {
        reloadProgram();
        reloadQuizzes();
    };

    // Get program title and school info
    const getProgramInfo = () => {
        if (!program) {
            return {title: 'Programme', school: '', concours: ''};
        }

        const concours = program.concours_learningpaths?.[0]?.concour;
        return {
            title: program.title || 'Programme',
            school: concours?.school?.name || '',
            concours: concours?.name || ''
        };
    };


    // Handle purchase flow
    const handlePurchaseFlow = () => {
        trigger(HapticType.SELECTION);
        router.push({
            pathname : `/(app)/(catalogue)/shop`,
            params : {
                selectedProgramId : pdId,
            }
        });
    };


    const {title, school, concours} = getProgramInfo();

    // Loading state
    if (programLoading || quizzesLoading) {
        return <QuizSkeleton isDark={isDark}/>;
    }

    // Error state
    if (programError || quizzesError) {
        return <ErrorState onRetry={handleRetry} isDark={isDark}/>;
    }

    // Check if no quizzes are available
    if (filteredQuizzes.length === 0) {
        return (
            <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
                {/* Header */}
                <View style={[styles.header, isDark && styles.headerDark]}>
                    <Pressable style={styles.headerIcon} onPress={handleBackPress}>
                        <MaterialCommunityIcons
                            name="arrow-left"
                            size={24}
                            color={isDark ? "#FFFFFF" : "#111827"}
                        />
                    </Pressable>

                    <View style={styles.headerInfo}>
                        <ThemedText style={styles.headerTitle} numberOfLines={1}>
                            {title}
                        </ThemedText>
                        {(school || concours) && (
                            <ThemedText style={styles.headerSubtitle}>
                                {concours && <Text style={styles.concoursText}>{concours} • </Text>}
                                {school && <Text style={styles.schoolText}>{school}</Text>}
                            </ThemedText>
                        )}
                    </View>

                    {/* View mode toggle */}
                    <Pressable style={styles.viewModeButton} onPress={toggleViewMode}>
                        <MaterialCommunityIcons
                            name={viewMode === 'list' ? 'view-grid' : 'view-list'}
                            size={24}
                            color={theme.color.primary[500]}
                        />
                    </Pressable>
                </View>

                {/* Search */}
                {isEnrolled && <View style={[styles.searchContainer, isDark && styles.searchContainerDark]}>
                    <View style={[styles.searchBox, isDark && styles.searchBoxDark]}>
                        <MaterialCommunityIcons
                            name="magnify"
                            size={20}
                            color={isDark ? "#9CA3AF" : "#6B7280"}
                        />
                        <TextInput
                            style={[styles.searchInput, isDark && styles.searchInputDark]}
                            placeholder="Rechercher un quiz..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
                        />
                        {searchQuery.length > 0 && (
                            <Pressable style={styles.clearButton} onPress={clearSearch}>
                                <MaterialCommunityIcons
                                    name="close-circle"
                                    size={20}
                                    color={isDark ? "#9CA3AF" : "#6B7280"}
                                />
                            </Pressable>
                        )}
                    </View>
                </View>}

                {/* Categories */}
                <View style={{height: 56}}>
                    <EnhancedQuizCategoryFilter
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onSelectCategory={setSelectedCategory}
                        isDark={isDark}
                    />
                </View>

                {/* Quiz count */}
                <View style={[styles.quizCountContainer, isDark && styles.quizCountContainerDark]}>
                    <ThemedText style={[styles.quizCountText, isDark && styles.quizCountTextDark]}>
                        {filteredQuizzes.length} quiz{filteredQuizzes.length !== 1 ? 's' : ''} disponible{filteredQuizzes.length !== 1 ? 's' : ''}
                    </ThemedText>
                </View>

                {/* Empty state */}
                <EmptyState
                    searchQuery={searchQuery}
                    selectedCategory={selectedCategory}
                    isDark={isDark}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
            {/* Header */}
            <Animated.View
                style={[
                    styles.header,
                    isDark && styles.headerDark,
                    {opacity: fadeAnim}
                ]}
            >
                <Pressable
                    style={styles.headerIcon}
                    onPress={handleBackPress}
                >
                    <MaterialCommunityIcons
                        name="arrow-left"
                        size={24}
                        color={isDark ? "#FFFFFF" : "#111827"}
                    />
                </Pressable>

                <View style={styles.headerInfo}>
                    <ThemedText style={styles.headerTitle} numberOfLines={1}>
                        {title}
                    </ThemedText>
                    {(school || concours) && (
                        <ThemedText style={styles.headerSubtitle}>
                            {concours && <Text style={styles.concoursText}>{concours} • </Text>}
                            {school && <Text style={styles.schoolText}>{school}</Text>}
                        </ThemedText>
                    )}
                </View>

                {/* View mode toggle */}
                <Pressable
                    style={styles.viewModeButton}
                    onPress={toggleViewMode}
                >
                    <MaterialCommunityIcons
                        name={viewMode === 'list' ? 'view-grid' : 'view-list'}
                        size={24}
                        color={theme.color.primary[500]}
                    />
                </Pressable>
            </Animated.View>

            {/* Search */}
            { isEnrolled && <Animated.View
                style={[
                    styles.searchContainer,
                    isDark && styles.searchContainerDark,
                    {opacity: fadeAnim}
                ]}
            >
                <View style={[styles.searchBox, isDark && styles.searchBoxDark]}>
                    <MaterialCommunityIcons
                        name="magnify"
                        size={20}
                        color={isDark ? "#9CA3AF" : "#6B7280"}
                    />
                    <TextInput
                        style={[styles.searchInput, isDark && styles.searchInputDark]}
                        placeholder="Rechercher un quiz..."
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
            </Animated.View>}

            {/* Categories */}
            <Animated.View style={{height: 56, opacity: fadeAnim}}>
                <EnhancedQuizCategoryFilter
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
                    isDark={isDark}
                />
            </Animated.View>

            {/* Quiz count */}
            <Animated.View
                style={[
                    styles.quizCountContainer,
                    isDark && styles.quizCountContainerDark,
                    {opacity: fadeAnim}
                ]}
            >
                <ThemedText style={[styles.quizCountText, isDark && styles.quizCountTextDark]}>
                    {filteredQuizzes.length} quiz{filteredQuizzes.length !== 1 ? 's' : ''} disponible{filteredQuizzes.length !== 1 ? 's' : ''}
                </ThemedText>
            </Animated.View>

            {/* Quiz list or grid based on viewMode */}
            <Animated.View
                style={[
                    styles.contentContainer,
                    {opacity: fadeAnim}
                ]}
            >
                {!isEnrolled && quizzesWithProgress.length > 2 &&
                    <View style={[styles.previewBanner, isDark && styles.previewBannerDark]}>
                        <MaterialCommunityIcons
                            name="lock"
                            size={24}
                            color={isDark ? "#6EE7B7" : "#65B741"}
                        />
                        <View style={styles.previewBannerTextContainer}>
                            <ThemedText style={[styles.previewBannerTitle, isDark && styles.previewBannerTitleDark]}>
                                Accédez à {quizzesWithProgress.length - 1} Quiz supplémentaires
                            </ThemedText>
                            <ThemedText style={styles.previewBannerDescription}>
                                Achetez ce programme pour débloquer tous les quiz disponibles.
                            </ThemedText>
                        </View>
                        <Pressable
                            style={styles.previewBannerButton}
                            onPress={handlePurchaseFlow}
                        >
                            <ThemedText style={styles.previewBannerButtonText}>
                                Acheter
                            </ThemedText>
                        </Pressable>
                    </View>
                }
                {/* Use conditional rendering instead of changing numColumns on the fly */}
                {viewMode === 'list' ? (
                    <FlatList
                        key="list" // Key changes when viewMode changes
                        data={filteredQuizzes}
                        keyExtractor={(item) => `quiz-row-${item.quizId}`}
                        renderItem={({item, index}) => (
                            <EnhancedQuizRowItem
                                quizItem={item}
                                pdId={String(pdId)}
                                isDark={isDark}
                                index={index}
                            />
                        )}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.quizListContent}
                    />
                ) : (
                    <FlatList
                        key="grid" // Key changes when viewMode changes
                        data={filteredQuizzes}
                        keyExtractor={(item) => `grid-quiz-card-${item.quizId}`}
                        renderItem={({item, index}) => (
                            <EnhancedQuizCard
                                quizItem={item}
                                pdId={String(pdId)}
                                isDark={isDark}
                                index={index}
                            />
                        )}
                        numColumns={2}
                        columnWrapperStyle={styles.gridRow}
                        contentContainerStyle={styles.gridContainer}
                        showsVerticalScrollIndicator={false}
                    />
                )}


            </Animated.View>
        </SafeAreaView>
    );
};

// ==========================
// Styles
// ==========================

const styles = StyleSheet.create({
    // Container styles
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    containerDark: {
        backgroundColor: '#111827',
    },
    contentContainer: {
        flex: 1,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#F9FAFB',
    },

    // Grid styles
    gridContainer: {
        paddingHorizontal: 8,
        paddingBottom: 80,
    },
    gridRow: {
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },

    // Header styles
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        elevation: 2,
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
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontFamily: theme.typography.fontFamily,
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
        padding: 8,
        borderRadius: 8,
    },

    // Search styles
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
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: '#111827',
        height: 40,
    },
    searchInputDark: {
        color: '#FFFFFF',
    },
    clearButton: {
        padding: 4,
    },

    // Quiz count styles
    quizCountContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#F3F4F6',
    },
    quizCountContainerDark: {
        backgroundColor: '#1F2937',
    },
    quizCountText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
    quizCountTextDark: {
        color: '#9CA3AF',
    },

    // Quiz list styles
    quizListContent: {
        paddingBottom: 80,
    },
    quizItem: {
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    quizItemDark: {
        backgroundColor: "#1F2937",
        borderBottomColor: "#374151",
    },
    quizContent: {
        padding: 16,
    },
    quizHeader: {
        flexDirection: "row",
        alignItems: "center",
    },

    // Empty state styles
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emptyStateTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        color: '#111827',
        textAlign: 'center',
    },
    emptyStateText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#6B7280',
        marginTop: 8,
        textAlign: 'center',
        maxWidth: '80%',
    },

    // Error state styles
    errorTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        color: '#EF4444',
        textAlign: 'center',
    },
    errorText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#6B7280',
        marginTop: 8,
        textAlign: 'center',
        maxWidth: '80%',
        marginBottom: 16,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.color.primary[500],
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 12,
        elevation: 2,
    },
    retryButtonDark: {
        backgroundColor: '#3B82F6',
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontWeight: '500',
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
    },

    // Skeleton styles
    skeletonLine: {
        borderRadius: 4,
        marginVertical: 2,
    },
    skeletonCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    skeletonCategory: {
        height: 40,
        borderRadius: 8,
        marginRight: 8,
    },
    skeletonQuizIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
    },
    skeletonBadge: {
        height: 24,
        borderRadius: 4,
    },

    // Badge styles
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginTop: 8,
        gap: 8,
    },
    progressBar: {
        height: 4,
        backgroundColor: "#E5E7EB",
        borderRadius: 2,
        overflow: "hidden",
        marginTop: 12,
    },
    progressBarDark: {
        backgroundColor: "#374151",
    },
    previewBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        padding: 16,
        marginTop: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1FAE5',
    },
    previewBannerDark: {
        backgroundColor: '#064E3B',
        borderColor: '#065F46',
    },
    previewBannerTextContainer: {
        flex: 1,
        marginLeft: 12,
        marginRight: 8,
    },
    previewBannerTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
        color: '#065F46',
        marginBottom: 2,
    },
    previewBannerTitleDark: {
        color: '#6EE7B7',
    },
    previewBannerDescription: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#047857',
    },
    previewBannerButton: {
        backgroundColor: '#10B981',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    previewBannerButtonText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default EnhancedQuizScreen;