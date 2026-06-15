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
  Dimensions,
  Keyboard
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import LottieView from 'lottie-react-native';

import * as Crypto from 'expo-crypto';

import { logger } from '@/utils/logger';
import { theme } from '@/constants/theme';
import { useCompetitionPayment } from '@/hooks/useCompetitionPayment';
import { HapticType, useHaptics } from '@/hooks/useHaptics';
import { CompetitionPaymentService } from '@/services/competition-payment.service';
import { PawaPayService, pawapayFailureMessage } from '@/lib/pawapay';
import WhatsAppContact from '@/components/WhatsappSupport';

interface CompetitionPaymentBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  competitionId: string;
  competitionName: string;
  documentCount?: number;
  onPaymentSuccess?: () => void;
}

// Get screen dimensions for modal sizing
const { height } = Dimensions.get('window');

// Competition unlock price (FCFA). In dev builds (__DEV__) we charge a tiny test
// amount so PawaPay test deposits don't cost the full price. The DB/display price
// stays 2000 in production. PawaPay MTN_MOMO_CMR minimum is 1 XAF (we use 100 to
// avoid operator rejection of micro-amounts) — change DEV_TEST_AMOUNT if needed.
const COMPETITION_PRICE = 2000;
const DEV_TEST_AMOUNT = 100;
const COMPETITION_PAYMENT_AMOUNT = __DEV__ ? DEV_TEST_AMOUNT : COMPETITION_PRICE;

