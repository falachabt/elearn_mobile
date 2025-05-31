import React, { useState, useRef, useEffect, useCallback } from 'react';
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
    SafeAreaView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import { theme } from '@/constants/theme';
import { ThemedText } from '@/components/ThemedText';
import { HapticType, useHaptics } from '@/hooks/useHaptics';
import { useSWRConfig } from 'swr';
import run from '@/config/gemini';
import Markdown from 'react-native-markdown-display';

// Types
export interface ContextElement {
    id: string;
    type: 'program' | 'course' | 'lesson' | 'exercise' | 'quiz' | 'archive' | 'video';
    title: string;
    data: any;
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
    contextElementIds: string[];
    createdAt: Date;
    updatedAt: Date;
}

interface ChatBoxProps {
    visible: boolean;
    onClose: () => void;
    initialContextElements?: ContextElement[];
    initialChatSessionId?: string;
}

// Constantes
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const STORAGE_KEYS = {
    CHAT_HISTORY: 'ezadrive_chat_history_v2',
};

const ChatBox: React.FC<ChatBoxProps> = ({
                                             visible,
                                             onClose,
                                             initialContextElements = [],
                                             initialChatSessionId,
                                         }) => {
    const isDark = useColorScheme() === 'dark';
    const { trigger } = useHaptics();
    const scrollViewRef = useRef<ScrollView>(null);
    const pathname = usePathname();
    const { cache } = useSWRConfig();

    // États principaux
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [contextElements, setContextElements] = useState<ContextElement[]>(initialContextElements);
    const [suggestedElements, setSuggestedElements] = useState<ContextElement[]>([]);
    const [currentChatSession, setCurrentChatSession] = useState<string | null>(initialChatSessionId || null);
    const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);

    // États des modaux/drawers
    const [activeModal, setActiveModal] = useState<'none' | 'history' | 'context'>('none');

    // Styles Markdown
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
        strong: {
            fontWeight: 'bold',
            color: isDark ? '#FFFFFF' : '#111827',
        },
    };

    // Générateur d'ID unique
    const generateUniqueId = useCallback(() => {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }, []);

    // Reset complet quand le modal se ferme
    useEffect(() => {
        if (!visible) {
            setActiveModal('none');
            // Reset après un délai pour éviter les animations glitchées
            const timer = setTimeout(() => {
                // Ne reset que si le modal reste fermé
                if (!visible) {
                    setActiveModal('none');
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [visible]);

    // Chargement initial
    useEffect(() => {
        if (visible) {
            loadChatHistory();
            if (initialChatSessionId) {
                loadChatSession(initialChatSessionId);
            } else if (currentChatSession) {
                loadChatSession(currentChatSession);
            } else {
                initializeWelcomeMessage();
            }
        }
    }, [visible, initialChatSessionId]);

    // Mise à jour des éléments de contexte initiaux
    useEffect(() => {
        if (initialContextElements && initialContextElements.length > 0) {
            setContextElements(initialContextElements);
        }
    }, [initialContextElements]);

    // Génération des suggestions
    useEffect(() => {
        if (visible) {
            generateSuggestedElements();
        }
    }, [pathname, contextElements, cache, visible]);

    // Auto-scroll
    useEffect(() => {
        if (scrollViewRef.current && messages.length > 0) {
            const timer = setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [messages]);

    // Fonctions utilitaires
    const initializeWelcomeMessage = () => {
        const welcomeMessage: Message = {
            id: generateUniqueId(),
            text: 'Bonjour! Je suis votre assistant. Comment puis-je vous aider aujourd\'hui?',
            isUser: false,
            timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
    };

    const loadChatHistory = async () => {
        try {
            const historyString = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
            if (historyString) {
                const history = JSON.parse(historyString) as ChatSession[];
                // Convertir les dates
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
            console.error('Erreur lors du chargement de l\'historique:', error);
        }
    };

    const saveChatHistory = async (history: ChatSession[]) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(history));
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
        }
    };

    const loadChatSession = async (sessionId: string) => {
        try {
            const historyString = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
            if (historyString) {
                const history = JSON.parse(historyString) as ChatSession[];
                const session = history.find(s => s.id === sessionId);

                if (session) {
                    setMessages(session.messages.map(msg => ({
                        ...msg,
                        timestamp: new Date(msg.timestamp)
                    })));

                    // Rehydrater les éléments de contexte
                    const rehydratedElements = await rehydrateContextElements(session.contextElementIds);
                    setContextElements(rehydratedElements);
                    setCurrentChatSession(sessionId);
                }
            }
        } catch (error) {
            console.error('Erreur lors du chargement de la session:', error);
        }
    };

    const rehydrateContextElements = async (elementIds: string[]): Promise<ContextElement[]> => {
        const elements: ContextElement[] = [];

        for (const elementId of elementIds) {
            const [type, id] = elementId.split('-');
            let data = null;
            let title = 'Élément de contexte';

            try {
                switch (type) {
                    case 'program':
                        data = cache.get(`program-index-${id}`)?.data;
                        title = `Programme: ${data?.title || 'Programme'}`;
                        break;
                    case 'course':
                        data = cache.get(`course-${id}`)?.data;
                        title = `Cours: ${data?.name || 'Cours'}`;
                        break;
                    case 'lesson':
                        data = cache.get(`content-${id}`)?.data;
                        title = `Leçon: ${data?.name || 'Leçon'}`;
                        break;
                    case 'exercise':
                        data = cache.get(`exercise-${id}`)?.data;
                        title = `Exercice: ${data?.title || 'Exercice'}`;
                        break;
                    case 'quiz':
                        data = cache.get(`quiz-${id}`)?.data;
                        title = `Quiz: ${data?.name || 'Quiz'}`;
                        break;
                    case 'archive':
                        data = cache.get(`archives/${id}`)?.data;
                        title = `Archive: ${data?.name || 'Archive'}`;
                        break;
                    case 'video':
                        data = cache.get(`video-${id}`)?.data;
                        title = `Vidéo: ${data?.title || 'Vidéo'}`;
                        break;
                }

                elements.push({
                    id: elementId,
                    type: type as any,
                    title,
                    data: data || {}
                });
            } catch (error) {
                console.error(`Erreur lors de la rehydratation de l'élément ${elementId}:`, error);
            }
        }

        return elements;
    };

    const generateSuggestedElements = () => {
        try {
            const suggestions: ContextElement[] = [];
            const segments = pathname.split('/').filter(Boolean);

            // Extraire les IDs des segments d'URL
            const indices = {
                pd: segments.findIndex(s => s === 'learn') + 1,
                course: segments.findIndex(s => s === 'courses') + 1,
                lesson: segments.findIndex(s => s === 'lessons') + 1,
                exercise: segments.findIndex(s => s === 'exercices') + 1,
                quiz: segments.findIndex(s => s === 'quizzes') + 1,
                archive: segments.findIndex(s => s === 'anales') + 1,
                video: segments.findIndex(s => s === 'videos') + 1,
            };

            const ids = {
                pd: indices.pd >= 0 && indices.pd < segments.length ? segments[indices.pd] : null,
                course: indices.course >= 0 && indices.course < segments.length ? segments[indices.course] : null,
                lesson: indices.lesson >= 0 && indices.lesson < segments.length ? segments[indices.lesson] : null,
                exercise: indices.exercise >= 0 && indices.exercise < segments.length ? segments[indices.exercise] : null,
                quiz: indices.quiz >= 0 && indices.quiz < segments.length ? segments[indices.quiz] : null,
                archive: indices.archive >= 0 && indices.archive < segments.length ? segments[indices.archive] : null,
                video: indices.video >= 0 && indices.video < segments.length ? segments[indices.video] : null,
            };

            // Générer les suggestions basées sur le cache SWR
            const cacheChecks = [
                { id: ids.pd, type: 'program', key: `program-index-${ids.pd}`, titleField: 'title' },
                { id: ids.course, type: 'course', key: `course-${ids.course}`, titleField: 'name' },
                { id: ids.lesson, type: 'lesson', key: `content-${ids.lesson}`, titleField: 'name' },
                { id: ids.exercise, type: 'exercise', key: `exercise-${ids.exercise}`, titleField: 'title' },
                { id: ids.quiz, type: 'quiz', key: `quiz-${ids.quiz}`, titleField: 'name' },
                { id: ids.archive, type: 'archive', key: `archives/${ids.archive}`, titleField: 'name' },
                { id: ids.video, type: 'video', key: `video-${ids.video}`, titleField: 'title' },
            ];

            cacheChecks.forEach(({ id, type, key, titleField }) => {
                if (id) {
                    const data = cache.get(key)?.data;
                    if (data) {
                        const elementId = `${type}-${id}`;
                        const title = `${type.charAt(0).toUpperCase() + type.slice(1)}: ${data[titleField] || `${type} actuel`}`;

                        suggestions.push({
                            id: elementId,
                            type: type as any,
                            title,
                            data
                        });
                    }
                }
            });

            // Filtrer les suggestions déjà présentes dans le contexte
            const filteredSuggestions = suggestions.filter(
                suggestion => !contextElements.some(element => element.id === suggestion.id)
            );

            setSuggestedElements(filteredSuggestions);
        } catch (error) {
            console.error('Erreur lors de la génération des suggestions:', error);
            setSuggestedElements([]);
        }
    };

    const createNewChatSession = async () => {
        const sessionId = generateUniqueId();
        const newSession: ChatSession = {
            id: sessionId,
            title: 'Nouvelle conversation',
            messages: [{
                id: generateUniqueId(),
                text: 'Bonjour! Je suis votre assistant. Comment puis-je vous aider aujourd\'hui?',
                isUser: false,
                timestamp: new Date(),
            }],
            contextElementIds: contextElements.map(el => el.id),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const updatedHistory = [...chatHistory, newSession];
        setChatHistory(updatedHistory);
        await saveChatHistory(updatedHistory);

        setMessages(newSession.messages);
        setCurrentChatSession(sessionId);
        setActiveModal('none');

        return sessionId;
    };

    const saveCurrentSession = async () => {
        if (!currentChatSession || messages.length === 0) return;

        const updatedHistory = [...chatHistory];
        const sessionIndex = updatedHistory.findIndex(s => s.id === currentChatSession);
        const title = messages.find(m => m.isUser)?.text.substring(0, 50) || 'Nouvelle conversation';

        const sessionData = {
            id: currentChatSession,
            title,
            messages,
            contextElementIds: contextElements.map(el => el.id),
            createdAt: sessionIndex !== -1 ? updatedHistory[sessionIndex].createdAt : new Date(),
            updatedAt: new Date(),
        };

        if (sessionIndex !== -1) {
            updatedHistory[sessionIndex] = sessionData;
        } else {
            updatedHistory.push(sessionData);
        }

        setChatHistory(updatedHistory);
        await saveChatHistory(updatedHistory);
    };

    const prepareContextInfo = () => {
        return contextElements.map((element) => {
            const data = element.data;

            switch (element.type) {
                case 'program':
                    return `Programme: ${data?.title || 'Non disponible'}
Description: ${data?.description || 'Non disponible'}
Nombre de cours: ${data?.course_count || data?.course_learningpath?.length || 'Non disponible'}
${data?.concours_learningpaths?.concour?.name ? `Concours: ${data.concours_learningpaths.concour.name}` : ''}
${data?.concours_learningpaths?.concour?.school?.name ? `École: ${data.concours_learningpaths.concour.school.name}` : ''}`;

                case 'course':
                    return `Cours: ${data?.name || 'Non disponible'}
${data?.category?.name ? `Catégorie: ${data.category.name}` : ''}
${data?.description ? `Description: ${data.description}` : ''}
${data?.goals ? `Objectifs: ${Array.isArray(data.goals) ? data.goals.join(', ') : data.goals}` : ''}
Nombre de leçons: ${data?.courses_content?.length || 'Non disponible'}`;

                case 'lesson':
                    return `Leçon: ${data?.name || 'Non disponible'}
Ordre: ${data?.order !== undefined ? data.order + 1 : 'Non disponible'}
Cours parent: ${data?.courses?.name || 'Non disponible'}`;

                case 'exercise':
                    return `Exercice: ${data?.title || 'Non disponible'}
${data?.description ? `Description: ${data.description}` : ''}
${data?.course?.name ? `Cours: ${data.course.name}` : ''}`;

                case 'quiz':
                    return `Quiz: ${data?.name || 'Non disponible'}
${data?.description ? `Description: ${data.description}` : ''}
Nombre de questions: ${data?.quiz_questions?.length || 'Non disponible'}
Catégorie: ${data?.category?.name || 'Non disponible'}`;

                case 'archive':
                    return `Archive: ${data?.name || 'Non disponible'}
${data?.session ? `Session: ${data.session}` : ''}
Type de fichier: ${data?.file_type || 'Non disponible'}`;

                case 'video':
                    return `Vidéo: ${data?.title || 'Non disponible'}
${data?.description ? `Description: ${data.description}` : ''}
Durée: ${data?.duration ? `${Math.floor(data.duration / 60)} minutes` : 'Non disponible'}`;

                default:
                    return `${element.title}\nAucune donnée supplémentaire disponible.`;
            }
        }).join('\n\n');
    };

    const handleSend = async () => {
        if (inputText.trim() === '' || isLoading) return;

        trigger(HapticType.LIGHT);

        const userMessage: Message = {
            id: generateUniqueId(),
            text: inputText.trim(),
            isUser: true,
            timestamp: new Date(),
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInputText('');
        setIsLoading(true);

        try {
            if (!currentChatSession) {
                await createNewChatSession();
            }

            const contextInfo = prepareContextInfo();
            const conversationHistory = messages
                .map(msg => `${msg.isUser ? 'Étudiant' : 'Assistant'}: ${msg.text}`)
                .join('\n\n');

            const prompt = `Tu es un assistant pédagogique spécialisé pour aider les étudiants dans leur préparation aux concours. Tu dois proposer une aide adaptée et efficace selon le contexte.

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

L'objectif est d'être utile et efficace dans tes réponses, en t'appuyant sur le contexte fourni sans être trop verbeux.`;

            const response = await run(prompt);

            const aiMessage: Message = {
                id: generateUniqueId(),
                text: response,
                isUser: false,
                timestamp: new Date(),
            };

            const finalMessages = [...updatedMessages, aiMessage];
            setMessages(finalMessages);
            await saveCurrentSession();

        } catch (error) {
            console.error('Erreur lors de l\'envoi:', error);

            const errorMessage: Message = {
                id: generateUniqueId(),
                text: "Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer plus tard.",
                isUser: false,
                timestamp: new Date(),
            };

            setMessages([...updatedMessages, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const addContextElement = (element: ContextElement) => {
        if (!contextElements.some(e => e.id === element.id)) {
            const updatedElements = [...contextElements, element];
            setContextElements(updatedElements);

            const systemMessage: Message = {
                id: generateUniqueId(),
                text: `J'ai ajouté "${element.title}" au contexte de notre conversation.`,
                isUser: false,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, systemMessage]);
            saveCurrentSession();
        }
    };

    const removeContextElement = (elementId: string) => {
        const updatedElements = contextElements.filter(e => e.id !== elementId);
        setContextElements(updatedElements);
        saveCurrentSession();
    };

    const handleCloseModal = () => {
        setActiveModal('none');
        onClose();
    };

    const handleHistoryItemPress = (session: ChatSession) => {
        trigger(HapticType.LIGHT);
        loadChatSession(session.id);
        setActiveModal('none');
    };

    // Renderers
    const renderMessageBubble = ({ item: message }: { item: Message }) => (
        <View
            style={[
                styles.messageBubble,
                message.isUser
                    ? styles.userBubble
                    : [styles.aiBubble, isDark && styles.aiBubbleDark],
            ]}
        >
            {message.isUser ? (
                <Text style={[styles.messageText, styles.userText]}>
                    {message.text}
                </Text>
            ) : (
                <Markdown style={markdownStyles}>
                    {message.text}
                </Markdown>
            )}
        </View>
    );

    const renderSuggestedElement = ({ item: element }: { item: ContextElement }) => (
        <TouchableOpacity
            style={[styles.suggestedElement, isDark && styles.suggestedElementDark]}
            onPress={() => {
                trigger(HapticType.LIGHT);
                addContextElement(element);
            }}
        >
            <MaterialCommunityIcons
                name={getIconForType(element.type)}
                size={16}
                color={isDark ? '#FFFFFF' : '#111827'}
            />
            <Text style={[styles.suggestedElementText, isDark && styles.suggestedElementTextDark]}>
                Ajouter {element.title}
            </Text>
        </TouchableOpacity>
    );

    const renderHistoryItem = ({ item: session }: { item: ChatSession }) => {
        const lastMessage = session.messages[session.messages.length - 1];
        const preview = lastMessage?.text.substring(0, 30) + (lastMessage?.text.length > 30 ? '...' : '');
        const isSelected = currentChatSession === session.id;

        return (
            <TouchableOpacity
                style={[
                    styles.historyItem,
                    isDark && styles.historyItemDark,
                    isSelected && styles.historyItemSelected,
                ]}
                onPress={() => handleHistoryItemPress(session)}
            >
                <MaterialCommunityIcons
                    name="chat-outline"
                    size={20}
                    color={isSelected ? theme.color.primary[500] : (isDark ? '#9CA3AF' : '#6B7280')}
                />
                <View style={styles.historyItemContent}>
                    <Text style={[styles.historyItemTitle, isDark && styles.historyItemTitleDark]}>
                        {session.title || 'Conversation'}
                    </Text>
                    <Text style={[styles.historyItemPreview, isDark && styles.historyItemPreviewDark]}>
                        {preview || 'Aucun message'}
                    </Text>
                </View>
                <Text style={[styles.historyItemDate, isDark && styles.historyItemDateDark]}>
                    {new Date(session.updatedAt).toLocaleDateString()}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderContextElement = ({ item: element }: { item: ContextElement }) => (
        <View style={[styles.contextElement, isDark && styles.contextElementDark]}>
            <MaterialCommunityIcons
                name={getIconForType(element.type)}
                size={20}
                color={isDark ? '#FFFFFF' : '#111827'}
                style={styles.contextElementIcon}
            />
            <View style={styles.contextElementContent}>
                <Text style={[styles.contextElementTitle, isDark && styles.contextElementTitleDark]}>
                    {element.title}
                </Text>
                <Text style={[styles.contextElementType, isDark && styles.contextElementTypeDark]}>
                    {element.type.charAt(0).toUpperCase() + element.type.slice(1)}
                </Text>
            </View>
            <Pressable
                style={styles.removeContextElement}
                onPress={() => {
                    trigger(HapticType.LIGHT);
                    removeContextElement(element.id);
                }}
            >
                <MaterialCommunityIcons
                    name="close"
                    size={20}
                    color={isDark ? '#9CA3AF' : '#6B7280'}
                />
            </Pressable>
        </View>
    );

    const getIconForType = (type: string) => {
        switch (type) {
            case 'program': return 'book-open-variant';
            case 'course': return 'book-open-page-variant';
            case 'lesson': return 'file-document-outline';
            case 'exercise': return 'pencil-outline';
            case 'quiz': return 'help-circle-outline';
            case 'video': return 'play-circle-outline';
            default: return 'file-outline';
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={handleCloseModal}
            presentationStyle="fullScreen"
        >
            <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
                {/* Header */}
                <View style={[styles.header, isDark && styles.headerDark]}>
                    <Pressable style={styles.headerButton} onPress={handleCloseModal}>
                        <MaterialCommunityIcons
                            name="arrow-left"
                            size={24}
                            color={isDark ? '#FFFFFF' : '#111827'}
                        />
                    </Pressable>

                    <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
                        Assistant IA
                    </Text>

                    <View style={styles.headerActions}>
                        <Pressable
                            style={styles.headerButton}
                            onPress={() => {
                                trigger(HapticType.LIGHT);
                                setActiveModal('history');
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
                            onPress={() => {
                                trigger(HapticType.LIGHT);
                                setActiveModal('context');
                            }}
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

                {/* Suggested Elements */}
                {suggestedElements.length > 0 && (
                    <View style={[styles.suggestedContainer, isDark && styles.suggestedContainerDark]}>
                        <FlatList
                            data={suggestedElements}
                            renderItem={renderSuggestedElement}
                            keyExtractor={(item) => `suggested_${item.id}`}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.suggestedContent}
                        />
                    </View>
                )}

                {/* Main Chat Area */}
                <KeyboardAvoidingView
                    style={styles.chatArea}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={0}
                >
                    {/* Messages */}
                    <FlatList
                        ref={scrollViewRef}
                        data={messages}
                        renderItem={renderMessageBubble}
                        keyExtractor={(item) => `message_${item.id}`}
                        style={styles.messagesList}
                        contentContainerStyle={styles.messagesContent}
                        showsVerticalScrollIndicator={false}
                        ListFooterComponent={
                            isLoading ? (
                                <View style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}>
                                    <ActivityIndicator size="small" color={theme.color.primary[500]} />
                                    <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
                                        En train de répondre...
                                    </Text>
                                </View>
                            ) : null
                        }
                    />

                    {/* Input Area */}
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

                {/* History Modal */}
                <Modal
                    visible={activeModal === 'history'}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setActiveModal('none')}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
                                    Historique des conversations
                                </Text>
                                <Pressable
                                    style={styles.closeButton}
                                    onPress={() => setActiveModal('none')}
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
                                }}
                            >
                                <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
                                <Text style={styles.newChatButtonText}>Nouvelle conversation</Text>
                            </TouchableOpacity>

                            <FlatList
                                data={[...chatHistory].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())}
                                renderItem={renderHistoryItem}
                                keyExtractor={(item) => `history_${item.id}`}
                                style={styles.modalList}
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        <MaterialCommunityIcons
                                            name="chat-remove-outline"
                                            size={48}
                                            color={isDark ? '#4B5563' : '#9CA3AF'}
                                        />
                                        <Text style={[styles.emptyStateText, isDark && styles.emptyStateTextDark]}>
                                            Aucune conversation
                                        </Text>
                                    </View>
                                }
                            />
                        </View>
                    </View>
                </Modal>

                {/* Context Modal */}
                <Modal
                    visible={activeModal === 'context'}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setActiveModal('none')}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
                                    Éléments de contexte
                                </Text>
                                <Pressable
                                    style={styles.closeButton}
                                    onPress={() => setActiveModal('none')}
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
                                renderItem={renderContextElement}
                                keyExtractor={(item) => `context_${item.id}`}
                                style={styles.modalList}
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        <MaterialCommunityIcons
                                            name="information-outline"
                                            size={48}
                                            color={isDark ? '#4B5563' : '#9CA3AF'}
                                        />
                                        <Text style={[styles.emptyStateText, isDark && styles.emptyStateTextDark]}>
                                            Aucun élément de contexte
                                        </Text>
                                        <Text style={[styles.emptyStateSubtext, isDark && styles.emptyStateSubtextDark]}>
                                            Ajoutez des éléments de contexte pour améliorer les réponses de l'assistant.
                                        </Text>
                                    </View>
                                }
                            />
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </Modal>
    );
};

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
    headerButton: {
        padding: 4,
        position: 'relative',
    },
    headerTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    headerTitleDark: {
        color: '#FFFFFF',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 16,
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
    suggestedContainer: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingVertical: 12,
    },
    suggestedContainerDark: {
        backgroundColor: '#1F2937',
        borderBottomColor: '#374151',
    },
    suggestedContent: {
        paddingHorizontal: 16,
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
        color: '#111827',
    },
    suggestedElementTextDark: {
        color: '#FFFFFF',
    },
    chatArea: {
        flex: 1,
    },
    messagesList: {
        flex: 1,
    },
    messagesContent: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    messageBubble: {
        marginBottom: 12,
        padding: 12,
        borderRadius: 16,
        maxWidth: '85%',
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
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        gap: 8,
    },
    inputContainerDark: {
        backgroundColor: '#1F2937',
        borderTopColor: '#374151',
    },
    input: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
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
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.color.primary[500],
        justifyContent: 'center',
        alignItems: 'center',
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
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        width: screenWidth * 0.9,
        maxHeight: screenHeight * 0.8,
        padding: 16,
    },
    modalContentDark: {
        backgroundColor: '#1F2937',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    modalTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    modalTitleDark: {
        color: '#FFFFFF',
    },
    closeButton: {
        padding: 4,
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
    modalList: {
        maxHeight: screenHeight * 0.6,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
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
        color: '#111827',
    },
    historyItemTitleDark: {
        color: '#FFFFFF',
    },
    historyItemPreview: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        color: '#6B7280',
    },
    historyItemPreviewDark: {
        color: '#9CA3AF',
    },
    historyItemDate: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        color: '#6B7280',
    },
    historyItemDateDark: {
        color: '#9CA3AF',
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
        color: '#111827',
    },
    contextElementTitleDark: {
        color: '#FFFFFF',
    },
    contextElementType: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        color: '#6B7280',
    },
    contextElementTypeDark: {
        color: '#9CA3AF',
    },
    removeContextElement: {
        padding: 4,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyStateText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: '#6B7280',
        marginTop: 12,
    },
    emptyStateTextDark: {
        color: '#9CA3AF',
    },
    emptyStateSubtext: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#9CA3AF',
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 24,
    },
    emptyStateSubtextDark: {
        color: '#6B7280',
    },
});

export default ChatBox;