import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    useColorScheme
} from 'react-native';
import { useRouter } from 'expo-router';

import { theme } from '@/constants/theme';

interface GenerousWeekCardProps {
    endDate: Date;
}

const GenerousWeekCard: React.FC<GenerousWeekCardProps> = ({ endDate }) => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const router = useRouter();
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
    });

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = endDate.getTime() - new Date().getTime();

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
    }, [endDate]);

    const handlePress = () => {
        router.push('/(app)/learn');
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
            {/* Header - Bande avec prix */}
            <View style={styles.headerBand}>
                <Text style={styles.priceText}>7900 FCFA la formation</Text>
            </View>

            {/* Main Content - Timer */}
            <View style={styles.mainContent}>
                <Text style={styles.countdownLabel}>Fin de l'offre dans :</Text>

                <View style={styles.timerContainer}>
                    <View style={styles.timerItem}>
                        <View style={styles.timerBox}>
                            <Text style={styles.timerValue}>{timeLeft.days.toString().padStart(2, '0')}</Text>
                        </View>
                        <Text style={styles.timerLabel}>jours</Text>
                    </View>
                    <Text style={styles.timerSeparator}>:</Text>

                    <View style={styles.timerItem}>
                        <View style={styles.timerBox}>
                            <Text style={styles.timerValue}>{timeLeft.hours.toString().padStart(2, '0')}</Text>
                        </View>
                        <Text style={styles.timerLabel}>heures</Text>
                    </View>
                    <Text style={styles.timerSeparator}>:</Text>

                    <View style={styles.timerItem}>
                        <View style={styles.timerBox}>
                            <Text style={styles.timerValue}>{timeLeft.minutes.toString().padStart(2, '0')}</Text>
                        </View>
                        <Text style={styles.timerLabel}>min</Text>
                    </View>
                    <Text style={styles.timerSeparator}>:</Text>

                    <View style={styles.timerItem}>
                        <View style={styles.timerBox}>
                            <Text style={styles.timerValue}>{timeLeft.seconds.toString().padStart(2, '0')}</Text>
                        </View>
                        <Text style={styles.timerLabel}>sec</Text>
                    </View>
                </View>
            </View>
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
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        backgroundColor: '#10B981',
    },
    containerDark: {
        shadowColor: '#064E3B',
        backgroundColor: '#059669',
    },
    headerBand: {
        backgroundColor: 'rgba(255, 255, 255, 0.09)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    priceText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    mainContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 20,
    },
    countdownLabel: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#FFFFFF',
        marginBottom: 20,
        opacity: 0.9,
        textAlign: 'center',
    },
    timerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timerItem: {
        alignItems: 'center',
    },
    timerBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        minWidth: 32,
        height: 32,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    timerValue: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        lineHeight : 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    timerLabel: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 11,

        color: '#FFFFFF',
        opacity: 0.8,
    },
    timerSeparator: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginHorizontal: 4,
        opacity: 0.7,
    },
});

export default GenerousWeekCard;