import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    useColorScheme,
    Linking,
    Platform,
    ScrollView,
    KeyboardAvoidingView,
    Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { theme } from '@/constants/theme';
import { useProgramPayment } from '@/hooks/useProgramPayment';
import { HapticType, useHaptics } from '@/hooks/useHaptics';
import { FIXED_PRICE, REGULAR_FIRST_COURSE_PRICE, isFixedPriceModeActive, getDisplayPrice } from '@/utils/pricing';
import { ProgramPaymentService } from '@/services/program-payment.service';
import { ThemedText } from '@/components/ThemedText';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase';

// Get screen dimensions for layout
const { height, width } = Dimensions.get('window');

// Types and Enums
export enum PaymentFlowState {
    LOADING = 'loading',

    INSTRUCTIONS = 'instructions',

    PAYMENT_OPTIONS = 'payment_options',
    PROCESSING = 'processing',
    VERIFYING = 'verifying',
    SUCCESS = 'success',
    FAILED = 'failed',
    CANCELED = 'canceled',
    INSTALLMENT_DETAILS = 'installment_details',

    // Nouveaux états pour les paiements d'échéances
    NEXT_PAYMENT_OPTIONS = 'next_payment_options',
    NEXT_PAYMENT_PROCESSING = 'next_payment_processing',
    NEXT_PAYMENT_VERIFYING = 'next_payment_verifying',
    NEXT_PAYMENT_SUCCESS = 'next_payment_success',
    NEXT_PAYMENT_FAILED = 'next_payment_failed',
    NEXT_PAYMENT_CANCELED = 'next_payment_canceled'
}

export interface PaymentContextData {
    programId: string | null;
    programName: string;
    programPrice: number;
    user: any;
    hasCompletedFirstInstallment: boolean;
    latestPayment: any;
    installmentPayment: any;
}

// Session Storage Helper pour les notifications vues
const NotificationManager = {
    markAsViewed(paymentId: string, type: 'success' | 'failed') {
        if (typeof window !== 'undefined') {
            const key = `payment_notification_${paymentId}_${type}`;
            sessionStorage.setItem(key, 'viewed');
        }
    },

    hasBeenViewed(paymentId: string, type: 'success' | 'failed'): boolean {
        if (typeof window !== 'undefined') {
            const key = `payment_notification_${paymentId}_${type}`;
            return sessionStorage.getItem(key) === 'viewed';
        }
        return false;
    },

    clearAll() {
        if (typeof window !== 'undefined') {
            Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith('payment_notification_')) {
                    sessionStorage.removeItem(key);
                }
            });
        }
    }
};

// Helper function to get program ID from pdId
async function getProgramIdFromPdId(pdId: string | undefined): Promise<string | null> {
    if (!pdId) return null;

    const { data, error } = await supabase.from("concours_learningpaths")
        .select("id")
        .eq('learningPathId', pdId)
        .single();
    if (error) {
        console.error("Error fetching program ID:", error);
        return null;
    }

    return data?.id || null;
}

// PaymentInstructions Component
interface PaymentInstructionsProps {
    programName: string;
    hasInstallmentPayment: boolean;
    isLoading: boolean;
    isDark: boolean;
    onContinue: () => void;
}

const PaymentInstructions: React.FC<PaymentInstructionsProps> = ({programName, hasInstallmentPayment, isLoading, isDark, onContinue}) => {
    return (
        <View style={styles.instructionsContainer}>
            <ThemedText style={styles.instructionsTitle}>
                Comment payer pour {programName}
            </ThemedText>

            <View style={styles.instructionStep}>
                <View style={styles.instructionNumberContainer}>
                    <Text style={styles.instructionNumber}>1</Text>
                </View>
                <ThemedText style={styles.instructionText}>
                    Entrez votre numéro de téléphone Mobile Money
                </ThemedText>
            </View>

            <View style={styles.instructionStep}>
                <View style={styles.instructionNumberContainer}>
                    <Text style={styles.instructionNumber}>2</Text>
                </View>
                <ThemedText style={styles.instructionText}>
                    Si vous avez un code promo, entrez-le et vérifiez-le pour bénéficier d'une réduction
                </ThemedText>
            </View>

            <View style={styles.instructionStep}>
                <View style={styles.instructionNumberContainer}>
                    <Text style={styles.instructionNumber}>3</Text>
                </View>
                <ThemedText style={styles.instructionText}>
                    Suivez les instructions pour compléter votre paiement
                </ThemedText>
            </View>

            {hasInstallmentPayment && (
                <View style={styles.instructionNote}>
                    <MaterialCommunityIcons name="information" size={20} color={isDark ? "#60A5FA" : "#2196F3"} />
                    <ThemedText style={[styles.instructionNoteText, {color: isDark ? "#60A5FA" : "#2196F3"}]}>
                        Vous avez déjà un plan de paiement échelonné pour ce programme. Ce paiement sera considéré comme votre prochain versement.
                    </ThemedText>
                </View>
            )}

            <TouchableOpacity
                style={[styles.continueButton, isLoading && { opacity: 0.5 }]}
                onPress={onContinue}
                disabled={isLoading}
            >
                <Text style={styles.continueButtonText}>Continuer</Text>
            </TouchableOpacity>

            {isLoading && (
                <View style={styles.paymentButtonDisabledMessage}>
                    <ActivityIndicator size="small" color={isDark ? "#6EE7B7" : "#4CAF50"} />
                    <ThemedText style={styles.paymentButtonDisabledText}>
                        Nous récupérons les informations de paiement...
                    </ThemedText>
                </View>
            )}
        </View>
    );
};

// PaymentOptions Component (pour nouveaux paiements)
interface PaymentOptionsProps {
    programName: string;
    programPrice: number;
    isDark: boolean;
    isLoading: boolean;
    onPayment: (paymentData: {
        phoneNumber: string;
        promoCode: string;
        promoCodeDetails: any;
        isInstallment: boolean;
        totalInstallments: number;
    }) => void;
}

