import React, {createContext, useContext, useState, ReactNode, useEffect} from 'react';
import {usePathname} from 'expo-router';
import {useSWRConfig} from 'swr';
import ChatBox, {ContextElement} from '@/components/shared/ChatBot'; // Import the ContextElement type

// Define the context interface
interface ChatContextType {
    isChatVisible: boolean;
    openChat: (initialContextElements?: ContextElement[], chatSessionId?: string) => void;
    closeChat: () => void;
    addContextElement: (element: ContextElement) => void;
    removeContextElement: (elementId: string) => void;
    contextElements: ContextElement[];
    currentChatSessionId: string | null;
    setCurrentChatSessionId: (id: string | null) => void;
}

// Create the context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Provider component
export const ChatProvider: React.FC<{ children: ReactNode }> = ({children}) => {
    const [isChatVisible, setIsChatVisible] = useState(false);
    const [contextElements, setContextElements] = useState<ContextElement[]>([]);
    const [currentChatSessionId, setCurrentChatSessionId] = useState<string | null>(null);
    const pathname = usePathname();
    const {cache} = useSWRConfig();

    // Update context elements when path changes
    useEffect(() => {
        // Only update if chat is not visible - prevents disrupting an ongoing chat
        if (!isChatVisible) {
            const currentContextElement = getContextElementFromCache(pathname, cache);
            if (currentContextElement) {
                setContextElements([currentContextElement]);
            }
        }
    }, [pathname, isChatVisible, cache]);

    const openChat = (initialContextElements?: ContextElement[], chatSessionId?: string) => {
        // If initialContextElements is provided, use it
        if (initialContextElements && initialContextElements.length > 0) {
            setContextElements(initialContextElements);
        }
        // Otherwise, try to get context from current path
        else if (contextElements.length === 0) {
            const currentContextElement = getContextElementFromCache(pathname, cache);
            if (currentContextElement) {
                setContextElements([currentContextElement]);
            }
        }

        if (chatSessionId) {
            setCurrentChatSessionId(chatSessionId);
        }

        setIsChatVisible(true);
    };

    const closeChat = () => {
        setIsChatVisible(false);
    };

    const addContextElement = (element: ContextElement) => {
        if (!contextElements.some(e => e.id === element.id)) {
            setContextElements([...contextElements, element]);
        }
    };

    const removeContextElement = (elementId: string) => {
        setContextElements(contextElements.filter(e => e.id !== elementId));
    };

    // @ts-ignore
    return (
        <ChatContext.Provider
            value={{
                isChatVisible,
                openChat,
                closeChat,
                addContextElement,
                removeContextElement,
                contextElements,
                currentChatSessionId,
                setCurrentChatSessionId,
            }}
        >
            {children}
            <ChatBox
                visible={isChatVisible}
                onClose={closeChat}
                initialContextElements={contextElements}
                initialChatSessionId={currentChatSessionId || undefined}
            />
        </ChatContext.Provider>
    );
};

// Custom hook to use the chat context
export const useChatBox = () => {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChatBox must be used within a ChatProvider');
    }
    return context;
};

