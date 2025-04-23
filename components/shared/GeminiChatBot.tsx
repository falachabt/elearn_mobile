import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Animated,
    Keyboard,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    Pressable,
    PanResponder,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {theme} from "@/constants/theme";

// Types
interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: number;
}

interface ChatSession {
    id: string;
    title: string;
    lastMessage: string;
    timestamp: number;
    messages: Message[];
}

interface ChatbotProps {
    apiKey: string;
    initialPosition?: { x: 'left' | 'right', y: number };
    theme?: {
        primary: string;
        primaryDark: string;
        secondary: string;
        background: string;
        backgroundDark: string;
        text: string;
        textDark: string;
        userBubble: string;
        botBubble: string;
        botBubbleDark: string;
        error: string;
    };
    placeholder?: string;
    welcomeMessage?: string;
    botName?: string;
    botAvatar?: any;
    userAvatar?: any;
    isDarkMode?: boolean;
    onSendMessage?: (message: string) => void;
}

// Default theme based on your application style
const DEFAULT_THEME = {
    primary: '#4F46E5',       // Indigo - Your app's primary color
    primaryDark: '#4338CA',   // Darker indigo
    secondary: '#818CF8',     // Light indigo
    background: '#FFFFFF',    // White
    backgroundDark: '#1A1A1A',// Dark background
    text: '#1A1A1A',          // Near black
    textDark: '#FFFFFF',      // White
    userBubble: '#4F46E5',    // Primary color
    botBubble: '#F3F4F6',     // Light gray
    botBubbleDark: '#2D3748', // Dark gray
    error: '#FF4444',         // Error color
};

// Storage keys
const STORAGE_KEY_CHAT_SESSIONS = 'gemini_chat_sessions';
const STORAGE_KEY_CURRENT_SESSION = 'gemini_current_session';
const STORAGE_KEY_BUTTON_POSITION = 'gemini_button_position';

