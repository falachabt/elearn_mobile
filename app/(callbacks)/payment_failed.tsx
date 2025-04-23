import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, useColorScheme, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import LottieView from 'lottie-react-native';
import * as Animatable from 'react-native-animatable';

export default function PaymentFailedCallback() {
    const router = useRouter();
    const isDark = useColorScheme() === 'dark';

    const [showFailed, setShowFailed] = useState(false);
    const [dots, setDots] = useState('.');

    // Effet pour animer les points de chargement
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length < 3 ? prev + '.' : '.');
        }, 500);

        return () => clearInterval(interval);
    }, []);

    // Effet principal pour simuler le délai et rediriger
    useEffect(() => {
        const timer1 = setTimeout(() => {
            // Après 1 seconde, montrer l'animation d'échec
            setShowFailed(true);

            // Puis après 1 seconde supplémentaire, rediriger vers le tableau de bord
            const timer2 = setTimeout(() => {
                router.back();
            }, 1000);

            return () => clearTimeout(timer2);
        }, 1000);

        return () => clearTimeout(timer1);
    }, [router]);

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            {!showFailed ? (
                <Animatable.View
                    animation="fadeIn"
                    style={styles.loadingContainer}
                >
                    <ActivityIndicator
                        size="large"
                        color={isDark ? theme.color.primary[400] : theme.color.primary[500]}
                    />
                    <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
                        {`Vérification du paiement${dots}`}
                    </Text>
                    <Text style={[styles.subText, isDark && styles.subTextDark]}>
                        Merci de patienter quelques instants
                    </Text>
                </Animatable.View>
            ) : (
                <Animatable.View
                    animation="fadeIn"
                    style={styles.failedContainer}
                >
                    <LottieView
                        source={require('@/assets/animations/payment-failed.json')}
                        autoPlay
                        loop={false}
                        style={styles.lottieAnimation}
                    />
                    <Text style={[styles.failedText, isDark && styles.failedTextDark]}>
                        Paiement non complété
                    </Text>
                    <Text style={[styles.failedSubText, isDark && styles.failedSubTextDark]}>
                        Votre paiement n'a pas pu être traité
                    </Text>
                </Animatable.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    containerDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.large,
    },
    loadingText: {
        fontFamily : theme.typography.fontFamily,
fontSize : theme.typography.fontSize.large,
        fontWeight: '500',
        color: theme.color.text,
        marginTop: theme.spacing.large,
        textAlign: 'center',
    },
    loadingTextDark: {
        color: theme.color.gray[50],
    },
    subText: {
        fontFamily : theme.typography.fontFamily,
fontSize: theme.typography.fontSize.medium,
        color: theme.color.gray[600],
        marginTop: theme.spacing.small,
        textAlign: 'center',
    },
    subTextDark: {
        color: theme.color.gray[400],
    },
    failedContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.large,
    },
    lottieAnimation: {
        width: 200,
        height: 200,
    },
    failedText: {
        fontFamily : theme.typography.fontFamily,
fontSize: theme.typography.fontSize.large,
        fontWeight: '600',
        color: theme.color.error,
        marginTop: theme.spacing.medium,
        textAlign: 'center',
    },
    failedTextDark: {
        color: theme.color.error,
    },
    failedSubText: {
        fontFamily : theme.typography.fontFamily,
fontSize: theme.typography.fontSize.medium,
        color: theme.color.gray[600],
        marginTop: theme.spacing.small,
        textAlign: 'center',
    },
    failedSubTextDark: {
        color: theme.color.gray[400],
    },
});