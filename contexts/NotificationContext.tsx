import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useRef,
    ReactNode,
} from "react";
import * as Notifications from "expo-notifications";
import { Href, router } from "expo-router";
import { Platform } from "react-native";

import { logger } from "@/utils/logger";

interface NotificationContextType {
    expoPushToken: string | undefined;
    notification: Notifications.Notification | null;
    error: Error | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
    undefined
);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error(
            "useNotification must be used within a NotificationProvider"
        );
    }
    return context;
};

interface NotificationProviderProps {
    children: ReactNode;
}

/**
 * Gère la navigation automatique basée sur les données de la notification
 */
const handleNotificationNavigation = (data: Record<string, unknown>) => {
    logger.log('🧭 Navigation automatique avec data:', data);
    
    try {
        // Type de notification: course, quiz, news, etc.
        const type = data?.type as string;
        const id = data?.id as string;
        const screen = data?.screen as string;
        
        if (!type && !screen) {
            logger.warn('⚠️ Pas de type ou screen dans les données de notification');
            return;
        }
        
        // Navigation basée sur le type
        switch (type) {
            case 'course':
                // Pour les cours du secondary (programmes)
                // Format attendu: { type: 'course', programId: 'xxx', courseId: 'xxx' }
                const programId = data?.programId as string;
                const courseId = data?.courseId as string;
                
                if (programId && courseId) {
                    router.push(`/(app)/secondary/program/${programId}/courses/${courseId}` as Href);
                    logger.log('✅ Navigation vers le cours secondary:', courseId);
                } else if (id) {
                    // Fallback vers learn si pas de programId
                    router.push(`/(app)/learn/${id}` as Href);
                    logger.log('✅ Navigation vers learn:', id);
                }
                break;
                
            case 'quiz':
                // Format: { type: 'quiz', programId: 'xxx', quizId: 'xxx' }
                const quizProgramId = data?.programId as string;
                const quizId = data?.quizId || id;
                
                if (quizProgramId && quizId) {
                    router.push(`/(app)/secondary/program/${quizProgramId}/quizzes/${quizId}` as Href);
                    logger.log('✅ Navigation vers le quiz:', quizId);
                }
                break;

            case 'exercise':
                // Format: { type: 'exercise', programId: 'xxx', exerciseId: 'xxx' }
                const exerciseProgramId = data?.programId as string;
                const exerciseId = (data?.exerciseId || id) as string;

                if (exerciseProgramId && exerciseId) {
                    router.push(`/(app)/secondary/program/${exerciseProgramId}/exercices/${exerciseId}` as Href);
                    logger.log('✅ Navigation vers l\'exercice:', exerciseId);
                }
                break;
                
            case 'news':
                if (id) {
                    router.push(`/(modals)/news/${id}` as Href);
                    logger.log('✅ Navigation vers la news:', id);
                } else {
                    // Si pas d'ID, aller à l'accueil où les news sont affichées
                    router.push('/(app)/' as Href);
                    logger.log('✅ Navigation vers l\'accueil (section news)');
                }
                break;
                
            case 'concours-blanc':
                // Rediriger vers l'inscription au concours blanc
                router.push('/concours-blanc-register');
                logger.log('✅ Navigation vers concours blanc');
                break;
                
            case 'profile':
                router.push('/(app)/profile' as Href);
                logger.log('✅ Navigation vers le profil');
                break;
                
            case 'home':
            case 'reminder':
                // Rappel d'apprentissage → accueil
                router.push('/(app)/' as Href);
                logger.log('✅ Navigation vers l\'accueil');
                break;
                
            default:
                // Navigation vers un écran spécifique si fourni
                if (screen) {
                    router.push(screen as Href);
                    logger.log('✅ Navigation vers:', screen);
                } else {
                    logger.warn('⚠️ Type de notification inconnu:', type);
                }
                break;
        }
    } catch (error) {
        logger.error('❌ Erreur lors de la navigation:', error);
    }
};

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
                                                                              children,
                                                                          }) => {
    const [expoPushToken] = useState<string | undefined>(undefined);
    const [notification, setNotification] =
        useState<Notifications.Notification | null>(null);
    const error = null;

    const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
    const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);

    useEffect(() => {
        if (Platform.OS === 'web') {
            return;
        }

        notificationListener.current =
            Notifications.addNotificationReceivedListener((notification) => {
                logger.log('📩 Notification reçue:', {
                    title: notification.request.content.title,
                    body: notification.request.content.body,
                    data: notification.request.content.data,
                    categoryIdentifier: notification.request.content.categoryIdentifier,
                });
                setNotification(notification);
            });

        responseListener.current =
            Notifications.addNotificationResponseReceivedListener((response) => {
                logger.log('🔔 Notification cliquée:', {
                    title: response.notification.request.content.title,
                    data: response.notification.request.content.data,
                    actionIdentifier: response.actionIdentifier,
                });
                
                // Navigation automatique basée sur les données de la notification
                handleNotificationNavigation(response.notification.request.content.data);
            });

        return () => {
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, []);

    return (
        <NotificationContext.Provider
            value={{ expoPushToken, notification, error }}
        >
            {children}
        </NotificationContext.Provider>
    );
};
