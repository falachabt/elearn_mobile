import React, {
    useState,
    useEffect,
    useImperativeHandle,
    forwardRef,
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

const PaymentPage = forwardRef<PaymentPageRef, PaymentPageProps>(({
                                                                      selectedProgramIds,
                                                                      onLoadingChange,
                                                                      onPaymentStatusChange
                                                                  }, ref) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [phoneNumber, setPhoneNumber] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [programs, setPrograms] = useState<Program[]>([]);
    const [network, setNetwork] = useState<"mtn" | "orange" | null>(null);
    const {cartItems, loading: cartLoading, currentCart} = useCart();
    const {paymentStatus, initiatePayment, cancelPayment} = usePayment();
    const {user} = useAuth();
    const [processingState, setProcessingState] = useState<'idle' | 'processing' | 'waiting'>('idle');
    const [showExtendedMessage, setShowExtendedMessage] = useState(false);

    function shouldUsePaymentStatus() {
        return ["completed", "failed", "initialized", "canceled"].includes(paymentStatus);
    }

    useEffect(() => {
        onLoadingChange && onLoadingChange(isLoading);
    }, [isLoading]);

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

    useImperativeHandle(ref, () => ({
        validateAndPay: async () => {
            if (!validatePhoneNumber(phoneNumber)) {
                setError("Numéro de téléphone invalide");
                return false;
            }

            try {
                setIsLoading(true);
                setProcessingState('processing');
                const notchpay = new NotchPayService();

                const result = await notchpay.initiateDirectCharge({
                    phone: phoneNumber,
                    channel: network === "orange" ? "cm.orange" : "cm.mtn",
                    currency: "XAF",
                    // amount: calculateTotal(),
                    amount: 10, // For test, use actual calculateTotal() in production
                    customer: {
                        email: user?.email || "default@gmail.com",
                    },
                });

                setProcessingState('waiting');

                const currentCart = await CartService.getCurrentCart();
                await initiatePayment(
                    currentCart.id,
                    phoneNumber,
                    calculateTotal(),
                    result.initResponse.transaction.reference
                );

                return true;
            } catch (err) {
                setIsLoading(false);
                setProcessingState('idle');
                setError((err as Error).message);
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
            setPrograms(data?.map((item) => item.program) || []);
        };

        if (currentCart?.id) {
            fetchCartItems();
        }
    }, [cartItems, currentCart]);

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

    const calculateTotal = () => {
        if (!programs?.length) return 0;
        return programs.reduce((total, item) => total + item.price, 0);
    };

    const handleRetry = async () => {
        await cancelPayment();
        setIsLoading(false);
        setProcessingState('idle');
        setError("");
    };

    const handleDialCode = () => {
        const code = network === 'mtn' ? '*126#' : '#150*50#';
        Linking.openURL(`tel:${code}`);
    };

    useEffect(() => {
        if (["completed", "canceled", "failed"].includes(paymentStatus)) {
            setIsLoading(false);
            setProcessingState('idle');
        }
        onPaymentStatusChange?.(paymentStatus === "initialized");
    }, [paymentStatus]);

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
                                    {/*{network === 'mtn' ? 'Composez *126#' : 'Composez #150*50#'}*/}
                                </Text> Validez la transaction sur votre mobile
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

    // Render phone number input section (fixed at top)
    const renderPhoneSection = () => {
        return (
            <View style={[styles.section, isDark && styles.sectionDark]}>
                <Text style={[styles.label, isDark && styles.labelDark]}>
                    Numéro Mobile Money
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
            </View>
        );
    };

    // Render cart items (scrollable middle section)
    const renderCartItems = () => {
        return (
            <ScrollView
                style={styles.cartItemsScrollView}
                contentContainerStyle={styles.cartItemsContentContainer}
            >
                {programs.map((item) => (
                    <View
                        key={item.id}
                        style={[styles.cartItem, isDark && styles.cartItemDark]}
                    >
                        <View style={styles.itemInfo}>
                            <Text style={[styles.itemName, isDark && styles.itemNameDark]}>
                                {item.learning_path?.title}
                            </Text>
                            <View style={styles.tagsContainer}>
                                <View style={[styles.tag, isDark && styles.tagDark]}>
                                    <Text style={[styles.tagText, isDark && styles.tagTextDark]}>
                                        {item.concour?.name}
                                    </Text>
                                </View>
                                <View style={[styles.tag, styles.schoolTag, isDark && styles.schoolTagDark]}>
                                    <Text style={[styles.tagText, isDark && styles.tagTextDark]}>
                                        {item.concour?.school?.name}
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
        return (
            <View style={[styles.totalContainer, isDark && styles.totalContainerDark]}>
                <Text style={[styles.totalLabel, isDark && styles.totalLabelDark]}>
                    Total:
                </Text>
                <Text style={[styles.totalAmount, isDark && styles.totalAmountDark]}>
                    {calculateTotal().toLocaleString("fr-FR")} FCFA
                </Text>
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

                    {/* Scrollable middle section */}
                    {renderCartItems()}

                    {/* Fixed bottom section */}
                    {renderTotalSection()}
                </View>
            </View>
        );
    };

    // Conditional rendering based on payment status and processing state
    const renderContent = () => {
        if (processingState === 'processing') {
            return renderProcessingState();
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
        <View style={[styles.container, isDark && styles.containerDark]}>
            {renderContent()}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    containerDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    formContainer: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    section: {
        backgroundColor: "#FFFFFF",
        marginBottom: theme.spacing.medium,
        padding: theme.spacing.medium,
    },
    recapSection: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    sectionDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    cartItemsScrollView: {
        flex: 1,
    },
    cartItemsContentContainer: {
        paddingBottom: theme.spacing.small,
    },
    phoneInputContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    networkIndicator: {
        width: 48,
        height: 48,
        backgroundColor: theme.color.gray[100],
        justifyContent: "center",
        alignItems: "center",
        marginRight: theme.spacing.small,
        borderRadius: 8,
    },
    networkIndicatorDark: {
        backgroundColor: theme.color.dark.background.secondary,
    },
    networkIcon: {
        width: 32,
        height: 32,
    },
    placeholderIcon: {
        width: 32,
        height: 32,
        backgroundColor: theme.color.gray[300],
        borderRadius: 4,
    },
    placeholderIconDark: {
        backgroundColor: theme.color.gray[700],
    },
    sectionTitle: {
        fontSize: theme.typography.fontSize.large,
        fontWeight: "700",
        marginBottom: theme.spacing.medium,
        color: theme.color.text,
    },
    sectionTitleDark: {
        color: theme.color.gray[50],
    },
    cartItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: theme.spacing.medium,
        borderBottomWidth: 1,
        borderBottomColor: theme.color.gray[200],
    },
    cartItemDark: {
        borderBottomColor: theme.color.gray[800],
    },
    itemInfo: {
        flex: 1,
        marginRight: theme.spacing.medium,
    },
    itemName: {
        fontSize: theme.typography.fontSize.medium,
        color: theme.color.text,
        marginBottom: theme.spacing.small,
    },
    itemNameDark: {
        color: theme.color.gray[50],
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    tag: {
        backgroundColor: theme.color.primary[50],
        paddingHorizontal: theme.spacing.small,
        paddingVertical: 4,
        borderRadius: 4,
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
        fontSize: theme.typography.fontSize.small,
        color: theme.color.primary[700],
    },
    tagTextDark: {
        color: theme.color.primary[200],
    },
    itemPrice: {
        fontSize: theme.typography.fontSize.medium,
        color: theme.color.gray[700],
        fontWeight: "600",
    },
    itemPriceDark: {
        color: theme.color.gray[300],
    },
    totalContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        borderTopWidth: theme.border.width.thin,
        borderTopColor: theme.color.border,
        paddingTop: theme.spacing.medium,
        marginTop: theme.spacing.small,
    },
    totalContainerDark: {
        borderTopColor: theme.color.gray[800],
    },
    totalLabel: {
        fontSize: theme.typography.fontSize.medium,
        fontWeight: "700",
        color: theme.color.text,
    },
    totalLabelDark: {
        color: theme.color.gray[50],
    },
    totalAmount: {
        fontSize: theme.typography.fontSize.large,
        fontWeight: "700",
        color: theme.color.primary[500],
    },
    totalAmountDark: {
        color: theme.color.primary[400],
    },
    label: {
        fontSize: theme.typography.fontSize.medium,
        color: theme.color.text,
        marginBottom: theme.spacing.small,
    },
    labelDark: {
        color: theme.color.gray[50],
    },
    input: {
        flex: 1,
        borderWidth: theme.border.width.thin,
        borderColor: theme.color.border,
        padding: theme.spacing.medium,
        fontSize: theme.typography.fontSize.medium,
        color: theme.color.text,
        borderRadius: 8,
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
    },
    statusContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: theme.spacing.medium,
        backgroundColor: "#FFFFFF",
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
        fontWeight: "700",
        color: theme.color.text,
        marginTop: theme.spacing.medium,
        marginBottom: theme.spacing.large,
        textAlign: "center",
    },
    statusTitleDark: {
        color: theme.color.gray[50],
    },
    statusText: {
        fontSize: theme.typography.fontSize.large,
        color: theme.color.text,
        marginTop: theme.spacing.medium,
        textAlign: "center",
    },
    statusTextDark: {
        color: theme.color.gray[50],
    },
    successSubtitle: {
        fontSize: 16,
        color: theme.color.gray[600],
        textAlign: "center",
        marginTop: theme.spacing.medium,
        marginBottom: theme.spacing.large,
        paddingHorizontal: theme.spacing.large,
    },
    successSubtitleDark: {
        color: theme.color.gray[400],
    },
    failedSubtitle: {
        fontSize: 16,
        color: theme.color.gray[600],
        textAlign: "center",
        marginTop: theme.spacing.small,
        marginBottom: theme.spacing.large,
        paddingHorizontal: theme.spacing.large,
    },
    failedSubtitleDark: {
        color: theme.color.gray[400],
    },
    extendedMessage: {
        fontSize: 14,
        color: theme.color.gray[600],
        textAlign: "center",
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
    instructionsContainer: {
        width: "100%",
        marginVertical: theme.spacing.large,
    },
    waitingNote: {
        flexDirection: "row",
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
    instructionRow: {
        flexDirection: "row",
        alignItems: "center",
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
    retryButton: {
        marginTop: theme.spacing.large,
        backgroundColor: theme.color.primary[500],
        paddingVertical: theme.spacing.medium,
        paddingHorizontal: theme.spacing.xlarge,
        borderRadius: theme.border.radius.medium,
    },
    actionButtonText: {
        color: "#FFFFFF",
        fontSize: theme.typography.fontSize.medium,
        fontWeight: "600",
    },
    retryButtonText: {
        color: "#FFFFFF",
        fontSize: theme.typography.fontSize.medium,
        fontWeight: "600",
    },
    failedText: {
        fontSize: theme.typography.fontSize.large,
        color: theme.color.error,
        textAlign: "center",
        marginTop: theme.spacing.medium,
    },
    failedTextDark: {
        color: theme.color.error,
    },
    successText: {
        fontSize: theme.typography.fontSize.large,
        color: theme.color.primary[500],
        fontWeight: "600",
        marginTop: theme.spacing.medium,
        textAlign: "center",
    },
    actionButton: {
        marginTop: theme.spacing.large,
        backgroundColor: theme.color.primary[500],
        paddingVertical: theme.spacing.medium,
        paddingHorizontal: theme.spacing.xlarge,
    }
})

export default React.memo(PaymentPage);
