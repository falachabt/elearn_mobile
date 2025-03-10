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
                        schoolId,
                        school:schools(
                          id,
                          name,
                          imageUrl,
                          localisation
                        )
                      ),
                      learning_path:learning_paths(
                        id,
                        title,
                        description,
                        image,
                        duration,
                        content,
                        course_count,
                        quiz_count,
                        total_duration
                    ))
                `)
                .eq('user_id', user?.id)

            if (lpError) throw lpError

            const result = learningPathsData.map((item: any) => (item?.concours_learningpaths));

            // Transform data and add mock progress
            return result.map((item: any) => ({
                id: item.learning_path.id,
                title: item.learning_path.title,
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

    const LearningPathCard = ({path}: { path: LearningPath }) => {
        const concours = path.concours_learningpaths?.[0]?.concour
        const school = concours?.school
        const {user} = useAuth();
        const {totalProgress} = useProgramProgress(path.id, user?.id || "");
        const {trigger} = useHaptics();

        return (
            <Pressable
                style={[styles.pathCard, isDarkMode && styles.pathCardDark]}
                onPress={() => {
                    trigger(HapticType.LIGHT);
                    router.push(`/(app)/learn/${path.id}` as any)
                }
                }
            >
                <Image
                    source={{uri: `https://api.dicebear.com/9.x/thumbs/png?seed=${path.title}`}}
                    style={styles.pathImage}
                />

                <View style={styles.pathContent}>
                    <Text
                        style={[styles.concoursName, isDarkMode && styles.concoursNameDark]}>{concours?.name} . {concours?.school.name}</Text>
                    <Text style={[styles.pathTitle, isDarkMode && styles.pathTitleDark]}>{path.title}</Text>

                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, {width: `${totalProgress}%`}]}/>
                        </View>
                        <Text style={[styles.progressText, isDarkMode && styles.progressTextDark]}>{totalProgress}%
                            complété</Text>
                    </View>

                    <View style={[styles.statsContainer, isDarkMode && styles.statsContainerDark]}>
                        <View style={styles.statItem}>
                            <MaterialCommunityIcons name="book-open-variant" size={20}
                                                    color={theme.color.primary[500]}/>
                            <Text
                                style={[styles.statText, isDarkMode && styles.statTextDark]}>{path.course_count} cours</Text>
                        </View>

                        <View style={styles.statItem}>
                            <MaterialCommunityIcons name="help-circle" size={20} color={theme.color.primary[500]}/>
                            <Text
                                style={[styles.statText, isDarkMode && styles.statTextDark]}>{path.quiz_count} quiz</Text>
                        </View>

                        <View style={styles.statItem}>
                            <MaterialCommunityIcons name="clock-outline" size={20} color={theme.color.primary[500]}/>
                            <Text
                                style={[styles.statText, isDarkMode && styles.statTextDark]}>{path.total_duration}h</Text>
                        </View>
                    </View>

                    {concours?.nextDate && (
                        <View style={styles.dateContainer}>
                            <MaterialCommunityIcons name="calendar" size={16} color="#6B7280"/>
                            <Text style={[styles.dateText, isDarkMode && styles.dateTextDark]}>
                                Prochain examen le {new Date(concours.nextDate).toLocaleDateString('fr-FR')}
                            </Text>
                        </View>
                    )}
                </View>
            </Pressable>
        )
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
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    titleDark: {
        color: '#FFFFFF',
    },
    subtitle: {
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
        fontSize: 14,
        color: '#6B7280',
    },
    pathTitle: {
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
        fontSize: 13,
        color: '#92400E',
        fontWeight: '500',
    },
    dateTextDark: {
        color: '#F59E0B',
    },
})

export default MyLearningPaths