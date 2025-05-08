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
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { ThemedText } from '@/components/ThemedText';
import { HapticType, useHaptics } from '@/hooks/useHaptics';
import run from '@/config/gemini'; // Adjust the import path as necessary

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatBoxProps {
  visible: boolean;
  onClose: () => void;
  isDark?: boolean;
  coursesData?: any[]; // This would contain course information to provide context to the AI
  programTitle?: string;
  customContext?: string; // Added the missing prop declaration
}

const ChatBox: React.FC<ChatBoxProps> = ({
  visible,
  onClose,
  isDark = false,
  coursesData = [],
  programTitle = '',
  customContext = '', // Added default value
}) => {
    const [messages, setMessages] = useState<Message[]>([
        {
          id: '0',
          text: customContext ? 
            `Bonjour ! Je suis votre assistant pour les exercices du programme "${programTitle}". Comment puis-je vous aider avec ces exercices ?` :
            `Bonjour ! Je suis votre assistant pour le programme "${programTitle}". Comment puis-je vous aider aujourd'hui ?`,
          isUser: false,
          timestamp: new Date(),
        },
      ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { trigger } = useHaptics();
  const scrollViewRef = useRef<ScrollView>(null);

  // Prepare context information about courses for the AI
  const prepareCourseContext = () => {
    if (customContext) {
        return customContext;
      }

    if (!coursesData || coursesData.length === 0) return '';
    
    return coursesData.map((course: any) => {
      const courseName = course?.course?.name || 'Cours sans titre';
      const courseGoals = course?.course?.goals || [];
      const courseContent = course?.course?.courses_content || [];
      const categoryName = course?.course?.category?.name || 'Sans catégorie';
      
      return `
Course: ${courseName}
Catégorie: ${categoryName}
Objectifs: ${courseGoals.join(', ')}
Contenu: ${courseContent.map((content: any) => content.name).join(', ')}
      `;
    }).join('\n\n');
  };

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
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    try {
      // Prepare context about the program and courses
      const contextInfo = `
Programme: ${programTitle}
${customContext ? 'Informations contextuelles:' : 'Informations sur les cours:'}
${prepareCourseContext()}
`;
      
      // Send message to Gemini with context
      const prompt = `
Tu es un assistant pédagogique spécialisé dans ce programme d'études. Utilise ces informations sur le programme et les cours pour aider l'étudiant:

${contextInfo}

Question de l'étudiant: ${inputText}

Réponds de manière concise, informative et utile. Si tu ne connais pas la réponse, ne fais pas de suppositions.
      `;
      
      const response = await run(prompt);
      
      // Create and add AI response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting response from Gemini:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer plus tard.",
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const headerTitleText = customContext
  ? "Assistant IA - Exercices"
  : "Assistant IA - Leçons";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.container, isDark && styles.containerDark]}>
          {/* Header */}
          <View style={[styles.header, isDark && styles.headerDark]}>
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
            <ThemedText style={styles.headerTitle}>
                {headerTitleText}
            </ThemedText>
            <View style={styles.headerRight} />
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  message.isUser
                    ? styles.userBubble
                    : [styles.aiBubble, isDark && styles.aiBubbleDark],
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.isUser
                      ? styles.userText
                      : [styles.aiText, isDark && styles.aiTextDark],
                  ]}
                >
                  {message.text}
                </Text>
              </View>
            ))}
            {isLoading && (
              <View style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}>
                <ActivityIndicator size="small" color={theme.color.primary[500]} />
                <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
                  En train de répondre...
                </Text>
              </View>
            )}
          </ScrollView>

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
        </View>
      </KeyboardAvoidingView>
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
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 32,
  },
  messagesContainer: {
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
    maxWidth: '80%',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.color.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
});

export default ChatBox;