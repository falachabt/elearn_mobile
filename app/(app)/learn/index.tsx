import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    useColorScheme,
    View
} from 'react-native'
import React, { useState } from 'react'
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
import {useUser} from '@/contexts/useUserInfo';

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
    isGenerousWeek?: boolean // Property to indicate if this is the generous week program
}

const MyLearningPaths = () => {
    const {session, user: authUser} = useAuth()
    const {user} = useUser() // Get user data including metadata
    const router = useRouter()
    const colorScheme = useColorScheme()
    const isDarkMode = colorScheme === 'dark'
    const [searchQuery, setSearchQuery] = useState('')

    // Get generous week program ID from user metadata
    const generousWeekProgramId = user?.metadata?.generousWeek?.programId

    const {data, error, isLoading, mutate} = useSWR(
        authUser ? 'all-learning-paths-with-enrollment' : null,
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
                    (enrollment: any) => enrollment.user_id === authUser?.id
                )
                const userEnrollment = item.user_program_enrollments?.find(
                    (enrollment: any) => enrollment.user_id === authUser?.id
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

            // Mark the generous week program
            if (generousWeekProgramId) {
                allPaths.forEach(path => {
                    // Check if any of the concours_learningpaths matches the generous week program ID
                    const isGenerousWeek = path.concours_learningpaths?.some(
                        clp => clp.id === generousWeekProgramId
                    );

                    if (isGenerousWeek) {
                        // Check if the generous week period is still active
                        if (user?.metadata?.generousWeek) {
                            const generousWeek = user.metadata.generousWeek
                            const selectedAt = new Date(generousWeek.selectedAt);
                            const durationInMs = generousWeek.duration * 24 * 60 * 60 * 1000;

                            // Only mark as generous week if the period hasn't expired
                            if (Date.now() < selectedAt.getTime() + durationInMs) {
                                path.isGenerousWeek = true;
                            }
                        }
                    }
                });
            }

            // Trier pour mettre les programmes de la semaine généreuse et enrollés en premier
            return allPaths.sort((a, b) => {
                // Generous week program comes first
                if (a.isGenerousWeek && !b.isGenerousWeek) return -1;
                if (!a.isGenerousWeek && b.isGenerousWeek) return 1;

                // Then enrolled programs
                if (a.isEnrolled && !b.isEnrolled) return -1;
                if (!a.isEnrolled && b.isEnrolled) return 1;

                return 0;
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

            {data && data.length > 0 ? (
                (() => {
                    const filteredData = data.filter(item => 
                        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
                    );

                    if (filteredData.length === 0 && searchQuery.length > 0) {
                        return (
                            <View style={styles.centerContainer}>
                                <MaterialCommunityIcons 
                                    name="magnify" 
                                    size={48} 
                                    color={isDarkMode ? '#CCCCCC' : '#6B7280'} 
                                />
                                <Text style={[styles.loadingText, {textAlign: 'center', marginTop: 16}]}>
                                    Aucun parcours trouvé pour "{searchQuery}"
                                </Text>
                                <Pressable 
                                    style={[styles.retryButton, {marginTop: 16}]} 
                                    onPress={() => setSearchQuery('')}
                                >
                                    <Text style={styles.retryText}>Effacer la recherche</Text>
                                </Pressable>
                            </View>
                        );
                    }

                    return (
                        <FlatList
                            data={filteredData}
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
                            removeClippedSubviews={true}
                            maxToRenderPerBatch={8}
                            windowSize={10}
                            initialNumToRender={5}
                            updateCellsBatchingPeriod={30}
                            getItemLayout={(data, index) => ({
                                length: 170, // Hauteur approximative de chaque carte
                                offset: 170 * index,
                                index,
                            })}
                        />
                    );
                })()
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