export const CompetitionPaymentBottomSheet = ({
  visible,
  onClose,
  competitionId,
  competitionName,
  documentCount,
  onPaymentSuccess
}: CompetitionPaymentBottomSheetProps) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const verificationMessages = [
    'En attente de validation sur votre téléphone...',
    'Une fois validé , La vérification peut prendre jusqu\'à 5 minutes...'
  ];
  const [phoneNumber, setPhoneNumber] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [processingState, setProcessingState] = useState<'idle' | 'processing' | 'verifying' | 'success' | 'failed' | 'canceled' | 'existing_payment'>('idle');
  const [currentTrxReference, setCurrentTrxReference] = useState<string | null>(null);
  const [paymentRowId, setPaymentRowId] = useState<string | null>(null);
  const [isStatusCheckActive, setIsStatusCheckActive] = useState(false);
  const [statusCheckInterval, setStatusCheckInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shouldIgnoreOldStatus, setShouldIgnoreOldStatus] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { trigger } = useHaptics();

  const {
    paymentStatus,
    loading,
    latestPayment,
    latestPaymentLoading,
    authorizationUrl,
    chargeError,
    getLatestPayment,
    isFinalStatus,
    initiateDirectPayment,
    cancelPayment,
    verifyPaymentStatus,
    invalidateAccessCache
  } = useCompetitionPayment();
  void promoCode;
  void latestPaymentLoading;
  // NotchPay helpers kept by the hook but unused now that manuel payments use PawaPay.
  void initiateDirectPayment;
  void cancelPayment;

  const normalizedCompetitionName = competitionName?.trim() || 'ce concours';
  const hasDocumentCount = typeof documentCount === 'number' && documentCount > 0;
  const documentCountLabel = hasDocumentCount
    ? `${documentCount} ${documentCount === 1 ? 'document' : 'documents'}`
    : 'tous les documents disponibles';
  const subjectCountLabel = hasDocumentCount
    ? `${documentCount} ${documentCount === 1 ? 'sujet' : 'sujets'}`
    : 'tous les sujets disponibles';
  const paymentDescription = hasDocumentCount
    ? `Payez 2000 FCFA pour débloquer ${subjectCountLabel} du concours ${normalizedCompetitionName}.`
    : `Payez 2000 FCFA pour accéder à tous les sujets du concours ${normalizedCompetitionName}.`;


  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((current) => (current + 1) % verificationMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Check for existing payments when the component becomes visible
  useEffect(() => {

    if (visible) {
      const checkExistingPayment = async () => {
        try {


          const payment = await getLatestPayment(competitionId);

          if (payment) {
            // If payment result has already been seen, start fresh
            if (payment.has_seen_results === true) {
              setProcessingState('idle');
              // Pre-fill phone number from previous payment for convenience
              if (payment.phone_number) {
                setPhoneNumber(payment.phone_number ?? '');
              }
            }
            // If payment is not in a final status, set up for verification
            else if (!isFinalStatus(payment.payment_status)) {
              setProcessingState('verifying');
              setCurrentTrxReference(payment.payment_reference);
              setIsStatusCheckActive(true);

              // Pre-fill phone number from existing payment
              setPhoneNumber(payment.phone_number ?? '');
            }
            // If payment is in a final status and not yet seen, show the result
            else {
              setCurrentTrxReference(payment.payment_reference);

              // Show the appropriate final state
              if (payment.payment_status === 'completed') {
                setProcessingState('success');
              } else if (payment.payment_status === 'failed') {
                setProcessingState('failed');
              } else if (payment.payment_status === 'canceled') {
                setProcessingState('canceled');
              }
            }
          }
        } catch (error) {
          logger.error('Error checking existing payment:', error);
        }
      };

      checkExistingPayment();
    } else {
      // Reset state when modal is closed
      resetState();
    }
  }, [visible, competitionId]);

  // Handle payment status changes
  useEffect(() => {
    // CRITICAL: Only process status changes when we are ACTIVELY verifying a payment
    // This prevents old payment statuses from interfering
    if (processingState !== 'verifying') {
      return;
    }

    // Ignore all status changes if we explicitly marked to ignore old statuses
    if (shouldIgnoreOldStatus) {
      return;
    }

    // CRITICAL: Only accept status changes if the payment matches our current transaction
    if (!currentTrxReference) {
      return;
    }
    
    // CRITICAL: latestPayment MUST have our payment_reference - this prevents processing old statuses
    // before the first payment reload completes
    if (!latestPayment?.payment_reference || latestPayment.payment_reference !== currentTrxReference) {
      return;
    }

    // Don't change state if payment has already been seen
    if (latestPayment?.has_seen_results === true) {
      return;
    }

    if (['completed', 'canceled', 'failed'].includes(paymentStatus)) {
      setIsStatusCheckActive(false);

      if (paymentStatus === 'canceled') {
        setProcessingState('canceled');
        invalidateAccessCache(competitionId);
      }
      if (paymentStatus === 'completed') {
        setProcessingState('success');
        
        invalidateAccessCache(competitionId);
        setTimeout(() => {
          onPaymentSuccess?.();
        }, 500);
      }
      if (paymentStatus === 'failed') {
        setProcessingState('failed');
        invalidateAccessCache(competitionId);
      }
    }
  }, [paymentStatus, competitionId, processingState, shouldIgnoreOldStatus, currentTrxReference, latestPayment?.payment_reference, latestPayment?.has_seen_results, invalidateAccessCache, onPaymentSuccess, getLatestPayment]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  // PawaPay verification polling — polls the backoffice, which syncs our DB row.
  useEffect(() => {
    if (!(currentTrxReference && isStatusCheckActive && processingState === 'verifying')) {
      return;
    }

    let elapsedSeconds = 0;
    const interval = setInterval(async () => {
      elapsedSeconds += 5;
      const res = await PawaPayService.checkStatus(currentTrxReference);

      if (res.status === 'completed') {
        setIsStatusCheckActive(false);
        setProcessingState('success');
        invalidateAccessCache(competitionId);
        setTimeout(() => onPaymentSuccess?.(), 500);
      } else if (res.status === 'failed') {
        setIsStatusCheckActive(false);
        setProcessingState('failed');
        setErrorMessage(pawapayFailureMessage(res.failureCode));
        invalidateAccessCache(competitionId);
      } else if (elapsedSeconds >= 300) {
        // 5 min timeout — stop polling, let the user retry / contact support.
        setIsStatusCheckActive(false);
        setProcessingState('failed');
        setErrorMessage("Le délai de vérification a expiré. Si le montant a été débité, contactez le support.");
      }
    }, 5000);

    setStatusCheckInterval(interval);
    return () => clearInterval(interval);
    // invalidateAccessCache / onPaymentSuccess are intentionally excluded: they change
    // identity every render and would cause an infinite re-run loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrxReference, isStatusCheckActive, processingState, competitionId]);

  // Handle keyboard events
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const handleInitiatePayment = async () => {
    if (!phoneNumber) {
      setErrorMessage('Veuillez entrer votre numéro de téléphone');
      return;
    }

    const phoneRegex = /^(6[4-9][0-9])[0-9]{6}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setErrorMessage('Numéro de téléphone invalide. Utilisez un numéro MTN ou Orange (ex: 650123456)');
      return;
    }

    setErrorMessage(null);
    setProcessingState('processing');
    trigger(HapticType.MEDIUM);

    try {
      const depositId = Crypto.randomUUID();

      // 1. Create the payment intent row first (the server requires it before charging).
      const payment = await CompetitionPaymentService.createPayment(
        competitionId,
        phoneNumber,
        COMPETITION_PAYMENT_AMOUNT,
        depositId
      );
      setPaymentRowId(payment.id);

      // 2. Ask the backoffice to initiate the PawaPay deposit (PIN prompt on the phone).
      const result = await PawaPayService.initiateDeposit({
        depositId,
        phoneNumber,
        amount: COMPETITION_PAYMENT_AMOUNT,
        customerMessage: 'Elearn Prepa',
      });

      if (!result.ok) {
        const code = (result.failureReason as { failureCode?: string })?.failureCode;
        setProcessingState('failed');
        setErrorMessage(
          code
            ? pawapayFailureMessage(code)
            : result.error || "Le paiement n'a pas pu être initié. Vérifiez votre numéro et réessayez."
        );
        if (payment.id) {
          CompetitionPaymentService.setStatus(payment.id, 'failed').catch(() => {});
        }
        return;
      }

      // 3. Deposit accepted → verify by polling the server (the verification effect below).
      setCurrentTrxReference(depositId);
      setShouldIgnoreOldStatus(false);
      setProcessingState('verifying');
      setIsStatusCheckActive(true);
    } catch (error) {
      logger.error('PawaPay payment initiation error:', error);
      setProcessingState('failed');
      setErrorMessage(error instanceof Error ? error.message : 'Une erreur est survenue lors du paiement');
    }
  };

  const handleCancel = async () => {
    trigger(HapticType.LIGHT);

    // Stop verifying and mark our intent row canceled. (This does not reverse an
    // already-approved mobile-money deposit — the customer simply ignores the PIN prompt.)
    if (processingState === 'verifying' || processingState === 'processing') {
      if (paymentRowId) {
        await CompetitionPaymentService.setStatus(paymentRowId, 'canceled').catch(() => {});
      }
    }

    // Mark as seen before closing if in a final state
    if (['success', 'failed', 'canceled'].includes(processingState) && latestPayment?.id) {
      await CompetitionPaymentService.markAsSeen(latestPayment.id);
      // Reload to get updated has_seen_results
      await getLatestPayment(competitionId);
    }

    resetState();
    onClose();
  };

  const handleClose = async () => {
    trigger(HapticType.LIGHT);
    
    // Mark as seen before closing if in a final state
    if (['success', 'failed', 'canceled'].includes(processingState) && latestPayment?.id) {
      await CompetitionPaymentService.markAsSeen(latestPayment.id);
      // Reload to get updated has_seen_results
      await getLatestPayment(competitionId);
    }
    
    resetState();
    onClose();
  };

  const resetState = () => {
    setPhoneNumber('');
    setPromoCode('');
    setProcessingState('idle');
    setCurrentTrxReference(null);
    setPaymentRowId(null);
    setIsStatusCheckActive(false);
    setErrorMessage(null);
    setShouldIgnoreOldStatus(false);

    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }
  };


  // No longer needed with react-native-modal

  // Function to handle verifying an existing payment
  const handleVerifyExistingPayment = async () => {
    if (currentTrxReference) {
      setProcessingState('verifying');
      setIsStatusCheckActive(true);

      try {
        await verifyPaymentStatus(currentTrxReference);
      } catch (error) {
        logger.error('Error verifying payment:', error);
      }
    }
  };

  // Function to start a new payment (after cancelling existing one if needed)
  const handleStartNewPayment = async () => {
    try {
      // Block ALL old status changes
      setShouldIgnoreOldStatus(true);
      
      // STOP any active status checking FIRST
      setIsStatusCheckActive(false);
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        setStatusCheckInterval(null);
      }

      // Mark current payment as seen before starting a new one
      if (latestPayment?.id) {
        await CompetitionPaymentService.markAsSeen(latestPayment.id);
      }

      // Don't cancel - just mark as seen and reset UI
      // Cancelling would trigger DB changes and cause unwanted status updates

      // Reset state IMMEDIATELY to show fresh form
      setProcessingState('idle');
      setErrorMessage(null);
      setCurrentTrxReference(null);
      
      // Don't reload payment here - it will be reloaded when user initiates new payment
    } catch (error) {
      logger.error('[PaymentSheet] Error starting new payment:', error);
      // Even on error, show fresh form
      setProcessingState('idle');
      setErrorMessage(null);
      setCurrentTrxReference(null);
    }
  };

  const renderContent = () => {
    switch (processingState) {
      case 'existing_payment':
        if (!latestPayment) return null;

        return (
          <View style={styles.statusContainer}>
            <Text style={[styles.statusTitle, isDark && styles.statusTitleDark]}>
              Paiement existant
            </Text>

            <View style={styles.paymentInfoContainer}>
              <Text style={[styles.paymentInfoLabel, isDark && styles.paymentInfoLabelDark]}>
                Statut:
              </Text>
              <Text style={[
                styles.paymentInfoValue,
                isDark && styles.paymentInfoValueDark,
                latestPayment.payment_status === 'completed' && styles.statusCompleted,
                latestPayment.payment_status === 'failed' && styles.statusFailed,
                latestPayment.payment_status === 'canceled' && styles.statusCanceled,
                !isFinalStatus(latestPayment.payment_status) && styles.statusPending
              ]}>
                {latestPayment.payment_status === 'completed' ? 'Complété' :
                 latestPayment.payment_status === 'failed' ? 'Échoué' :
                 latestPayment.payment_status === 'canceled' ? 'Annulé' :
                 latestPayment.payment_status === 'pending' ? 'En attente' :
                 latestPayment.payment_status === 'initialized' ? 'Initialisé' :
                 latestPayment.payment_status}
              </Text>
            </View>

            <View style={styles.paymentInfoContainer}>
              <Text style={[styles.paymentInfoLabel, isDark && styles.paymentInfoLabelDark]}>
                Montant:
              </Text>
              <Text style={[styles.paymentInfoValue, isDark && styles.paymentInfoValueDark]}>
                {latestPayment.amount} FCFA
              </Text>
            </View>

            <View style={styles.paymentInfoContainer}>
              <Text style={[styles.paymentInfoLabel, isDark && styles.paymentInfoLabelDark]}>
                Date:
              </Text>
              <Text style={[styles.paymentInfoValue, isDark && styles.paymentInfoValueDark]}>
                {latestPayment.created_at ? new Date(latestPayment.created_at).toLocaleDateString() : '--'}
              </Text>
            </View>

            <View style={styles.paymentInfoContainer}>
              <Text style={[styles.paymentInfoLabel, isDark && styles.paymentInfoLabelDark]}>
                Téléphone:
              </Text>
              <Text style={[styles.paymentInfoValue, isDark && styles.paymentInfoValueDark]}>
                {latestPayment.phone_number}
              </Text>
            </View>

            {!isFinalStatus(latestPayment.payment_status) ? (
              <>
                <TouchableOpacity
                  style={styles.verifyButton}
                  onPress={handleVerifyExistingPayment}
                >
                  <MaterialCommunityIcons name="refresh" size={20} color="#FFFFFF" />
                  <Text style={styles.verifyButtonText}>Vérifier le statut</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleStartNewPayment}
                >
                  <Text style={styles.cancelButtonText}>Annuler et faire un nouveau paiement</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {latestPayment.payment_status !== 'completed' && (
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={handleStartNewPayment}
                  >
                    <MaterialCommunityIcons name="cash" size={20} color="#FFFFFF" />
                    <Text style={styles.retryButtonText}>Faire un nouveau paiement</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                >
                  <Text style={styles.cancelButtonText}>Fermer</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        );

      case 'idle':
        return (
          <ScrollView 
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            <View style={styles.formContainer}>
              <Text style={[styles.title, isDark && styles.titleDark]}>
                Accéder aux sujets de {normalizedCompetitionName}
              </Text>

              <Text style={[styles.description, isDark && styles.descriptionDark]}>
                {paymentDescription}
              </Text>

              <View style={[styles.contextCard, isDark && styles.contextCardDark]}>
                <View style={styles.contextRow}>
                  <Text style={[styles.contextLabel, isDark && styles.contextLabelDark]}>
                    Concours
                  </Text>
                  <Text style={[styles.contextValue, isDark && styles.contextValueDark]}>
                    {normalizedCompetitionName}
                  </Text>
                </View>
                <View style={styles.contextRow}>
                  <Text style={[styles.contextLabel, isDark && styles.contextLabelDark]}>
                    Documents inclus
                  </Text>
                  <Text style={[styles.contextValue, isDark && styles.contextValueDark]}>
                    {documentCountLabel}
                  </Text>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, isDark && styles.inputLabelDark]}>
                  Numéro de téléphone (MTN ou Orange)
                </Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  placeholder="Ex: 650123456"
                  placeholderTextColor={isDark ? theme.color.gray[500] : theme.color.gray[400]}
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />
              </View>



              {errorMessage && (
                <Text style={styles.errorText}>{errorMessage}</Text>
              )}

              <TouchableOpacity
                style={styles.payButton}
                onPress={handleInitiatePayment}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="cash" size={20} color="#FFFFFF" />
                    <Text style={styles.payButtonText}>Payer maintenant</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.securePaymentContainer}>
                <MaterialCommunityIcons
                  name="shield-check"
                  size={16}
                  color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
                />
                <Text style={[styles.securePaymentText, isDark && styles.securePaymentTextDark]}>
                  Paiement sécurisé via MTN ou Orange Money
                </Text>
              </View>

              <WhatsAppContact 
                message={`Bonjour, j'ai besoin d'aide concernant le paiement pour ${normalizedCompetitionName}`}
                style={{ marginTop: 16, marginHorizontal: 0 }}
              />
            </View>
          </ScrollView>
        );

      case 'processing':
        return (
          <View style={styles.statusContainer}>
            <View style={styles.iconContainer}>
              <LottieView
                source={require('@/assets/animations/payment-loading.json')}
                autoPlay
                loop
                resizeMode="contain"
                speed={1}
                style={styles.lottieAnimation}
              />
            </View>
            <Text style={[styles.statusTitle, isDark && styles.statusTitleDark]}>
              Traitement en cours...
            </Text>
            <Text style={[styles.statusDescription, isDark && styles.statusDescriptionDark]}>
              Nous initialisons votre paiement. Veuillez patienter.
            </Text>
            
            <WhatsAppContact 
              message={`Bonjour, j'ai besoin d'aide concernant le paiement pour ${normalizedCompetitionName}`}
              style={{ marginTop: 24 }}
            />
          </View>
        );

      case 'verifying':


        return (
            <View style={styles.statusContainer}>
              <View style={styles.iconContainer}>
                <LottieView
                    source={require('@/assets/animations/payment-loading.json')}
                    autoPlay
                    loop
                    resizeMode="contain"
                    speed={1}
                    style={styles.lottieAnimation}
                />
              </View>
              <Text style={[styles.statusTitle, isDark && styles.statusTitleDark]}>
                Vérification du paiement...
              </Text>
              <Text style={[styles.statusDescription, isDark && styles.statusDescriptionDark]}>
                {verificationMessages[currentMessageIndex]}
              </Text>

            {authorizationUrl  && (
              <TouchableOpacity
                style={styles.fallbackButton}
                onPress={() => Linking.openURL(authorizationUrl)}
              >
                <MaterialCommunityIcons name="open-in-new" size={20} color="#FFFFFF" />
                <Text style={styles.fallbackButtonText}>Ouvrir la page de paiement</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Annuler le paiement</Text>
            </TouchableOpacity>
            
            <WhatsAppContact 
              message={`Bonjour, j'ai besoin d'aide concernant le paiement pour ${normalizedCompetitionName}`}
              style={{ marginTop: 16, width: '100%' }}
            />
          </View>
        );

      case 'success':
        return (
          <View style={styles.statusContainer}>
            <View style={styles.iconContainer}>
              <LottieView
                source={require('@/assets/animations/payment-success.json')}
                autoPlay
                loop={false}
                resizeMode="contain"
                speed={1}
                style={styles.lottieAnimation}
              />
            </View>
            <Text style={[styles.statusTitle, isDark && styles.statusTitleDark]}>
              Paiement réussi !
            </Text>
            <Text style={[styles.statusDescription, isDark && styles.statusDescriptionDark]}>
              {`Vous avez maintenant accès à ${subjectCountLabel} du concours ${normalizedCompetitionName}.`}
            </Text>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={handleClose}
            >
              <Text style={styles.doneButtonText}>Accéder aux sujets</Text>
            </TouchableOpacity>
            
            <WhatsAppContact 
              message={`Bonjour, j'ai besoin d'aide concernant mon accès à ${normalizedCompetitionName}`}
              style={{ marginTop: 16, width: '100%' }}
            />
          </View>
        );

      case 'failed':
        return (
          <View style={styles.statusContainer}>
            <View style={styles.iconContainer}>
              <LottieView
                source={require('@/assets/animations/payment-failed.json')}
                autoPlay
                loop={false}
                resizeMode="contain"
                speed={1}
                style={styles.lottieAnimation}
              />
            </View>
            <Text style={[styles.statusTitle, isDark && styles.statusTitleDark]}>
              Paiement échoué
            </Text>
            <Text style={[styles.statusDescription, isDark && styles.statusDescriptionDark]}>
              {errorMessage || chargeError || "Une erreur est survenue lors du paiement. Veuillez réessayer."}
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleStartNewPayment}
            >
              <MaterialCommunityIcons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Fermer</Text>
            </TouchableOpacity>
            
            <WhatsAppContact 
              message={`Bonjour, mon paiement pour ${normalizedCompetitionName} a échoué. J'ai besoin d'aide.`}
              style={{ marginTop: 16, width: '100%' }}
            />
          </View>
        );

      case 'canceled':
        return (
          <View style={styles.statusContainer}>
            <View style={styles.iconContainer}>
              <LottieView
                source={require('@/assets/animations/payment-canceled.json')}
                autoPlay
                loop={false}
                resizeMode="contain"
                speed={1}
                style={styles.lottieAnimation}
              />
            </View>
            <Text style={[styles.statusTitle, isDark && styles.statusTitleDark]}>
              Paiement annulé
            </Text>
            <Text style={[styles.statusDescription, isDark && styles.statusDescriptionDark]}>
              Vous avez annulé le paiement. Aucun montant n'a été débité.
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleStartNewPayment}
            >
              <MaterialCommunityIcons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Fermer</Text>
            </TouchableOpacity>
            
            <WhatsAppContact 
              message={`Bonjour, j'ai besoin d'aide concernant le paiement pour ${normalizedCompetitionName}`}
              style={{ marginTop: 16, width: '100%' }}
            />
          </View>
        );
    }
  };

  return (
      <Modal
          isVisible={visible}
          onBackdropPress={handleClose}
          onBackButtonPress={handleClose}
          onSwipeComplete={handleClose}
          swipeDirection={['up']}
          style={styles.modal}
          backdropOpacity={0.5}
          animationIn="slideInUp"
          animationOut="slideOutDown"
          animationInTiming={300}
          animationOutTiming={300}
          backdropTransitionInTiming={300}
          backdropTransitionOutTiming={300}
          propagateSwipe={Platform.OS === 'ios'}
          useNativeDriver={true}
          statusBarTranslucent
          deviceHeight={height}
          avoidKeyboard={true}
          hasBackdrop={true}
      >

      <View style={[
        styles.modalContent, 
        isDark && styles.modalContentDark,
        keyboardHeight > 0 && { marginBottom: keyboardHeight }
      ]}>

        <View style={[styles.modalHandle, isDark && styles.modalHandleDark]} />
        {renderContent()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  paymentInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
        paddingBottom: 20,

    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.color.gray[100],
    borderRadius: theme.border.radius.small,
  },
  paymentInfoLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: '500',
    color: theme.color.gray[700],
  },
  paymentInfoLabelDark: {
    color: theme.color.gray[300],
  },
  paymentInfoValue: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: theme.color.gray[900],
  },
  paymentInfoValueDark: {
    color: theme.color.gray[100],
  },
  statusCompleted: {
    color: theme.color.success[500],
  },
  statusFailed: {
    color: theme.color.error[500],
  },
  statusCanceled: {
    color: theme.color.warning[500],
  },
  statusPending: {
    color: theme.color.info[500],
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.info[500],
    borderRadius: theme.border.radius.small,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    width: '100%',
  },
  verifyButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    minHeight: height * 0.5,
    maxHeight: height * 0.85,
  },
  modalContentDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: theme.color.gray[400],
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  modalHandleDark: {
    backgroundColor: theme.color.gray[600],
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
  },
  formContainer: {
    padding: 24,
    width: '100%',
    minHeight: 300,
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  titleDark: {
    color: '#FFFFFF',
  },
  description: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: theme.color.gray[600],
    marginBottom: 24,
  },
  descriptionDark: {
    color: theme.color.gray[400],
  },
  contextCard: {
    backgroundColor: theme.color.primary[50],
    borderRadius: theme.border.radius.medium,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.color.primary[100],
  },
  contextCardDark: {
    backgroundColor: theme.color.dark.background.primary,
    borderColor: theme.color.dark.border,
  },
  contextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  contextLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    fontWeight: '500',
    color: theme.color.gray[700],
  },
  contextLabelDark: {
    color: theme.color.gray[400],
  },
  contextValue: {
    flex: 1,
    textAlign: 'right',
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: '700',
    color: theme.color.gray[900],
  },
  contextValueDark: {
    color: '#FFFFFF',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  inputLabelDark: {
    color: '#FFFFFF',
  },
  input: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    backgroundColor: theme.color.gray[100],
    borderRadius: theme.border.radius.small,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#1A1A1A',
  },
  inputDark: {
    backgroundColor: theme.color.dark.background.tertiary,
    color: '#FFFFFF',
  },
  errorText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.error,
    marginBottom: 16,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.primary[500],
    borderRadius: theme.border.radius.small,
    paddingVertical: 16,
    marginTop: 8,
  },
  payButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  securePaymentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  securePaymentText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[600],
    marginLeft: 8,
  },
  securePaymentTextDark: {
    color: theme.color.gray[400],
  },
  statusContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 300,
  },
  iconContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 24,
  },
  lottieAnimation: {
    width: 200,
    height: 200,
  },
  statusTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  statusTitleDark: {
    color: '#FFFFFF',
  },
  statusDescription: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: theme.color.gray[600],
    marginBottom: 24,
    textAlign: 'center',
  },
  statusDescriptionDark: {
    color: theme.color.gray[400],
  },
  fallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.primary[500],
    borderRadius: theme.border.radius.small,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    width: '100%',
  },
  fallbackButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: theme.color.primary[500],
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.primary[500],
    borderRadius: theme.border.radius.small,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
  },
  doneButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.primary[500],
    borderRadius: theme.border.radius.small,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    width: '100%',
  },
  retryButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

export default CompetitionPaymentBottomSheet;
