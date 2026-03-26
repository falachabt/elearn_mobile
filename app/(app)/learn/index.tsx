import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    useColorScheme,
    View
} from 'react-native'
import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import useSWR from 'swr'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Href, useRouter, useFocusEffect } from 'expo-router'

import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth'
import { theme } from '@/constants/theme'
import NoProgram from "@/components/shared/catalogue/NoProgramCard"
import ModernLearningPathCard from "@/components/shared/learn/LearningPathCard"
import { useUser } from '@/contexts/useUserInfo'
import { logger } from '@/utils/logger'

interface School {
    id: string
    name: string | null
    imageUrl?: string | null
    sigle: string | null
    localisation: string | null
}

interface StudyCycle {
    level: string
}

interface Concours {
    id: string
    name: string | null
    description: string | null
    image?: {
        url?: string | null
    } | null
    schoolId?: string | null
    school: School | null
    study_cycles: StudyCycle | { level: number } | null
    dates: string[] | null
    nextDate: string | null
}

interface ConcoursLearningPath {
    id: number
    concourId: string
    learningPathId: string
    price: number
    isActive: boolean
    concour: Concours
}

interface UserProgramEnrollment {
    id: number
    user_id: string
    expiry_date?: string | null
}

export interface LearningPath {
    id: string
    title: string
    description: string
    image: { url: string }
    duration: Record<string, unknown>[]
    content: {
        nodes: {
            id: string
            type: 'course' | 'quiz'
            data: {
                courseId?: number
                quizId?: string
            }
        }[]
    }
    concours_learningpaths?: ConcoursLearningPath[]
    course_count: number
    quiz_count: number
    total_duration: number
    progress?: number
    isEnrolled: boolean
    enrollmentId?: number
    isGenerousWeek?: boolean
}

interface LearningPathRow {
    id: number
    price: number | null
    isActive: boolean | null
    learningPathId: string | null
    concourId: string | null
    concour: Concours | null
    learning_path: {
        id: string
        title: string | null
        description: string | null
        image: unknown
        duration: unknown[] | null
        content?: {
            nodes: {
                id: string
                type: 'course' | 'quiz'
                data: {
                    courseId?: number
                    quizId?: string
                }
            }[]
        }
        course_count: number | null
        quiz_count: number | null
        total_duration: number | null
    } | null
    user_program_enrollments: UserProgramEnrollment[] | null
}

type LearnTab = 'enrolled' | 'available'

