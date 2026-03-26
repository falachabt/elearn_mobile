import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    useColorScheme,
    TouchableOpacity,
    FlatList,
    Dimensions,
    Animated,
    StatusBar,
    BackHandler,
    Alert,
    Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import { useSWRConfig } from 'swr';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import Markdown from 'react-native-markdown-display';

import { logger } from '@/utils/logger';
import { theme } from '@/constants/theme';
import { ThemedText } from '@/components/ThemedText';
import { HapticType, useHaptics } from '@/hooks/useHaptics';
import run, { GENERIC_GEMINI_ERROR_MESSAGE, type GeminiRequestPart } from '@/config/gemini';
import { Events, trackEvent } from '@/utils/analytics';
import {
    type ContextElement,
    getContextElementIconName,
    getSuggestedContextElementsFromCache,
    rehydrateContextElementsFromIds,
} from '@/utils/chatContext';

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
}

interface UploadAttachment {
    id: string;
    uri: string;
    name: string;
    mimeType: string;
    size: number | null;
    kind: 'image' | 'pdf';
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

interface ProgramCourseSummary {
    name?: string | null;
    title?: string | null;
}

interface LessonSummary {
    name?: string | null;
}

interface ResourceSummary {
    title?: string | null;
    name?: string | null;
}

interface HintSummary {
    text?: string | null;
}

interface QuizQuestionSummary {
    question_text?: string | null;
    question_type?: string | null;
}

interface VideoChapterSummary {
    title?: string | null;
    start_time?: number | null;
}

const MAX_CONTEXT_PDF_BYTES = 50 * 1024 * 1024;
const MAX_UPLOAD_ATTACHMENT_COUNT = 3;
const MAX_UPLOAD_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_UPLOAD_PDF_BYTES = 50 * 1024 * 1024;
const BASE64_CHUNK_SIZE = 0x8000;

const formatAttachmentSize = (size: number | null) => {
    if (!size || Number.isNaN(size)) {
        return '';
    }

    if (size >= 1024 * 1024) {
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${Math.max(1, Math.round(size / 1024))} KB`;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';

    for (let index = 0; index < bytes.length; index += BASE64_CHUNK_SIZE) {
        const chunk = bytes.subarray(index, index + BASE64_CHUNK_SIZE);
        binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
};

const NewChatBot: React.FC<ChatBoxProps> = ({
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
    const [selectedAttachments, setSelectedAttachments] = useState<UploadAttachment[]>([]);

    const { trigger } = useHaptics();
    const scrollViewRef = useRef<ScrollView>(null);
    const pathname = usePathname();
    const { cache } = useSWRConfig();

    // Animation for the chat container
    const slideAnim = useRef(new Animated.Value(visible ? 0 : Dimensions.get('window').height)).current;
    const fadeAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;

    // Handle Android back button
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (visible) {
                handleClose();
                return true;
            }
            return false;
        });

        return () => backHandler.remove();
    }, [visible]);

    // Animation effects when visibility changes
    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: Dimensions.get('window').height,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    // Styles Markdown personnalisés avec support du mode sombre
    const markdownStyles = {
        body: {
            color: isDark ? '#F9FAFB' : '#1F2937',
            fontFamily: theme.typography.fontFamily,
            fontSize: 15,
            lineHeight: 22,
        },
        heading1: {
            fontSize: 20,
            fontWeight: '700',
            marginTop: 16,
            marginBottom: 8,
            color: isDark ? '#F9FAFB' : '#1F2937',
        },
        heading2: {
            fontSize: 18,
            fontWeight: '600',
            marginTop: 14,
            marginBottom: 6,
            color: isDark ? '#F9FAFB' : '#1F2937',
        },
        heading3: {
            fontSize: 16,
            fontWeight: '600',
            marginTop: 12,
            marginBottom: 4,
            color: isDark ? '#F9FAFB' : '#1F2937',
        },
        paragraph: {
            marginTop: 0,
            marginBottom: 8,
            color: isDark ? '#F9FAFB' : '#1F2937',
            lineHeight: 22,
        },
        list_item: {
            marginTop: 3,
            marginBottom: 3,
            color: isDark ? '#F9FAFB' : '#1F2937',
        },
        bullet_list: {
            marginTop: 4,
            marginBottom: 8,
            color: isDark ? '#F9FAFB' : '#1F2937',
        },
        ordered_list: {
            marginTop: 4,
            marginBottom: 8,
            color: isDark ? '#F9FAFB' : '#1F2937',
        },
        code_block: {
            backgroundColor: isDark ? '#374151' : '#F3F4F6',
            padding: 12,
            borderRadius: theme.border.radius.small,
            marginTop: 8,
            marginBottom: 8,
            color: isDark ? '#E5E7EB' : '#1F2937',
            fontFamily: 'monospace',
        },
        code_inline: {
            backgroundColor: isDark ? '#374151' : '#F3F4F6',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: theme.border.radius.small,
            color: isDark ? '#E5E7EB' : '#1F2937',
            fontFamily: 'monospace',
        },
        blockquote: {
            backgroundColor: isDark ? '#374151' : '#F8FAFC',
            borderLeftWidth: 4,
            borderLeftColor: theme.color.primary[500],
            paddingLeft: 16,
            paddingRight: 16,
            paddingTop: 8,
            paddingBottom: 8,
            marginTop: 8,
            marginBottom: 8,
            borderRadius: theme.border.radius.small,
            color: isDark ? '#D1D5DB' : '#64748B',
        },
        link: {
            color: theme.color.primary[500],
            textDecorationLine: 'underline',
        },
        em: {
            fontStyle: 'italic',
            color: isDark ? '#F9FAFB' : '#1F2937',
        },
        strong: {
            fontWeight: '600',
            color: isDark ? '#F9FAFB' : '#1F2937',
        },
        hr: {
            backgroundColor: isDark ? '#374151' : '#E2E8F0',
            height: 1,
            marginTop: 16,
            marginBottom: 16,
        },
        table: {
            borderWidth: 1,
            borderColor: isDark ? '#4B5563' : '#E2E8F0',
            marginTop: 12,
            marginBottom: 12,
            borderRadius: theme.border.radius.small,
            overflow: 'hidden',
        },
        thead: {
            backgroundColor: isDark ? '#374151' : '#F8FAFC',
        },
        th: {
            padding: 12,
            color: isDark ? '#F9FAFB' : '#1F2937',
            fontWeight: '600',
            borderRightWidth: 1,
            borderRightColor: isDark ? '#4B5563' : '#E2E8F0',
        },
        tr: {
            borderBottomWidth: 1,
            borderBottomColor: isDark ? '#4B5563' : '#E2E8F0',
        },
        td: {
            padding: 12,
            color: isDark ? '#F9FAFB' : '#1F2937',
            borderRightWidth: 1,
            borderRightColor: isDark ? '#4B5563' : '#E2E8F0',
        },
        ordered_list_icon: {
            color: isDark ? '#F9FAFB' : '#1F2937',
            marginRight: 8,
        },
        bullet_list_icon: {
            color: isDark ? '#F9FAFB' : '#1F2937',
            marginRight: 8,
        },
        image: {
            marginTop: 12,
            marginBottom: 12,
            borderRadius: 8,
        },
    };

    // Effect to reset state when visibility changes
    useEffect(() => {
        if (!visible) {
            setShowContextDrawer(false);
            setShowChatHistory(false);
            setSelectedAttachments([]);
        }
    }, [visible]);

    // Load chat history and current chat on mount
    useEffect(() => {
        if (visible) {
            trackEvent(Events.CHAT_OPENED);
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
                        text: 'Bonjour! Je suis Nova votre assistant. Comment puis-je vous aider aujourd\'hui?',
                        isUser: false,
                        timestamp: new Date(),
                    },
                ]);
            }
        }
    }, [visible, initialChatSessionId]);

    // Effect to update context elements when initialContextElements changes
    useEffect(() => {
        setContextElements(initialContextElements || []);
    }, [initialContextElements]);

    // Generate suggested context elements based on current route and SWR cache
    useEffect(() => {
        if (!visible) return;
        setSuggestedElements(
            getSuggestedContextElementsFromCache(pathname, cache, contextElements)
        );
    }, [pathname, contextElements, cache, visible]);

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
            logger.error('Error loading chat history:', error);
        }
    };

    // Save chat history to AsyncStorage
    const saveChatHistory = async (history: ChatSession[]) => {
        try {
            await AsyncStorage.setItem('ezadrive_chat_history', JSON.stringify(history));
        } catch (error) {
            logger.error('Error saving chat history:', error);
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
                    setContextElements(
                        rehydrateContextElementsFromIds(cache, session.contextElementIds)
                    );
                    setCurrentChatSession(sessionId);
                }
            }
        } catch (error) {
            logger.error('Error loading chat session:', error);
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
                    text: 'Bonjour! Je suis Nova votre assistant. Comment puis-je vous aider aujourd\'hui?',
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
    const saveCurrentSession = async (
        nextMessages: Message[] = messages,
        sessionId: string | null = currentChatSession
    ) => {
        if (!sessionId) return;

        const updatedHistory = [...chatHistory];
        const sessionIndex = updatedHistory.findIndex(s => s.id === sessionId);

        if (sessionIndex !== -1) {
            updatedHistory[sessionIndex] = {
                ...updatedHistory[sessionIndex],
                messages: nextMessages,
                contextElementIds: contextElements.map(el => el.id),
                updatedAt: new Date(),
                title: nextMessages.find(m => m.isUser)?.text.substring(0, 30) || 'Nouvelle conversation',
            };
        } else {
            updatedHistory.push({
                id: sessionId,
                title: nextMessages.find(m => m.isUser)?.text.substring(0, 30) || 'Nouvelle conversation',
                messages: nextMessages,
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
${data?.course_learningpath && data.course_learningpath.length > 0 ? 
  `Liste des cours: ${data.course_learningpath.map((course: ProgramCourseSummary) => course.name || course.title).join(', ')}` : ''}
${data?.level ? `Niveau: ${data.level}` : ''}
${data?.duration ? `Durée estimée: ${data.duration}` : ''}
`;

                case 'course':
                    return `
Cours: ${data?.name || 'Non disponible'}
${data?.category?.name ? `Catégorie: ${data.category.name}` : ''}
${data?.description ? `Description: ${data.description}` : ''}
${data?.goals ? `Objectifs: ${Array.isArray(data.goals) ? data.goals.join(', ') : data.goals}` : ''}
Nombre de leçons: ${data?.courses_content?.length || 'Non disponible'}
${data?.courses_content && data.courses_content.length > 0 ? 
  `Liste des leçons: ${data.courses_content.map((lesson: LessonSummary, index: number) => `${index + 1}. ${lesson.name}`).join('\n')}` : ''}
${data?.level ? `Niveau: ${data.level}` : ''}
${data?.duration ? `Durée estimée: ${data.duration}` : ''}
${data?.prerequisites ? `Prérequis: ${data.prerequisites}` : ''}
${data?.quiz_count ? `Nombre de quiz: ${data.quiz_count}` : ''}
${data?.exercise_count ? `Nombre d\'exercices: ${data.exercise_count}` : ''}
`;

                case 'lesson':
                    return `
Leçon: ${data?.name || 'Non disponible'}
Ordre: ${typeof data?.order === 'number' ? data.order + 1 : 'Non disponible'}
Cours parent: ${data?.courses?.name || 'Non disponible'}
${data?.description ? `Description: ${data.description}` : ''}
${data?.content ? `Contenu: ${data.content.replace(/<[^>]*>/g, '')}` : ''}
${data?.duration ? `Durée estimée: ${data.duration}` : ''}
${data?.has_quiz ? `Contient des quiz: Oui` : ''}
${data?.has_exercises ? `Contient des exercices: Oui` : ''}
${data?.keywords && data.keywords.length > 0 ? `Mots-clés: ${data.keywords.join(', ')}` : ''}
${data?.resources && data.resources.length > 0 ? 
  `Ressources supplémentaires: ${data.resources.map((resource: ResourceSummary) => resource.title || resource.name).join(', ')}` : ''}
`;

                case 'exercise':
                    return `
Exercice: ${data?.title || 'Non disponible'}
${data?.description ? `Description: ${data.description}` : ''}
${data?.course?.name ? `Cours: ${data.course.name}` : ''}
${data?.lesson?.name ? `Leçon: ${data.lesson.name}` : ''}
${data?.instructions ? `Instructions: ${data.instructions.replace(/<[^>]*>/g, '')}` : ''}
${data?.difficulty ? `Difficulté: ${data.difficulty}` : ''}
${data?.duration ? `Durée estimée: ${data.duration}` : ''}
${data?.points ? `Points: ${data.points}` : ''}
${data?.tags && data.tags.length > 0 ? `Tags: ${data.tags.join(', ')}` : ''}
${data?.hints && data.hints.length > 0 ? 
  `Indices disponibles: ${data.hints.map((hint: HintSummary | string, index: number) => `${index + 1}. ${typeof hint === 'string' ? hint : hint.text || ''}`).join('\n')}` : ''}
${data?.solution ? `Solution disponible: Oui` : ''}
`;

                case 'quiz':
                    return `
Quiz: ${data?.name || 'Non disponible'}
${data?.description ? `Description: ${data.description}` : ''}
Nombre de questions: ${data?.quiz_questions?.length || 'Non disponible'}
Catégorie: ${data?.category?.name || 'Non disponible'}
${data?.course?.name ? `Cours: ${data.course.name}` : ''}
${data?.lesson?.name ? `Leçon: ${data.lesson.name}` : ''}
${data?.difficulty ? `Difficulté: ${data.difficulty}` : ''}
${data?.duration ? `Durée estimée: ${data.duration} minutes` : ''}
${data?.passing_score ? `Score de réussite: ${data.passing_score}%` : ''}
${data?.time_limit ? `Temps limite: ${data.time_limit} minutes` : ''}
${data?.quiz_questions && data.quiz_questions.length > 0 ? 
  `Questions: ${data.quiz_questions.map((q: QuizQuestionSummary, index: number) => 
    `${index + 1}. ${q.question_text?.replace(/<[^>]*>/g, '')} ${ 
      q.question_type ? `(Type: ${q.question_type})` : ''
    }`
  ).join('\n')}` : ''}
`;

                case 'archive':
                    return `
Archive: ${data?.name || 'Non disponible'}
${data?.session ? `Session: ${data.session}` : ''}
Type de fichier: ${data?.file_type || 'Non disponible'}
${data?.description ? `Description: ${data.description}` : ''}
${data?.year ? `Année: ${data.year}` : ''}
${data?.subject ? `Matière: ${data.subject}` : ''}
${data?.school ? `École: ${data.school}` : ''}
${data?.concours ? `Concours: ${data.concours}` : ''}
${data?.author ? `Auteur: ${data.author}` : ''}
${data?.tags && data.tags.length > 0 ? `Tags: ${data.tags.join(', ')}` : ''}
${data?.size ? `Taille du fichier: ${Math.round(data.size / 1024)} KB` : ''}
${data?.download_count ? `Nombre de téléchargements: ${data.download_count}` : ''}
`;

                case 'video':
                    return `
Vidéo: ${data?.title || 'Non disponible'}
${data?.description ? `Description: ${data.description}` : ''}
Durée: ${typeof data?.duration === 'number' ? `${Math.floor(data.duration / 60)} minutes ${data.duration % 60} secondes` : 'Non disponible'}
${data?.course?.name ? `Cours: ${data.course.name}` : ''}
${data?.lesson?.name ? `Leçon: ${data.lesson.name}` : ''}
${data?.author ? `Auteur/Présentateur: ${data.author}` : ''}
${data?.transcript ? `Transcription disponible: Oui` : ''}
${data?.transcript ? `Transcription: ${data.transcript.replace(/<[^>]*>/g, '')}` : ''}
${data?.tags && data.tags.length > 0 ? `Tags: ${data.tags.join(', ')}` : ''}
${data?.view_count ? `Nombre de vues: ${data.view_count}` : ''}
${data?.quality ? `Qualité: ${data.quality}` : ''}
${data?.chapters && data.chapters.length > 0 ? 
  `Chapitres: ${data.chapters.map((chapter: VideoChapterSummary, index: number) => 
    `${index + 1}. ${chapter.title} (${Math.floor((chapter.start_time || 0) / 60)}:${String((chapter.start_time || 0) % 60).padStart(2, '0')})`
  ).join('\n')}` : ''}
${data?.related_resources && data.related_resources.length > 0 ? 
  `Ressources liées: ${data.related_resources.map((resource: ResourceSummary) => resource.title || resource.name).join(', ')}` : ''}
`;

                case 'document':
                    return `
Document: ${data?.name || data?.title || 'Non disponible'}
${data?.description ? `Description: ${data.description}` : ''}
${data?.file_type ? `Type de fichier: ${data.file_type}` : ''}
${data?.file_size ? `Taille du fichier: ${Math.round(data.file_size / 1024)} KB` : ''}
${data?.is_correction ? 'Document de correction: Oui' : ''}
${data?.download_url || data?.file_url ? 'Lecture du document disponible: Oui' : ''}
`;

                default:
                    return `${element.title}\nAucune donnée supplémentaire disponible.`;
            }
        }).join('\n\n');
    };

    const buildPdfContextPart = async (): Promise<{
        part: GeminiRequestPart | null;
        sourceName?: string;
    }> => {
        const pdfContextElement = contextElements.find((element) => {
            const fileUrl = element.data?.download_url || element.data?.file_url;
            const fileType = element.data?.file_type?.toLowerCase();

            return (
                !!fileUrl &&
                (element.type === 'document' || element.type === 'archive') &&
                (fileType === 'pdf' || fileUrl.toLowerCase().includes('.pdf'))
            );
        });

        if (!pdfContextElement) {
            return { part: null };
        }

        const fileUrl = pdfContextElement.data?.download_url || pdfContextElement.data?.file_url;
        if (!fileUrl) {
            return { part: null };
        }

        const fileSize = Number(pdfContextElement.data?.file_size || pdfContextElement.data?.size || 0);
        if (fileSize > MAX_CONTEXT_PDF_BYTES) {
            logger.warn('Nova document context skipped because file is too large', {
                elementId: pdfContextElement.id,
                fileSize,
            });
            return { part: null };
        }

        const baseDirectory = FileSystem.cacheDirectory || FileSystem.documentDirectory;
        if (!baseDirectory) {
            return { part: null };
        }

        const tempFileUri = `${baseDirectory}nova-context-${Date.now()}.pdf`;

        try {
            const base64Data =
                Platform.OS === 'web'
                    ? await readUriAsBase64(fileUrl)
                    : await (async () => {
                        const downloadResult = await FileSystem.downloadAsync(fileUrl, tempFileUri);
                        return readUriAsBase64(downloadResult.uri);
                    })();

            return {
                part: {
                    inlineData: {
                        mimeType: 'application/pdf',
                        data: base64Data,
                    },
                },
                sourceName: pdfContextElement.data?.name || pdfContextElement.title,
            };
        } catch (error) {
            logger.error('Error preparing PDF context for Nova:', error);
            return { part: null };
        } finally {
            try {
                await FileSystem.deleteAsync(tempFileUri, { idempotent: true });
            } catch {
                // Ignore cleanup errors for temporary prompt files
            }
        }
    };

    const readUriAsBase64 = async (uri: string) => {
        if (Platform.OS !== 'web') {
            return FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
            });
        }

        const response = await fetch(uri);
        if (!response.ok) {
            throw new Error(`Failed to read attachment from URI: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        return arrayBufferToBase64(buffer);
    };

    const pickAttachments = async () => {
        if (isLoading) {
            return;
        }

        try {
            const remainingSlots = MAX_UPLOAD_ATTACHMENT_COUNT - selectedAttachments.length;
            if (remainingSlots <= 0) {
                Alert.alert(
                    'Limite atteinte',
                    `Vous pouvez joindre jusqu'à ${MAX_UPLOAD_ATTACHMENT_COUNT} fichiers par message.`
                );
                return;
            }

            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                multiple: true,
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets?.length) {
                return;
            }

            const normalizedAssets = result.assets
                .map((asset) => {
                    const assetMimeType = asset.mimeType?.toLowerCase() || '';
                    const assetName = asset.name || 'Pièce jointe';
                    const isPdf =
                        assetMimeType === 'application/pdf' ||
                        assetName.toLowerCase().endsWith('.pdf');
                    const isImage = assetMimeType.startsWith('image/');

                    if (!isPdf && !isImage) {
                        return null;
                    }

                    return {
                        id: `${Date.now()}-${asset.uri}-${assetName}`,
                        uri: asset.uri,
                        name: assetName,
                        mimeType: isPdf ? 'application/pdf' : assetMimeType || 'image/jpeg',
                        size: typeof asset.size === 'number' ? asset.size : null,
                        kind: isPdf ? 'pdf' : 'image',
                    } satisfies UploadAttachment;
                })
                .filter((asset): asset is UploadAttachment => asset !== null);

            if (normalizedAssets.length === 0) {
                Alert.alert(
                    'Format non pris en charge',
                    'Nova accepte uniquement les images et les documents PDF.'
                );
                return;
            }

            const nextAttachments = [
                ...selectedAttachments,
                ...normalizedAssets.filter(
                    (asset) =>
                        !selectedAttachments.some(
                            (existing) =>
                                existing.uri === asset.uri && existing.name === asset.name
                        )
                ),
            ].slice(0, MAX_UPLOAD_ATTACHMENT_COUNT);

            if (nextAttachments.length === selectedAttachments.length) {
                return;
            }

            if (selectedAttachments.length + normalizedAssets.length > MAX_UPLOAD_ATTACHMENT_COUNT) {
                Alert.alert(
                    'Limite atteinte',
                    `Nova garde les ${MAX_UPLOAD_ATTACHMENT_COUNT} premiers fichiers sélectionnés.`
                );
            }

            setSelectedAttachments(nextAttachments);
        } catch (error) {
            logger.error('Error picking Nova attachments:', error);
            Alert.alert(
                'Ajout impossible',
                'Impossible de sélectionner le fichier pour le moment.'
            );
        }
    };

