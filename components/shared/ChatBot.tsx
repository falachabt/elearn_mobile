import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    ScrollView,
    Modal,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    useColorScheme,
    TouchableOpacity,
    FlatList,
    Dimensions,
    Animated,
    SafeAreaView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import { theme } from '@/constants/theme';
import { ThemedText } from '@/components/ThemedText';
import { HapticType, useHaptics } from '@/hooks/useHaptics';
import { useSWRConfig } from 'swr';
import run from '@/config/gemini'; // Adjust the import path as necessary
import Markdown from 'react-native-markdown-display'; // Importation de la bibliothèque Markdown

// Define interfaces for context elements
export interface ContextElement {
    id: string;
    type: 'program' | 'course' | 'lesson' | 'exercise' | 'quiz' | 'archive' | 'video';
    title: string;
    data: any; // Actual data from SWR cache
}

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
}

interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    contextElementIds: string[]; // Store IDs rather than full objects
    createdAt: Date;
    updatedAt: Date;
}

interface ChatBoxProps {
    visible: boolean;
    onClose: () => void;
    initialContextElements?: ContextElement[];
    initialChatSessionId?: string;
}

const ChatBox: React.FC<ChatBoxProps> = ({
                                             visible,
                                             onClose,
                                             initialContextElements = [],
                                             initialChatSessionId,
                                         }) => {
    const isDark = useColorScheme() === 'dark';
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [contextElements, setContextElements] = useState<ContextElement[]>(initialContextElements);
    const [suggestedElements, setSuggestedElements] = useState<ContextElement[]>([]);
    const [currentChatSession, setCurrentChatSession] = useState<string | null>(initialChatSessionId || null);
    const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
    const [showChatHistory, setShowChatHistory] = useState(false);
    const [showContextDrawer, setShowContextDrawer] = useState(false);

    const { trigger } = useHaptics();
    const scrollViewRef = useRef<ScrollView>(null);
    const contextDrawerAnimation = useRef(new Animated.Value(0)).current;
    const pathname = usePathname();

    // Access SWR cache via the cache property
    const { cache } = useSWRConfig();

    // Styles Markdown personnalisés avec support du mode sombre
    const markdownStyles = {
        body: {
            color: isDark ? '#FFFFFF' : '#111827',
            fontFamily: theme.typography.fontFamily,
            fontSize: 15,
        },
        heading1: {
            fontSize: 18,
            fontWeight: 'bold',
            marginTop: 8,
            marginBottom: 4,
            color: isDark ? '#FFFFFF' : '#111827',
        },
        heading2: {
            fontSize: 17,
            fontWeight: 'bold',
            marginTop: 8,
            marginBottom: 4,
            color: isDark ? '#FFFFFF' : '#111827',
        },
        heading3: {
            fontSize: 16,
            fontWeight: 'bold',
            marginTop: 6,
            marginBottom: 3,
            color: isDark ? '#FFFFFF' : '#111827',
        },
        paragraph: {
            marginTop: 0,
            marginBottom: 5,
            color: isDark ? '#FFFFFF' : '#111827',
        },
        list_item: {
            marginTop: 2,
            marginBottom: 2,
            color: isDark ? '#FFFFFF' : '#111827',
        },
        bullet_list: {
            marginTop: 0,
            marginBottom: 5,
            color: isDark ? '#FFFFFF' : '#111827',
        },
        ordered_list: {
            marginTop: 0,
            marginBottom: 5,
            color: isDark ? '#FFFFFF' : '#111827',
        },
        code_block: {
            backgroundColor: isDark ? '#374151' : '#F3F4F6',
            padding: 8,
            borderRadius: 4,
            marginTop: 4,
            marginBottom: 4,
            color: isDark ? '#E5E7EB' : '#111827',
        },
        code_inline: {
            backgroundColor: isDark ? '#374151' : '#F3F4F6',
            padding: 2,
            borderRadius: 2,
            color: isDark ? '#E5E7EB' : '#111827',
        },
        blockquote: {
            backgroundColor: isDark ? '#374151' : '#F3F4F6',
            borderLeftWidth: 4,
            borderLeftColor: theme.color.primary[500],
            paddingLeft: 10,
            paddingRight: 10,
            paddingTop: 4,
            paddingBottom: 4,
            marginTop: 4,
            marginBottom: 4,
            color: isDark ? '#D1D5DB' : '#4B5563',
        },
        link: {
            color: isDark ? theme.color.primary[400] : theme.color.primary[500],
        },
        em: {
            fontStyle: 'italic',
            color: isDark ? '#FFFFFF' : '#111827',
        },
        strong: {
            fontWeight: 'bold',
            color: isDark ? '#FFFFFF' : '#111827',
        },
        hr: {
            backgroundColor: isDark ? '#374151' : '#E5E7EB',
            height: 1,
            marginTop: 8,
            marginBottom: 8,
        },
        // Ajouts pour d'autres éléments Markdown
        table: {
            borderWidth: 1,
            borderColor: isDark ? '#4B5563' : '#D1D5DB',
            marginTop: 10,
            marginBottom: 10,
        },
        thead: {
            backgroundColor: isDark ? '#374151' : '#F3F4F6',
        },
        th: {
            padding: 8,
            color: isDark ? '#FFFFFF' : '#111827',
            fontWeight: 'bold',
            borderWidth: 1,
            borderColor: isDark ? '#4B5563' : '#D1D5DB',
        },
        tr: {
            borderBottomWidth: 1,
            borderColor: isDark ? '#4B5563' : '#D1D5DB',
        },
        td: {
            padding: 8,
            color: isDark ? '#FFFFFF' : '#111827',
            borderWidth: 1,
            borderColor: isDark ? '#4B5563' : '#D1D5DB',
        },
        // Autres listes
        ordered_list_icon: {
            color: isDark ? '#FFFFFF' : '#111827',
            marginRight: 5,
        },
        bullet_list_icon: {
            color: isDark ? '#FFFFFF' : '#111827',
            marginRight: 5,
        },
        // Image
        image: {
            marginTop: 8,
            marginBottom: 8,
        },
    };

    // Load chat history and current chat on mount
    useEffect(() => {
        loadChatHistory();

        if (initialChatSessionId) {
            loadChatSession(initialChatSessionId);
        } else if (currentChatSession) {
            loadChatSession(currentChatSession);
        } else {
            // Start with a welcome message
            setMessages([
                {
                    id: '0',
                    text: 'Bonjour! Je suis votre assistant. Comment puis-je vous aider aujourd\'hui?',
                    isUser: false,
                    timestamp: new Date(),
                },
            ]);
        }
    }, [initialChatSessionId]);

    // Effect to update context elements when initialContextElements changes
    useEffect(() => {
        if (initialContextElements && initialContextElements.length > 0) {
            setContextElements(initialContextElements);
        }
    }, [initialContextElements]);

    // Generate suggested context elements based on current route and SWR cache
    useEffect(() => {
        const generateSuggestedElementsFromCache = () => {
            try {
                const suggestions: ContextElement[] = [];
                const segments = pathname.split('/').filter(Boolean);

                // Get indexes for different route segments
                const pdIndex = segments.findIndex(s => s === 'learn') + 1;
                const courseIndex = segments.findIndex(s => s === 'courses') + 1;
                const lessonIndex = segments.findIndex(s => s === 'lessons') + 1;
                const exerciseIndex = segments.findIndex(s => s === 'exercices') + 1;
                const quizIndex = segments.findIndex(s => s === 'quizzes') + 1;
                const archiveIndex = segments.findIndex(s => s === 'anales') + 1;
                const videoIndex = segments.findIndex(s => s === 'videos') + 1;

                // Get IDs from route segments
                const pdId = pdIndex >= 0 && pdIndex < segments.length ? segments[pdIndex] : null;
                const courseId = courseIndex >= 0 && courseIndex < segments.length ? segments[courseIndex] : null;
                const lessonId = lessonIndex >= 0 && lessonIndex < segments.length ? segments[lessonIndex] : null;
                const exerciseId = exerciseIndex >= 0 && exerciseIndex < segments.length ? segments[exerciseIndex] : null;
                const quizId = quizIndex >= 0 && quizIndex < segments.length ? segments[quizIndex] : null;
                const archiveId = archiveIndex >= 0 && archiveIndex < segments.length ? segments[archiveIndex] : null;
                const videoId = videoIndex >= 0 && videoIndex < segments.length ? segments[videoIndex] : null;

                // Check for program data in SWR cache
                if (pdId) {
                    const programKey = `program-index-${pdId}`;
                    const programData = cache.get(programKey)?.data;

                    if (programData) {
                        suggestions.push({
                            id: `program-${pdId}`,
                            type: 'program',
                            title: `Programme: ${programData?.title || 'Programme actuel'}`,
                            data: programData
                        });
                    }

                    // Check for courses list in SWR cache
                    const coursesKey = `program-courses-${pdId}`;
                    const coursesData = cache.get(coursesKey)?.data;

                    if (coursesData && Array.isArray(coursesData)) {
                        // Don't add all courses as suggestions, but note the availability
                        if (coursesData.length > 0 && !courseId) {
                            suggestions.push({
                                id: `courses-${pdId}`,
                                type: 'course',
                                title: `Tous les cours du programme (${coursesData.length})`,
                                data: coursesData
                            });
                        }
                    }
                }

                // Check for course data in SWR cache
                if (courseId) {
                    const courseKey = `course-${courseId}`;
                    const courseData = cache.get(courseKey)?.data;

                    if (courseData) {
                        suggestions.push({
                            id: `course-${courseId}`,
                            type: 'course',
                            title: `Cours: ${courseData?.name || 'Cours actuel'}`,
                            data: courseData
                        });
                    }
                }

                // Check for lesson data in SWR cache
                if (lessonId) {
                    const contentKey = `content-${lessonId}`;
                    const lessonData = cache.get(contentKey)?.data;

                    if (lessonData) {
                        suggestions.push({
                            id: `lesson-${lessonId}`,
                            type: 'lesson',
                            title: `Leçon: ${lessonData?.name || 'Leçon actuelle'}`,
                            data: lessonData
                        });
                    }
                }

                // Check for exercise data in SWR cache
                if (exerciseId) {
                    const exerciseKey = `exercise-${exerciseId}`;
                    const exerciseData = cache.get(exerciseKey)?.data;

                    if (exerciseData) {
                        suggestions.push({
                            id: `exercise-${exerciseId}`,
                            type: 'exercise',
                            title: `Exercice: ${exerciseData?.title || 'Exercice actuel'}`,
                            data: exerciseData
                        });
                    }
                }

                // Check for quiz data in SWR cache
                if (quizId) {
                    const quizKey = `quiz-${quizId}`;
                    const quizData = cache.get(quizKey)?.data;

                    if (quizData) {
                        suggestions.push({
                            id: `quiz-${quizId}`,
                            type: 'quiz',
                            title: `Quiz: ${quizData?.name || 'Quiz actuel'}`,
                            data: quizData
                        });
                    }
                }

                // Check for archive data in SWR cache
                if (archiveId) {
                    const archiveKey = `archives/${archiveId}`;
                    const archiveData = cache.get(archiveKey)?.data;

                    if (archiveData) {
                        suggestions.push({
                            id: `archive-${archiveId}`,
                            type: 'archive',
                            title: `Archive: ${archiveData?.name || 'Archive actuelle'}`,
                            data: archiveData
                        });
                    }
                }

                // Check for video data in SWR cache
                if (videoId) {
                    const videoKey = `video-${videoId}`;
                    const videoData = cache.get(videoKey)?.data;

                    if (videoData) {
                        suggestions.push({
                            id: `video-${videoId}`,
                            type: 'video',
                            title: `Vidéo: ${videoData?.title || 'Vidéo actuelle'}`,
                            data: videoData
                        });
                    }
                }

                // Filter out any suggestions that are already in the context
                const filteredSuggestions = suggestions.filter(
                    (suggestion) => !contextElements.some((element) => element.id === suggestion.id)
                );

                setSuggestedElements(filteredSuggestions);
            } catch (error) {
                console.error('Error generating suggestions from cache:', error);
                setSuggestedElements([]);
            }
        };

        generateSuggestedElementsFromCache();
    }, [pathname, contextElements, cache]);

    // Load chat history from AsyncStorage
    const loadChatHistory = async () => {
        try {
            const chatHistoryString = await AsyncStorage.getItem('ezadrive_chat_history');
            if (chatHistoryString) {
                const history = JSON.parse(chatHistoryString) as ChatSession[];
                // Convert date strings back to Date objects
                history.forEach(session => {
                    session.createdAt = new Date(session.createdAt);
                    session.updatedAt = new Date(session.updatedAt);
                    session.messages.forEach(msg => {
                        msg.timestamp = new Date(msg.timestamp);
                    });
                });
                setChatHistory(history);
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    };

    // Save chat history to AsyncStorage
    const saveChatHistory = async (history: ChatSession[]) => {
        try {
            await AsyncStorage.setItem('ezadrive_chat_history', JSON.stringify(history));
        } catch (error) {
            console.error('Error saving chat history:', error);
        }
    };

    // Load a specific chat session
    const loadChatSession = async (sessionId: string) => {
        try {
            const chatHistoryString = await AsyncStorage.getItem('ezadrive_chat_history');
            if (chatHistoryString) {
                const history = JSON.parse(chatHistoryString) as ChatSession[];
                const session = history.find(s => s.id === sessionId);

                if (session) {
                    setMessages(session.messages.map(msg => ({
                        ...msg,
                        timestamp: new Date(msg.timestamp)
                    })));

                    // Rehydrate context elements from SWR cache or create empty placeholders
                    const rehydratedContextElements: ContextElement[] = [];

                    for (const elementId of session.contextElementIds) {
                        // Parse the element ID to get the type and actual ID
                        const [type, id] = elementId.split('-');

                        // Try to find the corresponding data in SWR cache
                        // You'll need to adjust the cache keys based on your actual SWR key patterns
                        let data = null;
                        let cacheKey = '';
                        let title = 'Élément de contexte';

                        switch (type) {
                            case 'program':
                                cacheKey = `program-index-${id}`;
                                data = cache.get(cacheKey)?.data;
                                title = `Programme: ${data?.title || 'Programme'}`;
                                break;
                            case 'course':
                                cacheKey = `course-${id}`;
                                data = cache.get(cacheKey)?.data;
                                title = `Cours: ${data?.name || 'Cours'}`;
                                break;
                            case 'lesson':
                                cacheKey = `content-${id}`;
                                data = cache.get(cacheKey)?.data;
                                title = `Leçon: ${data?.name || 'Leçon'}`;
                                break;
                            case 'exercise':
                                cacheKey = `exercise-${id}`;
                                data = cache.get(cacheKey)?.data;
                                title = `Exercice: ${data?.title || 'Exercice'}`;
                                break;
                            case 'quiz':
                                cacheKey = `quiz-${id}`;
                                data = cache.get(cacheKey)?.data;
                                title = `Quiz: ${data?.name || 'Quiz'}`;
                                break;
                            case 'archive':
                                cacheKey = `archives/${id}`;
                                data = cache.get(cacheKey)?.data;
                                title = `Archive: ${data?.name || 'Archive'}`;
                                break;
                            case 'video':
                                cacheKey = `video-${id}`;
                                data = cache.get(cacheKey)?.data;
                                title = `Vidéo: ${data?.title || 'Vidéo'}`;
                                break;
                        }

                        // Add the element to the list
                        rehydratedContextElements.push({
                            id: elementId,
                            type: type as any,
                            title: title,
                            data: data || {}
                        });
                    }

                    setContextElements(rehydratedContextElements);
                    setCurrentChatSession(sessionId);
                }
            }
        } catch (error) {
            console.error('Error loading chat session:', error);
        }
    };

    // Create a new chat session
    const createNewChatSession = async () => {
        const newSession: ChatSession = {
            id: Date.now().toString(),
            title: 'Nouvelle conversation',
            messages: [
                {
                    id: '0',
                    text: 'Bonjour! Je suis votre assistant. Comment puis-je vous aider aujourd\'hui?',
                    isUser: false,
                    timestamp: new Date(),
                },
            ],
            contextElementIds: contextElements.map(el => el.id),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const updatedHistory = [...chatHistory, newSession];
        setChatHistory(updatedHistory);
        saveChatHistory(updatedHistory);

        setMessages(newSession.messages);
        setCurrentChatSession(newSession.id);

        return newSession.id;
    };

    // Save the current chat session
    const saveCurrentSession = async () => {
        if (!currentChatSession) return;

        const updatedHistory = [...chatHistory];
        const sessionIndex = updatedHistory.findIndex(s => s.id === currentChatSession);

        if (sessionIndex !== -1) {
            updatedHistory[sessionIndex] = {
                ...updatedHistory[sessionIndex],
                messages,
                contextElementIds: contextElements.map(el => el.id),
                updatedAt: new Date(),
                title: messages.find(m => m.isUser)?.text.substring(0, 30) || 'Nouvelle conversation',
            };
        } else {
            updatedHistory.push({
                id: currentChatSession,
                title: messages.find(m => m.isUser)?.text.substring(0, 30) || 'Nouvelle conversation',
                messages,
                contextElementIds: contextElements.map(el => el.id),
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        setChatHistory(updatedHistory);
        saveChatHistory(updatedHistory);
    };

    // Prepare context information for the AI using real data
    const prepareContextInfo = () => {
        return contextElements.map((element) => {
            const data = element.data;

            switch (element.type) {
                case 'program':
                    return `
Programme: ${data?.title || 'Non disponible'}
Description: ${data?.description || 'Non disponible'}
Nombre de cours: ${data?.course_count || data?.course_learningpath?.length || 'Non disponible'}
${data?.concours_learningpaths?.concour?.name ? `Concours: ${data.concours_learningpaths.concour.name}` : ''}
${data?.concours_learningpaths?.concour?.school?.name ? `École: ${data.concours_learningpaths.concour.school.name}` : ''}
`;

                case 'course':
                    return `
Cours: ${data?.name || 'Non disponible'}
${data?.category?.name ? `Catégorie: ${data.category.name}` : ''}
${data?.description ? `Description: ${data.description}` : ''}
${data?.goals ? `Objectifs: ${Array.isArray(data.goals) ? data.goals.join(', ') : data.goals}` : ''}
Nombre de leçons: ${data?.courses_content?.length || 'Non disponible'}
`;

                case 'lesson':
                    return `
Leçon: ${data?.name || 'Non disponible'}
Ordre: ${data?.order !== undefined ? data.order + 1 : 'Non disponible'}
Cours parent: ${data?.courses?.name || 'Non disponible'}
`;

                case 'exercise':
                    return `
Exercice: ${data?.title || 'Non disponible'}
${data?.description ? `Description: ${data.description}` : ''}
${data?.course?.name ? `Cours: ${data.course.name}` : ''}
`;

                case 'quiz':
                    return `
Quiz: ${data?.name || 'Non disponible'}
${data?.description ? `Description: ${data.description}` : ''}
Nombre de questions: ${data?.quiz_questions?.length || 'Non disponible'}
Catégorie: ${data?.category?.name || 'Non disponible'}
`;

                case 'archive':
                    return `
Archive: ${data?.name || 'Non disponible'}
${data?.session ? `Session: ${data.session}` : ''}
Type de fichier: ${data?.file_type || 'Non disponible'}
`;

                case 'video':
                    return `
Vidéo: ${data?.title || 'Non disponible'}
${data?.description ? `Description: ${data.description}` : ''}
Durée: ${data?.duration ? `${Math.floor(data.duration / 60)} minutes` : 'Non disponible'}
`;

                default:
                    return `${element.title}\nAucune donnée supplémentaire disponible.`;
            }
        }).join('\n\n');
    };

    // Send message to Gemini AI
    const handleSend = async () => {
        if (inputText.trim() === '') return;

        trigger(HapticType.LIGHT);

        // Create and add user message
        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputText.trim(),
            isUser: true,
            timestamp: new Date(),
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInputText('');
        setIsLoading(true);

        try {
            // Create session if needed
            if (!currentChatSession) {
                const newSessionId = await createNewChatSession();
                setCurrentChatSession(newSessionId);
            }

            // Prepare context information using actual data
            const contextInfo = prepareContextInfo();

            // Format conversation history
            const conversationHistory = messages
                .map(msg => `${msg.isUser ? 'Étudiant' : 'Assistant'}: ${msg.text}`)
                .join('\n\n');

            // Send message to Gemini with detailed context
            const prompt = `
Tu es un assistant pédagogique spécialisé pour aider les étudiants dans leur préparation aux concours. Tu dois proposer une aide adaptée et efficace selon le contexte.

${contextInfo ? `CONTEXTE DÉTAILLÉ:\n${contextInfo}\n\n` : ''}

HISTORIQUE DE LA CONVERSATION:
${conversationHistory}

Étudiant: ${inputText}

Directives:
1. Fournis des explications claires et précises avec des exemples pertinents
2. Reste focalisé sur l'information essentielle en évitant le superflu
3. Si une question sort du contexte, indique clairement les limites de ta réponse
4. Suggère des pistes complémentaires uniquement si c'est vraiment utile
5. Adapte naturellement ton niveau d'explication selon les échanges
6. Structure tes réponses avec du Markdown pour améliorer la lisibilité (titres, listes, mise en évidence)
7. Utilise des exemples concrets pour illustrer tes explications

L'objectif est d'être utile et efficace dans tes réponses, en t'appuyant sur le contexte fourni sans être trop verbeux.
`;
            const response = await run(prompt);

            // Create and add AI response
            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: response,
                isUser: false,
                timestamp: new Date(),
            };

            const finalMessages = [...updatedMessages, aiMessage];
            setMessages(finalMessages);

            // Save the updated session
            await saveCurrentSession();
        } catch (error) {
            console.error('Error getting response from Gemini:', error);

            // Add error message
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: "Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer plus tard.",
                isUser: false,
                timestamp: new Date(),
            };

            setMessages([...updatedMessages, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    // Add context element
    const addContextElement = (element: ContextElement) => {
        if (!contextElements.some(e => e.id === element.id)) {
            const updatedElements = [...contextElements, element];
            setContextElements(updatedElements);

            // Show feedback to the user
            const systemMessage: Message = {
                id: Date.now().toString(),
                text: `J'ai ajouté "${element.title}" au contexte de notre conversation.`,
                isUser: false,
                timestamp: new Date(),
            };

            setMessages([...messages, systemMessage]);

            // If we have a current session, update it
            if (currentChatSession) {
                const updatedHistory = [...chatHistory];
                const sessionIndex = updatedHistory.findIndex(s => s.id === currentChatSession);

                if (sessionIndex !== -1) {
                    updatedHistory[sessionIndex] = {
                        ...updatedHistory[sessionIndex],
                        contextElementIds: updatedElements.map(el => el.id),
                        updatedAt: new Date(),
                    };

                    setChatHistory(updatedHistory);
                    saveChatHistory(updatedHistory);
                }
            }
        }
    };

    // Remove context element
    const removeContextElement = (elementId: string) => {
        const updatedElements = contextElements.filter(e => e.id !== elementId);
        setContextElements(updatedElements);

        // If we have a current session, update it
        if (currentChatSession) {
            const updatedHistory = [...chatHistory];
            const sessionIndex = updatedHistory.findIndex(s => s.id === currentChatSession);

            if (sessionIndex !== -1) {
                updatedHistory[sessionIndex] = {
                    ...updatedHistory[sessionIndex],
                    contextElementIds: updatedElements.map(el => el.id),
                    updatedAt: new Date(),
                };

                setChatHistory(updatedHistory);
                saveChatHistory(updatedHistory);
            }
        }
    };

    // Toggle context drawer
    const toggleContextDrawer = () => {
        setShowContextDrawer(!showContextDrawer);
        Animated.timing(contextDrawerAnimation, {
            toValue: showContextDrawer ? 0 : 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    // Auto scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollViewRef.current) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    // Render a message bubble - MISE À JOUR POUR MARKDOWN
    const renderMessageBubble = (message: Message) => {
        return (
            <View
                key={message.id}
                style={[
                    styles.messageBubble,
                    message.isUser
                        ? styles.userBubble
                        : [styles.aiBubble, isDark && styles.aiBubbleDark],
                ]}
            >
                {message.isUser ? (
                    // Message de l'utilisateur - Text normal
                    <Text
                        style={[
                            styles.messageText,
                            styles.userText
                        ]}
                    >
                        {message.text}
                    </Text>
                ) : (
                    // Message de l'assistant - Markdown
                    <Markdown
                        /* @ts-ignore */
                        style={markdownStyles}
                    >
                        {message.text}
                    </Markdown>
                )}
            </View>
        );
    };

    // Render a chat history item
    const renderChatHistoryItem = (item: ChatSession) => {
        const lastMessage = item.messages[item.messages.length - 1];
        const preview = lastMessage?.text.substring(0, 30) + (lastMessage?.text.length > 30 ? '...' : '');
        const isSelected = currentChatSession === item.id;

        return (
            <TouchableOpacity
                style={[
                    styles.historyItem,
                    isDark && styles.historyItemDark,
                    isSelected && styles.historyItemSelected,
                ]}
                onPress={() => {
                    trigger(HapticType.LIGHT);
                    loadChatSession(item.id);
                    setShowChatHistory(false);
                }}
            >
                <MaterialCommunityIcons
                    name="chat-outline"
                    size={20}
                    color={isSelected ? theme.color.primary[500] : (isDark ? '#9CA3AF' : '#6B7280')}
                />
                <View style={styles.historyItemContent}>
                    <ThemedText style={styles.historyItemTitle}>
                        {item.title || 'Conversation'}
                    </ThemedText>
                    <ThemedText style={styles.historyItemPreview}>
                        {preview || 'Aucun message'}
                    </ThemedText>
                </View>
                <ThemedText style={styles.historyItemDate}>
                    {new Date(item.updatedAt).toLocaleDateString()}
                </ThemedText>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
            style={{
                flex : 1,
            }}
        >
            <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
                {/* Header */}
                <View style={[styles.header, isDark && styles.headerDark]}>
                    <View style={styles.headerLeft}>
                        <Pressable
                            style={styles.closeButton}
                            onPress={() => {
                                trigger(HapticType.LIGHT);
                                onClose();
                            }}
                        >
                            <MaterialCommunityIcons
                                name="arrow-left"
                                size={24}
                                color={isDark ? '#FFFFFF' : '#111827'}
                            />
                        </Pressable>
                    </View>
                    <ThemedText style={styles.headerTitle}>
                        Assistant IA
                    </ThemedText>
                    <View style={styles.headerRight}>
                        <Pressable
                            style={styles.headerButton}
                            onPress={() => {
                                trigger(HapticType.LIGHT);
                                setShowChatHistory(true);
                            }}
                        >
                            <MaterialCommunityIcons
                                name="history"
                                size={24}
                                color={isDark ? '#FFFFFF' : '#111827'}
                            />
                        </Pressable>
                        <Pressable
                            style={styles.headerButton}
                            onPress={toggleContextDrawer}
                        >
                            <MaterialCommunityIcons
                                name="information-outline"
                                size={24}
                                color={isDark ? '#FFFFFF' : '#111827'}
                            />
                            {contextElements.length > 0 && (
                                <View style={styles.contextBadge}>
                                    <Text style={styles.contextBadgeText}>
                                        {contextElements.length}
                                    </Text>
                                </View>
                            )}
                        </Pressable>
                    </View>
                </View>

                {/* Suggested Context Elements */}
                {suggestedElements.length > 0 && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={[styles.suggestedElementsContainer, isDark && styles.suggestedElementsContainerDark, {flexGrow : 0}]}
                        contentContainerStyle={styles.suggestedElementsContent}
                    >
                        {suggestedElements.map((element) => (
                            <TouchableOpacity
                                key={element.id}
                                style={[
                                    styles.suggestedElement,
                                    isDark && styles.suggestedElementDark,
                                ]}
                                onPress={() => {
                                    trigger(HapticType.LIGHT);
                                    addContextElement(element);
                                }}
                            >
                                <MaterialCommunityIcons
                                    name={
                                        element.type === 'program' ? 'book-open-variant' :
                                            element.type === 'course' ? 'book-open-page-variant' :
                                                element.type === 'lesson' ? 'file-document-outline' :
                                                    element.type === 'exercise' ? 'pencil-outline' :
                                                        element.type === 'quiz' ? 'help-circle-outline' :
                                                            element.type === 'video' ? 'play-circle-outline' :
                                                                'file-outline'
                                    }
                                    size={16}
                                    color={isDark ? '#FFFFFF' : '#111827'}
                                />
                                <ThemedText style={styles.suggestedElementText}>
                                    Ajouter {element.title}
                                </ThemedText>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* KeyboardAvoidingView added here to wrap the chat and input areas */}
                <KeyboardAvoidingView
                    // behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
                >
                    {/* ZONE DES MESSAGES - AVEC FIX POUR L'ESPACE VIDE */}
                    <View style={styles.chatContainer}>
                        <ScrollView
                            ref={scrollViewRef}
                            style={styles.messagesContainer}
                            contentContainerStyle={styles.messagesContent}
                            alwaysBounceVertical={false}
                            showsVerticalScrollIndicator={false}
                        >
                            {messages.map(renderMessageBubble)}
                            {isLoading && (
                                <View style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}>
                                    <ActivityIndicator size="small" color={theme.color.primary[500]} />
                                    <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
                                        En train de répondre...
                                    </Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>

                    {/* Input area */}
                    <View style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
                        <TextInput
                            style={[styles.input, isDark && styles.inputDark]}
                            placeholder="Tapez votre message..."
                            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={500}
                            returnKeyType="default"
                            blurOnSubmit={false}
                        />
                        <Pressable
                            style={[
                                styles.sendButton,
                                !inputText.trim() && styles.sendButtonDisabled,
                            ]}
                            onPress={handleSend}
                            disabled={!inputText.trim() || isLoading}
                        >
                            <MaterialCommunityIcons
                                name="send"
                                size={22}
                                color={!inputText.trim() ? '#9CA3AF' : '#FFFFFF'}
                            />
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>

                {/* Chat History Modal */}
                <Modal
                    visible={showChatHistory}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowChatHistory(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.historyModal, isDark && styles.historyModalDark]}>
                            <View style={styles.historyModalHeader}>
                                <ThemedText style={styles.historyModalTitle}>
                                    Historique des conversations
                                </ThemedText>
                                <Pressable
                                    style={styles.closeButton}
                                    onPress={() => setShowChatHistory(false)}
                                >
                                    <MaterialCommunityIcons
                                        name="close"
                                        size={24}
                                        color={isDark ? '#FFFFFF' : '#111827'}
                                    />
                                </Pressable>
                            </View>
                            <TouchableOpacity
                                style={[styles.newChatButton, isDark && styles.newChatButtonDark]}
                                onPress={() => {
                                    trigger(HapticType.LIGHT);
                                    createNewChatSession();
                                    setShowChatHistory(false);
                                }}
                            >
                                <MaterialCommunityIcons
                                    name="plus"
                                    size={20}
                                    color="#FFFFFF"
                                />
                                <Text style={styles.newChatButtonText}>
                                    Nouvelle conversation
                                </Text>
                            </TouchableOpacity>
                            <FlatList
                                data={[...chatHistory].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())}
                                renderItem={({ item }) => renderChatHistoryItem(item)}
                                keyExtractor={(item) => item.id}
                                style={styles.historyList}
                                contentContainerStyle={styles.historyListContent}
                                ListEmptyComponent={
                                    <View style={styles.emptyHistory}>
                                        <MaterialCommunityIcons
                                            name="chat-remove-outline"
                                            size={48}
                                            color={isDark ? '#4B5563' : '#9CA3AF'}
                                        />
                                        <ThemedText style={styles.emptyHistoryText}>
                                            Aucune conversation
                                        </ThemedText>
                                    </View>
                                }
                            />
                        </View>
                    </View>
                </Modal>

                {/* Context Elements Drawer */}
                <Animated.View
                    style={[
                        styles.contextDrawer,
                        isDark && styles.contextDrawerDark,
                        {
                            transform: [
                                {
                                    translateX: contextDrawerAnimation.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [300, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <View style={styles.contextDrawerHeader}>
                        <ThemedText style={styles.contextDrawerTitle}>
                            Éléments de contexte
                        </ThemedText>
                        <Pressable
                            style={styles.closeButton}
                            onPress={toggleContextDrawer}
                        >
                            <MaterialCommunityIcons
                                name="close"
                                size={24}
                                color={isDark ? '#FFFFFF' : '#111827'}
                            />
                        </Pressable>
                    </View>
                    <FlatList
                        data={contextElements}
                        renderItem={({ item }) => (
                            <View style={[styles.contextElement, isDark && styles.contextElementDark]}>
                                <MaterialCommunityIcons
                                    name={
                                        item.type === 'program' ? 'book-open-variant' :
                                            item.type === 'course' ? 'book-open-page-variant' :
                                                item.type === 'lesson' ? 'file-document-outline' :
                                                    item.type === 'exercise' ? 'pencil-outline' :
                                                        item.type === 'quiz' ? 'help-circle-outline' :
                                                            item.type === 'video' ? 'play-circle-outline' :
                                                                'file-outline'
                                    }
                                    size={20}
                                    color={isDark ? '#FFFFFF' : '#111827'}
                                    style={styles.contextElementIcon}
                                />
                                <View style={styles.contextElementContent}>
                                    <ThemedText style={styles.contextElementTitle}>
                                        {item.title}
                                    </ThemedText>
                                    <ThemedText style={styles.contextElementType}>
                                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                                    </ThemedText>
                                </View>
                                <Pressable
                                    style={styles.removeContextElement}
                                    onPress={() => {
                                        trigger(HapticType.LIGHT);
                                        removeContextElement(item.id);
                                    }}
                                >
                                    <MaterialCommunityIcons
                                        name="close"
                                        size={20}
                                        color={isDark ? '#9CA3AF' : '#6B7280'}
                                    />
                                </Pressable>
                            </View>
                        )}
                        keyExtractor={(item) => item.id}
                        ListEmptyComponent={
                            <View style={styles.emptyContext}>
                                <MaterialCommunityIcons
                                    name="information-outline"
                                    size={48}
                                    color={isDark ? '#4B5563' : '#9CA3AF'}
                                />
                                <ThemedText style={styles.emptyContextText}>
                                    Aucun élément de contexte
                                </ThemedText>
                                <ThemedText style={styles.emptyContextSubtext}>
                                    Ajoutez des éléments de contexte pour améliorer les réponses de l'assistant.
                                </ThemedText>
                            </View>
                        }
                    />
                </Animated.View>
            </SafeAreaView>
        </Modal>
    );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    containerDark: {
        backgroundColor: '#111827',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerDark: {
        backgroundColor: '#1F2937',
        borderBottomColor: '#374151',
    },
    headerLeft: {
        width: 40,
    },
    closeButton: {
        padding: 4,
    },
    headerTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 80,
        justifyContent: 'flex-end',
    },
    headerButton: {
        padding: 4,
        marginLeft: 16,
        position: 'relative',
    },
    contextBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: theme.color.primary[500],
        borderRadius: 8,
        width: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contextBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    suggestedElementsContainer: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    suggestedElementsContainerDark: {
        backgroundColor: '#1F2937',
        borderBottomColor: '#374151',
    },
    suggestedElementsContent: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        gap: 8,
    },
    suggestedElement: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        gap: 6,
    },
    suggestedElementDark: {
        backgroundColor: '#374151',
    },
    suggestedElementText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
    },
    // Nouvelle structure pour le conteneur des messages
    chatContainer: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        flexGrow: 0, // Cette ligne est cruciale pour empêcher l'étirement
    },
    messageBubble: {
        marginBottom: 12,
        padding: 12,
        borderRadius: 16,
        maxWidth: '85%', // Légèrement plus large pour accommoder le contenu markdown
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: theme.color.primary[500],
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#E5E7EB',
        borderBottomLeftRadius: 4,
    },
    aiBubbleDark: {
        backgroundColor: '#374151',
    },
    messageText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 15,
        lineHeight: 20,
    },
    userText: {
        color: '#FFFFFF',
    },
    aiText: {
        color: '#111827',
    },
    aiTextDark: {
        color: '#FFFFFF',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#E5E7EB',
        padding: 12,
        borderRadius: 16,
        borderBottomLeftRadius: 4,
        marginBottom: 12,
    },
    loadingContainerDark: {
        backgroundColor: '#374151',
    },
    loadingText: {
        marginLeft: 8,
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#4B5563',
    },
    loadingTextDark: {
        color: '#D1D5DB',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    inputContainerDark: {
        backgroundColor: '#1F2937',
        borderTopColor: '#374151',
    },
    input: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderRadius: theme.border.radius.small,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: '#111827',
        maxHeight: 120,
    },
    inputDark: {
        backgroundColor: '#374151',
        color: '#FFFFFF',
    },
    sendButton: {
        width: 50,
        height: 50,
        borderRadius: theme.border.radius.small,
        backgroundColor: theme.color.primary[500],
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    sendButtonDisabled: {
        backgroundColor: '#E5E7EB',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    historyModal: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        width: width * 0.9,
        maxHeight: '80%',
        padding: 16,
    },
    historyModalDark: {
        backgroundColor: '#1F2937',
    },
    historyModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    historyModalTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: 'bold',
    },
    newChatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.color.primary[500],
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 16,
        gap: 8,
    },
    newChatButtonDark: {
        backgroundColor: theme.color.primary[600],
    },
    newChatButtonText: {
        color: '#FFFFFF',
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
    },
    historyList: {
        maxHeight: '70%',
    },
    historyListContent: {
        gap: 8,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        padding: 12,
        borderRadius: 8,
        gap: 12,
    },
    historyItemDark: {
        backgroundColor: '#374151',
    },
    historyItemSelected: {
        borderWidth: 2,
        borderColor: theme.color.primary[500],
    },
    historyItemContent: {
        flex: 1,
    },
    historyItemTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '600',
    },
    historyItemPreview: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        color: '#6B7280',
    },
    historyItemDate: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        color: '#6B7280',
    },
    emptyHistory: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    emptyHistoryText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: '#6B7280',
        marginTop: 12,
    },
    contextDrawer: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 300,
        backgroundColor: '#FFFFFF',
        borderLeftWidth: 1,
        borderLeftColor: '#E5E7EB',
        padding: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: -2, height: 0 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    contextDrawerDark: {
        backgroundColor: '#1F2937',
        borderLeftColor: '#374151',
    },
    contextDrawerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    contextDrawerTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: 'bold',
    },
    contextElement: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    contextElementDark: {
        backgroundColor: '#374151',
    },
    contextElementIcon: {
        marginRight: 12,
    },
    contextElementContent: {
        flex: 1,
    },
    contextElementTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '600',
    },
    contextElementType: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        color: '#6B7280',
    },
    removeContextElement: {
        padding: 4,
    },
    emptyContext: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    emptyContextText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: '#6B7280',
        marginTop: 12,
    },
    emptyContextSubtext: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#9CA3AF',
        marginTop: 8,
        textAlign: 'center',
    },
});

export default ChatBox;