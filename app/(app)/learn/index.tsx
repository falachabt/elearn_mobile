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
}

const MyLearningPaths = () => {
    const {session, user} = useAuth()
    const router = useRouter()
    const colorScheme = useColorScheme()
    const isDarkMode = colorScheme === 'dark'

    const {data, error, isLoading, mutate} = useSWR(user ? 'my-learning-paths' : null, async () => {
            const {data: learningPathsData, error: lpError} = await supabase
                .from('user_program_enrollments')
                .select(`
                    concours_learningpaths(  id,
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
                    ))
                `)
                .eq('user_id', user?.id)



        console.log("lpError", lpError)

            if (lpError) throw lpError

            const result = learningPathsData.map((item: any) => (item?.concours_learningpaths));

            // Transform data and add mock progress
            return result.map((item: any, index : number) => ({
                id: item.learning_path.id,
                title: "Programme " + item.concour.school.sigle + " Niveau : " + item.concour.study_cycles.level ,
                description: item.learning_path.description,
                image: item.learning_path.image,
                duration: item.learning_path.duration,
                content: item.learning_path.content,
                course_count: item.learning_path.course_count,
                quiz_count: item.learning_path.quiz_count,
                total_duration: item.learning_path.total_duration,
                concours_learningpaths: [{
                    id: item.id,
                    concourId: item.concourId,
                    learningPathId: item.learningPathId,
                    price: item.price,
                    isActive: item.isActive,
                    concour: item.concour
                }],
                progress: Math.floor(Math.random() * 100) // Mock progress
            })) as LearningPath[]
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

            <FlatList
                data={data}
                keyExtractor={(item) => item.id + Math.random()}
                renderItem={({item}) => <ModernLearningPathCard path={item}/>}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={isLoading}
                        onRefresh={() => mutate()}
                        colors={[theme.color.primary[500]]}
                        tintColor={theme.color.primary[500]}
                    />
                }
                ListEmptyComponent={
                    <NoProgram/>
                }
            />
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
        fontFamily : theme.typography.fontFamily,
fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    titleDark: {
        color: '#FFFFFF',
    },
    subtitle: {
        fontFamily : theme.typography.fontFamily,
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
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        color: '#6B7280',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontFamily : theme.typography.fontFamily,
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
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: '600',
    },
    listContainer: {
        padding: 16,
        gap: 16,
    },
    pathCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: theme.border.width.thin,
        borderColor: theme.color.border,
        borderRadius: theme.border.radius.small,
        overflow: 'hidden',
    },
    pathCardDark: {
        borderColor: theme.color.dark.border,
        backgroundColor: theme.color.dark.background.secondary,
    },
    pathImage: {
        width: '100%',
        height: 120,
        objectFit: "cover",
        backgroundColor: theme.color.gray[600],
    },
    pathContent: {
        padding: 16,
    },
    schoolInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 0,
    },
    schoolLogo: {
        width: 20,
        height: 20,
        borderRadius: theme.border.radius.small,
        marginRight: 8,
    },
    schoolName: {
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        color: '#6B7280',
    },
    pathTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 0,
    },
    pathTitleDark: {
        color: '#FFFFFF',
    },
    progressContainer: {
        marginVertical: 12,
    },
    progressBar: {
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.color.primary[500],
        borderRadius: 2,
    },
    progressText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    progressTextDark: {
        color: '#CCCCCC',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: theme.border.radius.small
    },
    tagText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 12,
        color: '#065F46',
        marginLeft: 4,
    },
    concoursTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: theme.border.radius.small,
    },
    concoursText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 12,
        color: '#4F46E5',
        marginLeft: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    emptyText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 12,
        marginBottom: 16,
    },
    exploreButton: {
        backgroundColor: theme.color.primary[500],
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    exploreButtonText: {
        color: '#FFFFFF',
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: '600',
    },
    ribbonContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        zIndex: 1,
    },
    concoursName: {
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        color: '#4CAF50',
        fontWeight: '600',
        marginBottom: 4,
    },
    concoursNameDark: {
        color: '#A5D6A7',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        backgroundColor: '#F3F4F6',
        padding: 8,
        paddingHorizontal: theme.spacing.medium,
        borderRadius: theme.border.radius.small,
    },
    statsContainerDark: {
        backgroundColor: theme.color.dark.background.tertiary,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statText: {
        marginLeft: 4,
        fontFamily : theme.typography.fontFamily,
fontSize: 13,
        color: '#4B5563',
        fontWeight: '500',
    },
    statTextDark: {
        color: '#D1D5DB',
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        backgroundColor: '#FEF3C7',
        padding: 8,
        paddingHorizontal: theme.spacing.medium,
        borderRadius: theme.border.radius.small,
    },
    dateText: {
        marginLeft: 4,
        fontFamily : theme.typography.fontFamily,
fontSize: 13,
        color: '#92400E',
        fontWeight: '500',
    },
    dateTextDark: {
        color: '#F59E0B',
    },
})

export default MyLearningPaths