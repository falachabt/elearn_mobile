import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import WhatsAppContact from '@/components/WhatsappSupport';

type ResultType = 'success' | 'failed' | 'canceled';

const PaymentResultPage = () => {
    const params = useLocalSearchParams();
    const router = useRouter();
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';

    const result = params.result as ResultType;
    const programName = params.programName as string;
    const programId = params.programId as string;
    const pdId = params.pdId as string;
    const isInstallment = params.isInstallment === 'true';
    const hasMoreInstallments = params.hasMoreInstallments === 'true';
    const errorMessage = params.errorMessage as string | undefined;

    const getResultConfig = () => {
        switch (result) {
            case 'success':
                return {
                    title: 'Paiement réussi !',
                    message: isInstallment && hasMoreInstallments
                        ? 'Votre versement a été effectué avec succès. N\'oubliez pas de payer les prochaines échéances.'
                        : 'Votre paiement a été effectué avec succès. Vous pouvez maintenant accéder au programme.',
                    icon: 'check-circle',
                    iconColor: '#4CAF50',
                    lottieSource: require('@/assets/animations/payment-success.json'),
                };
            case 'failed':
                return {
                    title: 'Paiement échoué',
                    message: errorMessage || 'Le paiement a échoué. Veuillez réessayer.',
                    icon: 'close-circle',
                    iconColor: '#EF4444',
                    lottieSource: require('@/assets/animations/payment-failed.json'),
                };
            case 'canceled':
                return {
                    title: 'Paiement annulé',
                    message: 'Vous avez annulé le paiement. Vous pouvez réessayer quand vous le souhaitez.',
                    icon: 'cancel',
                    iconColor: '#F59E0B',
                    lottieSource: require('@/assets/animations/payment-canceled.json'),
                };
            default:
                return {
                    title: 'Statut inconnu',
                    message: 'Un problème est survenu.',
                    icon: 'help-circle',
                    iconColor: '#6B7280',
                    lottieSource: null,
                };
        }
    };

    const config = getResultConfig();

    const handleBackToProgram = () => {
        router.back();
    };

    const handleViewDetails = () => {
        // Navigate to program details or payment history
        router.push(`/learn/${pdId}` as any);
    };

    const handleRetry = () => {
        // Go back to payment page
        router.replace(`/learn/${pdId}/payment` as any);
    };

    return (
        <ThemedView style={styles.container}>
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Animation/Icon */}
                <View style={styles.iconContainer}>
                    {config.lottieSource ? (
                        <LottieView
                            source={config.lottieSource}
                            autoPlay
                            loop={false}
                            style={styles.lottie}
                            resizeMode="contain"
                            speed={1}
                        />
                    ) : (
                        <MaterialCommunityIcons
                            name={config.icon as any}
                            size={120}
                            color={config.iconColor}
                        />
                    )}
                </View>

                {/* Title */}
                <ThemedText style={styles.title}>{config.title}</ThemedText>

                {/* Message */}
                <ThemedText style={styles.message}>{config.message}</ThemedText>

                {/* Program Name */}
                <View style={[styles.programCard, isDark && styles.programCardDark]}>
                    <MaterialCommunityIcons
                        name="book-open-variant"
                        size={24}
                        color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                    <ThemedText style={styles.programName}>{programName}</ThemedText>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                    {result === 'success' ? (
                        <>
                            <TouchableOpacity
                                style={[styles.primaryButton, { backgroundColor: '#4CAF50' }]}
                                onPress={handleViewDetails}
                            >
                                <MaterialCommunityIcons name="eye" size={20} color="#FFFFFF" />
                                <Text style={styles.primaryButtonText}>Voir le programme</Text>
                            </TouchableOpacity>

                            {isInstallment && hasMoreInstallments && (
                                <TouchableOpacity
                                    style={[styles.secondaryButton, isDark && styles.secondaryButtonDark]}
                                    onPress={handleBackToProgram}
                                >
                                    <MaterialCommunityIcons 
                                        name="information" 
                                        size={20} 
                                        color={isDark ? '#9CA3AF' : '#6B7280'} 
                                    />
                                    <ThemedText style={styles.secondaryButtonText}>
                                        Voir les échéances
                                    </ThemedText>
                                </TouchableOpacity>
                            )}
                        </>
                    ) : (
                        <>
                            <TouchableOpacity
                                style={[styles.primaryButton, { backgroundColor: isDark ? '#6EE7B7' : '#4CAF50' }]}
                                onPress={handleRetry}
                            >
                                <MaterialCommunityIcons name="refresh" size={20} color="#FFFFFF" />
                                <Text style={styles.primaryButtonText}>Réessayer</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.secondaryButton, isDark && styles.secondaryButtonDark]}
                                onPress={handleBackToProgram}
                            >
                                <MaterialCommunityIcons 
                                    name="arrow-left" 
                                    size={20} 
                                    color={isDark ? '#9CA3AF' : '#6B7280'} 
                                />
                                <ThemedText style={styles.secondaryButtonText}>Retour</ThemedText>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* WhatsApp Support */}
                <WhatsAppContact 
                    message={`Bonjour, j'ai besoin d'aide concernant mon paiement pour ${programName}`}
                    style={{ marginTop: 16, marginHorizontal: 0 }}
                />

                {/* Help Section - Keep for failed payments */}
                {result === 'failed' && (
                    <View style={[styles.helpSection, isDark && styles.helpSectionDark]}>
                        <MaterialCommunityIcons
                            name="alert-circle"
                            size={20}
                            color={isDark ? '#F87171' : '#EF4444'}
                        />
                        <ThemedText style={styles.helpText}>
                            Si le problème persiste, contactez-nous via WhatsApp ci-dessus.
                        </ThemedText>
                    </View>
                )}
            </ScrollView>
        </ThemedView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        marginBottom: 24,
        alignItems: 'center',
        justifyContent: 'center',
        width: 200,
        height: 200,
        overflow: 'hidden',
    },
    lottie: {
        width: 200,
        height: 200,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 16,
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        color: '#6B7280',
        marginBottom: 32,
        paddingHorizontal: 16,
        lineHeight: 24,
    },
    programCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        padding: 16,
        borderRadius: 12,
        marginBottom: 32,
        width: '100%',
    },
    programCardDark: {
        backgroundColor: '#374151',
    },
    programName: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 12,
        flex: 1,
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 8,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        gap: 8,
    },
    secondaryButtonDark: {
        backgroundColor: '#374151',
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    helpSection: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        padding: 16,
        borderRadius: 12,
        marginTop: 24,
        gap: 12,
    },
    helpSectionDark: {
        backgroundColor: '#78350F',
    },
    helpText: {
        fontSize: 14,
        flex: 1,
    },
});

export default PaymentResultPage;