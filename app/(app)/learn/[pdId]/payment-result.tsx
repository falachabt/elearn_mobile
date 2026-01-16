import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import WhatsAppContact from '@/components/WhatsappSupport';
import { useUser } from '@/contexts/useUserInfo';
import { ProgramPaymentService } from '@/services/program-payment.service';

type ResultType = 'success' | 'failed' | 'canceled';

const PaymentResultPage = () => {
    const params = useLocalSearchParams();
    const router = useRouter();
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const { mutateUserPrograms, mutateProgramAccessMap, isLearningPathEnrolled } = useUser();
    const [isActivatingAccess, setIsActivatingAccess] = useState(false);
    const [activationMessage, setActivationMessage] = useState('Activation de vos accès en cours...');

    const result = params.result as ResultType;
    const programName = params.programName as string;
    const programId = params.programId as string;
    const pdId = params.pdId as string;
    const paymentId = params.paymentId as string;
    const isInstallment = params.isInstallment === 'true';
    const hasMoreInstallments = params.hasMoreInstallments === 'true';
    const errorMessage = params.errorMessage as string | undefined;

    // Mutate data on mount if success and mark as seen
    useEffect(() => {
        const handleMount = async () => {
            if (paymentId) {
                await ProgramPaymentService.markAsSeen(paymentId);
            }
            
            if (result === 'success') {
                console.log('[PaymentResult] Mutating user data after success');
                // Force immediate revalidation
                await Promise.all([
                    mutateUserPrograms(),
                    mutateProgramAccessMap()
                ]);
                console.log('[PaymentResult] Mutations completed');
            }
        };

        handleMount();
    }, [result, paymentId, mutateUserPrograms, mutateProgramAccessMap]);

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

    const handleViewDetails = async () => {
        if (result === 'success') {
            setIsActivatingAccess(true);
            console.log('[PaymentResult] Starting access activation check...');
            
            // Vérification active de l'accès avec boucle de polling
            let attempts = 0;
            const maxAttempts = 20; // 20 tentatives max (10 secondes)
            
            while (attempts < maxAttempts) {
                attempts++;
                console.log(`[PaymentResult] Verification attempt ${attempts}/${maxAttempts}`);
                
                // Mise à jour du message de progression
                if (attempts <= 3) {
                    setActivationMessage('Activation de vos accès en cours...');
                } else if (attempts <= 8) {
                    setActivationMessage('Vérification de votre inscription...');
                } else if (attempts <= 15) {
                    setActivationMessage('Finalisation, encore quelques secondes...');
                } else {
                    setActivationMessage('Dernière vérification...');
                }
                
                // Force revalidation
                await Promise.all([
                    mutateUserPrograms(),
                    mutateProgramAccessMap()
                ]);
                
                // Vérifie si l'utilisateur est bien inscrit
                const enrolled = isLearningPathEnrolled(pdId);
                console.log(`[PaymentResult] Enrollment check: ${enrolled}`);
                
                if (enrolled) {
                    console.log('[PaymentResult] Access confirmed! Redirecting...');
                    setActivationMessage('Accès confirmé ! Redirection...');
                    await new Promise(resolve => setTimeout(resolve, 500));
                    break;
                }
                
                // Attendre 500ms avant la prochaine tentative
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            setIsActivatingAccess(false);
            console.log('[PaymentResult] Access activation complete, navigating to program');
        }
        
        // Navigate to program details
        console.log('[PaymentResult] Navigating to program:', pdId);
        router.replace(`/(app)/learn/${pdId}`);
    };

    const handleRetry = () => {
        // Go back to payment page
        router.replace(`/(app)/learn/${pdId}/payment`);
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
                            name={config.icon as keyof typeof MaterialCommunityIcons.glyphMap}
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
                                style={[
                                    styles.primaryButton, 
                                    { backgroundColor: '#4CAF50' },
                                    isActivatingAccess && styles.buttonDisabled
                                ]}
                                onPress={handleViewDetails}
                                disabled={isActivatingAccess}
                            >
                                {isActivatingAccess ? (
                                    <>
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                        <Text style={styles.primaryButtonText}>Activation en cours...</Text>
                                    </>
                                ) : (
                                    <>
                                        <MaterialCommunityIcons name="eye" size={20} color="#FFFFFF" />
                                        <Text style={styles.primaryButtonText}>Voir le programme</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            {isActivatingAccess && (
                                <View style={[styles.activationStatusCard, isDark && styles.activationStatusCardDark]}>
                                    <MaterialCommunityIcons
                                        name="clock-outline"
                                        size={20}
                                        color={isDark ? '#60A5FA' : '#2196F3'}
                                    />
                                    <ThemedText style={styles.activationStatusText}>
                                        {activationMessage}
                                    </ThemedText>
                                </View>
                            )}

                            {isInstallment && hasMoreInstallments && !isActivatingAccess && (
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
    buttonDisabled: {
        opacity: 0.7,
    },
    activationStatusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E0F2FE',
        padding: 16,
        borderRadius: 12,
        gap: 12,
        marginTop: 8,
    },
    activationStatusCardDark: {
        backgroundColor: '#1E3A5F',
    },
    activationStatusText: {
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
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