// Function to get context element from SWR cache based on route
export const getContextElementFromCache = (pathname: string, cache: any): ContextElement | null => {
    try {
        const segments = pathname.split('/').filter(Boolean);

        // Get indexes for different route segments to handle various URL patterns
        const pdIndex = segments.findIndex(s => s === 'learn') + 1;
        const courseIndex = segments.findIndex(s => s === 'courses') + 1;
        const lessonIndex = segments.findIndex(s => s === 'lessons') + 1;
        const exerciseIndex = segments.findIndex(s => s === 'exercices') + 1;
        const quizIndex = segments.findIndex(s => s === 'quizzes') + 1;
        const archiveIndex = segments.findIndex(s => s === 'anales') + 1;
        const videoIndex = segments.findIndex(s => s === 'videos') + 1;

        // Get IDs from route segments, handling possible out-of-bounds
        const pdId = pdIndex >= 0 && pdIndex < segments.length ? segments[pdIndex] : null;
        const courseId = courseIndex >= 0 && courseIndex < segments.length ? segments[courseIndex] : null;
        const lessonId = lessonIndex >= 0 && lessonIndex < segments.length ? segments[lessonIndex] : null;
        const exerciseId = exerciseIndex >= 0 && exerciseIndex < segments.length ? segments[exerciseIndex] : null;
        const quizId = quizIndex >= 0 && quizIndex < segments.length ? segments[quizIndex] : null;
        const archiveId = archiveIndex >= 0 && archiveIndex < segments.length ? segments[archiveIndex] : null;
        const videoId = videoIndex >= 0 && videoIndex < segments.length ? segments[videoIndex] : null;

        // Determine the primary context based on the most specific route segment
        // Order matters: more specific routes should be checked first

        // Check for lesson context
        if (lessonId && courseId) {
            const contentKey = `content-${lessonId}`;
            const lessonData = cache.get(contentKey)?.data;

            if (lessonData) {
                return {
                    id: `lesson-${lessonId}`,
                    type: 'lesson',
                    title: `Leçon: ${lessonData.name || 'Leçon actuelle'}`,
                    data: lessonData
                };
            }
        }

        // Check for video context
        if (videoId && courseId) {
            const videoKey = `video-${videoId}`;
            const videoData = cache.get(videoKey)?.data;

            if (videoData) {
                return {
                    id: `video-${videoId}`,
                    type: 'video',
                    title: `Vidéo: ${videoData.title || 'Vidéo actuelle'}`,
                    data: videoData
                };
            }
        }

        // Check for exercise context
        if (exerciseId) {
            const exerciseKey = `exercise-${exerciseId}`;
            const exerciseData = cache.get(exerciseKey)?.data;

            if (exerciseData) {
                return {
                    id: `exercise-${exerciseId}`,
                    type: 'exercise',
                    title: `Exercice: ${exerciseData.title || 'Exercice actuel'}`,
                    data: exerciseData
                };
            }
        }

        // Check for quiz context
        if (quizId) {
            const quizKey = `quiz-${quizId}`;
            const quizData = cache.get(quizKey)?.data;

            if (quizData) {
                return {
                    id: `quiz-${quizId}`,
                    type: 'quiz',
                    title: `Quiz: ${quizData.name || 'Quiz actuel'}`,
                    data: quizData
                };
            }
        }

        // Check for archive context
        if (archiveId) {
            const archiveKey = `archives/${archiveId}`;
            const archiveData = cache.get(archiveKey)?.data;

            if (archiveData) {
                return {
                    id: `archive-${archiveId}`,
                    type: 'archive',
                    title: `Archive: ${archiveData.name || 'Archive actuelle'}`,
                    data: archiveData
                };
            }
        }

        // Check for course context
        if (courseId) {
            const courseKey = `course-${courseId}`;
            const courseData = cache.get(courseKey)?.data;

            if (courseData) {
                return {
                    id: `course-${courseId}`,
                    type: 'course',
                    title: `Cours: ${courseData.name || 'Cours actuel'}`,
                    data: courseData
                };
            }
        }

        // Check for program context (most general)
        if (pdId) {
            const programKey = `program-index-${pdId}`;
            const programData = cache.get(programKey)?.data;

            if (programData) {
                return {
                    id: `program-${pdId}`,
                    type: 'program',
                    title: `Programme: ${programData.title || 'Programme actuel'}`,
                    data: programData
                };
            }
        }

        // If we get here, we couldn't find any matching context in the cache
        return null;
    } catch (error) {
        console.error('Error getting context from cache:', error);
        return null;
    }
};

// Helper function to extract useful details from SWR data to print in chat
export const extractContextDataSummary = (element: ContextElement): string => {
    const data = element.data;

    switch (element.type) {
        case 'program':
            return `
Programme: ${data?.title || 'Non disponible'}
${data?.description ? `Description: ${data.description}` : ''}
${data?.course_count ? `Nombre de cours: ${data.course_count}` : ''}
${data?.concours_learningpaths?.concour?.name ? `Concours: ${data.concours_learningpaths.concour.name}` : ''}
${data?.concours_learningpaths?.concour?.school?.name ? `École: ${data.concours_learningpaths.concour.school.name}` : ''}
      `.trim();

        case 'course':
            return `
Cours: ${data?.name || 'Non disponible'}
${data?.description ? `Description: ${data.description}` : ''}
${data?.courses_categories?.name ? `Catégorie: ${data.courses_categories.name}` : ''}
${data?.goals ? `Objectifs: ${Array.isArray(data.goals) ? data.goals.join(', ') : data.goals}` : ''}
${data?.courses_content ? `Nombre de leçons: ${data.courses_content.length}` : ''}
      `.trim();

        case 'lesson':
            return `
Leçon: ${data?.name || 'Non disponible'}
${data?.order !== undefined ? `Ordre: ${data.order + 1}` : ''}
${data?.courses?.name ? `Cours: ${data.courses.name}` : ''}
      `.trim();

        case 'exercise':
            return `
Exercice: ${data?.title || 'Non disponible'}
${data?.description ? `Description: ${data.description}` : ''}
${data?.course?.name ? `Cours: ${data.course.name}` : ''}
      `.trim();

        case 'quiz':
            return `
Quiz: ${data?.name || 'Non disponible'}
${data?.description ? `Description: ${data.description}` : ''}
${data?.quiz_questions ? `Nombre de questions: ${data.quiz_questions.length}` : ''}
      `.trim();

        case 'archive':
            return `
Archive: ${data?.name || 'Non disponible'}
${data?.session ? `Session: ${data.session}` : ''}
${data?.file_type ? `Type de fichier: ${data.file_type}` : ''}
      `.trim();

        case 'video':
            return `
Vidéo: ${data?.title || 'Non disponible'}
${data?.description ? `Description: ${data.description}` : ''}
${data?.duration ? `Durée: ${Math.floor((data.duration || 0) / 60)} min` : ''}
      `.trim();

        default:
            return 'Aucune information détaillée disponible.';
    }
};