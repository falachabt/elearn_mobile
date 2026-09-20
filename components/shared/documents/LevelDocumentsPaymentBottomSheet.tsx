import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Linking,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';

import { logger } from '@/utils/logger';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useLevelDocumentsPayment } from '@/hooks/useLevelDocumentsPayment';
import { HapticType, useHaptics } from '@/hooks/useHaptics';
import { LevelDocumentsPaymentService } from '@/services/level-documents-payment.service';
import { PawaPayService, pawapayCheckoutUrl, pawapayFailureMessage } from '@/lib/pawapay';
import { formatPriceWithConversion, getPawaPayCharge, ExchangeRate, getExchangeRates } from '@/services/currency.service';
import { currencyForCountryName } from '@/constants/pawapayCountries';
import WhatsAppContact from '@/components/WhatsappSupport';
import {
  PhoneNumberField,
  findPhoneCountryByName,
} from '@/components/payment/PhoneNumberField';
import type { Country } from '@/components/ui/CountryPickerBottomSheet';

interface LevelDocumentsPaymentBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onPaymentSuccess?: () => void;
  levelId: string;
  levelName?: string;
}

const LEVEL_DOCUMENTS_PRICE = 1000;
const DEV_TEST_AMOUNT = 100;
const LEVEL_DOCUMENTS_PAYMENT_AMOUNT = __DEV__ ? DEV_TEST_AMOUNT : LEVEL_DOCUMENTS_PRICE;

type ProcessingState = 'idle' | 'processing' | 'verifying' | 'success' | 'failed' | 'canceled';

