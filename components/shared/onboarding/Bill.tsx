import React, {
    useState,
    useEffect,
    useImperativeHandle,
    forwardRef,
    useRef,
} from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    useColorScheme,
    Linking,
    StyleSheet,
    ScrollView,
    Alert,
    BackHandler,
    Dimensions,
    Platform,
    SafeAreaView,
    StatusBar,
    PixelRatio,
    KeyboardAvoidingView,
} from "react-native";
import {theme} from "@/constants/theme";
import {supabase} from "@/lib/supabase";
import {usePayment} from "@/hooks/usePayment";
import {useCart} from "@/hooks/useCart";
import {NotchPayService} from "@/lib/notchpay";
import * as Animatable from "react-native-animatable";
import LottieView from "lottie-react-native";
import {CartService} from "@/services/cart.service";
import {useAuth} from "@/contexts/auth";
import {MaterialCommunityIcons} from "@expo/vector-icons";

// Get screen dimensions
const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isTablet = width > 768;

// Scale factor for responsive sizing
const scale = Math.min(width / 390, height / 844);
const fontScale = PixelRatio.getFontScale();

// Responsive size function
const rs = (size: number) => Math.round(size * scale);

// Responsive font size function
const rfs = (size: number) => Math.round(size * Math.min(scale, fontScale));

// Define pricing plans (formulas) - same as in Programs component
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

export interface PaymentPageRef {
    validateAndPay: () => Promise<boolean>;
}

interface Program {
    id: string;
    price: number;
    learning_path: {
        title: string;
    };
    concour: {
        name: string;
        school: {
            name: string;
        };
    };
}

interface PaymentPageProps {
    selectedProgramIds: number[];
    onLoadingChange?: (loading: boolean) => void;
    onPaymentStatusChange?: (status: boolean) => void;
}

type ProcessingState = 'idle' | 'processing' | 'waiting' | 'fallback' | 'browser_redirect';
type PromoCodeStatus = 'idle' | 'verifying' | 'valid' | 'invalid';

