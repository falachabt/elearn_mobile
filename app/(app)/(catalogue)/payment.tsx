import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, useColorScheme, Linking, ActivityIndicator, Alert, BackHandler, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useCart } from '@/hooks/useCart';
import { usePayment } from '@/hooks/usePayment';
import * as Animatable from 'react-native-animatable';
import LottieView from 'lottie-react-native';
import { useAuth } from '@/contexts/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import PaymentGuideModal, {usePaymentGuide} from "@/components/shared/PaymentGuideModal";

type ProcessingState = 'idle' | 'processing' | 'waiting' | 'fallback' | 'browser_redirect';
type PromoCodeStatus = 'idle' | 'verifying' | 'valid' | 'invalid';

// Prix en mode prix unique
const FIXED_PRICE = 7900; // Prix de toutes les formations en mode prix fixe

// Définition des formules de prix
const PRICING_PLANS = [
  {
    id: 'essential',
    name: 'Formule Essentielle',
    description: 'Première formation: 14 900 FCFA + 7900 FCFA pour toutes nouvelles souscriptions à une formation.',
    basePrice: 14900,
    additionalPrice: 7900,
    threshold: 1,
    color: 'green'
  },
  {
    id: 'advantage',
    name: 'Formule Avantage',
    description: 'Pack complet de trois formations',
    price: 24900,
    threshold: 3,
    color: 'orange',
    recommended: true
  },
  {
    id: 'excellence',
    name: 'Formule Excellence',
    description: 'Formations illimitées pendant 12 mois',
    price: 39500,
    threshold: 5,
    color: '#4F46E5'
  }
];

