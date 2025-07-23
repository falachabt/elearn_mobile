import {useState, useEffect} from 'react';
import {supabase} from '@/lib/supabase';
import useSWR from 'swr';
import {programProgressKeys} from "@/constants/swr-path";

// Interfaces for data structures
interface School {
    id: string;
    name: string;
    sigle: string;
}

interface Concours {
    id: string;
    name: string;
    school?: School;
    study_cycles : {
        level : number;
    };
    concours_archives?: ArchiveComplete[];
}

interface ArchiveComplete {
    id: string;
}

interface ConcoursLearningPath {
    concour?: Concours;
}

interface Exercise {
    id: string;
}

interface Course {
    id: string;
    exercices?: Exercise[];
}

interface CourseLearningPath {
    id: string;
    courseId: string;
    courses?: Course;
}

interface QuizLearningPath {
    id: string;
    quizId: string;
}

interface LearningPath {
    id: string;
    title: string;
    description?: string;
    course_count?: number;
    quiz_count?: number;
    duration?: number;
    course_learningpath: CourseLearningPath[];
    quiz_learningpath: QuizLearningPath[];
    concours_learningpaths?: ConcoursLearningPath;
}

interface CourseProgress {
    course_id: string;
    progress_percentage: number;
}

interface QuizAttempt {
    quiz_id: string;
}

interface ExerciceComplete {
    exercice_id: string;
}

interface ProgressData {
    program: LearningPath;
    courseProgress: {
        completed: number;
        percentage: number;
    };
    quizProgress: {
        completed: number;
        percentage: number;
    };
    exercisesProgress: {
        completed: number;
        total: number;
        percentage: number;
    };
    archiveProgress: {
        completed: number;
        percentage: number;
    };
}

interface ProgramProgress {
    courseProgress: {
        completed: number;
        percentage: number;
    };
    quizProgress: {
        completed: number;
        percentage: number;
    };
    exercisesProgress: {
        completed: number;
        total: number;
        percentage: number;
    };
    archiveProgress: {
        completed: number;
        percentage: number;
    };
    totalProgress: number;
    program: LearningPath | undefined;
    isLoading: boolean;
    error: Error | null;
}

// Helper function to ensure percentage never exceeds 100%
const capPercentage = (value: number): number => {
    return Math.min(Math.max(0, value), 100);
};

