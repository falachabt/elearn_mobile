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
import Modal from 'react-native-modal';
import LottieView from 'lottie-react-native';

import { theme } from '@/constants/theme';
import { useCompetitionPayment } from '@/hooks/useCompetitionPayment';
import { HapticType, useHaptics } from '@/hooks/useHaptics';
import { CompetitionPaymentService } from '@/services/competition-payment.service';
import WhatsAppContact from '@/components/WhatsappSupport';

interface CompetitionPaymentBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  competitionId: string;
  competitionName: string;
  onPaymentSuccess?: () => void;
}

// Get screen dimensions for modal sizing
const { height } = Dimensions.get('window');

export const CompetitionPaymentBottomSheet = ({
  visible,
  onClose,
  competitionId,
  competitionName,
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
  const [isStatusCheckActive, setIsStatusCheckActive] = useState(false);
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    checkAccess,
    invalidateAccessCache
  } = useCompetitionPayment();


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
            // If payment is not in a final status, set up for verification
            if (!isFinalStatus(payment.payment_status)) {
              setProcessingState('verifying');
              setCurrentTrxReference(payment.payment_reference);
              setIsStatusCheckActive(true);

              // Pre-fill phone number from existing payment
              setPhoneNumber(payment.phone_number);
            }
            // If payment is in a final status but already seen, show idle form
            else if (payment.has_seen_results) {
              setProcessingState('idle');
            }
            // If payment is in a final status and not seen, show existing payment state
            else {
              setProcessingState('existing_payment');
              setCurrentTrxReference(payment.payment_reference);

              // If payment is completed, also set success state
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
          console.error('Error checking existing payment:', error);
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
    if (['completed', 'canceled', 'failed'].includes(paymentStatus)) {
      setIsStatusCheckActive(false);

      if (paymentStatus === 'canceled') {
        setProcessingState('canceled');
        // Mark as seen immediately and reload payment data
        if (latestPayment?.id) {
          CompetitionPaymentService.markAsSeen(latestPayment.id).then(async () => {
            invalidateAccessCache(competitionId);
            // Reload payment to get updated has_seen_results value
            await getLatestPayment(competitionId);
          });
        }
      }
      if (paymentStatus === 'completed') {
        setProcessingState('success');
        
        // Mark as seen immediately, invalidate cache and notify parent
        if (latestPayment?.id) {
          CompetitionPaymentService.markAsSeen(latestPayment.id).then(async () => {
            invalidateAccessCache(competitionId);
            // Reload payment to get updated has_seen_results value
            await getLatestPayment(competitionId);
            onPaymentSuccess?.();
          });
        }
      }
      if (paymentStatus === 'failed') {
        setProcessingState('failed');
        // Mark as seen immediately and reload payment data
        if (latestPayment?.id) {
          CompetitionPaymentService.markAsSeen(latestPayment.id).then(async () => {
            invalidateAccessCache(competitionId);
            // Reload payment to get updated has_seen_results value
            await getLatestPayment(competitionId);
          });
        }
      }
    }
  }, [paymentStatus, competitionId, latestPayment, invalidateAccessCache, onPaymentSuccess, getLatestPayment]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  // Handle payment verification
  useEffect(() => {
    if (currentTrxReference && isStatusCheckActive && processingState === 'verifying') {
      const interval = setInterval(async () => {
        try {
          await verifyPaymentStatus(currentTrxReference);
        } catch (error) {
          console.error('Error verifying payment:', error);
        }
      }, 5000); // Check every 5 seconds

      setStatusCheckInterval(interval);

      return () => {
        clearInterval(interval);
      };
    }

    if (['completed', 'canceled', 'failed'].includes(paymentStatus) && isStatusCheckActive) {
      setIsStatusCheckActive(false);
    }
  }, [currentTrxReference, isStatusCheckActive, paymentStatus, processingState]);

  const handleInitiatePayment = async () => {
    if (!phoneNumber) {
      setErrorMessage('Veuillez entrer votre numéro de téléphone');
      return;
    }

    // Validate phone number format
    const phoneRegex = /^(6[5-9][0-9])[0-9]{6}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setErrorMessage('Numéro de téléphone invalide. Utilisez un numéro MTN ou Orange (ex: 650123456)');
      return;
    }

    setErrorMessage(null);
    setProcessingState('processing');
    trigger(HapticType.MEDIUM);

    try {
      const result = await initiateDirectPayment(
        competitionId,
        phoneNumber,
        2000, // Fixed amount for competition payment
        undefined // No promo code for now
      );

      if (result.needsFallback && result.authorizationUrl) {
        // If direct charge failed but we have a fallback URL
        setProcessingState('verifying');
        setCurrentTrxReference(result.trxReference);
        setIsStatusCheckActive(true);

        // Open the authorization URL if needed
        if (Platform.OS !== 'web') {
          Linking.openURL(result.authorizationUrl);
        }
      } else {
        // Direct charge initiated successfully
        setProcessingState('verifying');
        setCurrentTrxReference(result.trxReference);
        setIsStatusCheckActive(true);
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      setProcessingState('failed');
      setErrorMessage(error instanceof Error ? error.message : 'Une erreur est survenue lors du paiement');
    }
  };

  const handleCancel = async () => {
    trigger(HapticType.LIGHT);

    if (processingState === 'verifying' || processingState === 'processing') {
      await cancelPayment();
    }


    resetState();
    onClose();
  };

  const handleClose = () => {
    trigger(HapticType.LIGHT);
    resetState();
    onClose();
  };

  const resetState = () => {
    setPhoneNumber('');
    setPromoCode('');
    setProcessingState('idle');
    setCurrentTrxReference(null);
    setIsStatusCheckActive(false);
    setErrorMessage(null);

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
        console.error('Error verifying payment:', error);
      }
    }
  };

  // Function to start a new payment (after cancelling existing one if needed)
  const handleStartNewPayment = async () => {
    // If there's an existing payment that's not in a final status, cancel it first
    if (latestPayment && !isFinalStatus(latestPayment.payment_status)) {
      await cancelPayment();
    }

    // Reset to idle state to show payment form
    setProcessingState('idle');
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
                {new Date(latestPayment.created_at).toLocaleDateString()}
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
          <ScrollView style={styles.scrollView}>

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.container}
            >

              <View style={styles.formContainer}>
                <Text style={[styles.title, isDark && styles.titleDark]}>
                  Accéder aux sujets de {competitionName}
                </Text>

                <Text style={[styles.description, isDark && styles.descriptionDark]}>
                  Payez 2000 FCFA pour accéder à tous les sujets de ce concours
                </Text>

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
                  message={`Bonjour, j'ai besoin d'aide concernant le paiement pour ${competitionName}`}
                  style={{ marginTop: 16, marginHorizontal: 0 }}
                />
              </View>
            </KeyboardAvoidingView>
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
              message={`Bonjour, j'ai besoin d'aide concernant le paiement pour ${competitionName}`}
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
              message={`Bonjour, j'ai besoin d'aide concernant le paiement pour ${competitionName}`}
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
              Vous avez maintenant accès à tous les sujets de {competitionName} 
            </Text>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={handleClose}
            >
              <Text style={styles.doneButtonText}>Accéder aux sujets</Text>
            </TouchableOpacity>
            
            <WhatsAppContact 
              message={`Bonjour, j'ai besoin d'aide concernant mon accès à ${competitionName}`}
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
              onPress={() => setProcessingState('idle')}
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
              message={`Bonjour, mon paiement pour ${competitionName} a échoué. J'ai besoin d'aide.`}
              style={{ marginTop: 16, width: '100%' }}
            />
          </View>
        );

      case 'canceled':
        return (
          <View style={styles.statusContainer}>
            <LottieView
              source={require('@/assets/animations/payment-canceled.json')}
              autoPlay
              loop={false}
              style={styles.lottieAnimation}
            />
            <Text style={[styles.statusTitle, isDark && styles.statusTitleDark]}>
              Paiement annulé
            </Text>
            <Text style={[styles.statusDescription, isDark && styles.statusDescriptionDark]}>
              Vous avez annulé le paiement. Aucun montant n'a été débité.
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => setProcessingState('idle')}
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
              message={`Bonjour, j'ai besoin d'aide concernant le paiement pour ${competitionName}`}
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

      <View style={[styles.modalContent, isDark && styles.modalContentDark]}>

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
    height : height * 0.5,
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
