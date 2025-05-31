import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    useColorScheme,
    View
} from 'react-native'
import React from 'react'
import {useAuth} from '@/contexts/auth'
import useSWR from 'swr'
import {supabase} from '@/lib/supabase'
import {MaterialCommunityIcons} from '@expo/vector-icons'
import {useRouter} from 'expo-router'
import {theme} from '@/constants/theme'
import {useProgramProgress} from "@/hooks/useProgramProgress";
import {HapticType, useHaptics} from "@/hooks/useHaptics";
import NoProgram from "@/components/shared/catalogue/NoProgramCard";
import ModernLearningPathCard from "@/components/shared/learn/LearningPathCard";

interface School {
    id: string
    name: string
    imageUrl?: string
    localisation: string
}

interface Concours {
    id: string
    name: string
    description: string
    schoolId: string
    school: School
    dates: { start: string; end: string }
    nextDate: Date
}

interface ConcoursLearningPath {
    id: number
    concourId: string
    learningPathId: string
    price: number
    isActive: boolean
    concour: Concours
}

export interface LearningPath {
    id: string
    title: string
    description: string
    image: { url: string }
    duration: any[]
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
    isEnrolled: boolean // New property to indicate enrollment status
    enrollmentId?: number // ID of enrollment if user is enrolled
}

const MyLearningPaths = () => {
    const {session, user} = useAuth()
    const router = useRouter()
    const colorScheme = useColorScheme()
    const isDarkMode = colorScheme === 'dark'

    const {data, error, isLoading, mutate} = useSWR(
        user ? 'all-learning-paths-with-enrollment' : null,
        async () => {
            // Single optimized query using LEFT JOIN to get all learning paths with enrollment status
            const {data: learningPathsData, error: lpError} = await supabase
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
                // Filter by active learning paths only
                .eq('isActive', true)

            console.log("lpError", lpError)

            if (lpError) throw lpError

            // Group by learning path to avoid duplicates and determine enrollment status
            const learningPathMap = new Map()

            learningPathsData?.forEach((item: any) => {
                const learningPathId = item.learning_path.id
                const isUserEnrolled = item.user_program_enrollments?.some(
                    (enrollment: any) => enrollment.user_id === user?.id
                )
                const userEnrollment = item.user_program_enrollments?.find(
                    (enrollment: any) => enrollment.user_id === user?.id
                )

                if (!learningPathMap.has(learningPathId)) {
                    learningPathMap.set(learningPathId, {
                        id: item.learning_path.id,
                        title: "Programme " + item.concour.school.sigle + " Niveau : " + item.concour.study_cycles.level,
                        description: item.learning_path.description,
                        image: item.learning_path.image,
                        duration: item.learning_path.duration,
                        content: item.learning_path.content,
                        course_count: item.learning_path.course_count,
                        quiz_count: item.learning_path.quiz_count,
                        total_duration: item.learning_path.total_duration,
                        concours_learningpaths: [],
                        isEnrolled: isUserEnrolled,
                        enrollmentId: userEnrollment?.id || null,
                        progress: isUserEnrolled ? Math.floor(Math.random() * 100) : 0 // Only show progress if enrolled
                    })
                }

                // Add concours learning path info
                learningPathMap.get(learningPathId).concours_learningpaths.push({
                    id: item.id,
                    concourId: item.concourId,
                    learningPathId: item.learningPathId,
                    price: item.price,
                    isActive: item.isActive,
                    concour: item.concour
                })
            })

            const allPaths = Array.from(learningPathMap.values()) as LearningPath[]

            // Trier pour mettre les programmes enrollés en premier
            return allPaths.sort((a, b) => {
                if (a.isEnrolled && !b.isEnrolled) return -1
                if (!a.isEnrolled && b.isEnrolled) return 1
                return 0
            })
        }
    )

    if (!session) {
        router.replace('/(auth)/login' as any)
        return null
    }

    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.color.primary[500]}/>
                <Text style={styles.loadingText}>Chargement de vos parcours...</Text>
            </View>
        )
    }

    return (
        <View style={[styles.container, isDarkMode && styles.containerDark]}>
            <View style={[styles.header, isDarkMode && styles.headerDark]}>
                <Text style={[styles.title, isDarkMode && styles.titleDark]}>Mes Parcours</Text>
                <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
                    Continuez votre préparation aux concours
                </Text>
            </View>

            {data && data.length > 0 ? (
                <FlatList
                    data={data}
                    keyExtractor={(item) => item.id}
                    renderItem={({item}) => (
                        <ModernLearningPathCard
                            path={item}
                        />
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
                />
            ) : (
                <NoProgram/>
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