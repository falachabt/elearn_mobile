import React, {createContext, useContext, useState, ReactNode, useEffect} from 'react';
import {usePathname} from 'expo-router';
import {useSWRConfig} from 'swr';

import type {ContextElement} from '@/utils/chatContext';
import { getContextElementFromCache as resolveContextElementFromCache } from '@/utils/chatContext';

// Define the context interface
interface ChatContextType {
    isChatVisible: boolean;
    initialContextElements?: ContextElement[];

    initialChatSessionId?: string | null | undefined;

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
            const currentContextElement = resolveContextElementFromCache(pathname, cache);
            setContextElements(currentContextElement ? [currentContextElement] : []);
        }
    }, [pathname, isChatVisible, cache]);


    const openChat = (initialContextElements?: ContextElement[], chatSessionId?: string) => {
        // If initialContextElements is provided, use it
        if (initialContextElements && initialContextElements.length > 0) {
            setContextElements(initialContextElements);
        }
        // Otherwise, try to get context from current path
        else if (contextElements.length === 0) {
            const currentContextElement = resolveContextElementFromCache(pathname, cache);
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
                initialContextElements: contextElements,
                initialChatSessionId: currentChatSessionId || null,
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
    return resolveContextElementFromCache(pathname, cache);
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
${typeof data?.order === 'number' ? `Ordre: ${data.order + 1}` : ''}
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

        case 'video': {
            const durationInMinutes =
                typeof data?.duration === 'number'
                    ? Math.floor(data.duration / 60)
                    : null;
            return `
Vidéo: ${data?.title || 'Non disponible'}
${data?.description ? `Description: ${data.description}` : ''}
${durationInMinutes !== null ? `Durée: ${durationInMinutes} min` : ''}
      `.trim();
        }

        case 'document':
            return `
Document: ${data?.name || data?.title || 'Non disponible'}
${data?.description ? `Description: ${data.description}` : ''}
${data?.file_type ? `Type de fichier: ${data.file_type}` : ''}
${data?.file_size ? `Taille: ${Math.round(data.file_size / 1024)} KB` : ''}
      `.trim();

        default:
            return 'Aucune information détaillée disponible.';
    }
};
