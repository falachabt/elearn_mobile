import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    useColorScheme
} from 'react-native';
import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface NewsCardExamProps {
    onPress?: () => void;
}

const NewsCardExam: React.FC<NewsCardExamProps> = ({ onPress }) => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const router = useRouter();

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else {
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                isDarkMode && styles.containerDark
            ]}
            onPress={handlePress}
            activeOpacity={0.9}
        >
            <LinearGradient
                colors={['#3F51B5', '#303F9F', '#1A237E']} // Beautiful blue gradient for exam
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientContainer}
            >
           
                {/* Message Section */}
                <View style={styles.messageSection}>
                    <Text style={styles.mainMessage}>🍀 Bonne chance !</Text>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 160,
        borderRadius: 0,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#3F51B5',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        marginVertical: 8,
    },
    containerDark: {
        shadowColor: '#1A237E',
    },
    gradientContainer: {
        flex: 1,
        padding: 16,
        justifyContent: 'space-between',
    },

    // Header Section
    headerSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    leftHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerTextContainer: {
        flex: 1,
    },
    title: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    statusBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    statusText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },

    // Message Section
    messageSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainMessage: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
        textAlign: 'center',
    },
    subMessage: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#FFFFFF',
        opacity: 0.9,
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default NewsCardExam;