import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Image,
    Modal,
    Platform,
    KeyboardAvoidingView,
    useColorScheme,
    ActivityIndicator,
    Linking,
    Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useSupportStorage } from '@/hooks/useStorage';
import { useRoute } from '@react-navigation/native';
import {useTicketMessages} from "@/hooks/useSupportTicket";
import {useLocalSearchParams} from "expo-router";
import { Message } from '@/hooks/useSupportTicket';
// Types
interface ContactInfo {
    title: string;
    number: string;
    hours: string;
    description: string;
}




// Constants
const contactNumbers: ContactInfo[] = [
    {
        title: 'Support Technique',
        number: '+237 6 57 27 37 53',
        hours: 'Lun-Ven: 9h-18h',
        description: 'Pour toute assistance technique avec la plateforme'
    },
    {
        title: 'Support Commercial',
        number: '+237 6 51 05 56 63',
        hours: 'Lun-Ven: 9h-17h',
        description: 'Pour les questions concernant votre abonnement'
    }
];

// Main Component
const CustomerService: React.FC = () => {
    const { ticketId } = useLocalSearchParams()
    const { user } = useAuth();
    const {
        messages,
        ticket,
        loading: messagesLoading,
        error: messagesError,
        sendMessage,
        markMessagesAsRead
    } = useTicketMessages(String(ticketId));

    // State
    const [newMessage, setNewMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [showContactInfo, setShowContactInfo] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
    const [selectedImagePath, setSelectedImagePath] = useState<string | null>(null);

    // Refs
    const scrollViewRef = useRef<ScrollView>(null);

    // Hooks
    const { uploadFile } = useSupportStorage();
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    // Effects
    useEffect(() => {
        if (messages?.length > 0) {

            markMessagesAsRead();
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages]);

    // Handlers
    const handleSend = async () => {
        if ((!newMessage.trim() && !selectedImage) || isUploading) return;

        try {
            if (selectedImage) {
                await sendMessage(
                    newMessage.trim() || 'Image',
                    'image',
                    selectedImage,
                    selectedImagePath || undefined
                );
            } else {
                await sendMessage(newMessage.trim(), 'text');
            }

            setNewMessage('');
            setSelectedImage(null);
            setSelectedImagePath(null);
            scrollViewRef.current?.scrollToEnd({ animated: true });
        } catch (error) {
            console.error('Error sending message:', error);
            Alert.alert('Error', 'Failed to send message. Please try again.');
        }
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setIsUploading(true);
                try {
                    const upload_result = await uploadFile(
                        result.assets[0].uri,
                        result.assets[0].mimeType
                    );
                    if (upload_result?.url) {
                        setSelectedImage(upload_result.url);
                        setSelectedImagePath(upload_result.filePath);
                    }
                } catch (error) {
                    console.error('Error uploading image:', error);
                    Alert.alert(
                        'Upload Error',
                        'Failed to upload image. Please try again.'
                    );
                }
            }
        } catch (error) {
            console.error('Image picker error:', error);
            Alert.alert('Error', 'Failed to pick image. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleCall = (number: string) => {
        Linking.openURL(`tel:${number}`);
    };


    // Sub-components
    const MessageBubble: React.FC<{ message: Message; isUserMessage: boolean; isDarkMode: boolean }> =
        ({ message, isUserMessage, isDarkMode }) => (
            <View style={[
                styles.messageBubble,
                isUserMessage ? styles.userBubble : styles.supportBubble,
                isDarkMode && (isUserMessage ? styles.userBubbleDark : styles.supportBubbleDark)
            ]}>

                {message.image_url && (
                    <TouchableOpacity onPress={() => {
                        setSelectedImage(message.image_url || null);
                        setImagePreviewVisible(true);
                    }}>
                        <Image
                            source={{ uri: message.image_url }}
                            style={styles.messageImage}
                            resizeMode="cover"
                        />
                    </TouchableOpacity>
                )}
                {message.content && (
                    <Text style={[
                        styles.messageText,
                        isUserMessage ? styles.userText : styles.supportText,
                        isDarkMode && (isUserMessage ? styles.userTextDark : styles.supportTextDark)
                    ]}>
                        {message.content}
                    </Text>
                )}
                <Text style={[styles.timestamp, isDarkMode && styles.timestampDark, { minWidth: 70 }]}>
                    {new Date(message.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                    {isUserMessage && (
                        <MaterialIcons
                            name={message.read_at ? 'done-all' : 'done'}
                            size={16}
                            color={message.read_at ? '#34D399' : '#9CA3AF'}
                        />
                    )}
                </Text>
            </View>
        );


    // Loading and Error States
    if (messagesLoading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={theme.color.primary[500]} />
            </View>
        );
    }

    if (messagesError) {
        return (
            <View style={[styles.container, styles.errorContainer]}>
                <Text style={styles.errorText}>
                    Error loading messages. Please try again.
                </Text>
            </View>
        );
    }

    // Render
    return (
        <KeyboardAvoidingView
            // behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            tabIndex={-1}
            style={[styles.container, isDarkMode && styles.containerDark]}
        >
            {/* Header */}
            <View style={[styles.header, isDarkMode && styles.headerDark]}>
                <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>
                    Service Client
                    <Text
                        style={[{fontWeight: 'bold'}, ticket?.status === 'closed' && {color: 'red'}, ticket?.status === 'resolved' && {color: 'green'}]}>
                        {"  " + ticket?.status}
                    </Text>
                </Text>
                <TouchableOpacity
                    style={[styles.phoneButton, isDarkMode && styles.phoneButtonDark]}
                    onPress={() => setShowContactInfo(true)}
                >
                    <MaterialIcons
                        name="phone"
                        size={24}
                        color={isDarkMode ? theme.color.dark.text.primary : theme.color.light.text.primary}
                    />
                </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
                {messages.map(message => (
                    <MessageBubble
                        key={message.id}
                        message={message}
                        isUserMessage={message.sender_id === user?.id}
                        isDarkMode={isDarkMode}
                    />
                ))}
            </ScrollView>

            {/* Input Area */}
            <View style={[styles.inputContainer, isDarkMode && styles.inputContainerDark]}>
                {selectedImage && (
                    <View style={styles.imagePreviewContainer}>
                        <Image
                            source={{ uri: selectedImage }}
                            style={styles.imagePreview}
                        />
                        <TouchableOpacity
                            style={styles.removeImageButton}
                            onPress={() => {
                                setSelectedImage(null);
                                setSelectedImagePath(null);
                            }}
                        >
                            <MaterialIcons name="close" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                )}
                <View style={styles.inputRow}>
                    <TouchableOpacity
                        style={[styles.attachButton, isDarkMode && styles.attachButtonDark]}
                        onPress={pickImage}
                        disabled={isUploading || ["closed", "resolved"].includes(String(ticket?.status))}

                    >
                        {isUploading ? (
                            <ActivityIndicator size="small" color={theme.color.primary[500]} />
                        ) : (
                            <MaterialIcons
                                name="attach-file"
                                size={24}
                                color={isDarkMode ? '#E5E7EB' : '#4B5563'}
                            />
                        )}
                    </TouchableOpacity>
                    <TextInput
                        style={[styles.input, isDarkMode && styles.inputDark]}
                        value={newMessage}
                        editable={!["closed", "resolved"].includes(String(ticket?.status))}
                        onChangeText={setNewMessage}
                        placeholder="Écrivez votre message..."
                        placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                        multiline
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            (!newMessage.trim() && !selectedImage || ["closed", "resolved"].includes(String(ticket?.status)) ) && styles.sendButtonDisabled
                        ]}
                        onPress={handleSend}
                        disabled={(!newMessage.trim() && !selectedImage || ["closed", "resolved"].includes(String(ticket?.status))) || isUploading}
                    >
                        <MaterialIcons name="send" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Contact Info Modal */}
            <Modal
                visible={showContactInfo}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowContactInfo(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, isDarkMode && styles.modalTitleDark]}>
                                Écrivez-nous sur WhatsApp
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowContactInfo(false)}
                                style={styles.closeButton}
                            >
                                <MaterialIcons
                                    name="close"
                                    size={24}
                                    color={isDarkMode ? '#E5E7EB' : '#4B5563'}
                                />
                            </TouchableOpacity>
                        </View>

                        {contactNumbers.map((contact, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.contactCard,
                                    isDarkMode && styles.contactCardDark,
                                    index < contactNumbers.length - 1 && styles.contactCardBorder
                                ]}
                            >
                                <View style={styles.contactInfo}>
                                    <Text style={[styles.contactTitle, isDarkMode && styles.contactTitleDark]}>
                                        {contact.title}
                                    </Text>
                                    <Text style={[styles.contactHours, isDarkMode && styles.contactHoursDark]}>
                                        {contact.hours}
                                    </Text>
                                    <Text
                                        style={[styles.contactDescription, isDarkMode && styles.contactDescriptionDark]}>
                                        {contact.description}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.callButton, {backgroundColor: '#25D366'}]}
                                    onPress={() => Linking.openURL(`whatsapp://send?phone=${contact.number.replace(/\s+/g, '')}`)}
                                >
                                    <MaterialIcons name="chat" size={20} color="#FFFFFF"/>
                                    <Text style={styles.callButtonText}>WhatsApp</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </View>
            
            
            </Modal>

            {/* Image Preview Modal */}
            <Modal
                visible={imagePreviewVisible}
                transparent={true}
                onRequestClose={() => setImagePreviewVisible(false)}
            >
                <View style={styles.imagePreviewModal}>
                    <TouchableOpacity
                        style={styles.closePreviewButton}
                        onPress={() => setImagePreviewVisible(false)}
                    >
                        <MaterialIcons name="close" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    {selectedImage && (
                        <Image
                            source={{ uri: selectedImage }}
                            style={styles.fullScreenImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
};
export default CustomerService;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
      marginBottom: 30,
    },
    containerDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    headerDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderBottomColor: theme.color.dark.border,
    },
    headerTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
    },
    headerTitleDark: {
        color: '#E5E7EB',
    },
    phoneButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
    },
    phoneButtonDark: {
        backgroundColor: theme.color.dark.background.tertiary,
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        padding: 16,
        gap: 8,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: theme.color.primary[500],
        borderTopRightRadius: 4,
    },
    supportBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 4,
    },
    userBubbleDark: {
        backgroundColor: theme.color.primary[600],
    },
    supportBubbleDark: {
        backgroundColor: theme.color.dark.background.secondary,
    },
    messageText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        lineHeight: 24,
    },
    userText: {
        color: '#FFFFFF',
    },
    supportText: {
        color: '#1F2937',
    },
    userTextDark: {
        color: '#FFFFFF',
    },
    supportTextDark: {
        color: '#E5E7EB',
    },
    messageImage: {
        width: 200,
        height: 150,
        borderRadius: 8,
        marginBottom: 8,
    },
    timestamp: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontFamily : theme.typography.fontFamily,