const GeminiChatbot: React.FC<ChatbotProps> = ({
                                                   apiKey,
                                                   initialPosition = { x: 'right', y: 100 },
                                                   theme: customTheme,
                                                   placeholder = 'Ask me anything...',
                                                   welcomeMessage = 'Hi there! How can I help you today?',
                                                   botName = 'Gemini Assistant',
                                                   botAvatar,
                                                   userAvatar,
                                                   isDarkMode = false,
                                                   onSendMessage,
                                               }) => {
    // Merge custom theme with default theme
    const theme = { ...DEFAULT_THEME, ...customTheme };

    // State
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // Chat sessions state
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);

    // Position state for draggable button
    const [buttonPosition, setButtonPosition] = useState({
        x: initialPosition.x,
        y: initialPosition.y
    });

    // Refs
    const slideAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef<FlatList>(null);
    const inputRef = useRef<TextInput>(null);
    const buttonPositionY = useRef(new Animated.Value(initialPosition.y)).current;
    const buttonPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                // Provide haptic feedback when starting to drag
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            },
            onPanResponderMove: (_evt, gestureState) => {
                const windowHeight = Dimensions.get('window').height;
                const newY = initialPosition.y + gestureState.dy;

                // Constrain the position to stay within the screen bounds
                if (newY > 50 && newY < windowHeight - 150) {
                    buttonPositionY.setValue(newY);
                }
            },
            onPanResponderRelease: (_evt, gestureState) => {
                const newY = initialPosition.y + gestureState.dy;
                // Save the new position
                setButtonPosition(prev => ({
                    ...prev,
                    y: newY
                }));
                saveButtonPosition(buttonPosition.x, newY);

                // Provide haptic feedback when ending drag
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
        })
    ).current;

    // Load button position and chat sessions on mount
    useEffect(() => {
        loadButtonPosition();
        loadChatSessions();
    }, []);

    // Create a new session if no current session exists
    useEffect(() => {
        if (sessions.length === 0) {
            createNewChatSession();
        }
    }, [sessions]);

    // Effect to add welcome message to a new chat
    useEffect(() => {
        if (currentSession && currentSession.messages.length === 0 && welcomeMessage) {
            const welcomeMsg: Message = {
                id: Date.now().toString(),
                text: welcomeMessage,
                sender: 'bot',
                timestamp: Date.now(),
            };

            updateCurrentSession({
                ...currentSession,
                messages: [welcomeMsg],
                lastMessage: welcomeMessage,
            });
        }
    }, [currentSession]);

    // Effect to handle keyboard visibility
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                setKeyboardVisible(true);
            }
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                setKeyboardVisible(false);
            }
        );

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);

    // Animation effects
    useEffect(() => {
        if (isOpen) {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 7,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 0,
                    friction: 7,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isOpen, slideAnim, scaleAnim]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (currentSession && isOpen) {
            setTimeout(() => {
                scrollToBottom();
            }, 100);
        }
    }, [currentSession?.messages]);

    // Load saved button position from AsyncStorage
    const loadButtonPosition = async () => {
        try {
            const savedPosition = await AsyncStorage.getItem(STORAGE_KEY_BUTTON_POSITION);
            if (savedPosition) {
                const position = JSON.parse(savedPosition);
                setButtonPosition(position);
                buttonPositionY.setValue(position.y);
            }
        } catch (error) {
            console.error('Error loading button position:', error);
        }
    };

    // Save button position to AsyncStorage
    const saveButtonPosition = async (x: 'left' | 'right', y: number) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY_BUTTON_POSITION, JSON.stringify({ x, y }));
        } catch (error) {
            console.error('Error saving button position:', error);
        }
    };

    // Load saved chat sessions from AsyncStorage
    const loadChatSessions = async () => {
        try {
            const savedSessions = await AsyncStorage.getItem(STORAGE_KEY_CHAT_SESSIONS);
            const currentSessionId = await AsyncStorage.getItem(STORAGE_KEY_CURRENT_SESSION);

            if (savedSessions) {
                const parsedSessions = JSON.parse(savedSessions) as ChatSession[];
                setSessions(parsedSessions);

                if (currentSessionId) {
                    const currentSession = parsedSessions.find(s => s.id === currentSessionId);
                    if (currentSession) {
                        setCurrentSession(currentSession);
                        return;
                    }
                }

                // If no current session found, use the most recent one
                if (parsedSessions.length > 0) {
                    const mostRecent = parsedSessions.sort((a, b) => b.timestamp - a.timestamp)[0];
                    setCurrentSession(mostRecent);
                    AsyncStorage.setItem(STORAGE_KEY_CURRENT_SESSION, mostRecent.id);
                }
            }
        } catch (error) {
            console.error('Error loading chat sessions:', error);
        }
    };

    // Save sessions to AsyncStorage
    const saveSessions = async (updatedSessions: ChatSession[]) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY_CHAT_SESSIONS, JSON.stringify(updatedSessions));
        } catch (error) {
            console.error('Error saving sessions:', error);
        }
    };

    // Update current session
    const updateCurrentSession = (updatedSession: ChatSession) => {
        setCurrentSession(updatedSession);

        setSessions(prevSessions => {
            const updatedSessions = prevSessions.map(session =>
                session.id === updatedSession.id ? updatedSession : session
            );

            saveSessions(updatedSessions);
            return updatedSessions;
        });

        AsyncStorage.setItem(STORAGE_KEY_CURRENT_SESSION, updatedSession.id);
    };

    // Create a new chat session
    const createNewChatSession = () => {
        const newSession: ChatSession = {
            id: Date.now().toString(),
            title: 'Nouvelle conversation',
            lastMessage: '',
            timestamp: Date.now(),
            messages: []
        };

        setSessions(prevSessions => {
            const updatedSessions = [...prevSessions, newSession];
            saveSessions(updatedSessions);
            return updatedSessions;
        });

        setCurrentSession(newSession);
        AsyncStorage.setItem(STORAGE_KEY_CURRENT_SESSION, newSession.id);

        // Provide haptic feedback when creating a new chat
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    // Switch to a specific chat session
    const switchChatSession = (sessionId: string) => {
        const session = sessions.find(s => s.id === sessionId);
        if (session) {
            setCurrentSession(session);
            AsyncStorage.setItem(STORAGE_KEY_CURRENT_SESSION, sessionId);
            setShowHistoryModal(false);

            // Provide haptic feedback when switching chats
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    // Delete a chat session
    const deleteChatSession = (sessionId: string) => {
        // Provide haptic feedback when deleting a chat
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        setSessions(prevSessions => {
            const updatedSessions = prevSessions.filter(s => s.id !== sessionId);
            saveSessions(updatedSessions);

            // If we're deleting the current session, switch to another one
            if (currentSession?.id === sessionId) {
                if (updatedSessions.length > 0) {
                    const newCurrentSession = updatedSessions[0];
                    setCurrentSession(newCurrentSession);
                    AsyncStorage.setItem(STORAGE_KEY_CURRENT_SESSION, newCurrentSession.id);
                } else {
                    // If no sessions left, create a new one
                    createNewChatSession();
                }
            }

            return updatedSessions;
        });
    };

    // Update the title of the current session based on first user message
    const updateSessionTitle = (userMessage: string) => {
        if (currentSession && (currentSession.title === 'Nouvelle conversation' || !currentSession.title)) {
            // Use first 30 characters of the message as the title
            let newTitle = userMessage.substring(0, 30);
            if (userMessage.length > 30) newTitle += '...';

            updateCurrentSession({
                ...currentSession,
                title: newTitle
            });
        }
    };

    // Send message to Gemini API using chat mode
    const sendMessageToGemini = async (userMessage: string) => {
        if (!currentSession) return;

        try {
            setIsTyping(true);

            // Convert current chat history to Gemini chat format
            const chatHistory = currentSession.messages.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            }));

            // Use Gemini chat mode API endpoint
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        ...chatHistory,
                        {
                            role: 'user',
                            parts: [{ text: userMessage }]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        topP: 0.95,
                        topK: 40,
                        maxOutputTokens: 2048,
                    },
                    safetySettings: [
                        {
                            category: "HARM_CATEGORY_HARASSMENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_HATE_SPEECH",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        }
                    ]
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Failed to get response from Gemini');
            }

            const botReply = data.candidates[0].content.parts[0].text;

            const botMessage: Message = {
                id: Date.now().toString(),
                text: botReply,
                sender: 'bot',
                timestamp: Date.now(),
            };

            // Update the session with the bot's response
            updateCurrentSession({
                ...currentSession,
                messages: [...currentSession.messages, botMessage],
                lastMessage: botReply,
                timestamp: Date.now()
            });

            // Provide haptic feedback when receiving a response
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        } catch (error) {
            console.error('Error sending message to Gemini:', error);

            const errorMessage: Message = {
                id: Date.now().toString(),
                text: 'Désolé, une erreur est survenue. Veuillez réessayer plus tard.',
                sender: 'bot',
                timestamp: Date.now(),
            };

            updateCurrentSession({
                ...currentSession,
                messages: [...currentSession.messages, errorMessage],
                lastMessage: errorMessage.text,
                timestamp: Date.now()
            });

            // Provide error haptic feedback
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsTyping(false);
        }
    };

    // Handle sending a message
    const handleSendMessage = () => {
        if (!currentSession || message.trim() === '') return;

        // Provide haptic feedback when sending a message
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Create user message
        const userMessage: Message = {
            id: Date.now().toString(),
            text: message,
            sender: 'user',
            timestamp: Date.now(),
        };

        // Update session with new message
        updateCurrentSession({
            ...currentSession,
            messages: [...currentSession.messages, userMessage],
            lastMessage: userMessage.text,
            timestamp: Date.now()
        });

        // Update session title if this is the first user message
        if (currentSession.messages.filter(m => m.sender === 'user').length === 0) {
            updateSessionTitle(message);
        }

        if (onSendMessage) {
            onSendMessage(message);
        }

        // Store the message text before clearing it
        const currentMessage = message;

        // Clear input
        setMessage('');

        // Send to Gemini API
        sendMessageToGemini(currentMessage);
    };

    // Toggle chatbot open/closed
    const toggleChatbot = () => {
        // Provide haptic feedback when toggling the chatbot
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        setIsOpen(!isOpen);
        if (!isOpen && inputRef.current) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 300);
        }
    };

    // Scroll to bottom of chat
    const scrollToBottom = () => {
        if(currentSession)
        if (flatListRef.current && currentSession?.messages.length > 0) {
            flatListRef.current.scrollToEnd({ animated: true });
        }
    };

    // Format date from timestamp
    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Render message item
    const renderMessageItem = ({ item }: { item: Message }) => {
        const isUser = item.sender === 'user';

        return (
            <View
                style={[
                    styles.messageBubbleContainer,
                    isUser ? styles.userMessageContainer : styles.botMessageContainer,
                ]}
            >
                {!isUser && (
                    <View style={styles.avatarContainer}>
                        {botAvatar ? (
                            <Image source={botAvatar} style={styles.avatar} />
                        ) : (
                            <View style={[
                                styles.defaultAvatar,
                                { backgroundColor: theme.secondary }
                            ]}>
                                <MaterialCommunityIcons name="robot" size={20} color="#FFFFFF" />
                            </View>
                        )}
                    </View>
                )}

                <View
                    style={[
                        styles.messageBubble,
                        isUser
                            ? [styles.userMessage, { backgroundColor: theme.userBubble }]
                            : [
                                styles.botMessage,
                                { backgroundColor: isDarkMode ? theme.botBubbleDark : theme.botBubble }
                            ],
                    ]}
                >
                    <Text
                        style={[
                            styles.messageText,
                            { color: isUser ? '#FFFFFF' : (isDarkMode ? theme.textDark : theme.text) },
                        ]}
                    >
                        {item.text}
                    </Text>
                    <Text
                        style={[
                            styles.messageTimestamp,
                            { color: isUser ? 'rgba(255,255,255,0.7)' : (isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') }
                        ]}
                    >
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>

                {isUser && (
                    <View style={styles.avatarContainer}>
                        {userAvatar ? (
                            <Image source={userAvatar} style={styles.avatar} />
                        ) : (
                            <View style={[styles.defaultAvatar, { backgroundColor: theme.primary }]}>
                                <MaterialCommunityIcons name="account" size={20} color="#FFFFFF" />
                            </View>
                        )}
                    </View>
                )}
            </View>
        );
    };

    // Chat container transform based on isOpen state
    const chatContainerTransform = {
        translateY: slideAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [500, 0],
        }),
        opacity: slideAnim,
        transform: [
            {
                scale: scaleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                }),
            },
        ],
    };

    // Render chat history item
    const renderChatHistoryItem = ({ item }: { item: ChatSession }) => {
        const isActive = currentSession?.id === item.id;
        return (
            <Pressable
                style={[
                    styles.historyItem,
                    isDarkMode && styles.historyItemDark,
                    isActive && styles.historyItemActive,
                    isDarkMode && isActive && styles.historyItemActiveDark,
                ]}
                onPress={() => switchChatSession(item.id)}
            >
                <View style={styles.historyItemContent}>
                    <Text
                        style={[
                            styles.historyItemTitle,
                            isDarkMode && styles.historyItemTitleDark,
                            isActive && styles.historyItemTitleActive,
                        ]}
                        numberOfLines={1}
                    >
                        {item.title}
                    </Text>
                    <Text
                        style={[
                            styles.historyItemSubtitle,
                            isDarkMode && styles.historyItemSubtitleDark,
                        ]}
                        numberOfLines={1}
                    >
                        {item.lastMessage || 'Nouvelle conversation'}
                    </Text>
                    <Text
                        style={[
                            styles.historyItemDate,
                            isDarkMode && styles.historyItemDateDark,
                        ]}
                    >
                        {formatDate(item.timestamp)}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.historyItemDeleteButton}
                    onPress={() => deleteChatSession(item.id)}
                    disabled={sessions.length === 1}
                >
                    <MaterialCommunityIcons
                        name="delete-outline"
                        size={22}
                        color={sessions.length === 1 ? '#999999' : theme.error}
                    />
                </TouchableOpacity>
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            {/* Floating chat button */}
            <Animated.View
                style={[
                    styles.chatButtonContainer,
                    {
                        [buttonPosition.x]: 20,
                        transform: [{ translateY: buttonPositionY }]
                    }
                ]}
                {...buttonPanResponder.panHandlers}
            >
                <TouchableOpacity
                    style={[
                        styles.chatButton,
                        { backgroundColor: isDarkMode ? theme.primaryDark : theme.primary }
                    ]}
                    onPress={toggleChatbot}
                    activeOpacity={0.8}
                >
                    <MaterialCommunityIcons
                        name={isOpen ? 'close' : 'chat'}
                        size={24}
                        color="#FFFFFF"
                    />
                </TouchableOpacity>
            </Animated.View>

            {/* Chat window */}
            {isOpen && currentSession && (
                <Animated.View
                    style={[
                        styles.chatContainer,
                        {
                            backgroundColor: isDarkMode ? theme.backgroundDark : theme.background,
                            bottom: keyboardVisible ? 80 : 80,
                        },
                        buttonPosition.x === 'left' ? { left: 20 } : { right: 20 },
                        chatContainerTransform,
                    ]}
                >
                    {/* Chat header */}
                    <View style={[
                        styles.chatHeader,
                        { backgroundColor: isDarkMode ? theme.primaryDark : theme.primary }
                    ]}>
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={() => setShowHistoryModal(true)}
                        >
                            <MaterialCommunityIcons name="history" size={22} color="#FFFFFF" />
                        </TouchableOpacity>

                        <Text style={styles.chatHeaderTitle}>{botName}</Text>

                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={styles.headerButton}
                                onPress={createNewChatSession}
                            >
                                <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.headerButton}
                                onPress={() => setIsOpen(false)}
                            >
                                <MaterialCommunityIcons name="close" size={22} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Messages */}
                    <FlatList
                        ref={flatListRef}
                        data={currentSession.messages}
                        renderItem={renderMessageItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.messagesContainer}
                        onContentSizeChange={scrollToBottom}
                        onLayout={scrollToBottom}
                        showsVerticalScrollIndicator={true}
                        initialNumToRender={15}
                        maxToRenderPerBatch={10}
                        windowSize={10}
                    />

                    {/* Typing indicator */}
                    {isTyping && (
                        <View style={[
                            styles.typingContainer,
                            isDarkMode && styles.typingContainerDark
                        ]}>
                            <ActivityIndicator size="small" color={theme.primary} />
                            <Text style={[
                                styles.typingText,
                                { color: isDarkMode ? theme.textDark : theme.text }
                            ]}>
                                {botName} est en train d'écrire...
                            </Text>
                        </View>
                    )}

                    {/* Input area */}
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
                        style={[
                            styles.inputContainer,
                            isDarkMode && styles.inputContainerDark
                        ]}
                    >
                        <TextInput
                            ref={inputRef}
                            style={[
                                styles.input,
                                {
                                    color: isDarkMode ? theme.textDark : theme.text,
                                    borderColor: theme.secondary,
                                    backgroundColor: isDarkMode ? 'rgba(45, 55, 72, 0.5)' : '#F9FAFB'
                                }
                            ]}
                            placeholder={placeholder}
                            placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                            value={message}
                            onChangeText={setMessage}
                            onSubmitEditing={handleSendMessage}
                            returnKeyType="send"
                            multiline
                        />
                        <TouchableOpacity
                            style={[
                                styles.sendButton,
                                {
                                    backgroundColor: isDarkMode ? theme.primaryDark : theme.primary,
                                    opacity: message.trim() === '' ? 0.6 : 1
                                }
                            ]}
                            onPress={handleSendMessage}
                            disabled={message.trim() === ''}
                        >
                            <MaterialCommunityIcons name="send" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                    </KeyboardAvoidingView>
                </Animated.View>
            )}

            {/* Chat history modal */}
            <Modal
                visible={showHistoryModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowHistoryModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[
                        styles.modalContent,
                        isDarkMode && styles.modalContentDark
                    ]}>
                        <View style={styles.modalHeader}>
                            <Text style={[
                                styles.modalTitle,
                                isDarkMode && styles.modalTitleDark
                            ]}>
                                Conversations
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setShowHistoryModal(false);
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                            >
                                <MaterialCommunityIcons
                                    name="close"
                                    size={24}
                                    color={isDarkMode ? '#FFFFFF' : '#111827'}
                                />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.newChatButton,
                                { backgroundColor: isDarkMode ? theme.primaryDark : theme.primary }
                            ]}
                            onPress={() => {
                                createNewChatSession();
                                setShowHistoryModal(false);
                            }}
                        >
                            <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
                            <Text style={styles.newChatButtonText}>Nouvelle conversation</Text>
                        </TouchableOpacity>

                        <FlatList
                            data={sessions.sort((a, b) => b.timestamp - a.timestamp)}
                            renderItem={renderChatHistoryItem}
                            keyExtractor={(item) => item.id}
                            style={styles.historyList}
                            contentContainerStyle={styles.historyListContent}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        pointerEvents: 'box-none',
    },
    chatButtonContainer: {
        position: 'absolute',
        zIndex: 1000,
    },
    chatButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    chatContainer: {
        position: 'absolute',
        width: Math.min(400, Dimensions.get('window').width - 40),
        height: 500,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    chatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
    },
    headerButton: {
        padding: 4,
    },
    headerActions: {
        flexDirection: 'row',
    },
    chatHeaderTitle: {
        color: '#FFFFFF',
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
    },
    messagesContainer: {
        padding: 15,
        paddingBottom: 5,
    },
    messageBubbleContainer: {
        flexDirection: 'row',
        marginBottom: 12,
        alignItems: 'flex-end',
    },
    userMessageContainer: {
        justifyContent: 'flex-end',
    },
    botMessageContainer: {
        justifyContent: 'flex-start',
    },
    messageBubble: {
        maxWidth: '75%',
        borderRadius: 16,
        padding: 12,
        paddingBottom: 24,
    },
    userMessage: {
        borderBottomRightRadius: 4,
        marginLeft: 8,
    },
    botMessage: {
        borderBottomLeftRadius: 4,
        marginRight: 8,
    },
    messageText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        lineHeight: 20,
    },
    messageTimestamp: {
        fontFamily : theme.typography.fontFamily,
fontSize: 10,
        position: 'absolute',
        bottom: 6,
        right: 12,
    },
    avatarContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    defaultAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    typingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        margin: 10,
        marginTop: 0,
        alignSelf: 'flex-start',
    },
    typingContainerDark: {
        backgroundColor: '#2D3748',
    },
    typingText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 12,
        marginLeft: 8,
        fontStyle: 'italic',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
    },
    inputContainerDark: {
        borderTopColor: '#4B5563',
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },

    // Modal styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        margin: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        maxHeight: '80%',
    },
    modalContentDark: {
        backgroundColor: '#1A1A1A',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    modalTitleDark: {
        color: '#FFFFFF',
    },
    newChatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    newChatButtonText: {
        color: '#FFFFFF',
        fontWeight: '500',
        fontFamily : theme.typography.fontFamily,
fontSize: 15,
        marginLeft: 8,
    },
    historyList: {
        maxHeight: 400,
    },
    historyListContent: {
        paddingBottom: 10,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        marginBottom: 8,
    },
    historyItemDark: {
        backgroundColor: '#2D3748',
    },
    historyItemActive: {
        backgroundColor: '#EBF5FF',
        borderLeftWidth: 4,
        borderLeftColor: '#4F46E5',
    },
    historyItemActiveDark: {
        backgroundColor: '#374151',
        borderLeftColor: '#818CF8',
    },
    historyItemContent: {
        flex: 1,
    },
    historyItemTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 15,
        fontWeight: '500',
        color: '#111827',
        marginBottom: 4,
    },
    historyItemTitleDark: {
        color: '#FFFFFF',
    },
    historyItemTitleActive: {
        color: '#4F46E5',
    },
    historyItemSubtitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 13,
        color: '#6B7280',
        marginBottom: 4,
    },
    historyItemSubtitleDark: {
        color: '#D1D5DB',
    },
    historyItemDate: {
        fontFamily : theme.typography.fontFamily,
fontSize: 11,
        color: '#9CA3AF',
    },
    historyItemDateDark: {
        color: '#9CA3AF',
    },
    historyItemDeleteButton: {
        padding: 8,
    },
});

export default GeminiChatbot;