    const removeAttachment = (attachmentId: string) => {
        setSelectedAttachments((current) =>
            current.filter((attachment) => attachment.id !== attachmentId)
        );
    };

    const buildAttachmentParts = async (): Promise<{
        parts: GeminiRequestPart[];
        summary: string;
    } | null> => {
        if (selectedAttachments.length === 0) {
            return {
                parts: [],
                summary: '',
            };
        }

        const oversizeAttachment = selectedAttachments.find((attachment) => {
            if (typeof attachment.size !== 'number') {
                return false;
            }

            const maxBytes =
                attachment.kind === 'pdf'
                    ? MAX_UPLOAD_PDF_BYTES
                    : MAX_UPLOAD_IMAGE_BYTES;

            return attachment.size > maxBytes;
        });

        if (oversizeAttachment) {
            Alert.alert(
                'Fichier trop volumineux',
                oversizeAttachment.kind === 'pdf'
                    ? 'Les PDF joints à Nova doivent faire moins de 50 MB.'
                    : 'Les images jointes à Nova doivent faire moins de 20 MB.'
            );
            return null;
        }

        try {
            const parts = await Promise.all(
                selectedAttachments.map(async (attachment) => {
                    const base64Data = await readUriAsBase64(attachment.uri);

                    return {
                        inlineData: {
                            mimeType: attachment.mimeType,
                            data: base64Data,
                        },
                    } satisfies GeminiRequestPart;
                })
            );

            const summary = selectedAttachments
                .map((attachment) => `${attachment.kind === 'image' ? 'Image' : 'PDF'}: ${attachment.name}`)
                .join(', ');

            return { parts, summary };
        } catch (error) {
            logger.error('Error preparing Nova attachments:', error);
            Alert.alert(
                'Lecture impossible',
                'Nova n’a pas pu lire la pièce jointe sélectionnée.'
            );
            return null;
        }
    };

