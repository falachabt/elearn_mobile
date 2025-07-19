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

interface NewsCardConcoursBlanc1Props {
    onPress?: () => void;
}

const NewsCardConcoursBlanc1: React.FC<NewsCardConcoursBlanc1Props> = ({ onPress }) => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const router = useRouter();

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else {
            // Navigate to the Concours Blanc registration screen
            router.push('/concours-blanc-register');
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
                colors={['#2563EB', '#1D4ED8']} // Blue gradient for academic feel
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientContainer}
            >
                {/* Header with icon */}
                <View style={styles.headerSection}>
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons 
                            name="school" 
                            size={28} 
                            color="#FFFFFF" 
                        />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.title}>Concours Blanc 1</Text>
                        <Text style={styles.subtitle}>🎯 Préparez-vous maintenant</Text>
                    </View>
                </View>

                {/* Main message */}
                <View style={styles.messageSection}>
                    <Text style={styles.mainMessage}>
                        Inscris-toi maintenant pour participer au Concours Blanc 1 !
                    </Text>
                    <Text style={styles.description}>
                        Testez vos connaissances et identifiez vos points d'amélioration avant l'examen officiel.
                    </Text>
                </View>

                {/* Call-to-action button */}
                <View style={styles.ctaSection}>
                    <View style={styles.ctaButton}>
                        <Text style={styles.ctaText}>S'inscrire maintenant</Text>
                        <MaterialCommunityIcons 
                            name="arrow-right" 
                            size={16} 
                            color="#2563EB" 
                        />
                    </View>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 160,
        borderRadius: theme.border.radius.small,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    containerDark: {
        shadowColor: '#1E3A8A',
    },
    gradientContainer: {
        flex: 1,
        padding: 16,
        justifyContent: 'space-between',
    },
    headerSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 2,
    },
    subtitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#FFFFFF',
        opacity: 0.9,
    },
    messageSection: {
        flex: 1,
        justifyContent: 'center',
    },
    mainMessage: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 6,
        lineHeight: 22,
    },
    description: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 13,
        color: '#FFFFFF',
        opacity: 0.85,
        lineHeight: 18,
    },
    ctaSection: {
        alignItems: 'flex-start',
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: theme.border.radius.small,
    },
    ctaText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '600',
        color: '#2563EB',
        marginRight: 8,
    },
});

export default NewsCardConcoursBlanc1;