import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    useColorScheme,
    Image,
    ActivityIndicator,
    Alert,
    SafeAreaView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

// Initialize Gemini
const API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your API key
const genAI = new GoogleGenerativeAI(API_KEY);

// Types
interface Message {
    id: string;
    question: string;
    answer: string;
    attachments?: Array<{
        type: 'image' | 'document';
        uri: string;
        name: string;
    }>;
    timestamp: Date;
}

interface Chat {
    id: string;
    title: string;
    messages: Message[];
    lastUpdated: Date;
}

interface GeminiChatProps {
    customStyles?: {
        container?: any;
        chatButton?: any;
        modalContent?: any;
    };
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    handleBackPress?: () => void;
}

export const GeminiChat: React.FC<GeminiChatProps> = ({
                                                          customStyles,
                                                          position = 'bottom-right',
                                                          handleBackPress,
                                                      }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const scrollRef = useRef<ScrollView>(null);

    // States
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [attachments, setAttachments] = useState<any[]>([]);

    // Animation values
    const slideAnim = useSharedValue(Platform.OS === 'ios' ? 800 : 1000);
    const fadeAnim = useSharedValue(0);
    const scaleAnim = useSharedValue(1);

    // Theme colors
    const theme = {
        background: isDark ? '#1a1a1a' : '#ffffff',
        text: isDark ? '#ffffff' : '#000000',
        primary: '#4285f4', // Google Blue
        secondary: isDark ? '#404040' : '#f0f0f0',
        border: isDark ? '#333333' : '#e0e0e0',
        error: '#d93025', // Google Red
        success: '#0f9d58', // Google Green
    };

    // Animation styles
    const modalAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: slideAnim.value }],
        opacity: fadeAnim.value,
    }));

    const buttonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scaleAnim.value }],
    }));

    // Handlers
    const handleOpen = useCallback(() => {
        setIsOpen(true);
        slideAnim.value = withSpring(0);
        fadeAnim.value = withTiming(1);
    }, []);

    const handleClose = useCallback(() => {
        slideAnim.value = withSpring(Platform.OS === 'ios' ? 800 : 1000);
        fadeAnim.value = withTiming(0);
        setTimeout(() => setIsOpen(false), 300);
    }, []);

    const handlePressIn = useCallback(() => {
        scaleAnim.value = withSpring(0.95);
    }, []);

    const handlePressOut = useCallback(() => {
        scaleAnim.value = withSpring(1);
    }, []);

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                multiple: true,
            });

            if (!result.canceled && result.assets) {
                // const newAttachments = await Promise.all(
                //     result.assets.map(async (asset: { uri: string; name: any; mimeType: string | string[]; }) => {
                //         const fileInfo = await FileSystem.getInfoAsync(asset.uri);
                //         return {
                //             uri: asset.uri,
                //             name: asset.name,
                //             type: asset.mimeType?.includes('image') ? 'image' : 'document',
                //             size: fileInfo.size,
                //         };
                //     })
                // );
                // setAttachments([...attachments, ...newAttachments]);
            }
        } catch (error) {
            console.error('Error picking document:', error);
            Alert.alert('Error', 'Failed to pick document');
        }
    };

    const handleSend = async () => {
        if (!query.trim() && attachments.length === 0) return;

        try {
            setLoading(true);

            // Initialize Gemini model
            const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
            const chat = model.startChat();

            // Prepare message with attachments if any
            let messageContent = query;
            if (attachments.length > 0) {
                messageContent += '\n[Attachments: ' +
                    attachments.map(att => att.name).join(', ') + ']';
            }

            // Send message to Gemini
            const result = await chat.sendMessage(messageContent);
            const response = await result.response.text();

            // Create new message
            const newMessage: Message = {
                id: Date.now().toString(),
                question: query,
                answer: response,
                attachments: attachments,
                timestamp: new Date(),
            };

            setMessages([...messages, newMessage]);
            setQuery('');
            setAttachments([]);

            // Scroll to bottom
            scrollRef.current?.scrollToEnd({ animated: true });
        } catch (error) {
            console.error('Error sending message:', error);
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send message');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Animated.View style={[styles.chatButtonContainer, getPositionStyle(position), buttonAnimatedStyle]}>
                <TouchableOpacity
                    style={[styles.chatButton, customStyles?.chatButton]}
                    onPress={handleOpen}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                >
                    <Image
                        source={{uri: 'https://lh3.googleusercontent.com/Du_mzqQXnKkprXQctQvKzc9Gk9f2yQnQiFecFT3JOtZF4hiWfR1B8yG_KS4WtJlpPUr8=w220-rw'}}
                        style={styles.buttonIcon}
                    />
                </TouchableOpacity>
            </Animated.View>

            <Modal
                visible={isOpen}
                transparent
                animationType="none"
                onRequestClose={handleClose}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.keyboardView}
                    >
                        <Animated.View
                            style={[
                                styles.modalContent,
                                { backgroundColor: theme.background },
                                modalAnimatedStyle,
                                customStyles?.modalContent,
                            ]}
                        >
                            {/* Header */}
                            <View style={styles.header}>
                                <TouchableOpacity onPress={handleClose} style={styles.backButton}>
                                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                                </TouchableOpacity>
                                <Text style={[styles.headerTitle, { color: theme.text }]}>
                                    Google Gemini
                                </Text>
                                <View style={styles.headerRight} />
                            </View>

                            {/* Chat Messages */}
                            <ScrollView
                                ref={scrollRef}
                                style={styles.messageContainer}
                                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                            >
                                {messages.map((msg, index) => (
                                    <View key={msg.id} style={styles.messageWrapper}>
                                        {/* Question */}
                                        <View style={[styles.questionBubble, { backgroundColor: theme.primary }]}>
                                            <Text style={styles.questionText}>{msg.question}</Text>
                                            {msg.attachments?.map((attachment, i) => (
                                                <View key={i} style={styles.attachmentPreview}>
                                                    <Ionicons
                                                        name={attachment.type === 'image' ? 'image' : 'document'}
                                                        size={20}
                                                        color="#ffffff"
                                                    />
                                                    <Text style={styles.attachmentText}>{attachment.name}</Text>
                                                </View>
                                            ))}
                                        </View>

                                        {/* Answer */}
                                        <View style={[styles.answerBubble, { backgroundColor: theme.secondary }]}>
                                            <Text style={[styles.answerText, { color: theme.text }]}>
                                                {msg.answer}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>

                            {/* Input Area */}
                            <View style={[styles.inputContainer, { borderTopColor: theme.border }]}>
                                {/* Attachment Previews */}
                                {attachments.length > 0 && (
                                    <ScrollView
                                        horizontal
                                        style={styles.attachmentContainer}
                                        showsHorizontalScrollIndicator={false}
                                    >
                                        {attachments.map((attachment, index) => (
                                            <View key={index} style={styles.attachmentChip}>
                                                <Text style={styles.attachmentChipText} numberOfLines={1}>
                                                    {attachment.name}
                                                </Text>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setAttachments(attachments.filter((_, i) => i !== index));
                                                    }}
                                                >
                                                    <Ionicons name="close-circle" size={20} color={theme.text} />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </ScrollView>
                                )}

                                <View style={styles.inputRow}>
                                    <TouchableOpacity
                                        style={styles.attachButton}
                                        onPress={pickDocument}
                                        disabled={loading}
                                    >
                                        <Ionicons
                                            name="attach"
                                            size={24}
                                            color={loading ? theme.border : theme.text}
                                        />
                                    </TouchableOpacity>

                                    <TextInput
                                        style={[
                                            styles.input,
                                            {
                                                color: theme.text,
                                                backgroundColor: theme.secondary,
                                                opacity: loading ? 0.5 : 1,
                                            },
                                        ]}
                                        value={query}
                                        onChangeText={setQuery}
                                        placeholder="Ask Gemini anything..."
                                        placeholderTextColor={isDark ? '#808080' : '#666666'}
                                        multiline
                                        editable={!loading}
                                    />

                                    <TouchableOpacity
                                        style={[
                                            styles.sendButton,
                                            {
                                                backgroundColor: theme.primary,
                                                opacity: loading || (!query.trim() && !attachments.length) ? 0.5 : 1,
                                            },
                                        ]}
                                        onPress={handleSend}
                                        disabled={loading || (!query.trim() && !attachments.length)}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="#ffffff" size="small" />
                                        ) : (
                                            <Ionicons name="send" size={24} color="#ffffff" />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Animated.View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>
        </>
    );
};

// Helper function to get position styles
const getPositionStyle = (position: string) => {
    switch (position) {
        case 'bottom-right':
            return { bottom: 20, right: 20 };
        case 'bottom-left':
            return { bottom: 20, left: 20 };
        case 'top-right':
            return { top: 20, right: 20 };
        case 'top-left':
            return { top: 20, left: 20 };
        default:
            return { bottom: 20, right: 20 };
    }
};

const styles = StyleSheet.create({
    chatButtonContainer: {
        position: 'absolute',
        zIndex: 1000,
    },
    chatButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    buttonIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    keyboardView: {
        flex: 1,
    },
    modalContent: {
        flex: 1,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
    },
    headerRight: {
        width: 40,
    },
    messageContainer: {
        flex: 1,
        padding: 15,
    },
    messageWrapper: {
        marginBottom: 20,
    },
    questionBubble: {
        maxWidth: '85%',
        alignSelf: 'flex-end',
        padding: 12,
        borderRadius: 15,
        borderTopRightRadius: 4,
    },
    questionText: {
        color: '#ffffff',
        fontSize: 16,
    },
    answerBubble: {
        maxWidth: '85%',
        alignSelf: 'flex-start',
        padding: 12,
        borderRadius: 15,
        borderTopLeftRadius: 4,
        marginTop: 8,
    },
    answerText: {
        fontSize: 16,
    },
    inputContainer: {
        padding: 10,
        borderTopWidth: 1,
    },
    attachmentContainer: {
        flexDirection: 'row',
        paddingVertical: 10,
    },
    attachmentChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(66, 133, 244, 0.1)',
        padding: 8,
        borderRadius: 16,
        marginRight: 8,
    },
    attachmentChipText: {
        marginRight: 8,
        fontSize: 14,
        maxWidth: 120,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    attachButton: {
        padding: 10,
    },
    input: {
        flex: 1,
        marginHorizontal: 10,
        maxHeight: 100,
        minHeight: 40,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 16,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    attachmentPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 6,
        borderRadius: 8,
        marginTop: 8,
    },
    attachmentText: {
        color: '#ffffff',
        marginLeft: 6,
        fontSize: 14,
    },
});