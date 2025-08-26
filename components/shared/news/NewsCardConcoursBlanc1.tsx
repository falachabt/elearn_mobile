import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    useColorScheme
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';

interface NewsCardConcoursBlanc1Props {
    onPress?: () => void;
}

const NewsCardConcoursBlanc1: React.FC<NewsCardConcoursBlanc1Props> = ({ onPress }) => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const router = useRouter();

    // Set the target date to Sunday, July 28th
    const targetDate = new Date(2025, 7, 3, 12, 0, 0); // 3 August 2025, 14:00:00
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
    });

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = targetDate.getTime() - new Date().getTime();

            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                });
            } else {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(timer);
    }, []);

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
                colors={['#4CAF50', '#2E7D32', '#1B5E20']} // Beautiful green gradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientContainer}
            >
                {/* Header Section */}
                <View style={styles.headerSection}>
                    <View style={styles.leftHeader}>

                        <View style={styles.headerTextContainer}>
                            <Text style={styles.title}>Concours Blanc 2</Text>
                            <Text style={styles.date}>📅 03 Aout 2025</Text>
                        </View>
                    </View>
                </View>

                {/* Countdown Section */}
                <View style={styles.countdownSection}>
                    <View style={styles.timerContainer}>
                        <View style={styles.timerItem}>
                            <View style={styles.timerBox}>
                                <Text style={styles.timerValue}>{timeLeft.days.toString().padStart(2, '0')}</Text>
                            </View>
                            <Text style={styles.timerLabel}>jours</Text>
                        </View>

                        <View style={styles.timerItem}>
                            <View style={styles.timerBox}>
                                <Text style={styles.timerValue}>{timeLeft.hours.toString().padStart(2, '0')}</Text>
                            </View>
                            <Text style={styles.timerLabel}>heures</Text>
                        </View>

                        <View style={styles.timerItem}>
                            <View style={styles.timerBox}>
                                <Text style={styles.timerValue}>{timeLeft.minutes.toString().padStart(2, '0')}</Text>
                            </View>
                            <Text style={styles.timerLabel}>min</Text>
                        </View>

                        <View style={styles.timerItem}>
                            <View style={styles.timerBox}>
                                <Text style={styles.timerValue}>{timeLeft.seconds.toString().padStart(2, '0')}</Text>
                            </View>
                            <Text style={styles.timerLabel}>sec</Text>
                        </View>
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
        borderRadius: 0,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        marginVertical: 8,
    },
    containerDark: {
        shadowColor: '#2E7D32',
    },
    gradientContainer: {
        flex: 1,
        justifyContent: 'space-between',
    },

    // Header Section
    headerSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.2)',
        backgroundColor: 'rgba(255, 255, 255, 0.09)',
        marginBottom: 12,
        paddingHorizontal: 16,
        paddingVertical: 6,
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
        marginBottom: 2,
    },
    date: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 13,
        color: '#FFFFFF',
        opacity: 0.9,
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

    // Countdown Section
    countdownSection: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    countdownLabel: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        color: '#FFFFFF',
        opacity: 0.9,
        marginBottom: 8,
        textAlign: 'center',
    },
    timerContainer: {
        flexDirection: 'row',
        gap : 0,
        width: '90%',
        paddingHorizontal: 8,
    },
    timerItem: {
        alignItems: 'center',
        flex: 1,
    },
    timerBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        minWidth: 45,
        height: 45,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    timerValue: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    timerLabel: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 10,
        color: '#FFFFFF',
        opacity: 0.8,
        textAlign: 'center',
    },
});

export default NewsCardConcoursBlanc1;