const MyLearningPaths = () => {
    const { session, user: authUser } = useAuth()
    const { user, mutateUserPrograms, mutateProgramAccessMap } = useUser()
    const router = useRouter()
    const colorScheme = useColorScheme()
    const isDarkMode = colorScheme === 'dark'
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedTab, setSelectedTab] = useState<LearnTab>('available')
    const hasInitializedTab = useRef(false)

    // Get generous week program ID from user metadata
    const generousWeekProgramId = user?.metadata?.generousWeek?.programId

    const { data, error, isLoading, mutate } = useSWR(
        authUser ? 'all-learning-paths-with-enrollment' : null,
        async () => {
            logger.log('[MyLearningPaths] Fetching learning paths for user:', authUser?.id);
            
            // Single optimized query using LEFT JOIN to get all learning paths with enrollment status
            const { data: learningPathsData, error: lpError } = await supabase
                .from('concours_learningpaths')
                .select(`
                    id,
                    price,
                    isActive,
                    learningPathId,
                    concourId,
                    concour:concours(
                        id,
                        name,
                        description,
                        image,
                        dates,
                        nextDate,
                        study_cycles(level),
                        school_id,
                        school:schools(
                            id,
                            name,
                            imageUrl,
                            sigle,
                            localisation
                        )
                    ),
                    learning_path:learning_paths(
                        id,
                        title,
                        description,
                        image,
                        duration,
                        course_count,
                        quiz_count,
                        total_duration
                    ),
                    user_program_enrollments!left(
                        id,
                        user_id,
                        expiry_date
                    )
                `)
                .eq('isActive', true)
                .or(`user_id.eq.${authUser?.id},user_id.is.null`, { foreignTable: 'user_program_enrollments' })

            if (lpError) {
                logger.error("Learning paths fetch error:", lpError)
                throw lpError
            }

            if (!learningPathsData) {
                return []
            }

            // Group by learning path to avoid duplicates and determine enrollment status
            const learningPathMap = new Map<string, LearningPath>()

            const learningPathRows = learningPathsData as unknown as LearningPathRow[]

            learningPathRows.forEach((item) => {
                if (!item.learning_path || !item.concour || !item.concourId || !item.learningPathId || item.price == null || item.isActive == null) {
                    return
                }

                const learningPathId = item.learning_path.id
                const now = new Date()
                const activeEnrollments = item.user_program_enrollments?.filter(
                    (enrollment: UserProgramEnrollment) =>
                        enrollment.user_id === authUser?.id &&
                        !!enrollment.expiry_date &&
                        new Date(enrollment.expiry_date) > now
                ) ?? []
                const isUserEnrolled = activeEnrollments.length > 0
                const userEnrollment = activeEnrollments[0]

                if (!learningPathMap.has(learningPathId)) {
                    const schoolSigle = item.concour.school?.sigle ?? ''
                    learningPathMap.set(learningPathId, {
                        id: item.learning_path.id,
                        title: `Programme ${schoolSigle}`.trim(),
                        description: item.learning_path.description ?? "",
                        image: { url: "" },
                        duration: [],
                        content: item.learning_path.content ?? { nodes: [] },
                        course_count: item.learning_path.course_count ?? 0,
                        quiz_count: item.learning_path.quiz_count ?? 0,
                        total_duration: item.learning_path.total_duration ?? 0,
                        concours_learningpaths: [],
                        isEnrolled: isUserEnrolled,
                        enrollmentId: userEnrollment?.id ,
                        progress: isUserEnrolled ? Math.floor(Math.random() * 100) : 0
                    })
                }

                // Add concours learning path info
                const existingPath = learningPathMap.get(learningPathId)
                if (existingPath) {
                    existingPath.concours_learningpaths!.push({
                        id: item.id,
                        concourId: item.concourId,
                        learningPathId: item.learningPathId,
                        price: item.price,
                        isActive: item.isActive,
                        concour: item.concour
                    })
                }
            })

            const allPaths = Array.from(learningPathMap.values())

            // Mark the generous week program
            if (generousWeekProgramId) {
                allPaths.forEach(path => {
                    // Check if any of the concours_learningpaths matches the generous week program ID
                    const isGenerousWeek = path.concours_learningpaths?.some(
                        clp => clp.id === generousWeekProgramId
                    )

                    if (isGenerousWeek) {
                        // Check if the generous week period is still active
                        if (user?.metadata?.generousWeek) {
                            const generousWeek = user.metadata.generousWeek
                            const selectedAt = new Date(generousWeek.selectedAt)
                            const durationInMs = generousWeek.duration * 24 * 60 * 60 * 1000

                            // Only mark as generous week if the period hasn't expired
                            if (Date.now() < selectedAt.getTime() + durationInMs) {
                                path.isGenerousWeek = true
                            }
                        }
                    }
                })
            }

            // Sort to put generous week and enrolled programs first
            return allPaths.sort((a, b) => {
                // Generous week program comes first
                if (a.isGenerousWeek && !b.isGenerousWeek) return -1
                if (!a.isGenerousWeek && b.isGenerousWeek) return 1

                // Then enrolled programs
                if (a.isEnrolled && !b.isEnrolled) return -1
                if (!a.isEnrolled && b.isEnrolled) return 1

                return 0
            })
        },
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 1000, // Allow revalidation every second
            refreshInterval: 0, // Disable auto-refresh, rely on manual triggers
            onSuccess: (data) => {
                logger.log('[MyLearningPaths] Data fetched successfully. Total paths:', data?.length);
                logger.log('[MyLearningPaths] Enrolled paths:', data?.filter(p => p.isEnrolled).length);
            }
        }
    )

    // Force revalidation on mount and when returning from payment
    useEffect(() => {
        logger.log('[MyLearningPaths] Component mounted, forcing revalidation...');
        // Force revalidation of both the list and user context
        mutate();
        mutateUserPrograms();
        mutateProgramAccessMap();
    }, []);

    // Also revalidate when the screen comes into focus (e.g., after payment)
    useFocusEffect(
        useCallback(() => {
            logger.log('[MyLearningPaths] Screen focused, revalidating...');
            mutate();
            mutateUserPrograms();
            mutateProgramAccessMap();
        }, [mutate, mutateUserPrograms, mutateProgramAccessMap])
    );

    // Memoize filtered data to prevent unnecessary re-renders
    const filteredData = useMemo(() => {
        if (!data) return []
        
        return data.filter(item => 
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
        )
    }, [data, searchQuery])

    const enrolledPrograms = useMemo(
        () => filteredData.filter((item) => item.isEnrolled || item.isGenerousWeek),
        [filteredData]
    )

    const availablePrograms = useMemo(
        () => filteredData.filter((item) => !item.isEnrolled && !item.isGenerousWeek),
        [filteredData]
    )

    const hasAccessiblePrograms = useMemo(
        () => (data ?? []).some((item) => item.isEnrolled || item.isGenerousWeek),
        [data]
    )

    const currentTabData = selectedTab === 'enrolled' ? enrolledPrograms : availablePrograms

    useEffect(() => {
        if (!data) return

        if (!hasInitializedTab.current) {
            setSelectedTab(hasAccessiblePrograms ? 'enrolled' : 'available')
            hasInitializedTab.current = true
            return
        }

        if (selectedTab === 'enrolled' && !hasAccessiblePrograms) {
            setSelectedTab('available')
        }
    }, [data, hasAccessiblePrograms, selectedTab])

    // Redirect to login if not authenticated
    if (!session) {
        router.replace('/(auth)/login' as Href)
        return null
    }

    // Loading state
    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.color.primary[500]} />
                <Text style={[styles.loadingText, isDarkMode && { color: '#FFFFFF' }]}>
                    Chargement de vos concours...
                </Text>
            </View>
        )
    }

    // Error state
    if (error) {
        return (
            <View style={styles.centerContainer}>
                <MaterialCommunityIcons 
                    name="alert-circle" 
                    size={48} 
                    color={isDarkMode ? '#CCCCCC' : '#6B7280'} 
                />
                <Text style={[styles.errorText, isDarkMode && { color: '#CCCCCC' }]}>
                    Une erreur est survenue lors du chargement
                </Text>
                <Pressable style={styles.retryButton} onPress={() => mutate()}>
                    <Text style={styles.retryText}>Réessayer</Text>
                </Pressable>
            </View>
        )
    }

    return (
        <View style={[styles.container, isDarkMode && styles.containerDark]}>
            <View style={[styles.header, isDarkMode && styles.headerDark]}>
                <Text style={[styles.title, isDarkMode && styles.titleDark]}>
                    Concours
                </Text>
                <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
                    Retrouvez vos concours et ceux disponibles
                </Text>
            </View>

            <View style={[styles.searchContainer, isDarkMode && styles.searchContainerDark]}>
                <View style={[styles.searchInputWrapper, isDarkMode && styles.searchInputWrapperDark]}>
                    <MaterialCommunityIcons 
                        name="magnify" 
                        size={20} 
                        color={isDarkMode ? '#CCCCCC' : '#6B7280'} 
                    />
                    <TextInput
                        style={[styles.searchInput, isDarkMode && styles.searchInputDark]}
                        placeholder="Rechercher un concours..."
                        placeholderTextColor={isDarkMode ? '#CCCCCC' : '#6B7280'}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={() => setSearchQuery('')}>
                            <MaterialCommunityIcons 
                                name="close-circle" 
                                size={20} 
                                color={isDarkMode ? '#CCCCCC' : '#6B7280'} 
                            />
                        </Pressable>
                    )}
                </View>
            </View>

            <View style={[styles.tabsContainer, isDarkMode && styles.tabsContainerDark]}>
                <Pressable
                    style={[
                        styles.tabButton,
                        selectedTab === 'enrolled' && styles.tabButtonActive,
                        isDarkMode && styles.tabButtonDark,
                        isDarkMode && selectedTab === 'enrolled' && styles.tabButtonActiveDark,
                    ]}
                    onPress={() => setSelectedTab('enrolled')}
                >
                    <Text
                        style={[
                            styles.tabButtonText,
                            selectedTab === 'enrolled' && styles.tabButtonTextActive,
                            isDarkMode && styles.tabButtonTextDark,
                            isDarkMode && selectedTab === 'enrolled' && styles.tabButtonTextActiveDark,
                        ]}
                    >
                        Mes concours
                    </Text>
                    <View
                        style={[
                            styles.tabCount,
                            selectedTab === 'enrolled' && styles.tabCountActive,
                            isDarkMode && styles.tabCountDark,
                        ]}
                    >
                        <Text
                            style={[
                                styles.tabCountText,
                                isDarkMode && styles.tabCountTextDark,
                                selectedTab === 'enrolled' && styles.tabCountTextActive,
                            ]}
                        >
                            {enrolledPrograms.length}
                        </Text>
                    </View>
                </Pressable>

                <Pressable
                    style={[
                        styles.tabButton,
                        selectedTab === 'available' && styles.tabButtonActive,
                        isDarkMode && styles.tabButtonDark,
                        isDarkMode && selectedTab === 'available' && styles.tabButtonActiveDark,
                    ]}
                    onPress={() => setSelectedTab('available')}
                >
                    <Text
                        style={[
                            styles.tabButtonText,
                            selectedTab === 'available' && styles.tabButtonTextActive,
                            isDarkMode && styles.tabButtonTextDark,
                            isDarkMode && selectedTab === 'available' && styles.tabButtonTextActiveDark,
                        ]}
                    >
                        Concours disponibles
                    </Text>
                    <View
                        style={[
                            styles.tabCount,
                            selectedTab === 'available' && styles.tabCountActive,
                            isDarkMode && styles.tabCountDark,
                        ]}
                    >
                        <Text
                            style={[
                                styles.tabCountText,
                                isDarkMode && styles.tabCountTextDark,
                                selectedTab === 'available' && styles.tabCountTextActive,
                            ]}
                        >
                            {availablePrograms.length}
                        </Text>
                    </View>
                </Pressable>
            </View>

            {data && data?.length > 0 ? (
                currentTabData.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <MaterialCommunityIcons 
                            name="magnify" 
                            size={48} 
                            color={isDarkMode ? '#CCCCCC' : '#6B7280'} 
                        />
                        <Text style={[styles.loadingText, { textAlign: 'center', marginTop: 16 }, isDarkMode && { color: '#CCCCCC' }]}>
                            {searchQuery.length > 0
                                ? `Aucun concours trouvé pour "${searchQuery}"`
                                : selectedTab === 'enrolled'
                                    ? "Vous n'avez pas encore de concours actif."
                                    : "Aucun concours disponible pour le moment."}
                        </Text>
                        {searchQuery.length > 0 ? (
                            <Pressable 
                                style={[styles.retryButton, { marginTop: 16 }]} 
                                onPress={() => setSearchQuery('')}
                            >
                                <Text style={styles.retryText}>Effacer la recherche</Text>
                            </Pressable>
                        ) : selectedTab === 'enrolled' ? (
                            <Pressable
                                style={[styles.retryButton, { marginTop: 16 }]}
                                onPress={() => setSelectedTab('available')}
                            >
                                <Text style={styles.retryText}>Voir les concours disponibles</Text>
                            </Pressable>
                        ) : null}
                    </View>
                ) : (
                    <FlatList
                        data={currentTabData}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <ModernLearningPathCard path={item} />
                        )}
                        contentContainerStyle={styles.listContainer}
                        ListFooterComponent={
                            selectedTab === 'enrolled' && enrolledPrograms.length > 0 ? (
                                <View style={[styles.footerCtaCard, isDarkMode && styles.footerCtaCardDark]}>
                                    <Text style={[styles.footerCtaTitle, isDarkMode && styles.footerCtaTitleDark]}>
                                        Explorer d'autres concours
                                    </Text>
                                    <Text style={[styles.footerCtaText, isDarkMode && styles.footerCtaTextDark]}>
                                        Découvrez les concours disponibles et ajoutez-en un nouveau à votre préparation.
                                    </Text>
                                    <Pressable
                                        style={styles.footerCtaButton}
                                        onPress={() => setSelectedTab('available')}
                                    >
                                        <Text style={styles.footerCtaButtonText}>Voir les concours disponibles</Text>
                                        <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" />
                                    </Pressable>
                                </View>
                            ) : null
                        }
                        refreshControl={
                            <RefreshControl
                                refreshing={isLoading}
                                onRefresh={() => mutate()}
                                colors={[theme.color.primary[500]]}
                                tintColor={theme.color.primary[500]}
                            />
                        }
                        removeClippedSubviews={true}
                        maxToRenderPerBatch={8}
                        windowSize={10}
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={5}
                        updateCellsBatchingPeriod={30}
                        getItemLayout={(data, index) => ({
                            length: 170,
                            offset: 170 * index,
                            index,
                        })}
                    />
                )
            ) : (
                <NoProgram />
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        paddingBottom: 60
    },
    containerDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    searchContainerDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderBottomColor: theme.color.dark.border,
    },
    tabsContainer: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    tabsContainerDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderBottomColor: theme.color.dark.border,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    tabButtonDark: {
        backgroundColor: theme.color.dark.background.primary,
        borderColor: theme.color.dark.border,
    },
    tabButtonActive: {
        backgroundColor: theme.color.primary[50],
        borderColor: theme.color.primary[200],
    },
    tabButtonActiveDark: {
        backgroundColor: 'rgba(20, 83, 45, 0.24)',
        borderColor: '#22C55E',
    },
    tabButtonText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
    },
    tabButtonTextDark: {
        color: '#CBD5E1',
    },
    tabButtonTextActive: {
        color: theme.color.primary[700],
    },
    tabButtonTextActiveDark: {
        color: '#DCFCE7',
    },
    tabCount: {
        minWidth: 24,
        height: 24,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        backgroundColor: '#E5E7EB',
    },
    tabCountDark: {
        backgroundColor: '#334155',
    },
    tabCountActive: {
        backgroundColor: theme.color.primary[500],
    },
    tabCountText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        fontWeight: '700',
        color: '#1F2937',
    },
    tabCountTextDark: {
        color: '#E2E8F0',
    },
    tabCountTextActive: {
        color: '#FFFFFF',
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    searchInputWrapperDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: '#111827',
        paddingVertical: 4,
    },
    searchInputDark: {
        color: '#FFFFFF',
    },
    header: {
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderBottomColor: theme.color.dark.border,
    },
    title: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    titleDark: {
        color: '#FFFFFF',
    },
    subtitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: '#6B7280',
        marginTop: 4,
    },
    subtitleDark: {
        color: '#CCCCCC',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 12,
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: '#6B7280',
    },
    listContainer: {
        padding: 16,
        gap: 16,
        paddingBottom: 28,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 12,
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: theme.color.primary[500],
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    retryText: {
        color: '#FFFFFF',
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
    },
    footerCtaCard: {
        marginTop: 8,
        borderRadius: 16,
        padding: 16,
        backgroundColor: '#ECFDF5',
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    footerCtaCardDark: {
        backgroundColor: 'rgba(20, 83, 45, 0.24)',
        borderColor: '#22C55E',
    },
    footerCtaTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '700',
        color: '#065F46',
        marginBottom: 6,
    },
    footerCtaTitleDark: {
        color: '#DCFCE7',
    },
    footerCtaText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        lineHeight: 20,
        color: '#047857',
        marginBottom: 14,
    },
    footerCtaTextDark: {
        color: '#BBF7D0',
    },
    footerCtaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: theme.color.primary[500],
    },
    footerCtaButtonText: {
        color: '#FFFFFF',
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '700',
    },
})

export default MyLearningPaths
