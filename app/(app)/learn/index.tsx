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
import { useState, useMemo, useEffect, useCallback } from 'react'
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

const MyLearningPaths = () => {
    const { session, user: authUser } = useAuth()
    const { user, mutateUserPrograms, mutateProgramAccessMap } = useUser()
    const router = useRouter()
    const colorScheme = useColorScheme()
    const isDarkMode = colorScheme === 'dark'
    const [searchQuery, setSearchQuery] = useState('')

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
                        user_id
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
                const isUserEnrolled = item.user_program_enrollments?.some(
                    (enrollment: UserProgramEnrollment) => enrollment.user_id === authUser?.id
                ) ?? false
                const userEnrollment = item.user_program_enrollments?.find(
                    (enrollment: UserProgramEnrollment) => enrollment.user_id === authUser?.id
                )

                if (!learningPathMap.has(learningPathId)) {
                    learningPathMap.set(learningPathId, {
                        id: item.learning_path.id,
                        title: `Programme ${item.concour.school?.sigle ?? ''} Niveau : ${item.concour.study_cycles?.level ?? ''}`,
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
                    Chargement de vos parcours...
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
                    Mes Parcours
                </Text>
                <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
                    Continuez votre préparation aux concours
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
                        placeholder="Rechercher un parcours..."
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

            {data && data?.length > 0 ? (
                filteredData.length === 0 && searchQuery.length > 0 ? (
                    <View style={styles.centerContainer}>
                        <MaterialCommunityIcons 
                            name="magnify" 
                            size={48} 
                            color={isDarkMode ? '#CCCCCC' : '#6B7280'} 
                        />
                        <Text style={[styles.loadingText, { textAlign: 'center', marginTop: 16 }, isDarkMode && { color: '#CCCCCC' }]}>
                            Aucun parcours trouvé pour "{searchQuery}"
                        </Text>
                        <Pressable 
                            style={[styles.retryButton, { marginTop: 16 }]} 
                            onPress={() => setSearchQuery('')}
                        >
                            <Text style={styles.retryText}>Effacer la recherche</Text>
                        </Pressable>
                    </View>
                ) : (
                    <FlatList
                        data={filteredData}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <ModernLearningPathCard path={item} />
                        )}
                        contentContainerStyle={styles.listContainer}
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
})

export default MyLearningPaths