const PaymentPage = forwardRef<PaymentPageRef, PaymentPageProps>(({
                                                                      selectedProgramIds,
                                                                      onLoadingChange,
                                                                      onPaymentStatusChange
                                                                  }, ref) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Screen orientation state
    const [orientation, setOrientation] = useState(height > width ? 'portrait' : 'landscape');

    // Handler for dimension changes
    const handleDimensionChange = () => {
        const { width: newWidth, height: newHeight } = Dimensions.get('window');
        setOrientation(newHeight > newWidth ? 'portrait' : 'landscape');
    };

    // Add dimension change listener
    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', handleDimensionChange);
        return () => {
            // Clean up the listener
            subscription.remove();
        };
    }, []);

    const [phoneNumber, setPhoneNumber] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [programs, setPrograms] = useState<Program[]>([]);
    const [network, setNetwork] = useState<"mtn" | "orange" | null>(null);
    const {cartItems, loading: cartLoading, currentCart} = useCart();
    const {
        paymentStatus,
        initiatePayment,
        initiateDirectPayment,
        cancelPayment,
        authorizationUrl,
        chargeError,
        verifyPaymentStatus,
        verifyPromoCode
    } = usePayment();
    const {user} = useAuth();
    const [processingState, setProcessingState] = useState<ProcessingState>('idle');
    const [showExtendedMessage, setShowExtendedMessage] = useState(false);
    const [currentTrxReference, setCurrentTrxReference] = useState<string | null>(null);
    const [browserRedirected, setBrowserRedirected] = useState(false);
    const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);

    // Promo code related states
    const [promoCode, setPromoCode] = useState('');
    const [promoCodeStatus, setPromoCodeStatus] = useState<PromoCodeStatus>('idle');
    const [promoCodeDetails, setPromoCodeDetails] = useState<{
        id: string;
        discount_percentage: number;
        name: string;
    } | null>(null);

    // Bundle formula states
    const [applicableFormula, setApplicableFormula] = useState<any>(null);
    const [baseTotal, setBaseTotal] = useState(0);
    const [bundleDiscount, setBundleDiscount] = useState(0);

    function shouldUsePaymentStatus() {
        return ["completed", "failed", "initialized", "canceled"].includes(paymentStatus);
    }

    useEffect(() => {
        onLoadingChange && onLoadingChange(isLoading);
    }, [isLoading]);

    // Start a status check interval when we have a transaction reference
    const startStatusCheck = (reference: string) => {
        if (statusCheckInterval.current) {
            clearInterval(statusCheckInterval.current);
        }

        statusCheckInterval.current = setInterval(() => {
            verifyPaymentStatus(reference).then(result => {
                if (result?.transaction?.status === 'completed') {
                    stopStatusCheck();
                }
            });
        }, 5000); // Check every 5 seconds
    };

    const stopStatusCheck = () => {
        if (statusCheckInterval.current) {
            clearInterval(statusCheckInterval.current);
            statusCheckInterval.current = null;
        }
    };

    // Cleanup interval on component unmount
    useEffect(() => {
        return () => {
            stopStatusCheck();
        };
    }, []);

    // Effect to handle fallback to authorization URL when charge fails
    useEffect(() => {
        if (chargeError && authorizationUrl) {
            setProcessingState('fallback');
        }
    }, [chargeError, authorizationUrl]);

    // Calculate which bundle formula applies based on program count
    useEffect(() => {
        const programCount = selectedProgramIds.length;

        let formula = null;
        if (programCount >= 5) {
            formula = PRICING_PLANS.find(plan => plan.id === 'excellence');
        } else if (programCount === 3) {
            formula = PRICING_PLANS.find(plan => plan.id === 'advantage');
        } else if (programCount > 0) {
            formula = PRICING_PLANS.find(plan => plan.id === 'essential');
        }

        setApplicableFormula(formula);
    }, [selectedProgramIds]);

    // Handle back button press when in browser_redirect state
    useEffect(() => {
        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            () => {
                if (processingState === 'browser_redirect') {
                    // Show a confirmation dialog before cancelling
                    Alert.alert(
                        "Paiement en cours",
                        "Souhaitez-vous revenir à l'étape précédente? Si vous avez déjà finalisé le paiement dans le navigateur, attendez quelques instants pour la confirmation.",
                        [
                            {
                                text: "Continuer le paiement",
                                onPress: () => {},
                                style: "cancel"
                            },
                            {
                                text: "Revenir en arrière",
                                onPress: () => handleRetry(),
                                style: "destructive"
                            }
                        ]
                    );
                    return true; // Prevent default back behavior
                }
                return false; // Let default back behavior happen
            }
        );

        return () => backHandler.remove();
    }, [processingState]);

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
                    }, 1500);
                }
            }
        });

        // Initial check in case app was opened from browser
        checkPaymentOnForeground();

        return () => {
            subscription.remove();
        };
    }, [browserRedirected, processingState, currentTrxReference]);

    // Calculate base total (without any discounts)
    const calculateBaseTotal = () => {
        if (!programs?.length) return 0;
        return programs.reduce((total, item) => total + item.price, 0);
    };

    // Calculate total with bundle discount applied
    const calculateBundleDiscountedTotal = () => {
        const baseTotal = calculateBaseTotal();
        const programCount = selectedProgramIds.length;

        if (programCount >= 5) {
            // Excellence formula: fixed price
            const excellencePlan = PRICING_PLANS.find(plan => plan.id === 'excellence');
            return excellencePlan?.price || baseTotal;
        }
        else if (programCount === 3) {
            // Advantage formula: fixed price for 3 programs
            const advantagePlan = PRICING_PLANS.find(plan => plan.id === 'advantage');
            return advantagePlan?.price || baseTotal;
        }
        else if (programCount > 0) {
            // Essential formula: first program + additional programs
            const essentialPlan = PRICING_PLANS.find(plan => plan.id === 'essential');
            if (essentialPlan) {
                const firstProgramPrice = essentialPlan.basePrice;
                const additionalProgramsPrice = (programCount - 1) * (essentialPlan?.additionalPrice || 0);
                return (firstProgramPrice || 0) + additionalProgramsPrice;
            }
        }

        return baseTotal;
    };

    // Calculate promo code discount amount
    const getPromoCodeDiscountAmount = (totalBeforePromo : number) => {
        if (promoCodeDetails) {
            return Math.round(totalBeforePromo * (promoCodeDetails.discount_percentage / 100));
        }
        return 0;
    };

    // Calculate the full bundle discount
    const getBundleDiscountAmount = () => {
        const base = calculateBaseTotal();
        const afterBundle = calculateBundleDiscountedTotal();
        return Math.max(0, base - afterBundle);
    };

    // Calculate final total after all discounts
    const calculateFinalTotal = () => {
        // First apply bundle discount
        const afterBundleDiscount = calculateBundleDiscountedTotal();

        // Then apply promo code on top of bundle discount
        const promoDiscount = getPromoCodeDiscountAmount(afterBundleDiscount);

        return afterBundleDiscount - promoDiscount;
    };

    useImperativeHandle(ref, () => ({
        validateAndPay: async () => {
            if (!validatePhoneNumber(phoneNumber)) {
                setError("Numéro de téléphone invalide");
                return false;
            }
            if (!network) {
                setError("Réseau mobile non reconnu");
                return false;
            }

            try {
                setIsLoading(true);
                setProcessingState('processing');
                setError('');

                if (!currentCart?.id) {
                    setError('Panier non valide');
                    setProcessingState('idle');
                    setIsLoading(false);
                    return false;
                }

                const result = await initiateDirectPayment(
                    currentCart.id,
                    phoneNumber,
                    calculateFinalTotal(), // Use the final discounted total
                    network,
                    promoCodeDetails?.id // Pass the promo code ID if available
                );

                // Store the transaction reference for status checking
                if (result.trxReference) {
                    setCurrentTrxReference(result.trxReference);
                    startStatusCheck(result.trxReference);
                }

                if (result.needsFallback) {
                    // If we need to use the fallback authorization URL
                    setProcessingState('fallback');
                    return true;
                } else {
                    // Normal direct charge flow
                    setProcessingState('waiting');
                    return true;
                }
            } catch (err) {
                setIsLoading(false);
                setProcessingState('idle');
                setError(err instanceof Error ? err.message : 'Échec de l\'initialisation du paiement');
                return false;
            }
        },
    }));

    // Fetch cart items and program details
    useEffect(() => {
        const fetchCartItems = async () => {
            const {data} = await supabase
                .from("cart_items")
                .select(
                    "*, program:concours_learningpaths(*, concour : concours(name, school:schools(name)), learning_path:learning_paths(*))"
                )
                .eq("cart_id", currentCart?.id);

            const programsData = data?.map((item) => item.program) || [];
            setPrograms(programsData);

            // Calculate and update discount information
            const baseTotal = programsData.reduce((total, item) => total + item.price, 0);
            setBaseTotal(baseTotal);

            const bundleDiscountedTotal = calculateBundleDiscountedTotal();
            setBundleDiscount(baseTotal - bundleDiscountedTotal);
        };

        if (currentCart?.id) {
            fetchCartItems();
        }
    }, [cartItems, currentCart, selectedProgramIds]);

    const validatePhoneNumber = (number: string) => {
        if (!number || number.length !== 9) return false;
        if (!number.startsWith("6")) return false;

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
        if (!number || number.length < 3 || !number.startsWith("6")) return null;

        const prefix = number.substring(1, 3);
        const prefixNum = parseInt(prefix);

        if (
            (prefixNum >= 50 && prefixNum <= 54) ||
            (prefixNum >= 70 && prefixNum <= 79) ||
            (prefixNum >= 80 && prefixNum <= 84)
        ) {
            return "mtn";
        }

        if (
            (prefixNum >= 55 && prefixNum <= 59) ||
            (prefixNum >= 90 && prefixNum <= 99) ||
            (prefixNum >= 85 && prefixNum <= 89)
        ) {
            return "orange";
        }

        return null;
    };

    const handlePhoneChange = (text: string) => {
        const numericOnly = text.replace(/[^0-9]/g, "");
        if (numericOnly.length <= 9) {
            setPhoneNumber(numericOnly);
            setNetwork(determineNetwork(numericOnly));
            setError("");
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
        } else {
            // Reset error message if user is typing a new promo code
            if (promoCodeStatus === 'invalid') {
                setPromoCodeStatus('idle');
            }
        }
    };

    const handleVerifyPromoCode = async () => {
        if (!promoCode.trim()) {
            setPromoCodeStatus('idle');
            setPromoCodeDetails(null);
            return;
        }

        setPromoCodeStatus('verifying');
        try {
            // Use the verifyPromoCode function from the usePayment hook
            const promoDetails = await verifyPromoCode(promoCode);

            if (promoDetails) {
                setPromoCodeStatus('valid');
                setPromoCodeDetails(promoDetails);
            } else {
                setPromoCodeStatus('invalid');
                setPromoCodeDetails(null);
            }
        } catch (err) {
            console.error('Error verifying promo code:', err);
            setPromoCodeStatus('invalid');
            setPromoCodeDetails(null);
        }
    };

    const handleRetry = async () => {
        try {
            await cancelPayment();
            setIsLoading(false);
            setProcessingState('idle');
            setError("");
            setBrowserRedirected(false);
            stopStatusCheck();
        } catch (err) {
            console.error("Error during retry:", err);
        }
    };

    const handleDialCode = () => {
        const code = network === 'mtn' ? '*126#' : '#150*50#';
        Linking.openURL(`tel:${code}`);
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

    useEffect(() => {
        if (["completed", "canceled", "failed"].includes(paymentStatus)) {
            setIsLoading(false);
            setProcessingState('idle');
            stopStatusCheck();
        }
        onPaymentStatusChange?.(paymentStatus === "initialized");
    }, [paymentStatus]);

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
                    style={[styles.lottieAnimation, { width: rs(200), height: rs(200) }]}
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
                        size={rs(20)}
                        color={isDark ? theme.color.primary[300] : theme.color.primary[600]}
                    />
                    <Text style={[styles.waitingNoteText, isDark && styles.waitingNoteTextDark]}>
                        Une fois la transaction terminée, revenez simplement à cette application.
                        Votre paiement sera confirmé automatiquement.
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.reopenButton}
                    onPress={handleOpenAuthorizationUrl}
                >
                    <MaterialCommunityIcons
                        name="open-in-new"
                        size={rs(20)}
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

    // Render fallback state - When direct charge fails, provide authorization URL option
    const renderFallbackState = () => {
        return (
            <Animatable.View
                animation="fadeIn"
                style={[styles.statusContainer, isDark && styles.statusContainerDark]}
            >
                <MaterialCommunityIcons
                    name="credit-card-outline"
                    size={rs(60)}
                    color={theme.color.primary[500]}
                />
                <Text style={[styles.fallbackTitle, isDark && styles.fallbackTitleDark]}>
                    Paiement via navigateur
                </Text>

                <Text style={[styles.fallbackDescription, isDark && styles.fallbackDescriptionDark]}>
                    Si vous ne recevez pas de notification sur votre mobile , Pour finaliser votre achat, nous allons vous rediriger vers une page de paiement sécurisée.
                </Text>

                <View style={[styles.waitingNote, isDark && styles.waitingNoteDark]}>
                    <MaterialCommunityIcons
                        name="information-outline"
                        size={rs(20)}
                        color={isDark ? theme.color.primary[300] : theme.color.primary[600]}
                    />
                    <Text style={[styles.waitingNoteText, isDark && styles.waitingNoteTextDark]}>
                        Complétez simplement votre transaction sur la page qui va s'ouvrir, puis revenez à l'application.
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.fallbackButton}
                    onPress={handleOpenAuthorizationUrl}
                >
                    <MaterialCommunityIcons
                        name="link-variant"
                        size={rs(20)}
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
                        Recommencer ou changer de numero
                    </Text>
                </TouchableOpacity>
            </Animatable.View>
        );
    };

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
                    style={[styles.lottieAnimation, { width: rs(200), height: rs(200) }]}
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
                    style={[styles.lottieAnimation, { width: rs(200), height: rs(200) }]}
                />
                <Text style={[styles.statusTitle, isDark && styles.statusTitleDark]}>
                    Validez le paiement
                </Text>

                <View style={styles.instructionsContainer}>
                    <View style={styles.instructionRow}>
                        <MaterialCommunityIcons
                            name="numeric-1-circle"
                            size={rs(24)}
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
                            size={rs(24)}
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
                            size={rs(24)}
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
                            size={rs(20)}
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
                    style={[styles.lottieAnimation, { width: rs(200), height: rs(200) }]}
                />
                <Text style={styles.successText}>Paiement réussi !</Text>
                <Text style={[styles.successSubtitle, isDark && styles.successSubtitleDark]}>
                    Votre accès aux cours a été activé et sera disponible dans quelques instants.
                </Text>
                <TouchableOpacity style={styles.actionButton}>
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
                    style={[styles.lottieAnimation, { width: rs(200), height: rs(200) }]}
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

    // Render promo code section
    const renderPromoCodeSection = () => {
        return (
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
                        editable={!isLoading}
                    />
                    <TouchableOpacity
                        style={[
                            styles.verifyButton,
                            isDark && styles.verifyButtonDark,
                            promoCodeStatus === 'verifying' && styles.verifyingButton,
                            !promoCode && styles.disabledButton
                        ]}
                        onPress={handleVerifyPromoCode}
                        disabled={!promoCode || promoCodeStatus === 'verifying' || isLoading}
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
                            size={rs(16)}
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
                            size={rs(16)}
                            color={theme.color.error}
                        />
                        <Text style={styles.invalidPromoText}>
                            Code promo invalide ou expiré
                        </Text>
                    </Animatable.View>
                )}
            </View>
        );
    };

    // Render phone number input section (fixed at top)
    const renderPhoneSection = () => {
        return (
            <View style={[styles.section, isDark && styles.sectionDark]}>
                <Text style={[styles.label, isDark && styles.labelDark]}>
                    Numéro OM ou MOMO
                </Text>
                <View style={styles.phoneInputContainer}>
                    <View style={[styles.networkIndicator, isDark && styles.networkIndicatorDark]}>
                        {network === "mtn" ? (
                            <Image
                                source={require("@/assets/images/mtn-logo.png")}
                                style={styles.networkIcon}
                                resizeMode="contain"
                            />
                        ) : network === "orange" ? (
                            <Image
                                source={require("@/assets/images/orange-logo.png")}
                                style={styles.networkIcon}
                                resizeMode="contain"
                            />
                        ) : (
                            <View style={[styles.placeholderIcon, isDark && styles.placeholderIconDark]}/>
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
                        editable={!isLoading}
                    />
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {/* Add the promo code section here */}
                {renderPromoCodeSection()}
            </View>
        );
    };

    // Render cart items (scrollable middle section)
    const renderCartItems = () => {
        return (
            <ScrollView
                style={styles.cartItemsScrollView}
                contentContainerStyle={styles.cartItemsContentContainer}
                showsVerticalScrollIndicator={false}
                bounces={true}
                nestedScrollEnabled={true}
            >
                {programs.map((item) => (
                    <View
                        key={item.id}
                        style={[styles.cartItem, isDark && styles.cartItemDark]}
                    >
                        <View style={styles.itemInfo}>
                            <Text numberOfLines={2} style={[styles.itemName, isDark && styles.itemNameDark]}>
                                {item.learning_path?.title}
                            </Text>
                            <View style={styles.tagsContainer}>
                                <View style={[styles.tag, isDark && styles.tagDark]}>
                                    <Text numberOfLines={1} style={[styles.tagText, isDark && styles.tagTextDark]}>
                                        {item.concour?.name}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <Text style={[styles.itemPrice, isDark && styles.itemPriceDark]}>
                            {item.price.toLocaleString("fr-FR")} FCFA
                        </Text>
                    </View>
                ))}
            </ScrollView>
        );
    };

    // Render total section (fixed at bottom)
    const renderTotalSection = () => {
        const baseTotal = calculateBaseTotal();
        const bundleDiscountAmount = getBundleDiscountAmount();
        const totalAfterBundleDiscount = calculateBundleDiscountedTotal();
        const promoDiscountAmount = getPromoCodeDiscountAmount(totalAfterBundleDiscount);
        const finalTotal = calculateFinalTotal();

        return (
            <View style={[styles.totalContainer, isDark && styles.totalContainerDark]}>
                <View style={styles.discountInfoContainer}>
                    <View style={styles.baseAmountRow}>
                        <Text style={[styles.totalLabel, isDark && styles.totalLabelDark]}>
                            Sous-total:
                        </Text>
                        <Text style={[styles.baseAmount, isDark && styles.baseAmountDark]}>
                            {baseTotal.toLocaleString("fr-FR")} FCFA
                        </Text>
                    </View>

                    {/* Display bundle discount if applicable */}
                    {bundleDiscountAmount > 0 && (
                        <View style={styles.discountRow}>
                            <Text style={[styles.bundleDiscountLabel, isDark && styles.bundleDiscountLabelDark]}>
                                {applicableFormula ? ` ${applicableFormula.name}:` : 'Réduction bundle:'}
                            </Text>
                            <Text style={[styles.bundleDiscountAmount, isDark && styles.bundleDiscountAmountDark]}>
                                -{bundleDiscountAmount.toLocaleString("fr-FR")} FCFA
                            </Text>
                        </View>
                    )}

                    {/* Display promo code discount if valid */}
                    {promoCodeDetails && (
                        <View style={styles.discountRow}>
                            <Text style={[styles.discountLabel, isDark && styles.discountLabelDark]}>
                                Réduction code promo ({promoCodeDetails.discount_percentage}%):
                            </Text>
                            <Text style={[styles.discountAmount, isDark && styles.discountAmountDark]}>
                                -{promoDiscountAmount.toLocaleString("fr-FR")} FCFA
                            </Text>
                        </View>
                    )}

                    {/* Display final total after all discounts */}
                    <View style={styles.finalTotalRow}>
                        <Text style={[styles.totalLabel, isDark && styles.totalLabelDark]}>
                            Total:
                        </Text>
                        <Text style={[styles.totalAmount, isDark && styles.totalAmountDark]}>
                            {finalTotal.toLocaleString("fr-FR")} FCFA
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    // Main payment form when not in a special state
    const renderPaymentForm = () => {
        return (
            <View style={styles.formContainer}>
                {/* Fixed top section */}
                {renderPhoneSection()}

                {/* Summary section with scrollable cart items */}
                <View style={[styles.section, styles.recapSection, isDark && styles.sectionDark]}>
                    <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
                        Récapitulatif
                    </Text>

                    {/* Constrained height container for cart items */}
                    <View style={styles.cartItemsContainer}>
                        {renderCartItems()}
                    </View>

                    {/* Fixed bottom section */}
                    {renderTotalSection()}
                </View>
            </View>
        );
    };

    // Conditional rendering based on payment status and processing state
    const renderContent = () => {
        if (processingState === 'browser_redirect') {
            return renderBrowserRedirectState();
        }

        if (processingState === 'processing') {
            return renderProcessingState();
        }

        if (processingState === 'fallback') {
            return renderFallbackState();
        }

        if (paymentStatus === "initialized" || processingState === 'waiting') {
            return renderInitializedState();
        }

        if (paymentStatus === "completed") {
            return renderSuccessState();
        }

        if (paymentStatus === "failed") {
            return renderFailedState();
        }

        return renderPaymentForm();
    };

    return (
        <SafeAreaView style={[styles.safeArea, isDark && styles.safeAreaDark]}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={isDark ? theme.color.dark.background.primary : '#FFFFFF'}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{flex: 1}}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    style={[styles.container, isDark && styles.containerDark]}
                    contentContainerStyle={styles.mainScrollContent}
                    bounces={true}
                    showsVerticalScrollIndicator={false}
                >
                    {renderContent()}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
});

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
    },
    safeAreaDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    containerDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    mainScrollContent: {
        flexGrow: 1,
        minHeight: '100%',
        paddingBottom: rs(20),
    },
    formContainer: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    section: {
        backgroundColor: "#FFFFFF",
        marginBottom: rs(theme.spacing.medium),
        padding: rs(theme.spacing.medium),
        borderRadius: rs(8),
        shadowColor: "#000",
        shadowOffset: { width: 0, height: rs(2) },
        shadowOpacity: 0.05,
        shadowRadius: rs(3),
        elevation: 2,
        marginHorizontal: rs(theme.spacing.small),
    },
    recapSection: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    sectionDark: {
        backgroundColor: theme.color.dark.background.secondary,
        shadowColor: "#000",
        shadowOpacity: 0.1,
    },
    cartItemsContainer: {
        height: Math.min(rs(200), height * 0.4), // Hauteur contrainte, adaptée à l'écran
        marginBottom: rs(theme.spacing.medium),
    },
    cartItemsScrollView: {
        flex: 1,
    },
    cartItemsContentContainer: {
        paddingBottom: rs(theme.spacing.small),
    },
    phoneInputContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    networkIndicator: {
        width: rs(48),
        height: rs(48),
        backgroundColor: theme.color.gray[100],
        justifyContent: "center",
        alignItems: "center",
        marginRight: rs(theme.spacing.small),
        borderRadius: rs(8),
    },
    networkIndicatorDark: {
        backgroundColor: theme.color.dark.background.secondary,
    },
    networkIcon: {
        width: rs(32),
        height: rs(32),
    },
    placeholderIcon: {
        width: rs(32),
        height: rs(32),
        backgroundColor: theme.color.gray[300],
        borderRadius: rs(4),
    },
    placeholderIconDark: {
        backgroundColor: theme.color.gray[700],
    },
    sectionTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.large),
        fontWeight: "700",
        marginBottom: rs(theme.spacing.medium),
        color: theme.color.text,
        lineHeight: rs(32),
    },
    sectionTitleDark: {
        color: theme.color.gray[50],
    },
    cartItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: rs(theme.spacing.medium),
        borderBottomWidth: 1,
        borderBottomColor: theme.color.gray[200],
    },
    cartItemDark: {
        borderBottomColor: theme.color.gray[800],
    },
    itemInfo: {
        flex: 1,
        marginRight: rs(theme.spacing.medium),
    },
    itemName: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.medium),
        color: theme.color.text,
        marginBottom: rs(theme.spacing.small),
        lineHeight: rs(22),
    },
    itemNameDark: {
        color: theme.color.gray[50],
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: rs(8),
    },
    tag: {
        backgroundColor: theme.color.primary[50],
        paddingHorizontal: rs(theme.spacing.small),
        paddingVertical: rs(4),
        borderRadius: rs(4),
    },
    tagDark: {
        backgroundColor: theme.color.primary[900],
    },
    schoolTag: {
        backgroundColor: theme.color.gray[100],
    },
    schoolTagDark: {
        backgroundColor: theme.color.gray[800],
    },
    tagText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.small),
        color: theme.color.primary[700],
        lineHeight: rs(18),
    },
    tagTextDark: {
        color: theme.color.primary[200],
    },
    itemPrice: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.medium),
        lineHeight: rs(24),
        color: theme.color.gray[700],
        fontWeight: "600",
    },
    itemPriceDark: {
        color: theme.color.gray[300],
    },
    totalContainer: {
        borderTopWidth: 1,
        borderTopColor: theme.color.border,
        paddingTop: rs(theme.spacing.medium),
        marginTop: rs(theme.spacing.small),
    },
    totalContainerDark: {
        borderTopColor: theme.color.gray[800],
    },
    totalLabel: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.medium),
        fontWeight: "700",
        color: theme.color.text,
        lineHeight: rs(24),
    },
    totalLabelDark: {
        color: theme.color.gray[50],
    },
    totalAmount: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.large),
        lineHeight: rs(32),
        fontWeight: "700",
        color: theme.color.primary[500],
    },
    totalAmountDark: {
        color: theme.color.primary[400],
    },
    // Promo code related styles
    promoSection: {
        marginTop: rs(theme.spacing.medium),
    },
    promoInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: rs(theme.spacing.small),
    },
    promoInput: {
        flex: 1,
        height: rs(48),
        borderWidth: 1,
        borderColor: theme.color.border,
        borderRadius: rs(theme.border.radius.small),
        paddingHorizontal: rs(theme.spacing.medium),
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.medium),
        color: theme.color.text,
        lineHeight: rs(24),
    },
    validPromoInput: {
        borderColor: theme.color.success,
    },
    invalidPromoInput: {
        borderColor: theme.color.error,
    },
    verifyButton: {
        height: rs(48),
        paddingHorizontal: rs(theme.spacing.medium),
        backgroundColor: theme.color.primary[500],
        borderRadius: rs(theme.border.radius.small),
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: rs(90),
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
        fontSize: rfs(theme.typography.fontSize.medium),
        fontWeight: '600',
        lineHeight: rs(24),
    },
    verifyButtonTextDark: {
        color: theme.color.dark.text.primary,
    },
    promoStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: rs(theme.spacing.small),
    },
    validPromoText: {
        marginLeft: rs(theme.spacing.small),
        color: theme.color.success,
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.small),
        lineHeight: rs(18),
    },
    invalidPromoText: {
        marginLeft: rs(theme.spacing.small),
        color: theme.color.error,
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.small),
        lineHeight: rs(18),
    },
    // Discount display styles
    discountInfoContainer: {
        width: '100%',
    },
    baseAmountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: rs(theme.spacing.small),
    },
    baseAmount: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.medium),
        color: theme.color.gray[600],
        lineHeight: rs(24),
    },
    baseAmountDark: {
        color: theme.color.gray[400],
    },
    discountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: rs(theme.spacing.small),
    },
    discountLabel: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.medium),
        color: theme.color.success,
        lineHeight: rs(24),
    },
    discountLabelDark: {
        color: theme.color.success,
    },
    bundleDiscountLabel: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.medium),
        color: '#E86112', // Orange color for bundle discounts
        lineHeight: rs(24),
    },
    bundleDiscountLabelDark: {
        color: '#F8A061', // Lighter orange for dark mode
    },
    discountAmount: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.medium),
        fontWeight: '600',
        color: theme.color.success,
        lineHeight: rs(24),
    },
    discountAmountDark: {
        color: theme.color.success,
    },
    bundleDiscountAmount: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.medium),
        fontWeight: '600',
        color: '#E86112', // Orange color for bundle discounts
        lineHeight: rs(24),
    },
    bundleDiscountAmountDark: {
        color: '#F8A061', // Lighter orange for dark mode
    },
    savingsSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(22, 163, 74, 0.1)',
        borderRadius: rs(6),
        padding: rs(8),
        marginTop: rs(12),
    },
    savingsSummaryText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(13),
        color: theme.color.success[600],
        marginLeft: rs(8),
        lineHeight: rs(18),
    },
    savingsSummaryTextDark: {
        color: theme.color.success[400],
    },
    finalTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: theme.color.primary[100],
        paddingTop: rs(theme.spacing.small),
        marginTop: rs(theme.spacing.small),
    },
    label: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.medium),
        color: theme.color.text,
        marginBottom: rs(theme.spacing.small),
        lineHeight: rs(24),
    },
    labelDark: {
        color: theme.color.gray[50],
    },
    input: {
        flex: 1,
        height: rs(48),
        borderWidth: 1,
        borderColor: theme.color.border,
        padding: rs(theme.spacing.medium),
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.medium),
        lineHeight: rs(15),
        color: theme.color.text,
        borderRadius: rs(8),
    },
    inputDark: {
        borderColor: theme.color.gray[700],
        backgroundColor: theme.color.dark.background.secondary,
        color: theme.color.gray[50],
    },
    errorText: {
        color: theme.color.error,
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.small),
        marginTop: rs(theme.spacing.small),
        lineHeight: rs(18),
    },
    statusContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: rs(theme.spacing.medium),
        backgroundColor: "#FFFFFF",
        minHeight: height * 0.7,
    },
    statusContainerDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    lottieAnimation: {
        width: rs(200),
        height: rs(200),
    },
    statusTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(24),
        fontWeight: "700",
        color: theme.color.text,
        marginTop: rs(theme.spacing.medium),
        marginBottom: rs(theme.spacing.large),
        textAlign: "center",
        lineHeight: rs(32),
    },
    statusTitleDark: {
        color: theme.color.gray[50],
    },
    statusText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.large),
        color: theme.color.text,
        marginTop: rs(theme.spacing.medium),
        textAlign: "center",
        lineHeight: rs(32),
    },
    statusTextDark: {
        color: theme.color.gray[50],
    },
    successSubtitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(16),
        color: theme.color.gray[600],
        textAlign: "center",
        marginTop: rs(theme.spacing.medium),
        marginBottom: rs(theme.spacing.large),
        paddingHorizontal: rs(theme.spacing.large),
        lineHeight: rs(24),
    },
    successSubtitleDark: {
        color: theme.color.gray[400],
    },
    failedSubtitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(16),
        color: theme.color.gray[600],
        textAlign: "center",
        marginTop: rs(theme.spacing.small),
        marginBottom: rs(theme.spacing.large),
        paddingHorizontal: rs(theme.spacing.large),
        lineHeight: rs(24),
    },
    failedSubtitleDark: {
        color: theme.color.gray[400],
    },
    extendedMessage: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(14),
        color: theme.color.gray[600],
        textAlign: "center",
        marginTop: rs(theme.spacing.large),
        paddingHorizontal: rs(theme.spacing.large),
        backgroundColor: theme.color.gray[100],
        padding: rs(theme.spacing.medium),
        borderRadius: rs(8),
        borderLeftWidth: rs(4),
        borderLeftColor: theme.color.primary[500],
        maxWidth: '90%',
        lineHeight: rs(20),
    },
    extendedMessageDark: {
        color: theme.color.gray[300],
        backgroundColor: theme.color.gray[800],
    },
    instructionsContainer: {
        width: "100%",
        marginVertical: rs(theme.spacing.large),
        paddingHorizontal: rs(10),
    },
    waitingNote: {
        flexDirection: "row",
        backgroundColor: theme.color.primary[50],
        padding: rs(theme.spacing.medium),
        borderRadius: rs(8),
        marginTop: rs(theme.spacing.medium),
        marginHorizontal: rs(theme.spacing.medium),
        borderLeftWidth: rs(3),
        borderLeftColor: theme.color.primary[500],
        maxWidth: '90%',
        alignSelf: 'center',
    },
    waitingNoteDark: {
        backgroundColor: 'rgba(6, 78, 59, 0.3)',
        borderLeftColor: theme.color.primary[400],
    },
    waitingNoteText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(13),
        color: theme.color.gray[800],
        marginLeft: rs(theme.spacing.small),
        flex: 1,
        lineHeight: rs(18),
    },
    waitingNoteTextDark: {
        color: theme.color.gray[300],
    },
    instructionRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: rs(theme.spacing.medium),
        paddingHorizontal: rs(theme.spacing.medium),
    },
    instructionText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(16),
        color: theme.color.text,
        marginLeft: rs(theme.spacing.small),
        flex: 1,
        lineHeight: rs(22),
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
    cancelButton: {
        marginTop: rs(theme.spacing.large),
        padding: rs(theme.spacing.medium),
        minWidth: rs(150),
        alignItems: 'center',
    },
    cancelButtonText: {
        color: theme.color.link,
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.medium),
        lineHeight: rs(24),
    },
    cancelButtonTextDark: {
        color: theme.color.primary[400],
    },
    retryButton: {
        marginTop: rs(theme.spacing.large),
        backgroundColor: theme.color.primary[500],
        paddingVertical: rs(theme.spacing.medium),
        paddingHorizontal: rs(theme.spacing.xlarge),
        borderRadius: rs(theme.border.radius.medium),
        minWidth: rs(150),
        alignItems: 'center',
    },
    actionButtonText: {
        color: "#FFFFFF",
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.medium),
        fontWeight: "600",
        lineHeight: rs(24),
    },
    retryButtonText: {
        color: "#FFFFFF",
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.medium),
        fontWeight: "600",
        lineHeight: rs(24),
    },
    failedText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.large),
        color: theme.color.error,
        textAlign: "center",
        marginTop: rs(theme.spacing.medium),
        lineHeight: rs(32),
    },
    failedTextDark: {
        color: theme.color.error,
    },
    successText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.large),
        color: theme.color.primary[500],
        fontWeight: "600",
        marginTop: rs(theme.spacing.medium),
        textAlign: "center",
        lineHeight: rs(32),
    },
    actionButton: {
        marginTop: rs(theme.spacing.large),
        backgroundColor: theme.color.primary[500],
        paddingVertical: rs(theme.spacing.medium),
        paddingHorizontal: rs(theme.spacing.xlarge),
        borderRadius: rs(theme.border.radius.medium),
        minWidth: rs(200),
        alignItems: 'center',
    },

    // Browser redirect styles
    browserRedirectText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(16),
        color: theme.color.text,
        textAlign: 'center',
        marginTop: rs(theme.spacing.medium),
        marginBottom: rs(theme.spacing.large),
        paddingHorizontal: rs(theme.spacing.large),
        lineHeight: rs(24),
    },
    browserRedirectTextDark: {
        color: theme.color.gray[300],
    },
    reopenButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.color.primary[500],
        marginTop: rs(theme.spacing.large),
        marginBottom: rs(theme.spacing.medium),
        paddingVertical: rs(theme.spacing.medium),
        paddingHorizontal: rs(theme.spacing.large),
        borderRadius: rs(theme.border.radius.medium),
        gap: rs(theme.spacing.small),
        minWidth: rs(200),
    },
    reopenButtonText: {
        color: '#FFFFFF',
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.medium),
        fontWeight: '600',
        lineHeight: rs(24),
    },

    // Fallback state styles
    fallbackTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(24),
        fontWeight: '700',
        color: theme.color.text,
        marginTop: rs(theme.spacing.large),
        textAlign: 'center',
        lineHeight: rs(32),
    },
    fallbackTitleDark: {
        color: theme.color.gray[50],
    },
    fallbackDescription: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(16),
        color: theme.color.gray[700],
        textAlign: 'center',
        marginTop: rs(theme.spacing.medium),
        marginHorizontal: rs(theme.spacing.large),
        lineHeight: rs(24),
    },
    fallbackDescriptionDark: {
        color: theme.color.gray[300],
    },
    fallbackNote: {
        flexDirection: 'row',
        backgroundColor: theme.color.primary[50],
        padding: rs(theme.spacing.medium),
        borderRadius: rs(8),
        marginTop: rs(theme.spacing.large),
        marginHorizontal: rs(theme.spacing.medium),
        borderLeftWidth: rs(3),
        borderLeftColor: theme.color.primary[500],
    },
    fallbackNoteDark: {
        backgroundColor: 'rgba(6, 78, 59, 0.3)',
        borderLeftColor: theme.color.primary[400],
    },
    fallbackNoteText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(14),
        color: theme.color.gray[800],
        marginLeft: rs(theme.spacing.small),
        flex: 1,
        lineHeight: rs(20),
    },
    fallbackNoteTextDark: {
        color: theme.color.gray[300],
    },
    fallbackButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.color.primary[500],
        marginTop: rs(theme.spacing.large),
        paddingVertical: rs(theme.spacing.medium),
        paddingHorizontal: rs(theme.spacing.large),
        borderRadius: rs(theme.border.radius.medium),
        gap: rs(theme.spacing.small),
        minWidth: rs(250),
    },
    fallbackButtonText: {
        color: '#FFFFFF',
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(theme.typography.fontSize.medium),
        fontWeight: '600',
        lineHeight: rs(24),
    },

    // Bundle styles
    bundleInfoContainer: {
        backgroundColor: theme.color.gray[50],
        borderRadius: rs(8),
        padding: rs(12),
        marginBottom: rs(16),
        borderWidth: 1,
        borderColor: theme.color.gray[200],
    },
    bundleInfoContainerDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderColor: theme.color.gray[700],
    },
    bundleBadgeRow: {
        flexDirection: 'row',
        marginBottom: rs(8),
    },
    bundleBadge: {
        paddingHorizontal: rs(10),
        paddingVertical: rs(4),
        borderRadius: rs(16),
    },
    bundleBadgeText: {
        color: '#FFFFFF',
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(12),
        fontWeight: '600',
        lineHeight: rs(16),
    },
    bundleInfoText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rfs(13),
        color: theme.color.gray[700],
        lineHeight: rs(18),
    },
    bundleInfoTextDark: {
        color: theme.color.gray[300],
    },
});

export default React.memo(PaymentPage);