export const LevelDocumentsPaymentBottomSheet: React.FC<LevelDocumentsPaymentBottomSheetProps> = ({
  visible,
  onClose,
  onPaymentSuccess,
  levelId,
  levelName,
}) => {
  const { user } = useAuth();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { trigger } = useHaptics();
  const insets = useSafeAreaInsets();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [country, setCountry] = useState<Country>(() => findPhoneCountryByName(user?.country));
  const currencyCode = currencyForCountryName(country.name);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [currentTrxReference, setCurrentTrxReference] = useState<string | null>(null);
  const [paymentRowId, setPaymentRowId] = useState<string | null>(null);
  const [isStatusCheckActive, setIsStatusCheckActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { latestPayment, getLatestPayment, isFinalStatus, invalidateAccessCache } =
    useLevelDocumentsPayment(levelId);

  const priceLabel = formatPriceWithConversion(LEVEL_DOCUMENTS_PRICE, currencyCode, exchangeRates);

  useEffect(() => {
    getExchangeRates().then(setExchangeRates);
  }, []);

  useEffect(() => {
    if (!visible) {
      resetState();
      return;
    }

    const checkExistingPayment = async () => {
      const payment = await getLatestPayment();
      if (!payment) return;

      if (payment.has_seen_results === true) {
        setProcessingState('idle');
        if (payment.phone_number) setPhoneNumber(payment.phone_number);
      } else if (!isFinalStatus(payment.payment_status)) {
        setProcessingState('verifying');
        setCurrentTrxReference(payment.payment_reference);
        setPaymentRowId(payment.id);
        setIsStatusCheckActive(true);
        if (payment.phone_number) setPhoneNumber(payment.phone_number);
      } else {
        setCurrentTrxReference(payment.payment_reference);
        setPaymentRowId(payment.id);
        if (payment.payment_status === 'completed') setProcessingState('success');
        else if (payment.payment_status === 'failed') setProcessingState('failed');
        else if (payment.payment_status === 'canceled') setProcessingState('canceled');
      }
    };

    checkExistingPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // PawaPay verification polling.
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
        invalidateAccessCache();
        setTimeout(() => onPaymentSuccess?.(), 500);
      } else if (res.status === 'failed') {
        setIsStatusCheckActive(false);
        setProcessingState('failed');
        setErrorMessage(pawapayFailureMessage(res.failureCode));
        invalidateAccessCache();
      } else if (elapsedSeconds >= 300) {
        setIsStatusCheckActive(false);
        setProcessingState('failed');
        setErrorMessage("Le délai de vérification a expiré. Si le montant a été débité, contactez le support.");
      }
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrxReference, isStatusCheckActive, processingState]);

  const resetState = () => {
    setPhoneNumber('');
    setProcessingState('idle');
    setCurrentTrxReference(null);
    setPaymentRowId(null);
    setIsStatusCheckActive(false);
    setErrorMessage(null);
  };

  const handleInitiatePayment = async () => {
    if (!phoneNumber) {
      setErrorMessage('Veuillez entrer votre numéro de téléphone');
      return;
    }
    if (!country.regex.test(phoneNumber)) {
      setErrorMessage(`Numéro de téléphone invalide pour ${country.name}.`);
      return;
    }

    setErrorMessage(null);
    setProcessingState('processing');
    trigger(HapticType.MEDIUM);

    try {
      const depositId = Crypto.randomUUID();

      const charge = getPawaPayCharge(LEVEL_DOCUMENTS_PAYMENT_AMOUNT, currencyCode, exchangeRates);
      if (!charge) {
        setErrorMessage('Devise temporairement indisponible pour ce pays. Réessayez dans un instant.');
        setProcessingState('failed');
        return;
      }

      const payment = await LevelDocumentsPaymentService.createPayment(
        levelId,
        phoneNumber,
        LEVEL_DOCUMENTS_PAYMENT_AMOUNT,
        depositId
      );
      setPaymentRowId(payment.id);

      const result = await PawaPayService.initiateDeposit({
        depositId,
        phoneNumber,
        callingCode: country.code.replace('+', ''),
        amount: charge.amount,
        currency: charge.currency,
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
        LevelDocumentsPaymentService.setStatus(payment.id, 'failed').catch(() => {});
        return;
      }

      const checkoutUrl = pawapayCheckoutUrl(result);
      if (checkoutUrl) {
        if (Platform.OS === 'web') {
          window.location.href = checkoutUrl;
        } else {
          Linking.openURL(checkoutUrl).catch((error) => {
            logger.error('[LevelDocumentsPayment] unable to open checkout URL:', error);
          });
        }
      }

      setCurrentTrxReference(depositId);
      setProcessingState('verifying');
      setIsStatusCheckActive(true);
    } catch (error) {
      logger.error('PawaPay level documents payment initiation error:', error);
      setProcessingState('failed');
      setErrorMessage(error instanceof Error ? error.message : 'Une erreur est survenue lors du paiement');
    }
  };

  const handleClose = async () => {
    trigger(HapticType.LIGHT);

    if (processingState === 'verifying' && paymentRowId) {
      await LevelDocumentsPaymentService.setStatus(paymentRowId, 'canceled').catch(() => {});
    }

    if (['success', 'failed', 'canceled'].includes(processingState) && latestPayment?.id) {
      await LevelDocumentsPaymentService.markAsSeen(latestPayment.id);
    }

    resetState();
    onClose();
  };

  const handleRetry = () => {
    setProcessingState('idle');
    setErrorMessage(null);
    setCurrentTrxReference(null);
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={handleClose}
      onBackButtonPress={handleClose}
      onSwipeComplete={handleClose}
      swipeDirection={['down']}
      style={styles.modal}
      backdropOpacity={0.5}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      useNativeDriver={true}
      statusBarTranslucent
      propagateSwipe={Platform.OS === 'ios'}
    >
      <View style={[styles.sheet, isDark && styles.sheetDark, { paddingBottom: 24 + insets.bottom }]}>
        <View style={[styles.handle, isDark && styles.handleDark]} />

        {processingState === 'idle' && (
          <>
            <ThemedTitle isDark={isDark}>{levelName || 'Documents par niveau'}</ThemedTitle>
            <ThemedSubtitle isDark={isDark}>
              Payez {priceLabel} pour accéder à tous les documents de{levelName ? ` "${levelName}"` : ' ce niveau'} pendant 1 an.
            </ThemedSubtitle>

            <PhoneNumberField
              localNumber={phoneNumber}
              onChangeLocalNumber={setPhoneNumber}
              country={country}
              onChangeCountry={setCountry}
              isDark={isDark}
              error={errorMessage}
            />

            <TouchableOpacity style={styles.primaryButton} onPress={handleInitiatePayment}>
              <MaterialCommunityIcons name="lock-open-variant-outline" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Payer {priceLabel}</Text>
            </TouchableOpacity>

            <WhatsAppContact style={styles.whatsapp} />
          </>
        )}

        {(processingState === 'processing' || processingState === 'verifying') && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={theme.color.primary[500]} />
            <ThemedTitle isDark={isDark}>
              {processingState === 'processing' ? 'Initialisation du paiement...' : 'Vérification en cours...'}
            </ThemedTitle>
            <ThemedSubtitle isDark={isDark}>
              {processingState === 'verifying'
                ? "Validez la demande sur votre téléphone (code PIN Mobile Money)."
                : 'Un instant...'}
            </ThemedSubtitle>
            <WhatsAppContact style={styles.whatsapp} />
          </View>
        )}

        {processingState === 'success' && (
          <View style={styles.statusContainer}>
            <MaterialCommunityIcons name="check-circle" size={56} color="#10B981" />
            <ThemedTitle isDark={isDark}>Paiement réussi</ThemedTitle>
            <ThemedSubtitle isDark={isDark}>
              Vous avez maintenant accès à tous les documents de{levelName ? ` "${levelName}"` : ' ce niveau'} pendant 1 an.
            </ThemedSubtitle>
            <TouchableOpacity style={styles.primaryButton} onPress={handleClose}>
              <Text style={styles.primaryButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        )}

        {(processingState === 'failed' || processingState === 'canceled') && (
          <View style={styles.statusContainer}>
            <MaterialCommunityIcons
              name={processingState === 'canceled' ? 'close-circle-outline' : 'alert-circle'}
              size={56}
              color={processingState === 'canceled' ? theme.color.gray[500] : '#DC2626'}
            />
            <ThemedTitle isDark={isDark}>
              {processingState === 'canceled' ? 'Paiement annulé' : 'Paiement échoué'}
            </ThemedTitle>
            {errorMessage && <ThemedSubtitle isDark={isDark}>{errorMessage}</ThemedSubtitle>}
            <TouchableOpacity style={styles.primaryButton} onPress={handleRetry}>
              <Text style={styles.primaryButtonText}>Réessayer</Text>
            </TouchableOpacity>
            <WhatsAppContact style={styles.whatsapp} />
          </View>
        )}
      </View>
    </Modal>
  );
};

const ThemedTitle: React.FC<{ isDark: boolean; children: React.ReactNode }> = ({ isDark, children }) => (
  <Text style={[styles.title, isDark && styles.titleDark]}>{children}</Text>
);
const ThemedSubtitle: React.FC<{ isDark: boolean; children: React.ReactNode }> = ({ isDark, children }) => (
  <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>{children}</Text>
);

const styles = StyleSheet.create({
  modal: { margin: 0, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 24,
  },
  sheetDark: { backgroundColor: theme.color.dark.background.secondary },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: theme.color.gray[300],
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  handleDark: { backgroundColor: theme.color.gray[600] },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    color: '#111827',
    textAlign: 'center',
  },
  titleDark: { color: '#FFFFFF' },
  subtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[600],
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitleDark: { color: theme.color.gray[400] },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
    backgroundColor: theme.color.primary[500],
  },
  primaryButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusContainer: { alignItems: 'center', paddingVertical: 8, gap: 8 },
  whatsapp: { marginTop: 16, alignSelf: 'center' },
});

export default LevelDocumentsPaymentBottomSheet;
