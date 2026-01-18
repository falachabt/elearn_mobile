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
import { logger } from '@/utils/logger';
import { theme } from '@/constants/theme';
import { getStatusColor } from '@/constants/payment.constants';
import { ProgramPayment } from '@/types/payment.types';

type ResultType = 'success' | 'failed' | 'canceled';

const PaymentResultPage = () => {
    const params = useLocalSearchParams();
    const router = useRouter();
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const { mutateUserPrograms, mutateProgramAccessMap, isLearningPathEnrolled, getProgramAccessStatus } = useUser();
    const [isActivatingAccess, setIsActivatingAccess] = useState(false);
    const [activationMessage, setActivationMessage] = useState('Activation de vos accès en cours...');
    const [payment, setPayment] = useState<ProgramPayment | null>(null);
    const [isLoadingPayment, setIsLoadingPayment] = useState(true);

    const result = params.result as ResultType;
    const programName = params.programName as string;
    const pdId = params.pdId as string;
    const paymentReference = params.paymentReference as string;
    const errorMessage = params.errorMessage as string | undefined;

    // Fetch payment by reference on mount
    useEffect(() => {
        const loadPayment = async () => {
            if (!paymentReference) {
                setIsLoadingPayment(false);
                return;
            }

            try {
                const paymentData = await ProgramPaymentService.getPaymentByReference(paymentReference);
                setPayment(paymentData);
                
                if (paymentData?.id) {
                    await ProgramPaymentService.markAsSeen(paymentData.id);
                }
            } catch (error) {
                logger.error('Error loading payment:', error);
            } finally {
                setIsLoadingPayment(false);
            }
        };

        loadPayment();
    }, [paymentReference]);

    // Mutate data on mount if success
    useEffect(() => {
        if (result === 'success' && !isLoadingPayment) {
            mutateUserPrograms();
            mutateProgramAccessMap();
        }
    }, [result, isLoadingPayment, mutateUserPrograms, mutateProgramAccessMap]);

    const isInstallment = payment?.is_installment || false;
    const hasMoreInstallments = payment?.is_installment && 
        (payment?.current_installment || 1) < (payment?.total_installments || 1);

    const getResultConfig = () => {
        switch (result) {
            case 'success':
                return {
                    title: 'Paiement réussi !',
                    message: isInstallment && hasMoreInstallments
                        ? 'Votre versement a été effectué avec succès. N\'oubliez pas de payer les prochaines échéances.'
                        : 'Votre paiement a été effectué avec succès. Vous pouvez maintenant accéder au programme.',
                    icon: 'check-circle',
                    iconColor: getStatusColor('completed'),
                    lottieSource: require('@/assets/animations/payment-success.json'),
                };
            case 'failed':
                return {
                    title: 'Paiement échoué',
                    message: errorMessage || 'Le paiement a échoué. Veuillez réessayer.',
                    icon: 'close-circle',
                    iconColor: getStatusColor('failed'),
                    lottieSource: require('@/assets/animations/payment-failed.json'),
                };
            case 'canceled':
                return {
                    title: 'Paiement annulé',
                    message: 'Vous avez annulé le paiement. Vous pouvez réessayer quand vous le souhaitez.',
                    icon: 'cancel',
                    iconColor: getStatusColor('canceled'),
                    lottieSource: require('@/assets/animations/payment-canceled.json'),
                };
            default:
                return {
                    title: 'Statut inconnu',
                    message: 'Un problème est survenu.',
                    icon: 'help-circle',
                    iconColor: theme.color.gray[500],
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
            
            // Vérification active de l'accès avec boucle de polling
            let attempts = 0;
            const maxAttempts = 12; // 12 tentatives max (12 secondes avec 1s de délai)
            
            while (attempts < maxAttempts) {
                attempts++;
                
                // Mise à jour du message de progression
                if (attempts <= 2) {
                    setActivationMessage('Activation de vos accès en cours...');
                } else if (attempts <= 6) {
                    setActivationMessage('Vérification de votre inscription...');
                } else if (attempts <= 10) {
                    setActivationMessage('Finalisation, encore quelques secondes...');
                } else {
                    setActivationMessage('Dernière vérification...');
                }
                
                // Attendre un peu au début pour laisser le trigger DB s'exécuter
                if (attempts === 1) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
                
                // Force revalidation avec option pour bypasser le cache
                await Promise.all([
                    mutateUserPrograms(undefined, { revalidate: true }),
                    mutateProgramAccessMap(undefined, { revalidate: true })
                ]);
                
                // Petit délai pour laisser SWR mettre à jour les données
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Vérifie si l'utilisateur est bien inscrit ET a un accès valide
                const enrolled = isLearningPathEnrolled(pdId);
                const accessStatus = getProgramAccessStatus(pdId);
                
                logger.log(`[PaymentResult] Attempt ${attempts}/${maxAttempts} - Enrolled: ${enrolled}, HasAccess: ${accessStatus.hasAccess}`);
                
                // Succès si inscrit ET accès confirmé (pas expiré)
                if (enrolled && accessStatus.hasAccess) {
                    setActivationMessage('Accès confirmé ! Redirection...');
                    await new Promise(resolve => setTimeout(resolve, 500));
                    break;
                }
                
                // Attendre 2 secondes avant la prochaine tentative
                // Laisse plus de temps au trigger DB + propagation données
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            setIsActivatingAccess(false);
        }
        
        // Navigate to program details with flag to force revalidation
        router.replace(`/(app)/learn/${pdId}?fromPayment=success&timestamp=${Date.now()}`);
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
                        color={isDark ? theme.color.gray[400] : theme.color.light.text.tertiary}
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
                                    { backgroundColor: getStatusColor('completed') },
                                    isActivatingAccess && styles.buttonDisabled
                                ]}
                                onPress={handleViewDetails}
                                disabled={isActivatingAccess}
                            >
                                {isActivatingAccess ? (
                                    <>
                                        <ActivityIndicator color={theme.color.light.text.primary} size="small" />
                                        <Text style={styles.primaryButtonText}>Activation en cours...</Text>
                                    </>
                                ) : (
                                    <>
                                        <MaterialCommunityIcons name="eye" size={20} color={theme.color.light.text.primary} />
                                        <Text style={styles.primaryButtonText}>Voir le programme</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            {isActivatingAccess && (
                                <View style={[styles.activationStatusCard, isDark && styles.activationStatusCardDark]}>
                                    <MaterialCommunityIcons
                                        name="clock-outline"
                                        size={20}
                                        color={isDark ? theme.color.info[400] : theme.color.info[500]}
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
                                        color={isDark ? theme.color.gray[400] : theme.color.light.text.tertiary} 
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
                                style={[styles.primaryButton, { backgroundColor: getStatusColor('completed') }]}
                                onPress={handleRetry}
                            >
                                <MaterialCommunityIcons name="refresh" size={20} color={theme.color.light.text.primary} />
                                <Text style={styles.primaryButtonText}>Réessayer</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.secondaryButton, isDark && styles.secondaryButtonDark]}
                                onPress={handleBackToProgram}
                            >
                                <MaterialCommunityIcons 
                                    name="arrow-left" 
                                    size={20} 
                                    color={isDark ? theme.color.gray[400] : theme.color.light.text.tertiary} 
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
                            color={getStatusColor('failed')}
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
        color: theme.color.light.text.tertiary,
        marginBottom: 32,
        paddingHorizontal: 16,
        lineHeight: 24,
    },
    programCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.color.light.background.tertiary,
        padding: 16,
        borderRadius: 12,
        marginBottom: 32,
        width: '100%',
    },
    programCardDark: {
        backgroundColor: theme.color.dark.background.tertiary,
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
        backgroundColor: theme.color.info[100],
        padding: 16,
        borderRadius: 12,
        gap: 12,
        marginTop: 8,
    },
    activationStatusCardDark: {
        backgroundColor: theme.color.dark.background.tertiary,
    },
    activationStatusText: {
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    primaryButtonText: {
        color: theme.color.light.text.primary,
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
        backgroundColor: theme.color.light.background.tertiary,
        gap: 8,
    },
    secondaryButtonDark: {
        backgroundColor: theme.color.dark.background.tertiary,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    helpSection: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(251, 191, 36, 0.12)',
        padding: 16,
        borderRadius: 12,
        marginTop: 24,
        gap: 12,
    },
    helpSectionDark: {
        backgroundColor: theme.color.dark.background.tertiary,
    },
    helpText: {
        fontSize: 14,
        flex: 1,
    },
});

export default PaymentResultPage;