const PaymentOptions: React.FC<PaymentOptionsProps> = ({
                                                           programName,
                                                           programPrice,
                                                           isDark,
                                                           isLoading,
                                                           onPayment
                                                       }) => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [promoCode, setPromoCode] = useState('');
    const [promoCodeStatus, setPromoCodeStatus] = useState<'idle' | 'verifying' | 'valid' | 'invalid'>('idle');
    const [promoCodeDetails, setPromoCodeDetails] = useState<any>(null);
    const [promoCodeError, setPromoCodeError] = useState<string | null>(null);
    const [isInstallment, setIsInstallment] = useState(false);
    const [totalInstallments, setTotalInstallments] = useState(4);

    const displayAmount = () => {
        if (isInstallment) {
            return Math.ceil(programPrice / totalInstallments);
        }
        return programPrice;
    };

    const verifyPromoCode = async () => {
        if (!promoCode.trim()) {
            setPromoCodeStatus('idle');
            setPromoCodeDetails(null);
            setPromoCodeError(null);
            return;
        }

        setPromoCodeStatus('verifying');
        try {
            const { data: user } = await supabase.auth.getUser();
            if (user?.user?.id) {
                const { data: existingPromoUsage, error: usageError } = await supabase
                    .from('payments')
                    .select('id')
                    .eq('user_id', user.user.id)
                    .eq('status', 'completed')
                    .not('promo_code_id', 'is', null)
                    .limit(1);

                if (!usageError && existingPromoUsage && existingPromoUsage.length > 0) {
                    setPromoCodeStatus('invalid');
                    setPromoCodeDetails(null);
                    setPromoCodeError('Vous avez déjà utilisé un code promo dans une commande précédente.');
                    return;
                }
            }

            const { data, error } = await supabase
                .from('influencers')
                .select('id, name, promo_code, discount_percentage, valid_until, status')
                .eq('promo_code', promoCode)
                .eq('status', 'active')
                .single();

            if (error || !data) {
                setPromoCodeStatus('invalid');
                setPromoCodeDetails(null);
                setPromoCodeError('Code promo invalide ou expiré');
                return;
            }

            const now = new Date();
            const validUntil = data.valid_until ? new Date(data.valid_until) : null;

            if (validUntil && validUntil < now) {
                setPromoCodeStatus('invalid');
                setPromoCodeDetails(null);
                setPromoCodeError('Ce code promo a expiré');
                return;
            }

            setPromoCodeStatus('valid');
            setPromoCodeError(null);
            setPromoCodeDetails({
                id: data.id,
                discount_percentage: data.discount_percentage,
                name: data.name
            });
        } catch (err) {
            console.error('Error verifying promo code:', err);
            setPromoCodeStatus('invalid');
            setPromoCodeDetails(null);
            setPromoCodeError('Erreur lors de la vérification du code promo');
        }
    };

    const handlePayment = () => {
        onPayment({
            phoneNumber,
            promoCode,
            promoCodeDetails,
            isInstallment,
            totalInstallments
        });
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.paymentOptionsContainer}
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.paymentHeader}>
                    <ThemedText style={styles.paymentTitle}>
                        Paiement pour {programName}
                    </ThemedText>
                    <ThemedText style={styles.paymentAmount}>
                        {displayAmount()} FCFA
                        {isInstallment && ` (Versement 1/${totalInstallments})`}
                    </ThemedText>
                </View>

                <View style={[styles.paymentTypeContainer, isDark && styles.paymentTypeContainerDark]}>
                    <TouchableOpacity
                        style={[styles.paymentTypeOption, !isInstallment && styles.paymentTypeSelected]}
                        onPress={() => setIsInstallment(false)}
                    >
                        <MaterialCommunityIcons
                            name={!isInstallment ? "radiobox-marked" : "radiobox-blank"}
                            size={24}
                            color={!isInstallment ? (isDark ? "#6EE7B7" : "#4CAF50") : "#9CA3AF"}
                        />
                        <View style={styles.paymentTypeTextContainer}>
                            <ThemedText style={styles.paymentTypeTitle}>Paiement complet</ThemedText>
                            <ThemedText style={styles.paymentTypeDescription}>
                                Payez {programPrice} FCFA en une seule fois
                            </ThemedText>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.paymentTypeOption, isInstallment && styles.paymentTypeSelected]}
                        onPress={() => setIsInstallment(true)}
                    >
                        <MaterialCommunityIcons
                            name={isInstallment ? "radiobox-marked" : "radiobox-blank"}
                            size={24}
                            color={isInstallment ? (isDark ? "#6EE7B7" : "#4CAF50") : "#9CA3AF"}
                        />
                        <View style={styles.paymentTypeTextContainer}>
                            <ThemedText style={styles.paymentTypeTitle}>Paiement échelonné</ThemedText>
                            <ThemedText style={styles.paymentTypeDescription}>
                                Payez en {totalInstallments} versements de {Math.ceil(programPrice / totalInstallments)} FCFA
                            </ThemedText>
                        </View>
                    </TouchableOpacity>

                    {isInstallment && (
                        <View style={styles.installmentOptionsContainer}>
                            <ThemedText style={styles.installmentOptionsTitle}>
                                Nombre de versements
                            </ThemedText>
                            <View style={styles.installmentButtonsContainer}>
                                {[2, 4].map((num) => (
                                    <TouchableOpacity
                                        key={num}
                                        style={[
                                            styles.installmentButton,
                                            totalInstallments === num && styles.installmentButtonSelected
                                        ]}
                                        onPress={() => setTotalInstallments(num)}
                                    >
                                        <Text
                                            style={[
                                                styles.installmentButtonText,
                                                totalInstallments === num && styles.installmentButtonTextSelected
                                            ]}
                                        >
                                            {num}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                </View>

                <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Numéro de téléphone</ThemedText>
                    <TextInput
                        style={[styles.input, isDark && styles.inputDark]}
                        placeholder="Ex: 6XXXXXXXX"
                        placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                        keyboardType="phone-pad"
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Code promo (optionnel)</ThemedText>
                    <View style={styles.promoCodeContainer}>
                        <TextInput
                            style={[styles.promoCodeInput, isDark && styles.inputDark]}
                            placeholder="Entrez votre code promo"
                            placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                            value={promoCode}
                            onChangeText={(text) => {
                                setPromoCode(text);
                                if (promoCodeStatus === 'valid' || promoCodeStatus === 'invalid') {
                                    setPromoCodeStatus('idle');
                                    setPromoCodeError(null);
                                }
                            }}
                        />
                        <TouchableOpacity
                            style={[
                                styles.verifyButton,
                                promoCodeStatus === 'verifying' && styles.verifyingButton,
                                promoCodeStatus === 'valid' && styles.validButton,
                                promoCodeStatus === 'invalid' && styles.invalidButton
                            ]}
                            onPress={verifyPromoCode}
                            disabled={promoCodeStatus === 'verifying' || !promoCode.trim()}
                        >
                            {promoCodeStatus === 'verifying' ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : promoCodeStatus === 'valid' ? (
                                <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                            ) : promoCodeStatus === 'invalid' ? (
                                <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
                            ) : (
                                <Text style={styles.verifyButtonText}>Vérifier</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {promoCodeStatus === 'valid' && promoCodeDetails && (
                        <View style={styles.promoCodeValidContainer}>
                            <MaterialCommunityIcons name={"tag-check" as any} size={20} color={isDark ? "#6EE7B7" : "#4CAF50"} />
                            <ThemedText style={styles.promoCodeValidText}>
                                Code promo valide: {promoCodeDetails.discount_percentage}% de réduction
                            </ThemedText>
                        </View>
                    )}

                    {promoCodeStatus === 'invalid' && promoCodeError && (
                        <ThemedText style={styles.promoCodeErrorText}>
                            {promoCodeError}
                        </ThemedText>
                    )}
                </View>

                <View style={styles.paymentMethodsContainer}>
                    <ThemedText style={styles.paymentMethodsTitle}>
                        Méthode de paiement
                    </ThemedText>

                    <TouchableOpacity
                        style={[
                            styles.paymentMethodButton,
                            isDark && {backgroundColor: '#374151', borderColor: '#4B5563'},
                            {
                                backgroundColor: isDark ? '#059669' : '#4CAF50',
                                opacity: (isLoading || !phoneNumber.trim()) ? 0.5 : 1
                            }
                        ]}
                        onPress={handlePayment}
                        disabled={isLoading || !phoneNumber.trim()}
                    >
                        <View style={styles.paymentMethodContent}>
                            <MaterialCommunityIcons name="cellphone" size={24} color="#FFFFFF"/>
                            <ThemedText style={[styles.paymentMethodText, {color: '#FFFFFF'}]}>
                                Payer maintenant
                            </ThemedText>
                        </View>
                        {isLoading && <ActivityIndicator size="small" color="#FFFFFF"/>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

// NextPaymentOptions Component (pour paiements d'échéances)
interface NextPaymentOptionsProps {
    programName: string;
    installmentAmount: number;
    currentInstallment: number;
    totalInstallments: number;
    isDark: boolean;
    isLoading: boolean;
    onPayment: (phoneNumber: string) => void;
}

const NextPaymentOptions: React.FC<NextPaymentOptionsProps> = ({
                                                                   programName,
                                                                   installmentAmount,
                                                                   currentInstallment,
                                                                   totalInstallments,
                                                                   isDark,
                                                                   isLoading,
                                                                   onPayment
                                                               }) => {
    const [phoneNumber, setPhoneNumber] = useState('');

    const handlePayment = () => {
        onPayment(phoneNumber);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.paymentOptionsContainer}
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.paymentHeader}>
                    <ThemedText style={styles.paymentTitle}>
                        Prochain versement - {programName}
                    </ThemedText>
                    <ThemedText style={styles.paymentAmount}>
                        {installmentAmount} FCFA
                    </ThemedText>
                    <ThemedText style={styles.installmentInfo}>
                        Versement {currentInstallment + 1}/{totalInstallments}
                    </ThemedText>
                </View>

                <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Numéro de téléphone</ThemedText>
                    <TextInput
                        style={[styles.input, isDark && styles.inputDark]}
                        placeholder="Ex: 6XXXXXXXX"
                        placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                        keyboardType="phone-pad"
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                    />
                </View>

                <View style={styles.promoCodeDisabledContainer}>
                    <ThemedText style={styles.promoCodeDisabledText}>
                        Les codes promo ne sont pas disponibles pour les prochains versements
                    </ThemedText>
                </View>

                <View style={styles.paymentMethodsContainer}>
                    <ThemedText style={styles.paymentMethodsTitle}>
                        Méthode de paiement
                    </ThemedText>

                    <TouchableOpacity
                        style={[
                            styles.paymentMethodButton,
                            {
                                backgroundColor: isDark ? '#059669' : '#4CAF50',
                                opacity: (isLoading || !phoneNumber.trim()) ? 0.5 : 1
                            }
                        ]}
                        onPress={handlePayment}
                        disabled={isLoading || !phoneNumber.trim()}
                    >
                        <View style={styles.paymentMethodContent}>
                            <MaterialCommunityIcons name="cellphone" size={24} color="#FFFFFF"/>
                            <ThemedText style={[styles.paymentMethodText, {color: '#FFFFFF'}]}>
                                Payer le versement
                            </ThemedText>
                        </View>
                        {isLoading && <ActivityIndicator size="small" color="#FFFFFF"/>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

// PaymentProcessing Component
interface PaymentProcessingProps {
    state: 'processing' | 'verifying';
    isDark: boolean;
    currentMessage?: string;
    onCancel: () => void;
}

const PaymentProcessing: React.FC<PaymentProcessingProps> = ({
                                                                 state,
                                                                 isDark,
                                                                 currentMessage,
                                                                 onCancel
                                                             }) => {
    if (state === 'processing') {
        return (
            <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={isDark ? "#6EE7B7" : "#4CAF50"} />
                <ThemedText style={styles.processingText}>
                    Initialisation du paiement...
                </ThemedText>
                <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                    <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.verifyingContainer}>
            <View style={{ maxWidth: 200, alignItems: 'center', maxHeight: 300 }}>
                <LottieView
                    source={require('@/assets/animations/payment-loading.json')}
                    autoPlay
                    key="verifyingAnimation"
                />
            </View>
            <ThemedText style={styles.verifyingTitle}>
                Vérification du paiement
            </ThemedText>
            <ThemedText style={styles.verifyingMessage}>
                {currentMessage || 'En attente de validation sur votre téléphone...'}
            </ThemedText>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
        </View>
    );
};

// PaymentResult Component
interface PaymentResultProps {
    state: 'success' | 'failed' | 'canceled';
    programName: string;
    isInstallment: boolean;
    hasMoreInstallments: boolean;
    hasCompletedFirstInstallment: boolean;
    errorMessage?: string;
    authorizationUrl?: string | null;
    onRetry?: () => void;
    onBack: () => void;
    onViewDetails?: () => void;
    onBackToDetails?: () => void;
}

const PaymentResult: React.FC<PaymentResultProps> = ({
                                                         state,
                                                         programName,
                                                         isInstallment,
                                                         hasMoreInstallments,
                                                         hasCompletedFirstInstallment,
                                                         errorMessage,
                                                         authorizationUrl,
                                                         onRetry,
                                                         onBack,
                                                         onViewDetails,
                                                         onBackToDetails
                                                     }) => {
    if (state === 'success') {
        return (
            <View style={styles.successContainer}>
                <View style={styles.successAnimation}>
                    <LottieView
                        source={require('@/assets/animations/payment-success.json')}
                        autoPlay
                        loop={false}
                    />
                </View>
                <ThemedText style={styles.successTitle}>
                    Paiement réussi !
                </ThemedText>
                <ThemedText style={styles.successMessage}>
                    {isInstallment
                        ? (hasMoreInstallments
                            ? `Votre versement pour ${programName} a été effectué avec succès.`
                            : `Tous vos versements pour ${programName} ont été effectués avec succès !`)
                        : `Votre paiement pour ${programName} a été effectué avec succès.`}
                </ThemedText>

                {isInstallment && hasMoreInstallments && onViewDetails ? (
                    <View style={styles.successButtonsContainer}>
                        <TouchableOpacity style={styles.secondaryButton} onPress={onViewDetails}>
                            <Text style={styles.secondaryButtonText}>Voir les détails</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.continueButton} onPress={onBack}>
                            <Text style={styles.continueButtonText}>Retourner au programme</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.continueButton} onPress={onBack}>
                        <Text style={styles.continueButtonText}>Retourner au programme</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    if (state === 'failed') {
        return (
            <View style={styles.failedContainer}>
                <LottieView
                    source={require('@/assets/animations/payment-failed.json')}
                    autoPlay
                    loop={false}
                    style={styles.failedAnimation}
                />
                <ThemedText style={styles.failedTitle}>
                    Paiement échoué
                </ThemedText>
                <ThemedText style={styles.failedMessage}>
                    {errorMessage || 'Une erreur est survenue lors du traitement de votre paiement.'}
                </ThemedText>

                {authorizationUrl && (
                    <View style={styles.fallbackContainer}>
                        <ThemedText style={styles.fallbackMessage}>
                            Vous pouvez compléter votre paiement en cliquant sur le lien ci-dessous:
                        </ThemedText>
                        <TouchableOpacity
                            style={styles.fallbackButton}
                            onPress={() => Linking.openURL(authorizationUrl)}
                        >
                            <Text style={styles.fallbackButtonText}>Continuer vers la page de paiement</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {hasCompletedFirstInstallment && onBackToDetails ? (
                    <TouchableOpacity style={styles.retryButton} onPress={onBackToDetails}>
                        <Text style={styles.retryButtonText}>Retour aux détails</Text>
                    </TouchableOpacity>
                ) : onRetry ? (
                    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                        <Text style={styles.retryButtonText}>Réessayer</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
        );
    }

    return (
        <View style={styles.canceledContainer}>
            <MaterialCommunityIcons name="close-circle" size={80} color="#F87171" />
            <ThemedText style={styles.canceledTitle}>
                Paiement annulé
            </ThemedText>
            <ThemedText style={styles.canceledMessage}>
                Vous avez annulé le processus de paiement.
            </ThemedText>

            {hasCompletedFirstInstallment && onBackToDetails ? (
                <TouchableOpacity style={styles.retryButton} onPress={onBackToDetails}>
                    <Text style={styles.retryButtonText}>Retour aux détails</Text>
                </TouchableOpacity>
            ) : onRetry ? (
                <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                    <Text style={styles.retryButtonText}>Réessayer</Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
};

// InstallmentDetails Component
interface InstallmentDetailsProps {
    installmentPayment: any;
    programName: string;
    isDark: boolean;
    onPayNext: () => void;
    onBack: () => void;
}

const InstallmentDetails: React.FC<InstallmentDetailsProps> = ({
                                                                   installmentPayment,
                                                                   programName,
                                                                   isDark,
                                                                   onPayNext,
                                                                   onBack
                                                               }) => {
    if (!installmentPayment) {
        return (
            <View style={styles.noInstallmentContainer}>
                <ThemedText style={styles.noInstallmentText}>
                    Aucun plan de paiement échelonné actif.
                </ThemedText>
                <TouchableOpacity style={styles.continueButton} onPress={onBack}>
                    <Text style={styles.continueButtonText}>Retourner au programme</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const currentInstallment = installmentPayment.current_installment || 1;
    const totalInstallments = installmentPayment.total_installments || 1;
    const nextPaymentDueDate = installmentPayment.next_payment_due_date
        ? new Date(installmentPayment.next_payment_due_date)
        : null;
    const installmentAmount = installmentPayment.amount || 0;
    const totalAmount = installmentPayment.total_amount || 0;
    const paidAmount = installmentAmount * currentInstallment;
    const remainingAmount = totalAmount - paidAmount;

    const daysUntilNextPayment = nextPaymentDueDate
        ? Math.ceil((nextPaymentDueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const formattedNextPaymentDate = nextPaymentDueDate
        ? nextPaymentDueDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'Non défini';

    return (
        <ScrollView style={styles.installmentDetailsContainer}>
            <View style={styles.installmentHeader}>
                <ThemedText style={styles.installmentTitle}>
                    Plan de paiement échelonné
                </ThemedText>
                <ThemedText style={styles.installmentSubtitle}>
                    {programName}
                </ThemedText>
            </View>

            <View style={[styles.installmentProgressContainer, isDark && styles.installmentProgressContainerDark]}>
                <View style={styles.installmentProgressHeader}>
                    <ThemedText style={styles.installmentProgressTitle}>
                        Progression des paiements
                    </ThemedText>
                    <ThemedText style={styles.installmentProgressValue}>
                        {currentInstallment}/{totalInstallments}
                    </ThemedText>
                </View>
                <View style={styles.installmentProgressBar}>
                    <View
                        style={[
                            styles.installmentProgressFill,
                            { width: `${(currentInstallment / totalInstallments) * 100}%` }
                        ]}
                    />
                </View>
            </View>

            <View style={[styles.installmentInfoCard, isDark && styles.installmentInfoCardDark]}>
                <View style={styles.installmentInfoRow}>
                    <ThemedText style={styles.installmentInfoLabel}>Montant total</ThemedText>
                    <ThemedText style={styles.installmentInfoValue}>{totalAmount} FCFA</ThemedText>
                </View>
                <View style={styles.installmentInfoRow}>
                    <ThemedText style={styles.installmentInfoLabel}>Montant payé</ThemedText>
                    <ThemedText style={styles.installmentInfoValue}>{paidAmount} FCFA</ThemedText>
                </View>
                <View style={styles.installmentInfoRow}>
                    <ThemedText style={styles.installmentInfoLabel}>Montant restant</ThemedText>
                    <ThemedText style={styles.installmentInfoValue}>{remainingAmount} FCFA</ThemedText>
                </View>
                <View style={styles.installmentInfoRow}>
                    <ThemedText style={styles.installmentInfoLabel}>Montant par versement</ThemedText>
                    <ThemedText style={styles.installmentInfoValue}>{installmentAmount} FCFA</ThemedText>
                </View>
            </View>

            {nextPaymentDueDate && currentInstallment < totalInstallments && (
                <View style={[styles.nextPaymentCard, isDark && styles.nextPaymentCardDark]}>
                    <View style={styles.nextPaymentHeader}>
                        <MaterialCommunityIcons
                            name="calendar-clock"
                            size={24}
                            color={isDark ? "#F59E0B" : "#F59E0B"}
                        />
                        <ThemedText style={styles.nextPaymentTitle}>
                            Prochain paiement
                        </ThemedText>
                    </View>
                    <View style={styles.nextPaymentInfo}>
                        <ThemedText style={styles.nextPaymentDate}>
                            {formattedNextPaymentDate}
                        </ThemedText>
                        {daysUntilNextPayment !== null && (
                            <ThemedText
                                style={[
                                    styles.nextPaymentDays,
                                    daysUntilNextPayment <= 3 && styles.nextPaymentDaysUrgent
                                ]}
                            >
                                {daysUntilNextPayment <= 0
                                    ? 'Paiement dû aujourd\'hui'
                                    : `Dans ${daysUntilNextPayment} jour${daysUntilNextPayment !== 1 ? 's' : ''}`}
                            </ThemedText>
                        )}
                        <ThemedText style={styles.nextPaymentAmount}>
                            {installmentAmount} FCFA
                        </ThemedText>
                    </View>
                    {daysUntilNextPayment !== null && daysUntilNextPayment <= 30 && (
                        <TouchableOpacity style={styles.payNowButton} onPress={onPayNext}>
                            <Text style={styles.payNowButtonText}>Payer maintenant</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <View style={[styles.paymentHistoryContainer, isDark && styles.paymentHistoryContainerDark]}>
                <ThemedText style={styles.paymentHistoryTitle}>
                    Historique des paiements
                </ThemedText>
                {Array.from({ length: currentInstallment }).map((_, index) => {
                    const installmentNumber = index + 1;
                    const paymentDate = new Date();
                    paymentDate.setMonth(paymentDate.getMonth() - (currentInstallment - installmentNumber));

                    return (
                        <View key={index} style={styles.paymentHistoryItem}>
                            <View style={styles.paymentHistoryItemLeft}>
                                <View style={styles.paymentHistoryItemIcon}>
                                    <MaterialCommunityIcons name="check-circle" size={24} color={isDark ? "#6EE7B7" : "#4CAF50"} />
                                </View>
                                <View>
                                    <ThemedText style={styles.paymentHistoryItemTitle}>
                                        Versement {installmentNumber}
                                    </ThemedText>
                                    <ThemedText style={styles.paymentHistoryItemDate}>
                                        {paymentDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </ThemedText>
                                </View>
                            </View>
                            <ThemedText style={styles.paymentHistoryItemAmount}>
                                {installmentAmount} FCFA
                            </ThemedText>
                        </View>
                    );
                })}
            </View>

            <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <Text style={styles.backButtonText}>Retourner au programme</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};



// Main Component
const ProgramPaymentPage = () => {
    const local = useLocalSearchParams();
    const pdId = local.pdId as string | undefined;
    const router = useRouter();
    const { user } = useAuth();
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const { trigger } = useHaptics();

    // Main state management
    const [currentState, setCurrentState] = useState<PaymentFlowState>(PaymentFlowState.LOADING);
    const [programContext, setProgramContext] = useState<PaymentContextData>({
        programId: null,
        programName: '',
        programPrice: FIXED_PRICE,
        user: null,
        hasCompletedFirstInstallment: false,
        latestPayment: null,
        installmentPayment: null
    });

    // Processing states
    const [currentTrxReference, setCurrentTrxReference] = useState<string | null>(null);
    const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [verificationMessages] = useState([
        'En attente de validation sur votre téléphone...',
        'Une fois validé, la vérification peut prendre jusqu\'à 5 minutes...'
    ]);
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
    const [justCompletedPayment, setJustCompletedPayment] = useState(false);

    const {
        paymentStatus,
        loading,
        latestPayment,
        latestPaymentLoading,
        authorizationUrl,
        chargeError,
        getLatestPayment,
        getAllPayments,
        isFinalStatus,
        initiateDirectPayment,
        cancelPayment,
        verifyPaymentStatus
    } = useProgramPayment(pdId);

    // Initialize component data
    useEffect(() => {
        const initializePaymentPage = async () => {
            try {
                setCurrentState(PaymentFlowState.LOADING);

                const programId = await getProgramIdFromPdId(pdId);
                if (!programId) {
                    throw new Error('Program not found');
                }

                const { data, error } = await supabase
                    .from('learning_paths')
                    .select(`
                        id,
                        title,
                        concours_learningpaths(
                          id,
                          price,
                          concour:concours(
                            id,
                            name
                          )
                        )
                      `)
                    .eq('id', pdId)
                    .single();

                if (error) throw error;

                let price = REGULAR_FIRST_COURSE_PRICE;
                if (user?.id) {
                    const { data: enrollments } = await supabase
                        .from('user_enrollments')
                        .select('id')
                        .eq('user_id', user.id);

                    const enrollmentsCount = enrollments?.length || 0;
                    const isFixedPriceMode = isFixedPriceModeActive(enrollmentsCount);
                    const basePrice = REGULAR_FIRST_COURSE_PRICE;
                    price = getDisplayPrice(basePrice, isFixedPriceMode);
                }

                const latestPayment = await getLatestPayment(programId);
                const allPayments = await getAllPayments(programId);

                console.log("all payments: ", allPayments);

                const hasCompletedFirstInstallment = latestPayment?.is_installment &&
                    allPayments.some(payment => payment.is_installment && payment.current_installment === 1 && payment.payment_status === "completed")  || false;
                const installmentPayment = latestPayment?.is_installment ? latestPayment : null;

                setProgramContext({
                    programId,
                    programName: data.title || 'ce programme',
                    programPrice: price,
                    user,
                    hasCompletedFirstInstallment,
                    latestPayment,
                    installmentPayment
                });

                determineInitialState(latestPayment, hasCompletedFirstInstallment);

            } catch (error) {
                console.error('Error initializing payment page:', error);
                setCurrentState(PaymentFlowState.FAILED);
                setErrorMessage('Erreur lors du chargement des informations de paiement');
            }
        };

        initializePaymentPage();
    }, [pdId, user?.id]);

    // Determine the initial state based on payment history
    const determineInitialState = (latestPayment: any, hasCompletedFirstInstallment: boolean) => {
        if (!latestPayment) {
            setCurrentState(PaymentFlowState.INSTRUCTIONS);
            return;
        }

        // Si le paiement n'est pas en statut final, continuer la vérification
        if (!isFinalStatus(latestPayment.payment_status)) {
            // Vérifier si c'est un paiement d'échéance suivante
            if (hasCompletedFirstInstallment && latestPayment.current_installment > 1) {
                setCurrentState(PaymentFlowState.NEXT_PAYMENT_VERIFYING);
            } else {
                setCurrentState(PaymentFlowState.VERIFYING);
            }
            setCurrentTrxReference(latestPayment.payment_reference);
            startStatusCheck(latestPayment.payment_reference);
            return;
        }

        // Si le dernier paiement a échoué/annulé
        if (latestPayment.payment_status === 'failed' || latestPayment.payment_status === 'canceled') {
            if (hasCompletedFirstInstallment) {
                setCurrentState(PaymentFlowState.INSTALLMENT_DETAILS);
            } else {
                setCurrentState(PaymentFlowState.INSTRUCTIONS);
            }
            return;
        }

        // Si le dernier paiement est réussi
        if (latestPayment.payment_status === 'completed') {
            // Ne pas montrer la notification de succès si elle a déjà été vue
            if (NotificationManager.hasBeenViewed(latestPayment.id, 'success')) {
                if (hasCompletedFirstInstallment) {
                    const currentInstallment = latestPayment.current_installment || 1;
                    const totalInstallments = latestPayment.total_installments || 1;

                    if (currentInstallment < totalInstallments) {
                        setCurrentState(PaymentFlowState.INSTALLMENT_DETAILS);
                    } else {
                        router.back();
                    }
                } else {
                    router.back();
                }
                return;
            }

            // Marquer comme vu et montrer le succès
            NotificationManager.markAsViewed(latestPayment.id, 'success');

            if (hasCompletedFirstInstallment) {
                const currentInstallment = latestPayment.current_installment || 1;
                const totalInstallments = latestPayment.total_installments || 1;

                if (currentInstallment < totalInstallments) {
                    setCurrentState(PaymentFlowState.NEXT_PAYMENT_SUCCESS);
                } else {
                    setCurrentState(PaymentFlowState.SUCCESS);
                }
            } else {
                setCurrentState(PaymentFlowState.SUCCESS);
            }
            setJustCompletedPayment(true);
            return;
        }

        setCurrentState(PaymentFlowState.INSTRUCTIONS);
    };

    // Handle payment status changes
    useEffect(() => {
        if (paymentStatus === 'successful' || paymentStatus === 'completed') {
            setJustCompletedPayment(true);

            // Déterminer le bon état de succès
            if (programContext.hasCompletedFirstInstallment) {
                setCurrentState(PaymentFlowState.NEXT_PAYMENT_SUCCESS);
            } else {
                setCurrentState(PaymentFlowState.SUCCESS);
            }

            stopStatusCheck();
        } else if (paymentStatus === 'failed') {
            // Déterminer le bon état d'échec
            if (programContext.hasCompletedFirstInstallment) {
                setCurrentState(PaymentFlowState.NEXT_PAYMENT_FAILED);
            } else {
                setCurrentState(PaymentFlowState.FAILED);
            }
            setErrorMessage('Le paiement a échoué. Veuillez réessayer.');
            stopStatusCheck();
        } else if (paymentStatus === 'canceled') {
            // Déterminer le bon état d'annulation
            if (programContext.hasCompletedFirstInstallment) {
                setCurrentState(PaymentFlowState.NEXT_PAYMENT_CANCELED);
            } else {
                setCurrentState(PaymentFlowState.CANCELED);
            }
            stopStatusCheck();
        }
    }, [paymentStatus, programContext.hasCompletedFirstInstallment]);

    // Handle authorization URL
    useEffect(() => {
        if (authorizationUrl) {
            Linking.openURL(authorizationUrl);
        }
    }, [authorizationUrl]);

    // Message rotation for verification
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentMessageIndex((current) => (current + 1) % verificationMessages.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Status check functions
    const startStatusCheck = (reference: string) => {
        if (statusCheckInterval) return;

        const interval = setInterval(async () => {
            const result = await verifyPaymentStatus(reference);

            // Check if we've reached a terminal status and stop the check if we have
            if (result?.transaction?.status) {
                const status = result.transaction.status === "complete" ? "completed" : result.transaction.status;
                if (isFinalStatus(status)) {
                    console.log(`Terminal status reached (${status}), stopping status check`);
                    stopStatusCheck();
                }
            }
        }, 5000);

        setStatusCheckInterval(interval);
    };

    const stopStatusCheck = () => {
        if (statusCheckInterval) {
            clearInterval(statusCheckInterval);
            setStatusCheckInterval(null);
            console.log("Status check stopped");
        }
    };

    // Event handlers
    const handleContinueFromInstructions = () => {
        setCurrentState(PaymentFlowState.PAYMENT_OPTIONS);
    };

    const handlePayment = async (paymentData: any) => {
        trigger(HapticType.MEDIUM);
        setCurrentState(PaymentFlowState.PROCESSING);
        setErrorMessage(null);

        try {
            let amount: number;

            amount = paymentData.isInstallment
                ? Math.ceil(programContext.programPrice / paymentData.totalInstallments)
                : programContext.programPrice;

            if (paymentData.promoCodeDetails) {
                const discountAmount = Math.ceil((amount * paymentData.promoCodeDetails.discount_percentage) / 100);
                amount = amount - discountAmount;
            }

            const result = await initiateDirectPayment(
                programContext.programId!,
                paymentData.phoneNumber.trim(),
                amount,
                paymentData.promoCodeDetails?.id,
                paymentData.isInstallment,
                paymentData.isInstallment ? paymentData.totalInstallments : 1,
                1
            );

            if(result.payment){
                // case of non installment payment
                const payment = result.payment;
                if(payment && payment.payment_reference) {
                    console.log('Payment initiated successfully:', payment);

                    setCurrentTrxReference(payment.payment_reference);
                    setCurrentState(PaymentFlowState.VERIFYING);
                    startStatusCheck(payment.payment_reference);
                }else{
                    setCurrentState(PaymentFlowState.FAILED);
                    setErrorMessage('Impossible d\'initier le paiement. Veuillez réessayer.');
                }
            }else{
                // case of installment payment
                if (result && result.payment_reference) {
                    console.log('Payment initiated successfully:', result);


                    setCurrentTrxReference(result.payment_reference);
                    setCurrentState(PaymentFlowState.VERIFYING);
                    startStatusCheck(result.payment_reference);
                } else {
                    setCurrentState(PaymentFlowState.FAILED);
                    setErrorMessage('Impossible d\'initier le paiement. Veuillez réessayer.');
                }
            }


        } catch (error) {
            console.error('Payment initiation error:', error);
            setCurrentState(PaymentFlowState.FAILED);
            setErrorMessage(error instanceof Error ? error.message : 'Une erreur est survenue lors du paiement');
        }
    };

    const handleNextPayment = async (phoneNumber: string) => {
        trigger(HapticType.MEDIUM);
        setCurrentState(PaymentFlowState.NEXT_PAYMENT_PROCESSING);
        setErrorMessage(null);

        try {
            const amount = programContext.installmentPayment?.amount || programContext.programPrice;

            // get the next payment due start cournt ( default use lastpayemnt_next_due date if > Today else use today)
            let nextInstallationStartDate = new Date();
            if (programContext.installmentPayment?.next_payment_due_date) {
                const nextDueDate = new Date(programContext.installmentPayment.next_payment_due_date);
                if (nextDueDate > new Date()) {
                    nextInstallationStartDate = nextDueDate;
                }
            }

            const result = await initiateDirectPayment(
                programContext.programId!,
                phoneNumber.trim(),
                amount,
                undefined, // pas de promo code pour les échéances
                true, // toujours installment
                programContext.installmentPayment?.total_installments || 1,
                (programContext.installmentPayment?.current_installment || 1) + 1,
                nextInstallationStartDate
            );

            if (result && result.payment_reference) {
                setCurrentTrxReference(result.payment_reference);
                setCurrentState(PaymentFlowState.NEXT_PAYMENT_VERIFYING);
                startStatusCheck(result.payment_reference);
            } else {
                setCurrentState(PaymentFlowState.NEXT_PAYMENT_FAILED);
                setErrorMessage('Impossible d\'initier le paiement. Veuillez réessayer.');
            }
        } catch (error) {
            console.error('Next payment initiation error:', error);
            setCurrentState(PaymentFlowState.NEXT_PAYMENT_FAILED);
            setErrorMessage(error instanceof Error ? error.message : 'Une erreur est survenue lors du paiement');
        }
    };

    const handleCancelPayment = async () => {
        if (currentTrxReference) {
            try {
                await cancelPayment();
                stopStatusCheck();

                // Retourner au bon état selon le contexte
                if (programContext.hasCompletedFirstInstallment) {
                    setCurrentState(PaymentFlowState.INSTALLMENT_DETAILS);
                } else {
                    setCurrentState(PaymentFlowState.CANCELED);
                }
            } catch (error) {
                console.error('Error canceling payment:', error);
            }
        }
    };

    const handleBackToDetails = () => {
        setCurrentState(PaymentFlowState.INSTALLMENT_DETAILS);
        setErrorMessage(null);
    };

    const handleRetry = () => {
        if (programContext.hasCompletedFirstInstallment) {
            setCurrentState(PaymentFlowState.INSTALLMENT_DETAILS);
        } else {
            setCurrentState(PaymentFlowState.PAYMENT_OPTIONS);
        }
        setErrorMessage(null);
    };

    const handlePayNextInstallment = () => {
        setCurrentState(PaymentFlowState.NEXT_PAYMENT_OPTIONS);
    };

    const handleViewDetails = () => {
        setJustCompletedPayment(false);
        setCurrentState(PaymentFlowState.INSTALLMENT_DETAILS);
    };

    const handleBack = () => {
        setJustCompletedPayment(false);
        router.back();
    };

    // Render content based on current state
    const renderContent = () => {
        switch (currentState) {
            case PaymentFlowState.LOADING:
                return (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={isDark ? "#6EE7B7" : "#4CAF50"} />
                        <ThemedText style={styles.loadingText}>
                            Chargement des informations de paiement...
                        </ThemedText>
                    </View>
                );

            case PaymentFlowState.INSTRUCTIONS:
                return (
                    <PaymentInstructions
                        programName={programContext.programName}
                        hasInstallmentPayment={!!programContext.installmentPayment}
                        isLoading={loading || latestPaymentLoading}
                        isDark={isDark}
                        onContinue={handleContinueFromInstructions}
                    />
                );

            case PaymentFlowState.PAYMENT_OPTIONS:
                return (
                    <PaymentOptions
                        programName={programContext.programName}
                        programPrice={programContext.programPrice}
                        isDark={isDark}
                        isLoading={loading}
                        onPayment={handlePayment}
                    />
                );

            case PaymentFlowState.NEXT_PAYMENT_OPTIONS:
                return (
                    <NextPaymentOptions
                        programName={programContext.programName}
                        installmentAmount={programContext.installmentPayment?.amount || 0}
                        currentInstallment={programContext.installmentPayment?.current_installment || 1}
                        totalInstallments={programContext.installmentPayment?.total_installments || 1}
                        isDark={isDark}
                        isLoading={loading}
                        onPayment={handleNextPayment}
                    />
                );

            case PaymentFlowState.PROCESSING:
                return (
                    <PaymentProcessing
                        state="processing"
                        isDark={isDark}
                        onCancel={() => setCurrentState(PaymentFlowState.PAYMENT_OPTIONS)}
                    />
                );

            case PaymentFlowState.NEXT_PAYMENT_PROCESSING:
                return (
                    <PaymentProcessing
                        state="processing"
                        isDark={isDark}
                        onCancel={() => setCurrentState(PaymentFlowState.INSTALLMENT_DETAILS)}
                    />
                );

            case PaymentFlowState.VERIFYING:
                return (
                    <PaymentProcessing
                        state="verifying"
                        isDark={isDark}
                        currentMessage={verificationMessages[currentMessageIndex]}
                        onCancel={handleCancelPayment}
                    />
                );

            case PaymentFlowState.NEXT_PAYMENT_VERIFYING:
                return (
                    <PaymentProcessing
                        state="verifying"
                        isDark={isDark}
                        currentMessage={verificationMessages[currentMessageIndex]}
                        onCancel={handleCancelPayment}
                    />
                );

            case PaymentFlowState.SUCCESS:
            case PaymentFlowState.NEXT_PAYMENT_SUCCESS:
                const currentInstallment = programContext.latestPayment?.current_installment || 1;
                const totalInstallments = programContext.latestPayment?.total_installments || 1;
                const hasMoreInstallments = currentInstallment < totalInstallments;

                return (
                    <PaymentResult
                        state="success"
                        programName={programContext.programName}
                        isInstallment={programContext.latestPayment?.is_installment || false}
                        hasMoreInstallments={hasMoreInstallments}
                        hasCompletedFirstInstallment={programContext.hasCompletedFirstInstallment}
                        onBack={handleBack}
                        onViewDetails={hasMoreInstallments ? handleViewDetails : undefined}
                    />
                );

            case PaymentFlowState.FAILED:
                return (
                    <PaymentResult
                        state="failed"
                        programName={programContext.programName}
                        isInstallment={false}
                        hasMoreInstallments={false}
                        hasCompletedFirstInstallment={false}
                        errorMessage={errorMessage}
                        authorizationUrl={authorizationUrl}
                        onRetry={handleRetry}
                        onBack={handleBack}
                    />
                );

            case PaymentFlowState.NEXT_PAYMENT_FAILED:
                return (
                    <PaymentResult
                        state="failed"
                        programName={programContext.programName}
                        isInstallment={true}
                        hasMoreInstallments={false}
                        hasCompletedFirstInstallment={true}
                        errorMessage={errorMessage}
                        authorizationUrl={authorizationUrl}
                        onBackToDetails={handleBackToDetails}
                        onBack={handleBack}
                    />
                );

            case PaymentFlowState.CANCELED:
                return (
                    <PaymentResult
                        state="canceled"
                        programName={programContext.programName}
                        isInstallment={false}
                        hasMoreInstallments={false}
                        hasCompletedFirstInstallment={false}
                        onRetry={handleRetry}
                        onBack={handleBack}
                    />
                );

            case PaymentFlowState.NEXT_PAYMENT_CANCELED:
                return (
                    <PaymentResult
                        state="canceled"
                        programName={programContext.programName}
                        isInstallment={true}
                        hasMoreInstallments={false}
                        hasCompletedFirstInstallment={true}
                        onBackToDetails={handleBackToDetails}
                        onBack={handleBack}
                    />
                );

            case PaymentFlowState.INSTALLMENT_DETAILS:
                return (
                    <InstallmentDetails
                        installmentPayment={programContext.installmentPayment}
                        programName={programContext.programName}
                        isDark={isDark}
                        onPayNext={handlePayNextInstallment}
                        onBack={handleBack}
                    />
                );

            default:
                return (
                    <PaymentInstructions
                        programName={programContext.programName}
                        hasInstallmentPayment={!!programContext.installmentPayment}
                        isLoading={false}
                        isDark={isDark}
                        onContinue={handleContinueFromInstructions}
                    />
                );
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (statusCheckInterval) {
                clearInterval(statusCheckInterval);
            }
        };
    }, [statusCheckInterval]);

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <View style={[styles.header, isDark && styles.headerDark]}>
                <TouchableOpacity
                    style={styles.backButtonHeader}
                    onPress={handleBack}
                >
                    <MaterialCommunityIcons
                        name="arrow-left"
                        size={24}
                        color={isDark ? "#FFFFFF" : "#111827"}
                    />
                </TouchableOpacity>
                <ThemedText style={styles.headerTitle}>
                    Paiement du programme
                </ThemedText>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content}>
                {renderContent()}
            </ScrollView>
        </View>
    );
};

// Complete Styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
        marginBottom: 60,
    },
    content: {
        flex: 1,
        paddingHorizontal: 0,
    },
    containerDark: {
        backgroundColor: "#111827",
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderBottomColor: "#374151",
    },
    backButtonHeader: {
        padding: 8,
    },
    headerTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: "600",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        marginTop: 16,
        color: '#6B7280',
    },
    instructionsContainer: {
        padding: 20,
    },
    instructionsTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 24,
        textAlign: 'center',
    },
    instructionStep: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    instructionNumberContainer: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#4CAF50',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    instructionNumber: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
    },
    instructionText: {
        flex: 1,
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        lineHeight: 24,
    },
    instructionNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(96, 165, 250, 0.1)',
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
        marginBottom: 8,
    },
    instructionNoteText: {
        flex: 1,
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        lineHeight: 20,
        marginLeft: 8,
    },
    continueButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
    },
    paymentOptionsContainer: {
        flex: 1,
        padding: 16,
    },
    paymentHeader: {
        marginBottom: 24,
    },
    paymentTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    paymentAmount: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: '600',
        color: '#4CAF50',
    },
    installmentInfo: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    paymentTypeContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    paymentTypeContainerDark: {
        backgroundColor: '#374151',
    },
    paymentTypeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 8,
    },
    paymentTypeSelected: {
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
    },
    paymentTypeTextContainer: {
        marginLeft: 12,
    },
    paymentTypeTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
    },
    paymentTypeDescription: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#6B7280',
    },
    installmentOptionsContainer: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    installmentOptionsTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    installmentButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    installmentButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    installmentButtonSelected: {
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
    },
    installmentButtonText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    installmentButtonTextSelected: {
        color: '#4CAF50',
    },
    inputContainer: {
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    inputLabel: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
    },
    inputDark: {
        backgroundColor: '#374151',
        borderColor: '#4B5563',
        color: '#FFFFFF',
    },
    promoCodeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    promoCodeInput: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
    },
    verifyButton: {
        marginLeft: 8,
        backgroundColor: '#4B5563',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 80,
    },
    verifyingButton: {
        backgroundColor: '#F59E0B',
    },
    validButton: {
        backgroundColor: '#4CAF50',
    },
    invalidButton: {
        backgroundColor: '#EF4444',
    },
    verifyButtonText: {
        color: '#FFFFFF',
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '600',
    },
    promoCodeValidContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    promoCodeValidText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#4CAF50',
        marginLeft: 8,
    },
    promoCodeErrorText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#EF4444',
        marginTop: 8,
    },
    promoCodeDisabledContainer: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 16,
    },
    promoCodeDisabledText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#6B7280',
        fontStyle: 'italic',
    },
    paymentMethodsContainer: {
        marginTop: 8,
    },
    paymentMethodsTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    paymentMethodButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    paymentMethodContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    paymentMethodText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 12,
    },
    paymentButtonDisabledMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        padding: 8,
    },
    paymentButtonDisabledText: {
        fontSize: 14,
        marginLeft: 8,
        color: '#9CA3AF',
        fontStyle: 'italic',
    },
    processingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    processingText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        textAlign: 'center',
    },
    cancelButton: {
        marginTop: 24,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: '#EF4444',
        borderRadius: 8,
    },
    cancelButtonText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: '#EF4444',
        fontWeight: '500',
    },
    verifyingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    verifyingAnimation: {
        width: 200,
        height: 300,
    },
    verifyingTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 20,
        fontWeight: '700',
        marginTop: 16,
        marginBottom: 8,
    },
    verifyingMessage: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        color: '#6B7280',
    },
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    successAnimation: {
        width: 200,
        height: 200,
    },
    successTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 24,
        fontWeight: '700',
        marginTop: 16,
        marginBottom: 8,
        color: '#4CAF50',
    },
    successMessage: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
    },
    successButtonsContainer: {
        width: '100%',
        gap: 12,
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#4CAF50',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#4CAF50',
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
    },
    failedContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    failedAnimation: {
        width: 200,
        height: 200,
    },
    failedTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 24,
        fontWeight: '700',
        marginTop: 16,
        marginBottom: 8,
        color: '#EF4444',
    },
    failedMessage: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        color: '#6B7280',
    },
    retryButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
    },
    canceledContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    canceledTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 24,
        fontWeight: '700',
        marginTop: 16,
        marginBottom: 8,
        color: '#F87171',
    },
    canceledMessage: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        color: '#6B7280',
    },
    noInstallmentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    noInstallmentText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        color: '#6B7280',
    },
    installmentDetailsContainer: {
        flex: 1,
        padding: 16,
    },
    installmentHeader: {
        marginBottom: 24,
    },
    installmentTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 8,
    },
    installmentSubtitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: '#6B7280',
    },
    installmentProgressContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    installmentProgressContainerDark: {
        backgroundColor: '#374151',
    },
    installmentProgressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    installmentProgressTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
    },
    installmentProgressValue: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '700',
        color: '#4CAF50',
    },
    installmentProgressBar: {
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        overflow: 'hidden',
    },
    installmentProgressFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 4,
    },
    installmentInfoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    installmentInfoCardDark: {
        backgroundColor: '#374151',
    },
    installmentInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    installmentInfoLabel: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#6B7280',
    },
    installmentInfoValue: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '600',
    },
    nextPaymentCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    nextPaymentCardDark: {
        backgroundColor: '#374151',
    },
    nextPaymentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    nextPaymentTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    nextPaymentInfo: {
        alignItems: 'center',
        marginBottom: 16,
    },
    nextPaymentDate: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    nextPaymentDays: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
    },
    nextPaymentDaysUrgent: {
        color: '#EF4444',
        fontWeight: '600',
    },
    nextPaymentAmount: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 20,
        fontWeight: '700',
        color: '#4CAF50',
    },
    payNowButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    payNowButtonText: {
        color: '#FFFFFF',
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
    },
    paymentHistoryContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    paymentHistoryContainerDark: {
        backgroundColor: '#374151',
    },
    paymentHistoryTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    paymentHistoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    paymentHistoryItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    paymentHistoryItemIcon: {
        marginRight: 12,
    },
    paymentHistoryItemTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '600',
    },
    paymentHistoryItemDate: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        color: '#6B7280',
    },
    paymentHistoryItemAmount: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '600',
    },
    backButton: {
        backgroundColor: '#4B5563',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 24,
    },
    backButtonText: {
        color: '#FFFFFF',
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
    },
    fallbackContainer: {
        marginTop: 20,
        marginBottom: 20,
        padding: 15,
        borderRadius: 8,
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#F59E0B',
        width: '100%',
        alignItems: 'center',
    },
    fallbackMessage: {
        color: '#92400E',
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 10,
    },
    fallbackButton: {
        backgroundColor: '#F59E0B',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    fallbackButtonText: {
        color: '#FFFFFF',
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ProgramPaymentPage;