export const useProgramProgress = (lpId: string, userId: string): ProgramProgress => {
    // LOG: Au début du hook pour voir avec quels paramètres il est appelé.
    console.log(`[useProgramProgress] Hook initialisé. lpId: "${lpId}", userId: "${userId}"`);

    const [courseProgress, setCourseProgress] = useState<{
        completed: number;
        percentage: number;
    }>({
        completed: 0,
        percentage: 0,
    });

    const [quizProgress, setQuizProgress] = useState<{
        completed: number;
        percentage: number;
    }>({
        completed: 0,
        percentage: 0,
    });

    const [exercisesProgress, setExercisesProgress] = useState<{
        completed: number;
        total: number;
        percentage: number;
    }>({
        completed: 0,
        total: 0,
        percentage: 0,
    });

    const [archiveProgress, setArchiveProgress] = useState<{
        completed: number;
        percentage: number;
    }>({
            completed: 0,
            percentage: 0,
        }
    );

    const {data: programData, error, isLoading} = useSWR<ProgressData>(
        lpId && userId ? programProgressKeys.detail(lpId, userId) : null, // Use specific key
        async () => {
            // LOG: Début de la fonction de fetch SWR. Si ce log n'apparaît pas, c'est que lpId ou userId est manquant.
            console.log(`[useProgramProgress] Début du fetcher SWR pour lpId: ${lpId}`);

            // --- ÉTAPE 1: Récupération des données du programme ---
            console.log("[useProgramProgress] Étape 1: Tentative de récupération des données du programme...");
            const {data: rawProgramData, error: programError} = await supabase
                .from("learning_paths")
                .select(
                    `
            id,
            title,
            description,
            course_count,
            quiz_count,
            duration,
            course_learningpath(
                id, 
                courseId,
                courses(
                    id, 
                    exercices(id)
                )
            ),
            quiz_learningpath(
                id, 
                quizId
            ),
            concours_learningpaths(
                concour:concours(
                    id,
                    name,
                    study_cycles(level),
                    concours_archives(id),
                    school:schools(
                        id,
                        name, 
                        sigle
                    )
                )
            )
            `
                )
                .eq("id", lpId)
                .single();

            // LOG: Vérification de l'erreur de la première requête. C'est un point de défaillance majeur.
            if (programError) {
                console.error("[useProgramProgress] ERREUR CRITIQUE à l'étape 1: Échec de la récupération du programme.", programError);
                throw programError; // Lance l'erreur pour que SWR la capture
            }
            if (!rawProgramData) {
                const noDataError = new Error("Aucune donnée de programme trouvée pour cet ID. .single() a probablement échoué car 0 ligne retournée.");
                console.error("[useProgramProgress] ERREUR CRITIQUE à l'étape 1:", noDataError.message);
                throw noDataError;
            }
            console.log("[useProgramProgress] Étape 1: Données du programme récupérées avec succès.");

            const program = rawProgramData as unknown as LearningPath;

            // LOG: Vérification de la structure des données reçues avant de tenter de les utiliser.
            if (!program.course_learningpath || !program.quiz_learningpath) {
                const structureError = new Error("La structure des données du programme est incorrecte. `course_learningpath` ou `quiz_learningpath` est manquant.");
                console.error("[useProgramProgress] ERREUR CRITIQUE DE STRUCTURE:", structureError, "Données reçues:", program);
                throw structureError;
            }

            // --- Extraction des IDs ---
            console.log("[useProgramProgress] Extraction des IDs pour les requêtes de progression...");
            const relevantCourseIds = program.course_learningpath.map(c => c.courseId).filter(Boolean);
            const relevantQuizIds = program.quiz_learningpath.map(q => q.quizId).filter(Boolean);
            const relevantArchivesIds = program.concours_learningpaths?.concour?.concours_archives?.map(a => a.id).filter(Boolean) || [];
            const allExerciseIds: string[] = [];
            program.course_learningpath.forEach(courseLP => {
                if (courseLP.courses?.exercices) {
                    courseLP.courses.exercices.forEach(exercise => {
                        if (exercise.id) {
                            allExerciseIds.push(exercise.id);
                        }
                    });
                }
            });
            console.log(`[useProgramProgress] IDs extraits: ${relevantCourseIds.length} cours, ${relevantQuizIds.length} quiz, ${allExerciseIds.length} exercices, ${relevantArchivesIds.length} archives.`);

            // --- ÉTAPE 2: Récupération des données de progression en parallèle ---
            console.log("[useProgramProgress] Étape 2: Lancement des requêtes de progression en parallèle...");
            try {
                const [courseProgressData, quizData, exerciseData, archiveProgressData] = await Promise.all([
                    // Fetch only relevant course progress
                    supabase
                        .from("course_progress_summary")
                        .select("course_id, progress_percentage")
                        .eq("user_id", userId)
                        .in("course_id", relevantCourseIds.length ? relevantCourseIds : ['none'])
                        .then(({data, error}) => {
                            if (error) {
                                console.error("[useProgramProgress] Erreur dans la requête de progression des cours:", error);
                                throw error;
                            }
                            return data as CourseProgress[] || [];
                        }),

                    // Fetch only relevant quiz attempts
                    supabase
                        .from("quiz_attempts")
                        .select("quiz_id")
                        .eq("user_id", userId)
                        .eq("status", "completed")
                        .gte("score", 70)
                        .in("quiz_id", relevantQuizIds.length ? relevantQuizIds : ['none'])
                        .then(({data, error}) => {
                            if (error) {
                                console.error("[useProgramProgress] Erreur dans la requête des tentatives de quiz:", error);
                                throw error;
                            }
                            return data as QuizAttempt[] || [];
                        }),

                    // Fetch only relevant completed exercises
                    supabase
                        .from("exercices_complete")
                        .select("exercice_id")
                        .eq("user_id", userId)
                        .eq("is_completed", true)
                        .in("exercice_id", allExerciseIds.length ? allExerciseIds : ['none'])
                        .then(({data, error}) => {
                            if (error) {
                                console.error("[useProgramProgress] Erreur dans la requête des exercices complétés:", error);
                                throw error;
                            }
                            return data as ExerciceComplete[] || [];
                        }),


                    // Fetch only relevant archive progress
                    supabase
                        .from("user_completed_archives")
                        .select("id")
                        .eq("user_id", userId)
                        .in("archive_id", relevantArchivesIds.length ? relevantArchivesIds : ['none']) // Ajout d'une condition pour ne pas faire une requête IN vide
                        .then(({data, error}) => {
                            if (error) {
                                // Non-blocking error: logging for debugging purposes only
                                console.error("Erreur silencieuse (non bloquante) lors de la récupération des archives complétées:", error);
                                return [];
                            }
                            return data as ArchiveComplete[] || [];
                        }),
                ]);

                console.log("[useProgramProgress] Étape 2: Toutes les données de progression ont été récupérées avec succès.");
                
                // Calculate course progress
                const totalCourses = program.course_learningpath.length || 0;
                const cappedCourseProgressData = courseProgressData.map(course => ({
                    ...course,
                    progress_percentage: Math.min(course.progress_percentage, 100)
                }));
                const totalCourseProgress = cappedCourseProgressData.reduce((acc, course) => {
                    return acc + course.progress_percentage;
                }, 0);
                let calculatedCourseProgress = 0;
                if (totalCourses > 0) {
                    calculatedCourseProgress = capPercentage(totalCourseProgress / (totalCourses * 100) * 100);
                }
                const courseCompleted = Math.min(
                    cappedCourseProgressData.filter(course => course.progress_percentage === 100).length,
                    totalCourses
                );

                // Calculate quiz progress
                const totalQuizzes = program.quiz_learningpath.length || 0;
                const completedQuizzes = Math.min(quizData.length, totalQuizzes);
                let calculatedQuizProgress = 0;
                if (totalQuizzes > 0) {
                    calculatedQuizProgress = capPercentage((completedQuizzes / totalQuizzes) * 100);
                }

                // Calculate exercises progress
                const totalExercises = allExerciseIds.length;
                const completedExerciseIds = new Set(
                    exerciseData
                        .map(exercise => exercise.exercice_id)
                        .filter(id => allExerciseIds.includes(id))
                );
                const completedExercises = Math.min(completedExerciseIds.size, totalExercises);
                let calculatedExercisesProgress = 0;
                if (totalExercises > 0) {
                    calculatedExercisesProgress = capPercentage((completedExercises / totalExercises) * 100);
                }

                console.log("[useProgramProgress] Fetcher SWR terminé avec succès. Retour des données calculées.");
                return {
                    program,
                    courseProgress: {
                        completed: courseCompleted,
                        percentage: calculatedCourseProgress,
                    },
                    quizProgress: {
                        completed: completedQuizzes,
                        percentage: calculatedQuizProgress,
                    },
                    exercisesProgress: {
                        completed: completedExercises,
                        total: totalExercises,
                        percentage: calculatedExercisesProgress
                    },
                    archiveProgress: {
                        completed: archiveProgressData.length,
                        percentage: relevantArchivesIds.length > 0 ? capPercentage((archiveProgressData.length / relevantArchivesIds.length) * 100) : 0
                    }
                };

            } catch (e) {
                // LOG: Si une des requêtes de Promise.all échoue, on le saura ici.
                console.error("[useProgramProgress] ERREUR CRITIQUE à l'étape 2: Une des requêtes de progression a échoué dans Promise.all.", e);
                throw e; // Relance l'erreur pour que SWR la capture
            }
        },
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            refreshInterval: 10000, // Refresh every 10 seconds
        }
    );

    // LOG: Ce useEffect se déclenchera UNIQUEMENT si SWR renvoie une erreur finale.
    useEffect(() => {
        if (error) {
            console.error("[useProgramProgress] HOOK FINAL: SWR a rapporté une erreur qui sera retournée au composant:", error);
        }
    }, [error]);

    useEffect(() => {
        if (programData) {
            setCourseProgress(programData.courseProgress);
            setQuizProgress(programData.quizProgress);
            setExercisesProgress(programData.exercisesProgress);
            setArchiveProgress(programData.archiveProgress);
        }
    }, [programData]);

    // Calculate total progress with weighted components and capped at 100%
    //  --- BLOC DE CALCUL RESTAURÉ ---
    const totalProgress = (() => {
        const totalCourses = programData?.program?.course_learningpath?.length || 0;
        const totalQuizzes = programData?.program?.quiz_learningpath?.length || 0;
        const totalExercises = exercisesProgress?.total || 0;
        const totalArchives = programData?.program?.concours_learningpaths?.concour?.concours_archives?.length || 0;

        if (!totalCourses && !totalQuizzes && !totalExercises && !totalArchives) return 0;

        // Define weights for each component
        const componentsWeight = {
            courses: totalCourses > 0 ? 1.5 : 0,
            quizzes: totalQuizzes > 0 ? 2 : 0,
            exercises: totalExercises > 0 ? 3 : 0,
            archives: totalArchives > 0 ? 2 : 0
        };

        // Normalize weights if any component is missing
        const totalWeight = componentsWeight.courses + componentsWeight.quizzes + componentsWeight.exercises + componentsWeight.archives;

        if (totalWeight === 0) return 0;

        const normalizedWeights = {
            courses: componentsWeight.courses / totalWeight,
            quizzes: componentsWeight.quizzes / totalWeight,
            exercises: componentsWeight.exercises / totalWeight,
            archives: componentsWeight.archives / totalWeight
        };

        // Calculate weighted progress and cap at 100%
        const weightedProgress =
            ((courseProgress?.percentage || 0) * normalizedWeights.courses) +
            ((quizProgress?.percentage || 0) * normalizedWeights.quizzes) +
            ((exercisesProgress?.percentage || 0) * normalizedWeights.exercises) +
            ((archiveProgress?.percentage || 0) * normalizedWeights.archives);

        return Math.round(capPercentage(weightedProgress));
    })();

    return {
        courseProgress,
        quizProgress,
        exercisesProgress,
        archiveProgress,
        totalProgress, // --- totalProgress EST BIEN DE RETOUR DANS L'OBJET RETOURNÉ ---
        program: programData?.program,
        isLoading,
        error: error as Error | null,
    };
};