export default function PaymentScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [error, setError] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [network, setNetwork] = useState<'mtn' | 'orange' | null>(null);
  const { cartItems, currentCart } = useCart();
  const {
    paymentStatus,
    initiatePayment,
    initiateDirectPayment,
    cancelPayment,
    authorizationUrl,
    chargeError,
    verifyPaymentStatus
  } = usePayment();
  const { user } = useAuth();
  const [showExtendedMessage, setShowExtendedMessage] = useState(false);
  const [currentTrxReference, setCurrentTrxReference] = useState<string | null>(null);
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const [browserRedirected, setBrowserRedirected] = useState(false);
  const [isStatusCheckActive, setIsStatusCheckActive] = useState(false);
  const [ showPaymentGuide, setShowPaymentGuide ] = useState(true);

  // Déterminer si le mode prix fixe est activé (l'utilisateur a déjà un achat)
  const FIXED_PRICE_MODE = (user?.user_program_enrollments?.length || 0) > 0 || false;

  // Promo code related states
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeStatus, setPromoCodeStatus] = useState<PromoCodeStatus>('idle');
  const [promoCodeError, setPromoCodeError] = useState<string | null>(null);
  const [promoCodeDetails, setPromoCodeDetails] = useState<{
    id: string;
    discount_percentage: number;
    name: string;
  } | null>(null);

  // Déterminer quelle formule est applicable selon le nombre d'items
  const applicableFormula = useMemo(() => {
    // En mode prix fixe, pas de formule applicable
    if (FIXED_PRICE_MODE) return null;

    const itemCount = cartItems.length;

    if (itemCount >= 5) {
      // Formule Excellence: uniquement à partir de 5 formations
      return PRICING_PLANS.find(plan => plan.id === 'excellence') || null;
    } else if (itemCount === 3) {
      // Formule Avantage: uniquement pour exactement 3 formations
      return PRICING_PLANS.find(plan => plan.id === 'advantage') || null;
    } else if (itemCount > 0) {
      // Formule Essentielle: pour 1, 2 ou 4 formations
      return PRICING_PLANS.find(plan => plan.id === 'essential') || null;
    }

    return null;
  }, [cartItems, FIXED_PRICE_MODE]);

  // Calculate regular total (without any formula discount)
  const regularTotal = useMemo(() =>
          cartItems.reduce((sum, item) => sum + item.price, 0) || 0,
      [cartItems]);

  // Calculate discounted total with the applicable formula or fixed price
  const discountedTotal = useMemo(() => {
    if (!cartItems.length) return 0;

    // Si mode prix fixe, multiplier le nombre d'items par le prix fixe
    if (FIXED_PRICE_MODE) {
      return cartItems.length * FIXED_PRICE;
    }

    if (!applicableFormula) return regularTotal;

    switch (applicableFormula.id) {
      case 'excellence':
        // Prix fixe pour 5 formations ou plus
        return applicableFormula.price || 0;
      case 'advantage':
        // Prix fixe uniquement pour exactement 3 formations
        if (cartItems.length === 3) {
          return applicableFormula.price || 0;
        } else {
          // Sinon on applique la formule essentielle
          const essentialFormula = PRICING_PLANS.find(plan => plan.id === 'essential');
          if (!essentialFormula) return regularTotal;

          const firstCoursePrice = essentialFormula.basePrice || 0;
          const additionalCoursesPrice = (cartItems.length - 1) * (essentialFormula.additionalPrice || 0);
          return firstCoursePrice + additionalCoursesPrice;
        }
      case 'essential':
        // Première formation à prix normal + formations additionnelles à prix réduit
        const firstCoursePrice = applicableFormula.basePrice || 0;
        const additionalCoursesPrice = (cartItems.length - 1) * (applicableFormula.additionalPrice || 0);
        return firstCoursePrice + additionalCoursesPrice;
      default:
        return regularTotal;
    }
  }, [cartItems, regularTotal, applicableFormula, FIXED_PRICE_MODE]);

  // Calculate promo code discount if applicable
  const promoDiscount = useMemo(() => {
    if (!promoCodeDetails) return 0;

    return Math.round(discountedTotal * (promoCodeDetails.discount_percentage / 100));
  }, [discountedTotal, promoCodeDetails]);

  // Calculate formula savings
  const formulaSavings = useMemo(() =>
          regularTotal - discountedTotal,
      [regularTotal, discountedTotal]);

  // Calculate final total after all discounts
  const finalTotal = useMemo(() =>
          discountedTotal - promoDiscount,
      [discountedTotal, promoDiscount]);

  useEffect(() => {
    if (['completed', 'canceled', 'failed'].includes(paymentStatus)) {
      setProcessingState('idle');
      stopStatusCheck();
    }
    if(paymentStatus === 'canceled') {
      setError('Le paiement a été annulé');
    }
    if(paymentStatus === 'completed') {
      stopStatusCheck();
    }
  }, [paymentStatus]);

  // Effect to handle fallback to authorization URL when charge fails
  useEffect(() => {
    if (chargeError && authorizationUrl) {
      setProcessingState('fallback');
    }
  }, [chargeError, authorizationUrl]);

  // Start a status check interval when we have a transaction reference
  const startStatusCheck = (reference: string) => {
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current);
    }

    setCurrentTrxReference(reference);
    setIsStatusCheckActive(true);

    console.log(`Starting status check for transaction ${reference} (every 15 seconds)`);

    statusCheckInterval.current = setInterval(async () => {
      console.log(`Checking status for transaction ${reference}...`);

      try {
        const result = await verifyPaymentStatus(reference);
        console.log(`Status check result:`, result?.transaction?.status || 'No status returned');

        // If transaction has reached a terminal state, stop checking
        if (result?.transaction?.status === 'complete' ||
            result?.transaction?.status === 'canceled' ||
            result?.transaction?.status === 'failed') {
          console.log(`Transaction reached terminal state: ${result.transaction.status}`);
          stopStatusCheck();
        } else if (result?.transaction?.status) {
          // Transaction is still in progress with some other status (e.g., 'processing', 'pending')
          console.log(`Transaction status: ${result.transaction.status}. Continuing to check...`);
        } else {
          console.log(`No valid transaction status received, continuing to check...`);
        }
      } catch (err) {
        console.error(`Error checking transaction status:`, err);
        // We don't stop checking on error - will try again on next interval
      }
    }, 15000); // Check every 15 seconds
  };

  const stopStatusCheck = () => {
    if (statusCheckInterval.current) {
      console.log(`Stopping status check for transaction ${currentTrxReference}`);
      clearInterval(statusCheckInterval.current);
      statusCheckInterval.current = null;
      setIsStatusCheckActive(false);
    }
  };

  // Cleanup interval on component unmount
  useEffect(() => {
    return () => {
      stopStatusCheck();
    };
  }, []);

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

  // Effect to start/stop status checking based on transaction state
  useEffect(() => {
    // If we have a transaction reference but no active status check,
    // and the transaction is in an intermediary state, start checking
    if (currentTrxReference &&
        !isStatusCheckActive &&
        !['completed', 'canceled', 'failed'].includes(paymentStatus) &&
        ['processing', 'waiting', 'fallback', 'browser_redirect'].includes(processingState)) {
      console.log(`Restarting status check for transaction ${currentTrxReference}`);
      startStatusCheck(currentTrxReference);
    }

    // If transaction is in a terminal state, stop checking
    if (['completed', 'canceled', 'failed'].includes(paymentStatus) && isStatusCheckActive) {
      stopStatusCheck();
    }
  }, [currentTrxReference, isStatusCheckActive, paymentStatus, processingState]);

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

  const handlePromoCodeChange = (text: string) => {
    // Convert promo code to uppercase and remove spaces
    const formattedCode = text.toUpperCase().replace(/\s/g, '');
    setPromoCode(formattedCode);

    // Reset promo code status if code is cleared
    if (!formattedCode) {
      setPromoCodeStatus('idle');
      setPromoCodeDetails(null);
      setPromoCodeError(null);
    } else {
      // Reset error message if user is typing a new promo code
      if (promoCodeStatus === 'invalid') {
        setPromoCodeStatus('idle');
        setPromoCodeError(null);
      }
    }
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
      // First check if user has already used any promo code in a completed payment
      if (user?.id) {
        const { data: existingPromoUsage, error: usageError } = await supabase
            .from('payments')
            .select('id')
            .eq('user_id', user.id)
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

      // Query the influencers table to find the promo code
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

      // Check if promo code is still valid based on valid_until date
      const now = new Date();
      const validUntil = data.valid_until ? new Date(data.valid_until) : null;

      if (validUntil && validUntil < now) {
        setPromoCodeStatus('invalid');
        setPromoCodeDetails(null);
        setPromoCodeError('Ce code promo a expiré');
        return;
      }

      // Promo code is valid
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

      if (!currentCart?.id) {
        setError('Panier non valide');
        setProcessingState('idle');
        return;
      }

      const result = await initiateDirectPayment(
          currentCart.id,
          phoneNumber,
          finalTotal,
          network,
          promoCodeDetails?.id
      );

      // Store the transaction reference for status checking
      if (result.trxReference) {
        setCurrentTrxReference(result.trxReference);
        startStatusCheck(result.trxReference);
      }

      if (result.needsFallback) {
        // If we need to use the fallback authorization URL
        setProcessingState('fallback');
      } else {
        // Normal direct charge flow
        setProcessingState('waiting');
      }
    } catch (err: unknown) {
      setProcessingState('idle');

      if (err instanceof Error) {
        console.log("Error initiating payment:", err.message);
        setError(err.message);
      } else {
        console.log("Error initiating payment:", err);
        setError('Échec de l\'initialisation du paiement');
      }
    }
  };

  const handleOpenAuthorizationUrl = async () => {
    if (authorizationUrl) {
      try {
        // Change state to browser_redirect
        setProcessingState('browser_redirect');
        setBrowserRedirected(true);

        // Open the URL in device's browser
        const canOpen = await Linking.canOpenURL(authorizationUrl);
        if (canOpen) {
          await Linking.openURL(authorizationUrl);
        } else {
          console.error("Cannot open URL:", authorizationUrl);
          setError("Impossible d'ouvrir le navigateur. Veuillez réessayer.");
          setProcessingState('fallback');
        }
      } catch (err) {
        console.error("Error opening URL:", err);
        setError("Erreur lors de l'ouverture du navigateur. Veuillez réessayer.");
        setProcessingState('fallback');
      }
    }
  };

  // Handle app coming to foreground - check payment status
  useEffect(() => {
    // Function to check payment status when app becomes active
    const checkPaymentOnForeground = () => {
      if (
          browserRedirected &&
          processingState === 'browser_redirect' &&
          currentTrxReference
      ) {
        // Verify payment status immediately when user returns to app
        verifyPaymentStatus(currentTrxReference);

        // Also make sure the regular status check is running
        if (!isStatusCheckActive && currentTrxReference) {
          startStatusCheck(currentTrxReference);
        }
      }
    };

    // Listen for app state changes
    const subscription = Linking.addEventListener('url', (event) => {
      if (event.url &&
          (event.url.includes('payment-callback') ||
              event.url.includes('success') ||
              event.url.includes('app://'))
      ) {
        // This is our callback URL - check payment status
        if (currentTrxReference) {
          // Add a small delay to allow transaction to process on NotchPay side
          setTimeout(() => {
            verifyPaymentStatus(currentTrxReference);

            // Also make sure the regular status check is running
            if (!isStatusCheckActive && currentTrxReference) {
              startStatusCheck(currentTrxReference);
            }
          }, 1500);
        }
      }
    });

    // Initial check in case app was opened from browser
    checkPaymentOnForeground();

    return () => {
      subscription.remove();
    };
  }, [browserRedirected, processingState, currentTrxReference, isStatusCheckActive]);

  const handleRetry = async () => {
    try {
      await cancelPayment();
      setProcessingState('idle');
      setError('');
      setPhoneNumber('');
      setNetwork(null);
      setPromoCode('');
      setPromoCodeStatus('idle');
      setPromoCodeDetails(null);
      setPromoCodeError(null);
      setBrowserRedirected(false);
      stopStatusCheck();
      setCurrentTrxReference(null);
    } catch (err) {
      // Handle error if needed
      console.error("Error during retry:", err);
    }
  };

  // Render browser redirect waiting state
  const renderBrowserRedirectState = () => {
    return (
        <Animatable.View
            animation="fadeIn"
            style={[styles.statusContainer, isDark && styles.statusContainerDark]}
        >
          <LottieView
              source={require("@/assets/animations/payment-loading.json")}
              autoPlay
              loop
              style={styles.lottieAnimation}
          />
          <Text style={[styles.statusTitle, isDark && styles.statusTitleDark]}>
            Finalisation du paiement
          </Text>

          <Text style={[styles.browserRedirectText, isDark && styles.browserRedirectTextDark]}>
            Complétez votre paiement dans la page qui vient de s'ouvrir.
          </Text>

          <View style={[styles.waitingNote, isDark && styles.waitingNoteDark]}>
            <MaterialCommunityIcons
                name="information-outline"
                size={20}
                color={isDark ? theme.color.primary[300] : theme.color.primary[600]}
            />
            <Text style={[styles.waitingNoteText, isDark && styles.waitingNoteTextDark]}>
              Une fois la transaction traitée et encaissée, vous serez redirigé vers cette application.
            </Text>
          </View>

          <TouchableOpacity
              style={styles.reopenButton}
              onPress={handleOpenAuthorizationUrl}
          >
            <MaterialCommunityIcons
                name="open-in-new"
                size={20}
                color="#FFFFFF"
            />
            <Text style={styles.reopenButtonText}>
              Ouvrir la page de paiement
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleRetry}
          >
            <Text style={[styles.cancelButtonText, isDark && styles.cancelButtonTextDark]}>
              Recommencer ou changer de numéro
            </Text>
          </TouchableOpacity>
        </Animatable.View>
    );
  };

  const renderPaymentForm = () => (
      <ScrollView style={[styles.container, isDark && styles.containerDark]}>
        <PaymentGuideModal visible={showPaymentGuide} onClose={() => { setShowPaymentGuide(false); }} />
        <View style={[styles.section, isDark && styles.sectionDark]}>
          <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
            Paiement
          </Text>

          {/* Montant à payer avec détails des remises */}
          <View style={[styles.amountContainer, isDark && styles.amountContainerDark]}>
            <Text style={[styles.amountLabel, isDark && styles.amountLabelDark]}>
              Montant à payer
            </Text>

            {/* Bannière mode prix fixe (uniquement en mode prix fixe) */}
            {/*{FIXED_PRICE_MODE && (*/}
            {/*    <View style={[styles.fixedPriceContainer, isDark && styles.fixedPriceContainerDark]}>*/}
            {/*      <MaterialCommunityIcons*/}
            {/*          name="tag-heart"*/}
            {/*          size={20}*/}
            {/*          color={isDark ? "#86EFAC" : "#166534"}*/}
            {/*      />*/}
            {/*      <Text style={[styles.fixedPriceText, isDark && styles.fixedPriceTextDark]}>*/}
            {/*        En tant que client fidèle, vous bénéficiez du tarif réduit de {FIXED_PRICE.toLocaleString('fr-FR')} FCFA sur toutes vos formations.*/}
            {/*      </Text>*/}
            {/*    </View>*/}
            {/*)}*/}

            <View style={styles.discountInfoContainer}>
              <Text style={[styles.baseAmount, isDark && styles.baseAmountDark]}>
                {regularTotal.toLocaleString('fr-FR')} FCFA
              </Text>

              {/* Afficher la réduction liée à la formule si applicable */}
              {formulaSavings > 0 && (
                  <View style={styles.discountRow}>
                    <Text style={[
                      styles.discountLabel,
                      FIXED_PRICE_MODE
                          ? {color: isDark ? "#86EFAC" : "#166534"}
                          : {color: applicableFormula?.color || theme.color.success}
                    ]}>
                      {FIXED_PRICE_MODE
                          ? "Tarif préférentiel:"
                          : `(${applicableFormula?.name}):`}
                    </Text>
                    <Text style={[
                      styles.discountAmount,
                      FIXED_PRICE_MODE
                          ? {color: isDark ? "#86EFAC" : "#166534"}
                          : {color: applicableFormula?.color || theme.color.success}
                    ]}>
                      -{formulaSavings.toLocaleString('fr-FR')} FCFA
                    </Text>
                  </View>
              )}

              {/* Afficher la réduction du code promo si applicable */}
              {promoDiscount > 0 && (
                  <View style={styles.discountRow}>
                    <Text style={[styles.discountLabel, isDark && styles.discountLabelDark]}>
                      Réduction ({promoCodeDetails?.discount_percentage}%):
                    </Text>
                    <Text style={[styles.discountAmount, isDark && styles.discountAmountDark]}>
                      -{promoDiscount.toLocaleString('fr-FR')} FCFA
                    </Text>
                  </View>
              )}

              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, isDark && styles.totalLabelDark]}>
                  Total:
                </Text>
                <Text style={[styles.amount, isDark && styles.amountDark]}>
                  {finalTotal.toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.phoneSection}>
            <Text style={[styles.label, isDark && styles.labelDark]}>
              Numéro Mobile Money ou Orange Money
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

          {/* Promo code section */}
          <View style={styles.promoSection}>
            <Text style={[styles.label, isDark && styles.labelDark]}>
              Code promotionnel (facultatif)
            </Text>
            <View style={styles.promoInputContainer}>
              <TextInput
                  style={[
                    styles.promoInput,
                    isDark && styles.inputDark,
                    promoCodeStatus === 'valid' && styles.validPromoInput,
                    promoCodeStatus === 'invalid' && styles.invalidPromoInput
                  ]}
                  value={promoCode}
                  onChangeText={handlePromoCodeChange}
                  placeholder="Entrez votre code promo"
                  placeholderTextColor={isDark ? theme.color.gray[500] : theme.color.gray[400]}
                  autoCapitalize="characters"
                  maxLength={20}
              />
              <TouchableOpacity
                  style={[
                    styles.verifyButton,
                    isDark && styles.verifyButtonDark,
                    promoCodeStatus === 'verifying' && styles.verifyingButton,
                    !promoCode && styles.disabledButton
                  ]}
                  onPress={verifyPromoCode}
                  disabled={!promoCode || promoCodeStatus === 'verifying'}
              >
                {promoCodeStatus === 'verifying' ? (
                    <ActivityIndicator size="small" color={isDark ? theme.color.dark.text.primary : '#FFFFFF'} />
                ) : (
                    <Text style={[styles.verifyButtonText, isDark && styles.verifyButtonTextDark]}>
                      Vérifier
                    </Text>
                )}
              </TouchableOpacity>
            </View>

            {promoCodeStatus === 'valid' && (
                <Animatable.View animation="fadeIn" style={styles.promoStatusContainer}>
                  <MaterialCommunityIcons
                      name="check-circle-outline"
                      size={16}
                      color={theme.color.success}
                  />
                  <Text style={styles.validPromoText}>
                    Code promo valide: {promoCodeDetails?.discount_percentage}% de réduction par {promoCodeDetails?.name}
                  </Text>
                </Animatable.View>
            )}

            {promoCodeStatus === 'invalid' && (
                <Animatable.View animation="fadeIn" style={styles.promoStatusContainer}>
                  <MaterialCommunityIcons
                      name="close-circle-outline"
                      size={16}
                      color={theme.color.error}
                  />
                  <Text style={styles.invalidPromoText}>
                    {promoCodeError || 'Code promo invalide ou expiré'}
                  </Text>
                </Animatable.View>
            )}
          </View>

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
      </ScrollView>
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
            Préparation de votre paiement...
          </Text>

          {showExtendedMessage && (
              <Animatable.Text
                  animation="fadeIn"
                  style={[styles.extendedMessage, isDark && styles.extendedMessageDark]}
              >
                Nous finalisons la connexion avec le service de paiement.
                Merci de patienter quelques instants...
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

          {isStatusCheckActive && (
              <View style={styles.statusCheckActiveIndicator}>
                <ActivityIndicator
                    size="small"
                    color={isDark ? theme.color.primary[300] : theme.color.primary[600]}
                />
                <Text style={[styles.statusCheckText, isDark && styles.statusCheckTextDark]}>
                  Vérification de la transaction...
                </Text>
              </View>
          )}

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

  // Render fallback state - When direct charge fails, provide authorization URL option
  const renderFallbackState = () => {
    return (
        <Animatable.View
            animation="fadeIn"
            style={[styles.statusContainer, isDark && styles.statusContainerDark]}
        >
          <MaterialCommunityIcons
              name="credit-card-outline"
              size={60}
              color={theme.color.primary[500]}
          />
          <Text style={[styles.fallbackTitle, isDark && styles.fallbackTitleDark]}>
            Paiement via navigateur
          </Text>

          <Text style={[styles.fallbackDescription, isDark && styles.fallbackDescriptionDark]}>
            Pour finaliser votre achat, nous allons vous rediriger vers une page de paiement sécurisée.
          </Text>

          <View style={[styles.fallbackNote, isDark && styles.fallbackNoteDark]}>
            <MaterialCommunityIcons
                name="information-outline"
                size={20}
                color={isDark ? theme.color.primary[300] : theme.color.primary[600]}
            />
            <Text style={[styles.fallbackNoteText, isDark && styles.fallbackNoteTextDark]}>
              Complétez simplement votre transaction sur la page qui va s'ouvrir, puis revenez à l'application.
            </Text>
          </View>

          <TouchableOpacity
              style={styles.fallbackButton}
              onPress={handleOpenAuthorizationUrl}
          >
            <MaterialCommunityIcons
                name="link-variant"
                size={20}
                color="#FFFFFF"
            />
            <Text style={styles.fallbackButtonText}>
              Continuer vers la page de paiement
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleRetry}
          >
            <Text style={[styles.cancelButtonText, isDark && styles.cancelButtonTextDark]}>
              Choisir une autre méthode
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
              onPress={() => router.replace('/(app)/learn')}
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
            Paiement non complété
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

  // Show browser redirect state if active
  if (processingState === 'browser_redirect') {
    return renderBrowserRedirectState();
  }

  // Conditional rendering based on payment status and processing state
  if (processingState === 'processing') {
    return renderProcessingState();
  }

  if (processingState === 'fallback') {
    return renderFallbackState();
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
    marginBottom: 30,
  },
  sectionDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.xlarge,
    fontWeight: '700',
    color: theme.color.text,
    marginBottom: theme.spacing.large,
  },
  sectionTitleDark: {
    color: theme.color.gray[50],
  },

  // Fixed price mode banner styles
  fixedPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#166534',
    padding: theme.spacing.medium,
    marginBottom: theme.spacing.medium,
  },
  fixedPriceContainerDark: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  fixedPriceText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: '#166534',
    marginLeft: theme.spacing.small,
  },
  fixedPriceTextDark: {
    color: '#86EFAC',
  },

  // Status check active indicator
  statusCheckActiveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.small,
    marginTop: theme.spacing.medium,
    gap: theme.spacing.small,
  },
  statusCheckText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: theme.color.gray[600],
  },
  statusCheckTextDark: {
    color: theme.color.gray[400],
  },

  // Browser redirect styles
  browserRedirectText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: theme.color.text,
    textAlign: 'center',
    marginTop: theme.spacing.medium,
    marginBottom: theme.spacing.large,
    paddingHorizontal: theme.spacing.large,
  },
  browserRedirectTextDark: {
    color: theme.color.gray[300],
  },
  reopenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.primary[500],
    marginTop: theme.spacing.large,
    marginBottom: theme.spacing.medium,
    paddingVertical: theme.spacing.medium,
    paddingHorizontal: theme.spacing.large,
    borderRadius: theme.border.radius.medium,
    gap: theme.spacing.small,
  },
  reopenButtonText: {
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.medium,
    fontWeight: '600',
  },

  // Fallback state styles
  fallbackTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 24,
    fontWeight: '700',
    color: theme.color.text,
    marginTop: theme.spacing.large,
    textAlign: 'center',
  },
  fallbackTitleDark: {
    color: theme.color.gray[50],
  },
  fallbackDescription: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: theme.color.gray[700],
    textAlign: 'center',
    marginTop: theme.spacing.medium,
    marginHorizontal: theme.spacing.large,
  },
  fallbackDescriptionDark: {
    color: theme.color.gray[300],
  },
  fallbackNote: {
    flexDirection: 'row',
    backgroundColor: theme.color.primary[50],
    padding: theme.spacing.medium,
    borderRadius: 8,
    marginTop: theme.spacing.large,
    marginHorizontal: theme.spacing.medium,
    borderLeftWidth: 3,
    borderLeftColor: theme.color.primary[500],
  },
  fallbackNoteDark: {
    backgroundColor: 'rgba(6, 78, 59, 0.3)',
    borderLeftColor: theme.color.primary[400],
  },
  fallbackNoteText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[800],
    marginLeft: theme.spacing.small,
    flex: 1,
  },
  fallbackNoteTextDark: {
    color: theme.color.gray[300],
  },
  fallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.primary[500],
    marginTop: theme.spacing.large,
    paddingVertical: theme.spacing.medium,
    paddingHorizontal: theme.spacing.large,
    borderRadius: theme.border.radius.medium,
    gap: theme.spacing.small,
  },
  fallbackButtonText: {
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.medium,
    fontWeight: '600',
  },

  // Rest of existing styles
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
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.small,
    color: theme.color.primary[700],
    marginBottom: theme.spacing.small,
  },
  amountLabelDark: {
    color: theme.color.primary[200],
  },
  amount: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.xlarge,
    fontWeight: '700',
    color: theme.color.primary[700],
  },
  amountDark: {
    color: theme.color.primary[200],
  },
  // Promo code section styles
  promoSection: {
    marginBottom: theme.spacing.large,
  },
  promoInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.small,
  },
  promoInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.border.radius.small,
    paddingHorizontal: theme.spacing.medium,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.medium,
    color: theme.color.text,
    backgroundColor: '#FFFFFF',
  },
  validPromoInput: {
    borderColor: theme.color.success,
  },
  invalidPromoInput: {
    borderColor: theme.color.error,
  },
  verifyButton: {
    height: 48,
    paddingHorizontal: theme.spacing.medium,
    backgroundColor: theme.color.primary[500],
    borderRadius: theme.border.radius.small,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyButtonDark: {
    backgroundColor: theme.color.primary[400],
  },
  verifyingButton: {
    opacity: 0.7,
  },
  disabledButton: {
    opacity: 0.5,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.medium,
    fontWeight: '600',
  },
  verifyButtonTextDark: {
    color: theme.color.dark.text.primary,
  },
  promoStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.small,
    paddingHorizontal: theme.spacing.small,
  },
  validPromoText: {
    marginLeft: theme.spacing.small,
    color: theme.color.success,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.small,
  },
  invalidPromoText: {
    marginLeft: theme.spacing.small,
    color: theme.color.error,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.small,
  },
  discountInfoContainer: {
    marginTop: theme.spacing.small,
  },
  baseAmount: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.large,
    color: theme.color.gray[600],
    textDecorationLine: 'line-through',
  },
  baseAmountDark: {
    color: theme.color.gray[400],
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.small,
  },
  discountLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.medium,
    color: theme.color.success,
  },
  discountLabelDark: {
    color: theme.color.success,
  },
  discountAmount: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.medium,
    fontWeight: '600',
    color: theme.color.success,
  },
  discountAmountDark: {
    color: theme.color.success,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.small,
    paddingTop: theme.spacing.small,
    borderTopWidth: 1,
    borderTopColor: theme.color.primary[200],
  },
  totalLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.medium,
    fontWeight: '600',
    color: theme.color.primary[700],
  },
  totalLabelDark: {
    color: theme.color.primary[200],
  },
  phoneSection: {
    marginBottom: theme.spacing.large,
  },
  label: {
    fontFamily: theme.typography.fontFamily,
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
    fontFamily: theme.typography.fontFamily,
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
    fontFamily: theme.typography.fontFamily,
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
    fontFamily: theme.typography.fontFamily,
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
    fontFamily: theme.typography.fontFamily,
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
    fontFamily: theme.typography.fontFamily,
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
    fontFamily: theme.typography.fontFamily,
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
    fontFamily: theme.typography.fontFamily,
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
    fontFamily: theme.typography.fontFamily,
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
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.medium,
  },
  cancelButtonTextDark: {
    color: theme.color.primary[400],
  },
  // Success state styles
  successText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.large,
    color: theme.color.primary[500],
    fontWeight: '600',
    marginTop: theme.spacing.medium,
    textAlign: 'center',
  },
  successSubtitle: {
    fontFamily: theme.typography.fontFamily,
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
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.large,
    color: theme.color.error,
    textAlign: 'center',
    marginTop: theme.spacing.medium,
  },
  failedTextDark: {
    color: theme.color.error,
  },
  failedSubtitle: {
    fontFamily: theme.typography.fontFamily,
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
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.medium,
    fontWeight: '600',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.medium,
    fontWeight: '600',
  },
});