import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, useColorScheme, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import LottieView from 'lottie-react-native';
import * as Animatable from 'react-native-animatable';

export default function PaymentCallback() {
    const router = useRouter();
    const isDark = useColorScheme() === 'dark';

    const [showSuccess, setShowSuccess] = useState(false);
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
            // Après 3 secondes, montrer l'animation de succès
            setShowSuccess(true);

            // Puis après 2 secondes supplémentaires, rediriger vers l'app
            const timer2 = setTimeout(() => {
                router.replace('/(app)');
            }, 1000);

            return () => clearTimeout(timer2);
        }, 1000);

        return () => clearTimeout(timer1);
    }, [router]);

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            {!showSuccess ? (
                <Animatable.View
                    animation="fadeIn"
                    style={styles.loadingContainer}
                >
                    <ActivityIndicator
                        size="large"
                        color={isDark ? theme.color.primary[400] : theme.color.primary[500]}
                    />
                    <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
                        {`Finalisation de la transaction${dots}`}
                    </Text>
                    <Text style={[styles.subText, isDark && styles.subTextDark]}>
                        Merci de patienter quelques instants
                    </Text>
                </Animatable.View>
            ) : (
                <Animatable.View
                    animation="fadeIn"
                    style={styles.successContainer}
                >
                    <LottieView
                        source={require('@/assets/animations/payment-success.json')}
                        autoPlay
                        loop={false}
                        style={styles.lottieAnimation}
                    />
                    <Text style={[styles.successText, isDark && styles.successTextDark]}>
                        Paiement confirmé !
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
fontSize: theme.typography.fontSize.large,
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
    successContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.large,
    },
    lottieAnimation: {
        width: 200,
        height: 200,
    },
    successText: {
        fontFamily : theme.typography.fontFamily,
fontSize: theme.typography.fontSize.large,
        fontWeight: '600',
        color: theme.color.primary[500],
        marginTop: theme.spacing.medium,
        textAlign: 'center',
    },
    successTextDark: {
        color: theme.color.primary[400],
    },
});