    // Send message to Gemini AI
    const handleSend = async () => {
        const trimmedInput = inputText.trim();
        if (trimmedInput === '' && selectedAttachments.length === 0) return;

        trackEvent(Events.MESSAGE_SENT);
        trigger(HapticType.LIGHT);
        setIsLoading(true);

        const attachmentPayload = await buildAttachmentParts();
        if (!attachmentPayload) {
            setIsLoading(false);
            return;
        }

        const userMessageText = [
            trimmedInput || 'Analyse les pièces jointes.',
            attachmentPayload.summary ? `Pièces jointes: ${attachmentPayload.summary}` : '',
        ]
            .filter(Boolean)
            .join('\n\n');

        // Create and add user message
        const userMessage: Message = {
            id: Date.now().toString(),
            text: userMessageText,
            isUser: true,
            timestamp: new Date(),
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInputText('');
        setSelectedAttachments([]);
        let sessionId = currentChatSession;

        try {
            // Create session if needed
            if (!sessionId) {
                sessionId = await createNewChatSession();
                setCurrentChatSession(sessionId);
            }

            // Prepare context information using actual data
            const contextInfo = prepareContextInfo();
            const { part: pdfContextPart, sourceName: pdfSourceName } = await buildPdfContextPart();

            // Format conversation history
            const conversationHistory = messages
                .map(msg => `${msg.isUser ? 'Étudiant' : 'Nova'}: ${msg.text}`)
                .join('\n\n');

            // Send message to Gemini with detailed context
            const prompt = `
Tu es un assistant pédagogique spécialisé pour aider les étudiants dans leur préparation aux concours. Tu dois proposer une aide adaptée et efficace selon le contexte.

${contextInfo ? `CONTEXTE DÉTAILLÉ:\n${contextInfo}\n\n` : ''}
${attachmentPayload.summary ? `PIÈCES JOINTES DE L'ÉTUDIANT:\n${attachmentPayload.summary}\nUtilise ces pièces jointes comme source prioritaire si la question s'y rapporte.\n\n` : ''}
${pdfContextPart ? `DOCUMENT PDF JOINT:\nUn document PDF lié au contexte est joint à cette requête. Appuie-toi dessus en priorité quand la question porte sur son contenu. Nom du document: ${pdfSourceName || 'Document courant'}.\n\n` : ''}

HISTORIQUE DE LA CONVERSATION:
${conversationHistory}

Étudiant: ${trimmedInput || 'Analyse les pièces jointes envoyées.'}

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
            const parts: GeminiRequestPart[] = [
                ...attachmentPayload.parts,
                ...(pdfContextPart ? [pdfContextPart] : []),
                { text: prompt },
            ];
            const response = await run(parts);

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
            await saveCurrentSession(finalMessages, sessionId);
        } catch (error) {
            logger.error('Error getting response from Gemini:', error);

            // Add error message
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: GENERIC_GEMINI_ERROR_MESSAGE,
                isUser: false,
                timestamp: new Date(),
            };

            const failedMessages = [...updatedMessages, errorMessage];
            setMessages(failedMessages);
            await saveCurrentSession(failedMessages, sessionId);
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

    // Handle closing the chat
    const handleClose = () => {
        // First animate out
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: Dimensions.get('window').height,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            // Then call the onClose callback
            onClose();
        });
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
                        /* @ts-expect-error react-native-markdown-display style typing is incomplete */
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

    // Render context element for drawer
    const renderContextElement = (item: ContextElement) => {
        return (
            <View style={[styles.contextElement, isDark && styles.contextElementDark]}>
                <MaterialCommunityIcons
                    name={getContextElementIconName(item.type)}
                    size={20}
                    color={isDark ? '#F9FAFB' : '#1F2937'}
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
        );
    };

    // If not visible, don't render anything
    if (!visible) return null;

    return (
        <Animated.View
            style={[
                styles.overlay,
                {
                    opacity: fadeAnim,
                }
            ]}
        >
            <StatusBar backgroundColor="rgba(0, 0, 0, 0.5)" barStyle="light-content" />

            <Animated.View
                style={[
                    styles.container,
                    isDark && styles.containerDark,
                    {
                        transform: [{ translateY: slideAnim }]
                    }
                ]}
            >
                {/* Header avec design amélioré */}
                <View style={[styles.header, isDark && styles.headerDark]}>
                    <Pressable
                        style={[styles.closeButton, isDark && styles.closeButtonDark]}
                        onPress={handleClose}
                    >
                        <MaterialCommunityIcons
                            name="arrow-left"
                            size={24}
                            color={isDark ? '#F9FAFB' : '#1F2937'}
                        />
                    </Pressable>

                    <View style={styles.headerCenter}>
                        <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
                            Nova
                        </Text>
                        <Text style={[styles.headerSubtitle, isDark && styles.headerSubtitleDark]}>
                            Votre assistant pédagogique
                        </Text>
                    </View>

                    <View style={styles.headerRight}>
                        <Pressable
                            style={[styles.headerButton, isDark && styles.headerButtonDark]}
                            onPress={() => {
                                trigger(HapticType.LIGHT);
                                setShowChatHistory(true);
                            }}
                        >
                            <MaterialCommunityIcons
                                name="history"
                                size={20}
                                color={isDark ? '#F9FAFB' : '#1F2937'}
                            />
                        </Pressable>
                        <Pressable
                            style={[styles.headerButton, isDark && styles.headerButtonDark]}
                            onPress={() => setShowContextDrawer(true)}
                        >
                            <MaterialCommunityIcons
                                name="information-outline"
                                size={20}
                                color={isDark ? '#F9FAFB' : '#1F2937'}
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

                {/* Liste de suggestions améliorée */}
                {suggestedElements.length > 0 && (
                    <View style={[styles.suggestedElementsContainer, isDark && styles.suggestedElementsContainerDark]}>
                        <Text style={[styles.suggestedTitle, isDark && styles.suggestedTitleDark]}>
                            Suggestions
                        </Text>
                        <FlatList
                            data={suggestedElements}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.suggestedElementsContent}
                            renderItem={({ item: element }) => (
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
                                    <View style={[styles.suggestedElementIcon, isDark && styles.suggestedElementIconDark]}>
                                        <MaterialCommunityIcons
                                            name={getContextElementIconName(element.type)}
                                            size={16}
                                            color={theme.color.primary[500]}
                                        />
                                    </View>
                                    <Text style={[styles.suggestedElementText, isDark && styles.suggestedElementTextDark]}>
                                        {element.title
                                            .replace('Programme: ', '')
                                            .replace('Cours: ', '')
                                            .replace('Leçon: ', '')
                                            .replace('Exercice: ', '')
                                            .replace('Quiz: ', '')
                                            .replace('Archive: ', '')
                                            .replace('Vidéo: ', '')
                                            .replace('Document: ', '')}
                                    </Text>
                                    <MaterialCommunityIcons
                                        name="plus"
                                        size={14}
                                        color={theme.color.primary[500]}
                                    />
                                </TouchableOpacity>
                            )}
                            keyExtractor={(item) => item.id}
                        />
                    </View>
                )}

                {/* Zone de chat avec layout amélioré */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.keyboardAvoidingView}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 140 : 80}
                >
                    <View style={styles.chatContainer}>
                        <ScrollView
                            ref={scrollViewRef}
                            style={styles.messagesContainer}
                            contentContainerStyle={styles.messagesContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {messages.map(renderMessageBubble)}
                            {isLoading && (
                                <View style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}>
                                    <View style={styles.loadingDots}>
                                        <ActivityIndicator
                                            size="small"
                                            color={theme.color.primary[500]}
                                        />
                                    </View>
                                    <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
                                        Nova en train d'écrire...
                                    </Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>

                    {/* Zone d'input améliorée */}
                    <View style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
                        {selectedAttachments.length > 0 && (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.attachmentsList}
                                style={styles.attachmentsScroll}
                            >
                                {selectedAttachments.map((attachment) => (
                                    <View
                                        key={attachment.id}
                                        style={[
                                            styles.attachmentCard,
                                            isDark && styles.attachmentCardDark,
                                        ]}
                                    >
                                        {attachment.kind === 'image' ? (
                                            <Image
                                                source={{ uri: attachment.uri }}
                                                style={styles.attachmentThumbnail}
                                            />
                                        ) : (
                                            <View
                                                style={[
                                                    styles.attachmentThumbnail,
                                                    styles.attachmentPdfThumbnail,
                                                ]}
                                            >
                                                <MaterialCommunityIcons
                                                    name="file-pdf-box"
                                                    size={24}
                                                    color="#FFFFFF"
                                                />
                                            </View>
                                        )}
                                        <View style={styles.attachmentMeta}>
                                            <Text
                                                style={[
                                                    styles.attachmentName,
                                                    isDark && styles.attachmentNameDark,
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {attachment.name}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.attachmentDetails,
                                                    isDark && styles.attachmentDetailsDark,
                                                ]}
                                            >
                                                {attachment.kind === 'image' ? 'Image' : 'PDF'}
                                                {attachment.size
                                                    ? ` • ${formatAttachmentSize(attachment.size)}`
                                                    : ''}
                                            </Text>
                                        </View>
                                        <Pressable
                                            style={styles.attachmentRemoveButton}
                                            onPress={() => removeAttachment(attachment.id)}
                                        >
                                            <MaterialCommunityIcons
                                                name="close"
                                                size={16}
                                                color={isDark ? '#F9FAFB' : '#1F2937'}
                                            />
                                        </Pressable>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                        <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark]}>
                            <Pressable
                                style={[
                                    styles.attachButton,
                                    isDark && styles.attachButtonDark,
                                ]}
                                onPress={pickAttachments}
                                disabled={isLoading}
                            >
                                <MaterialCommunityIcons
                                    name="paperclip"
                                    size={20}
                                    color={theme.color.primary[500]}
                                />
                            </Pressable>
                            <TextInput
                                style={[styles.input, isDark && styles.inputDark]}
                                placeholder="Posez votre question ou joignez un PDF/image..."
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
                                    !inputText.trim() &&
                                    selectedAttachments.length === 0 &&
                                    styles.sendButtonDisabled,
                                ]}
                                onPress={handleSend}
                                disabled={
                                    (!inputText.trim() && selectedAttachments.length === 0) ||
                                    isLoading
                                }
                            >
                                <MaterialCommunityIcons
                                    name="send"
                                    size={20}
                                    color="#FFFFFF"
                                />
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>

                {/* Chat History Modal */}
                {showChatHistory && (
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
                                        color={isDark ? '#F9FAFB' : '#1F2937'}
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
                )}

                {/* Context Elements Drawer */}
                {showContextDrawer && (
                    <View style={styles.modalOverlay}>
                        <View style={[styles.contextDrawerContent, isDark && styles.contextDrawerContentDark]}>
                            <View style={styles.contextDrawerHeader}>
                                <ThemedText style={styles.contextDrawerTitle}>
                                    Éléments de contexte
                                </ThemedText>
                                <Pressable
                                    style={styles.closeButton}
                                    onPress={() => setShowContextDrawer(false)}
                                >
                                    <MaterialCommunityIcons
                                        name="close"
                                        size={24}
                                        color={isDark ? '#F9FAFB' : '#1F2937'}
                                    />
                                </Pressable>
                            </View>
                            <FlatList
                                data={contextElements}
                                renderItem={({ item }) => renderContextElement(item)}
                                keyExtractor={(item) => item.id}
                                style={styles.contextDrawerList}
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
                                            Ajoutez des éléments de contexte pour améliorer les réponses de Nova.
                                        </ThemedText>
                                    </View>
                                }
                            />
                        </View>
                    </View>
                )}
            </Animated.View>
        </Animated.View>
    );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        marginBottom: 65,
        zIndex: 1000,
    },
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        width: '100%',
        height: '100%',
        borderTopLeftRadius: theme.border.radius.small,
        borderTopRightRadius: theme.border.radius.small,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 20,
    },
    containerDark: {
        backgroundColor: '#111827',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        backdropFilter: 'blur(10px)',
    },
    headerDark: {
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        borderBottomColor: '#374151',
    },
    closeButton: {
        padding: 8,
        borderRadius: theme.border.radius.small,
        backgroundColor: '#F8FAFC',
    },
    closeButtonDark: {
      backgroundColor : '#374151',
    },
    headerCenter: {
        alignItems: 'center',
        flex: 1,
    },
    headerTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    headerTitleDark: {
        color: '#F9FAFB',
    },
    headerSubtitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    headerSubtitleDark: {
        color: '#9CA3AF',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerButton: {
        padding: 8,
        borderRadius: theme.border.radius.small,
        backgroundColor: '#F8FAFC',
        position: 'relative',
    },
    headerButtonDark: {
        backgroundColor: '#374151',
    },
    contextBadge: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: theme.color.primary[500],
        borderRadius: theme.border.radius.small,
        width: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    contextBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
    suggestedElementsContainer: {
        backgroundColor: '#FAFBFC',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        paddingVertical: 16,
    },
    suggestedElementsContainerDark: {
        backgroundColor: '#1F2937',
        borderBottomColor: '#374151',
    },
    suggestedTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginHorizontal: 20,
        marginBottom: 12,
    },
    suggestedTitleDark: {
        color: '#9CA3AF',
    },
    suggestedElementsContent: {
        paddingHorizontal: 20,
        gap: 12,
    },
    suggestedElement: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: theme.border.radius.small,
        gap: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        minWidth: 120,
    },
    suggestedElementDark: {
        backgroundColor: '#374151',
        borderColor: '#4B5563',
    },
    suggestedElementIcon: {
        width: 24,
        height: 24,
        backgroundColor: '#F0F9FF',
        borderRadius: theme.border.radius.small,
        alignItems: 'center',
        justifyContent: 'center',
    },
    suggestedElementIconDark: {
        backgroundColor: '#1E40AF',
    },
    suggestedElementText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 13,
        fontWeight: '500',
        color: '#374151',
        flex: 1,
    },
    suggestedElementTextDark: {
        color: '#F9FAFB',
    },
    keyboardAvoidingView: {
        flex: 1,
        width: '100%',
    },
    chatContainer: {
        flex: 1,
        width: '100%',
    },
    messagesContainer: {
        flex: 1,
        width: '100%',
    },
    messagesContent: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        width: '100%',
    },
    messageBubble: {
        marginBottom: 16,
        padding: 16,
        borderRadius: theme.border.radius.medium,
        maxWidth: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: theme.color.primary[500],
        borderBottomRightRadius: theme.border.radius.small,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#F8FAFC',
        borderBottomLeftRadius: theme.border.radius.small,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    aiBubbleDark: {
        backgroundColor: '#374151',
        borderColor: '#4B5563',
    },
    messageText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 15,
        lineHeight: 22,
    },
    userText: {
        color: '#FFFFFF',
        fontWeight: '500',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: theme.border.radius.medium,
        borderBottomLeftRadius: theme.border.radius.small,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 8,
    },
    loadingContainerDark: {
        backgroundColor: '#374151',
        borderColor: '#4B5563',
    },
    loadingDots: {
        padding: 4,
    },
    loadingText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    loadingTextDark: {
        color: '#D1D5DB',
    },
    inputContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    inputContainerDark: {
        backgroundColor: '#1F2937',
        borderTopColor: '#374151',
    },
    attachmentsScroll: {
        marginBottom: 12,
    },
    attachmentsList: {
        paddingRight: 8,
        gap: 10,
    },
    attachmentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: theme.border.radius.small,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 8,
        minWidth: 180,
        maxWidth: 260,
        gap: 10,
    },
    attachmentCardDark: {
        backgroundColor: '#374151',
        borderColor: '#4B5563',
    },
    attachmentThumbnail: {
        width: 42,
        height: 42,
        borderRadius: theme.border.radius.small,
        backgroundColor: '#E5E7EB',
    },
    attachmentPdfThumbnail: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#DC2626',
    },
    attachmentMeta: {
        flex: 1,
        minWidth: 0,
    },
    attachmentName: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 13,
        fontWeight: '600',
        color: '#1F2937',
    },
    attachmentNameDark: {
        color: '#F9FAFB',
    },
    attachmentDetails: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    attachmentDetailsDark: {
        color: '#D1D5DB',
    },
    attachmentRemoveButton: {
        width: 28,
        height: 28,
        borderRadius: theme.border.radius.small,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(148, 163, 184, 0.16)',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#F8FAFC',
        borderRadius: theme.border.radius.medium,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    inputWrapperDark: {
        backgroundColor: '#374151',
        borderColor: '#4B5563',
    },
    attachButton: {
        width: 40,
        height: 40,
        borderRadius: theme.border.radius.small,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    attachButtonDark: {
        backgroundColor: '#1E3A8A',
    },
    input: {
        flex: 1,
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: '#1F2937',
        maxHeight: 120,
        minHeight: 24,
        textAlignVertical: 'center',
    },
    inputDark: {
        color: '#F9FAFB',
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: theme.border.radius.small,
        backgroundColor: theme.color.primary[500],
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: theme.color.primary[500],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    sendButtonDisabled: {
        backgroundColor: '#E5E7EB',
        shadowOpacity: 0,
        elevation: 0,
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1001,
    },
    historyModal: {
        backgroundColor: '#FFFFFF',
        borderRadius: theme.border.radius.medium,
        width: width * 0.9,
        maxHeight: height * 0.8,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 20,
    },
    historyModalDark: {
        backgroundColor: '#1F2937',
    },
    historyModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    historyModalTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 20,
        fontWeight: '700',
    },
    newChatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.color.primary[500],
        paddingVertical: 16,
        borderRadius: theme.border.radius.small,
        marginBottom: 20,
        gap: 8,
        shadowColor: theme.color.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
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
        maxHeight: height * 0.6,
    },
    historyListContent: {
        gap: 12,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: theme.border.radius.small,
        gap: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    historyItemDark: {
        backgroundColor: '#374151',
        borderColor: '#4B5563',
    },
    historyItemSelected: {
        borderWidth: 2,
        borderColor: theme.color.primary[500],
        backgroundColor: '#F0F9FF',
    },
    historyItemContent: {
        flex: 1,
    },
    historyItemTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 15,
        fontWeight: '600',
    },
    historyItemPreview: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    historyItemDate: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        color: '#9CA3AF',
    },
    emptyHistory: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyHistoryText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: '#6B7280',
        marginTop: 16,
    },
    contextDrawerContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: theme.border.radius.medium,
        width: width * 0.9,
        maxHeight: height * 0.8,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 20,
    },
    contextDrawerContentDark: {
        backgroundColor: '#1F2937',
    },
    contextDrawerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    contextDrawerTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 20,
        fontWeight: '700',
    },
    contextDrawerList: {
        maxHeight: height * 0.6,
    },
    contextElement: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: theme.border.radius.small,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    contextElementDark: {
        backgroundColor: '#374151',
        borderColor: '#4B5563',
    },
    contextElementIcon: {
        marginRight: 12,
    },
    contextElementContent: {
        flex: 1,
    },
    contextElementTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 15,
        fontWeight: '600',
    },
    contextElementType: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    removeContextElement: {
        padding: 8,
        borderRadius: theme.border.radius.small,
        backgroundColor: '#FEF2F2',
    },
    emptyContext: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyContextText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: '#6B7280',
        marginTop: 16,
    },
    emptyContextSubtext: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#9CA3AF',
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 24,
    },
});

export default NewChatBot;
