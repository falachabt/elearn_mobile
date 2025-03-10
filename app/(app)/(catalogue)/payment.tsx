import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, useColorScheme, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useCart } from '@/hooks/useCart';
import { usePayment } from '@/hooks/usePayment';
import { NotchPayService } from '@/lib/notchpay';
import * as Animatable from 'react-native-animatable';
import LottieView from 'lottie-react-native';
import { useAuth } from '@/contexts/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type ProcessingState = 'idle' | 'processing' | 'waiting';

export default function PaymentScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [error, setError] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [network, setNetwork] = useState<'mtn' | 'orange' | null>(null);
  const { cartItems, currentCart } = useCart();
  const { paymentStatus, initiatePayment, cancelPayment } = usePayment();
  const { user } = useAuth();
  const [showExtendedMessage, setShowExtendedMessage] = useState(false);

  const totalAmount = 10; // For test, use actual calculation in production

  useEffect(() => {
    if (['completed', 'canceled', 'failed'].includes(paymentStatus)) {
      setProcessingState('idle');
    }
    if(paymentStatus === 'canceled') {
      setError('Le paiement a été annulé');
    }
  }, [paymentStatus]);

  // Extended message timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (processingState === 'processing') {
      timer = setTimeout(() => {
        setShowExtendedMessage(true);
      }, 5000);
    } else {
      setShowExtendedMessage(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [processingState]);

  const validatePhoneNumber = (number: string) => {
    if (!number || number.length !== 9) return false;
    if (!number.startsWith('6')) return false;
    const prefix = number.substring(1, 3);
    const prefixNum = parseInt(prefix);
    return (
        (prefixNum >= 50 && prefixNum <= 54) ||
        (prefixNum >= 70 && prefixNum <= 79) ||
        (prefixNum >= 80 && prefixNum <= 84) ||
        (prefixNum >= 55 && prefixNum <= 59) ||
        (prefixNum >= 90 && prefixNum <= 99) ||
        (prefixNum >= 85 && prefixNum <= 89)
    );
  };

  const determineNetwork = (number: string) => {
    if (!number || number.length < 3 || !number.startsWith('6')) return null;
    const prefix = number.substring(1, 3);
    const prefixNum = parseInt(prefix);
    if (
        (prefixNum >= 50 && prefixNum <= 54) ||
        (prefixNum >= 70 && prefixNum <= 79) ||
        (prefixNum >= 80 && prefixNum <= 84)
    ) {
      return 'mtn';
    }
    if (
        (prefixNum >= 55 && prefixNum <= 59) ||
        (prefixNum >= 90 && prefixNum <= 99) ||
        (prefixNum >= 85 && prefixNum <= 89)
    ) {
      return 'orange';
    }
    return null;
  };

  const handlePhoneChange = (text: string) => {
    const numericOnly = text.replace(/[^0-9]/g, '');
    if (numericOnly.length <= 9) {
      setPhoneNumber(numericOnly);
      setNetwork(determineNetwork(numericOnly));
      setError('');
    }
  };

  const handleDialCode = () => {
    const code = network === 'mtn' ? '*126#' : '#150*50#';
    Linking.openURL(`tel:${code}`);
  };

  const handleInitiatePayment = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      setError('Numéro de téléphone invalide');
      return;
    }
    if (!network) {
      setError('Réseau mobile non reconnu');
      return;
    }

    try {
      setProcessingState('processing');
      setError('');

      const notchpay = new NotchPayService();
      const result = await notchpay.initiateDirectCharge({
        phone: phoneNumber,
        channel: network === 'orange' ? 'cm.orange' : 'cm.mtn',
        currency: 'XAF',
        amount: totalAmount,
        customer: {
          email: user?.email || 'default@gmail.com',
        },
      });

      setProcessingState('waiting');

      if (currentCart?.id) {
        await initiatePayment(
            currentCart.id,
            phoneNumber,
            totalAmount,
            result.initResponse.transaction.reference
        );
      }
    } catch (err) {
      setProcessingState('idle');
      setError(err instanceof Error ? err.message : 'Échec de l\'initialisation du paiement');
    }
  };

  const handleRetry = async () => {
    try {
      await cancelPayment();
      setProcessingState('idle');
      setError('');
      setPhoneNumber('');
      setNetwork(null);
    } catch (err) {
      // Handle error if needed
    }
  };

  const renderPaymentForm = () => (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <View style={[styles.section, isDark && styles.sectionDark]}>
          <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
            Paiement
          </Text>

          <View style={[styles.amountContainer, isDark && styles.amountContainerDark]}>
            <Text style={[styles.amountLabel, isDark && styles.amountLabelDark]}>
              Montant à payer
            </Text>
            <Text style={[styles.amount, isDark && styles.amountDark]}>
              {totalAmount.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>

          <View style={styles.phoneSection}>
            <Text style={[styles.label, isDark && styles.labelDark]}>
              Numéro Mobile Money
            </Text>
            <View style={styles.phoneInputContainer}>
              <View style={[styles.networkIndicator, isDark && styles.networkIndicatorDark]}>
                {network === 'mtn' ? (
                    <Image
                        source={require('@/assets/images/mtn-logo.png')}
                        style={styles.networkIcon}
                        resizeMode="contain"
                    />
                ) : network === 'orange' ? (
                    <Image
                        source={require('@/assets/images/orange-logo.png')}
                        style={styles.networkIcon}
                        resizeMode="contain"
                    />
                ) : (
                    <View style={[styles.placeholderIcon, isDark && styles.placeholderIconDark]} />
                )}
              </View>
              <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={phoneNumber}
                  onChangeText={handlePhoneChange}
                  placeholder="6XXXXXXXX"
                  placeholderTextColor={isDark ? theme.color.gray[500] : theme.color.gray[400]}
                  keyboardType="phone-pad"
                  maxLength={9}
              />
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
              style={[
                styles.payButton,
                isDark && styles.payButtonDark,
                (!validatePhoneNumber(phoneNumber) || !network) && styles.payButtonDisabled
              ]}
              onPress={handleInitiatePayment}
              disabled={!validatePhoneNumber(phoneNumber) || !network}
          >
            <MaterialCommunityIcons
                name="lock"
                size={20}
                color={isDark ? '#022c22' : '#FFFFFF'}
            />
            <Text style={[styles.payButtonText, isDark && styles.payButtonTextDark]}>
              Payer maintenant
            </Text>
          </TouchableOpacity>
        </View>
      </View>
  );

  // Render processing state - Initializing payment
  const renderProcessingState = () => {
    return (
        <Animatable.View
            animation="fadeIn"
            style={[styles.statusContainer, isDark && styles.statusContainerDark]}
        >
          <LottieView
              source={require("@/assets/animations/loading.json")}
              autoPlay
              loop
              style={styles.lottieAnimation}
          />
          <Text style={[styles.statusText, isDark && styles.statusTextDark]}>
            Initialisation du paiement...
          </Text>

          {showExtendedMessage && (
              <Animatable.Text
                  animation="fadeIn"
                  style={[styles.extendedMessage, isDark && styles.extendedMessageDark]}
              >
                La connexion au service de paiement prend un peu plus de temps que prévu.
                Veuillez patienter, nous finalisons l'initialisation...
              </Animatable.Text>
          )}
        </Animatable.View>
    );
  };

  // Render payment initialized state - Waiting for user to confirm on mobile
  const renderInitializedState = () => {
    return (
        <Animatable.View
            animation="fadeIn"
            style={[styles.statusContainer, isDark && styles.statusContainerDark]}
        >
          <LottieView
              source={require("@/assets/animations/payment-loading.json")}
              autoPlay
              speed={3}
              loop
              style={styles.lottieAnimation}
          />
          <Text style={[styles.statusTitle, isDark && styles.statusTitleDark]}>
            Validez le paiement
          </Text>

          <View style={styles.instructionsContainer}>
            <View style={styles.instructionRow}>
              <MaterialCommunityIcons
                  name="numeric-1-circle"
                  size={24}
                  color={theme.color.primary[500]}
              />
              <TouchableOpacity onPress={handleDialCode}>
                <Text style={[styles.instructionText, isDark && styles.instructionTextDark]}>
                  <Text style={styles.linkText}>
                    {network === 'mtn' ? 'Composez *126#' : 'Composez #150*50#'}
                  </Text> puis validez la transaction
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.instructionRow}>
              <MaterialCommunityIcons
                  name="numeric-2-circle"
                  size={24}
                  color={theme.color.primary[500]}
              />
              <Text style={[styles.instructionText, isDark && styles.instructionTextDark]}>
                Une fois validé, patientez entre{' '}
                <Text style={styles.highlightText}>1 à 3 minutes</Text>
              </Text>
            </View>

            <View style={styles.instructionRow}>
              <MaterialCommunityIcons
                  name="numeric-3-circle"
                  size={24}
                  color={theme.color.primary[500]}
              />
              <Text style={[styles.instructionText, isDark && styles.instructionTextDark]}>
                Si vous ne recevez pas de notification sur votre téléphone,{' '}
                <Text style={styles.highlightText}>vérifiez votre solde</Text> pour confirmer le débit
              </Text>
            </View>

            <View style={[styles.waitingNote, isDark && styles.waitingNoteDark]}>
              <MaterialCommunityIcons
                  name="information-outline"
                  size={20}
                  color={isDark ? theme.color.primary[300] : theme.color.primary[600]}
              />
              <Text style={[styles.waitingNoteText, isDark && styles.waitingNoteTextDark]}>
                Pendant les heures de pointe, le traitement peut prendre jusqu'à 5 minutes.
                Restez sur cette page jusqu'à la confirmation.
              </Text>
            </View>
          </View>

          <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleRetry}
          >
            <Text style={[styles.cancelButtonText, isDark && styles.cancelButtonTextDark]}>
              Annuler
            </Text>
          </TouchableOpacity>
        </Animatable.View>
    );
  };

  // Render success state
  const renderSuccessState = () => {
    return (
        <Animatable.View
            animation="fadeIn"
            style={[styles.statusContainer, isDark && styles.statusContainerDark]}
        >
          <LottieView
              source={require("@/assets/animations/payment-success.json")}
              autoPlay
              loop={false}
              style={styles.lottieAnimation}
          />
          <Text style={styles.successText}>Paiement réussi !</Text>
          <Text style={[styles.successSubtitle, isDark && styles.successSubtitleDark]}>
            Votre accès aux cours a été activé et sera disponible dans quelques instants.
          </Text>
          <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(app)/learn')}
          >
            <Text style={styles.actionButtonText}>Accéder à vos cours</Text>
          </TouchableOpacity>
        </Animatable.View>
    );
  };

  // Render failed state
  const renderFailedState = () => {
    return (
        <Animatable.View
            animation="fadeIn"
            style={[styles.statusContainer, isDark && styles.statusContainerDark]}
        >
          <LottieView
              source={require("@/assets/animations/payment-failed.json")}
              autoPlay
              loop={false}
              style={styles.lottieAnimation}
          />
          <Text style={[styles.failedText, isDark && styles.failedTextDark]}>
            Votre paiement a échoué
          </Text>
          <Text style={[styles.failedSubtitle, isDark && styles.failedSubtitleDark]}>
            Vérifiez votre solde ou essayez avec un autre numéro mobile money.
          </Text>
          <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </Animatable.View>
    );
  };

  // Conditional rendering based on payment status and processing state
  if (processingState === 'processing') {
    return renderProcessingState();
  }

  if (paymentStatus === 'initialized' || processingState === 'waiting') {
    return renderInitializedState();
  }

  if (paymentStatus === 'completed') {
    return renderSuccessState();
  }

  if (paymentStatus === 'failed') {
    return renderFailedState();
  }

  return renderPaymentForm();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: theme.spacing.medium,
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.border.radius.small,
    padding: theme.spacing.large,
    elevation: 1,
  },
  sectionDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xlarge,
    fontWeight: '700',
    color: theme.color.text,
    marginBottom: theme.spacing.large,
  },
  sectionTitleDark: {
    color: theme.color.gray[50],
  },
  amountContainer: {
    marginBottom: theme.spacing.large,
    padding: theme.spacing.medium,
    backgroundColor: theme.color.primary[50],
    borderRadius: theme.border.radius.small,
  },
  amountContainerDark: {
    backgroundColor: theme.color.dark.background.tertiary,
  },
  amountLabel: {
    fontSize: theme.typography.fontSize.small,
    color: theme.color.primary[700],
    marginBottom: theme.spacing.small,
  },
  amountLabelDark: {
    color: theme.color.primary[200],
  },
  amount: {
    fontSize: theme.typography.fontSize.xlarge,
    fontWeight: '700',
    color: theme.color.primary[700],
  },
  amountDark: {
    color: theme.color.primary[200],
  },
  phoneSection: {
    marginBottom: theme.spacing.large,
  },
  label: {
    fontSize: theme.typography.fontSize.medium,
    color: theme.color.text,
    marginBottom: theme.spacing.small,
  },
  labelDark: {
    color: theme.color.gray[50],
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.small,
  },
  networkIndicator: {
    width: 48,
    height: 48,
    backgroundColor: theme.color.gray[100],
    borderRadius: theme.border.radius.small,
    justifyContent: 'center',
    alignItems: 'center',
  },
  networkIndicatorDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  networkIcon: {
    width: 32,
    height: 32,
  },
  placeholderIcon: {
    width: 32,
    height: 32,
    backgroundColor: theme.color.gray[300],
    borderRadius: theme.border.radius.small,
  },
  placeholderIconDark: {
    backgroundColor: theme.color.gray[700],
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.border.radius.small,
    paddingHorizontal: theme.spacing.medium,
    fontSize: theme.typography.fontSize.medium,
    color: theme.color.text,
    backgroundColor: '#FFFFFF',
  },
  inputDark: {
    borderColor: theme.color.gray[700],
    backgroundColor: theme.color.dark.background.primary,
    color: theme.color.gray[50],
  },
  errorText: {
    color: theme.color.error,
    fontSize: theme.typography.fontSize.small,
    marginTop: theme.spacing.small,
    textAlign: 'center',
  },
  errorTextDark: {
    color: theme.color.error,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.primary[500],
    height: 56,
    borderRadius: theme.border.radius.medium,
    gap: theme.spacing.small,
  },
  payButtonDark: {
    backgroundColor: theme.color.primary[400],
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonText: {
    fontSize: theme.typography.fontSize.medium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  payButtonTextDark: {
    color: theme.color.dark.text.primary,
  },
  // Status container for all payment states
  statusContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.medium,
    backgroundColor: '#FFFFFF',
  },
  statusContainerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  lottieAnimation: {
    width: 200,
    height: 200,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.color.text,
    marginTop: theme.spacing.medium,
    marginBottom: theme.spacing.large,
    textAlign: 'center',
  },
  statusTitleDark: {
    color: theme.color.gray[50],
  },
  statusText: {
    fontSize: theme.typography.fontSize.large,
    color: theme.color.text,
    marginTop: theme.spacing.medium,
    textAlign: 'center',
  },
  statusTextDark: {
    color: theme.color.gray[50],
  },
  // Extended message when payment initialization takes longer
  extendedMessage: {
    fontSize: 14,
    color: theme.color.gray[600],
    textAlign: 'center',
    marginTop: theme.spacing.large,
    paddingHorizontal: theme.spacing.large,
    backgroundColor: theme.color.gray[100],
    padding: theme.spacing.medium,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: theme.color.primary[500],
  },
  extendedMessageDark: {
    color: theme.color.gray[300],
    backgroundColor: theme.color.gray[800],
  },
  // Instructions container for initialized state
  instructionsContainer: {
    width: '100%',
    marginVertical: theme.spacing.large,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.medium,
    paddingHorizontal: theme.spacing.medium,
  },
  instructionText: {
    fontSize: 16,
    color: theme.color.text,
    marginLeft: theme.spacing.small,
    flex: 1,
  },
  instructionTextDark: {
    color: theme.color.gray[50],
  },
  linkText: {
    color: theme.color.primary[500],
    textDecorationLine: 'underline',
  },
  highlightText: {
    fontWeight: '700',
    color: theme.color.primary[500],
  },
  // Waiting note for initialized state
  waitingNote: {
    flexDirection: 'row',
    backgroundColor: theme.color.primary[50],
    padding: theme.spacing.medium,
    borderRadius: 8,
    marginTop: theme.spacing.medium,
    marginHorizontal: theme.spacing.medium,
    borderLeftWidth: 3,
    borderLeftColor: theme.color.primary[500],
  },
  waitingNoteDark: {
    backgroundColor: 'rgba(6, 78, 59, 0.3)',
    borderLeftColor: theme.color.primary[400],
  },
  waitingNoteText: {
    fontSize: 13,
    color: theme.color.gray[800],
    marginLeft: theme.spacing.small,
    flex: 1,
  },
  waitingNoteTextDark: {
    color: theme.color.gray[300],
  },
  // Cancel button for initialized state
  cancelButton: {
    marginTop: theme.spacing.large,
    padding: theme.spacing.medium,
  },
  cancelButtonText: {
    color: theme.color.link,
    fontSize: theme.typography.fontSize.medium,
  },
  cancelButtonTextDark: {
    color: theme.color.primary[400],
  },
  // Success state styles
  successText: {
    fontSize: theme.typography.fontSize.large,
    color: theme.color.primary[500],
    fontWeight: '600',
    marginTop: theme.spacing.medium,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: theme.color.gray[600],
    textAlign: 'center',
    marginTop: theme.spacing.medium,
    marginBottom: theme.spacing.large,
    paddingHorizontal: theme.spacing.large,
  },
  successSubtitleDark: {
    color: theme.color.gray[400],
  },
  // Failed state styles
  failedText: {
    fontSize: theme.typography.fontSize.large,
    color: theme.color.error,
    textAlign: 'center',
    marginTop: theme.spacing.medium,
  },
  failedTextDark: {
    color: theme.color.error,
  },
  failedSubtitle: {
    fontSize: 16,
    color: theme.color.gray[600],
    textAlign: 'center',
    marginTop: theme.spacing.small,
    marginBottom: theme.spacing.large,
    paddingHorizontal: theme.spacing.large,
  },
  failedSubtitleDark: {
    color: theme.color.gray[400],
  },
  // Action buttons
  actionButton: {
    marginTop: theme.spacing.large,
    backgroundColor: theme.color.primary[500],
    paddingVertical: theme.spacing.medium,
    paddingHorizontal: theme.spacing.xlarge,
    borderRadius: theme.border.radius.medium,
    minWidth: 200,
    alignItems: 'center',
  },
  retryButton: {
    marginTop: theme.spacing.large,
    backgroundColor: theme.color.primary[500],
    paddingVertical: theme.spacing.medium,
    paddingHorizontal: theme.spacing.xlarge,
    borderRadius: theme.border.radius.medium,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.fontSize.medium,
    fontWeight: '600',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.fontSize.medium,
    fontWeight: '600',
  },
});