fontSize: 12,
        color: '#9CA3AF',
    },
    timestampDark: {
        color: '#6B7280',
    },
    inputContainer: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        marginBottom: 30,
    },
    inputContainerDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderTopColor: theme.color.dark.border,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        paddingRight: 40,
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        color: '#1F2937',
    },
    inputDark: {
        backgroundColor: theme.color.dark.background.tertiary,
        color: '#E5E7EB',
    },
    attachButton: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    attachButtonDark: {
        backgroundColor: theme.color.dark.background.tertiary,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: theme.color.primary[500],
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    imagePreviewContainer: {
        marginBottom: 8,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    imagePreview: {
        width: 100,
        height: 100,
        borderRadius: 8,
    },
    removeImageButton: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 12,
        padding: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    modalContentDark: {
        backgroundColor: theme.color.dark.background.secondary,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
    },
    modalTitleDark: {
        color: '#E5E7EB',
    },
    closeButton: {
        padding: 4,
    },
    contactCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
    },
    contactCardDark: {
        borderBottomColor: theme.color.dark.border,
    },
    contactCardBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    contactInfo: {
        flex: 1,
        marginRight: 16,
    },
    contactTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    contactTitleDark: {
        color: '#E5E7EB',
    },
    contactHours: {
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        color: theme.color.primary[500],
        marginBottom: 4,
    },
    contactHoursDark: {
        color: theme.color.primary[400],
    },
    contactDescription: {
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        color: '#6B7280',
    },
    contactDescriptionDark: {
        color: '#9CA3AF',
    },
    callButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.color.primary[500],
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
    },
    callButtonText: {
        color: '#FFFFFF',
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        fontWeight: '500',
    },
    imagePreviewModal: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closePreviewButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 1,
        padding: 8,
    },
    fullScreenImage: {
        width: '100%',
        height: '80%',
    },
    errorText: {
        color: '#EF4444',
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
    },
});