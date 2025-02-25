import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useCart } from '@/hooks/useCart';
import { usePayment } from '@/hooks/usePayment';
import { NotchPayService } from '@/lib/notchpay';
import * as Animatable from 'react-native-animatable';
import LottieView from 'lottie-react-native';
import { useAuth } from '@/contexts/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type LoadingState = 'idle' | 'processing' | 'error';

export default function PaymentScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [network, setNetwork] = useState<'mtn' | 'orange' | null>(null);
  const { cartItems, currentCart } = useCart();
  const { paymentStatus, initiatePayment, cancelPayment } = usePayment();
  const { user } = useAuth();

  const totalAmount = 10;

  useEffect(() => {
    if (paymentStatus === 'initialized') {
      setLoadingState('idle');
    }
    if(paymentStatus === 'canceled') {
      setError('Le paiement a été annulé');
    }
  }, [paymentStatus]);

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
      setLoadingState('processing');
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

      if (currentCart?.id) {
        await initiatePayment(
          currentCart.id,
          phoneNumber,
          totalAmount,
          result.initResponse.transaction.reference
        );
      }
    } catch (err) {
      setLoadingState('error');
      setError(err instanceof Error ? err.message : 'Échec de l\'initialisation du paiement');
    }
  };

  const handleRetry = async () => {

    try {
      await cancelPayment();
      setLoadingState('idle');
      setError('');
      setPhoneNumber('');
      setNetwork(null);

    }catch (err) {  
      // setError(err instanceof Error ? err.message : 'Échec de l\'initialisation du paiement');
    }
  };

  const renderPaymentForm = () => (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.section, isDark && styles.sectionDark]}>
        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
          Paiement
        </Text>
        
        <View style={[styles.amountContainer, isDark && styles.amountcontainerDark]}>
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

  if (loadingState === 'processing') {
    return (
      <Animatable.View animation="fadeIn" style={[styles.statusContainer, isDark && styles.statusContaierDark]}>
        <LottieView
          source={require('@/assets/animations/loading.json')}
          autoPlay
          loop
          style={styles.lottieAnimation}
        />
        <Text style={[styles.statusText, isDark && styles.statusTextDark]}>
          Initialisation du paiement...
        </Text>
      </Animatable.View>
    );
  }

  if (paymentStatus === 'initialized') {
    return (
      <Animatable.View animation="fadeIn" style={[styles.statusContainer, isDark && styles.statusContaierDark]}>
        <LottieView
          source={require('@/assets/animations/payment-loading.json')}
          autoPlay
          loop
          style={styles.lottieAnimation}
        />
        <Text style={[styles.statusText, isDark && styles.statusTextDark]}>
          Validez le paiement
        </Text>
        <View style={{marginTop: theme.spacing.large}}>
          <Text style={[styles.statusText, isDark && styles.statusTextDark]}>
            <MaterialCommunityIcons name="numeric-1-circle" size={20}
                                    color={theme.color.primary[500]}/> {network === 'mtn' ? 'Composez *126#' : 'Composez #150*4#'} puis
            validez
          </Text>
          <Text style={[styles.statusText, isDark && styles.statusTextDark, {marginTop: theme.spacing.medium}]}>
            <MaterialCommunityIcons name="numeric-2-circle" size={20} color={theme.color.primary[500]}/> Une fois
            validé, patientez entre <Text style={{fontWeight: 'bold', color: theme.color.primary[500]}}>1 à 3
            minutes</Text>
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.actionButton, styles.retryButton]} 
          onPress={handleRetry}
        >
          <Text style={styles.actionButtonText}>Annuler</Text>
        </TouchableOpacity>
      </Animatable.View>
    );
  }

  if (paymentStatus === 'completed') {
    return (
      <Animatable.View animation="fadeIn" style={[styles.statusContainer, isDark && styles.statusContaierDark]}>
        <LottieView
          source={require('@/assets/animations/payment-success.json')}
          autoPlay
          loop={false}
          style={styles.lottieAnimation}
        />
        <Text style={styles.successText}>Paiement réussi !</Text>
        <TouchableOpacity 
          style={[styles.actionButton, styles.successButton]} 
          onPress={() => router.push('/(app)/learn')}
        >
          <Text style={styles.actionButtonText}>Accéder aux cours</Text>
         
        </TouchableOpacity>
      </Animatable.View>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <Animatable.View animation="fadeIn" style={[styles.statusContainer, isDark && styles.statusContaierDark]}>
        <LottieView
          source={require('@/assets/animations/payment-failed.json')}
          autoPlay
          loop={false}
          style={styles.lottieAnimation}
        />
        <Text style={[styles.errorText, isDark && styles.errorTextDark]}>
          Le paiement a échoué. Veuillez réessayer.
        </Text>
        <TouchableOpacity 
          style={[styles.actionButton, styles.retryButton]} 
          onPress={handleRetry}
        >
          <Text style={styles.actionButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </Animatable.View>
    );
  }

  return renderPaymentForm();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
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
  amountcontainerDark: {
    backgroundColor: theme.color.dark.background.tertiary
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
  statusContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.medium,
    backgroundColor: '#FFFFFF',
  },
  statusContaierDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  lottieAnimation: {
    width: 200,
    height: 200,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.medium,
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
  successText: {
    fontSize: theme.typography.fontSize.large,
    color: theme.color.primary[500],
    fontWeight: '600',
    marginTop: theme.spacing.medium,
    textAlign: 'center',
  },
  actionButton: {
    marginTop: theme.spacing.xlarge,
    paddingVertical: theme.spacing.medium,
    paddingHorizontal: theme.spacing.xlarge,
    borderRadius: theme.border.radius.medium,
    minWidth: 200,
    alignItems: 'center',
  },
  successButton: {
    backgroundColor: theme.color.primary[500],
  },
  retryButton: {
    backgroundColor: theme.color.primary[500],
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.fontSize.medium,
    fontWeight: '600',
  },
});