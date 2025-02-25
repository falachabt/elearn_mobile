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
    useColorScheme, Linking,
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
import {StyleSheet} from "react-native";
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

        function shouldUsePaymentStatus() {
            return ["completed", "failed", "initialized"].includes(paymentStatus);
        }

        useEffect(() => {
            onLoadingChange && onLoadingChange(isLoading);
        }, [isLoading]);

        useImperativeHandle(ref, () => ({
            validateAndPay: async () => {
                if (!validatePhoneNumber(phoneNumber)) {
                    setError("Numéro de téléphone invalide");
                    return false;
                }

                try {
                    setIsLoading(true);
                    const notchpay = new NotchPayService();

                    const result = await notchpay.initiateDirectCharge({
                        phone: phoneNumber,
                        channel: network === "orange" ? "cm.orange" : "cm.mtn",
                        currency: "XAF",
                        // amount: calculateTotal(),
                        amount: 10,
                        customer: {
                            email: user?.email || "default@gmail.com",
                        },
                    });

                    const currentCart = await CartService.getCurrentCart();
                    await initiatePayment(
                        currentCart.id,
                        phoneNumber,
                        calculateTotal(),
                        result.initResponse.transaction.reference
                    );

                    return true;
                } catch (err) {
                    setIsLoading(false)
                    setError((err as Error).message);
                    return false;
                }
            },
        }));

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

            fetchCartItems();
        }, [cartItems]);

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
            }
        };

        const calculateTotal = () => {
            if (!programs?.length) return 0;
            return programs.reduce((total, item) => total + item.price, 0);
        };

        const handleRetry = async () => {
            await cancelPayment();
            setIsLoading(false);
            setError("");
        };

        useEffect(() => {
            if (["completed", "canceled", "failed"].includes(paymentStatus)) {
                setIsLoading(false);
            }
            onPaymentStatusChange?.(paymentStatus === "initialized");
        }, [paymentStatus]);

        const renderPaymentStatus = () => {
            if (paymentStatus === "initialized") {
                return (
                    <Animatable.View
                        animation="fadeIn"
                        style={[
                            styles.loadingContainer,
                            isDark && styles.loadingContainerDark
                        ]}
                    >
                        <LottieView
                            source={require("@/assets/animations/payment-loading.json")}
                            autoPlay
                            speed={3}
                            loop
                            style={{width: 200, height: 200}}
                        />
                        <Text style={[
                            styles.loadingText,
                            isDark && styles.loadingTextDark
                        ]}>
                            <Text style={[styles.statusText, isDark && styles.statusTextDark]}>
                                Validez le paiement
                            </Text>
                            <View style={{marginTop: theme.spacing.large}}>
                                <Text style={[styles.statusText, isDark && styles.statusTextDark]}>
                                    <MaterialCommunityIcons name="numeric-1-circle" size={24}
                                                            color={theme.color.primary[500]}/>
                                    <Text
                                        style={{textDecorationLine: 'underline'}}
                                        onPress={() => {
                                            const code = network === 'mtn' ? '*126#' : '#150*4#';
                                            Linking.openURL(`tel:${code}`);
                                        }}
                                    >
                                        {network === 'mtn' ? 'Composez *126#' : 'Composez #150*4#'}
                                    </Text> puis validez
                                </Text>
                                <Text
                                    style={[styles.statusText, isDark && styles.statusTextDark, {marginTop: theme.spacing.medium}]}>
                                    <MaterialCommunityIcons name="numeric-2-circle" size={24}
                                                            color={theme.color.primary[500]}/> Une fois
                                    validé, patientez entre <Text
                                    style={{fontWeight: 'bold', color: theme.color.primary[500]}}>1 à 3
                                    minutes</Text>
                                </Text>
                            </View>
                        </Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={handleRetry}
                        >
                            <Text style={[
                                styles.retryButtonText,
                                isDark && styles.retryButtonTextDark
                            ]}>
                                Annuler
                            </Text>
                        </TouchableOpacity>
                    </Animatable.View>
                );
            }

            if (paymentStatus === "failed") {
                return (
                    <Animatable.View
                        animation="fadeIn"
                        style={[
                            styles.loadingContainer,
                            isDark && styles.loadingContainerDark
                        ]}
                    >
                        <LottieView
                            source={require("@/assets/animations/payment-failed.json")}
                            autoPlay
                            loop={false}
                            speed={1}
                            style={{width: 200, height: 200}}
                        />
                        <Text style={[
                            styles.loadingText,
                            isDark && styles.loadingTextDark
                        ]}>
                            Votre paiement a échoué. Veuillez réessayer.
                        </Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={handleRetry}
                        >
                            <Text style={[
                                styles.retryButtonText,
                                isDark && styles.retryButtonTextDark
                            ]}>
                                Retour
                            </Text>
                        </TouchableOpacity>
                    </Animatable.View>
                );
            }

            if (paymentStatus === "completed") {
                return (
                    <Animatable.View
                        animation="fadeIn"
                        style={[
                            styles.successContainer,
                            isDark && styles.successContainerDark
                        ]}
                    >
                        <LottieView
                            source={require("@/assets/animations/payment-success.json")}
                            autoPlay
                            loop={false}
                            style={{width: 200, height: 200}}
                        />
                        <Text style={styles.successText}>Paiement réussi !</Text>
                    </Animatable.View>
                );
            }

            return null;
        };

        return (
            <View style={[
                styles.container,
                isDark && styles.containerDark
            ]}>
                {shouldUsePaymentStatus() ? (
                    renderPaymentStatus()
                ) : (
                    <>
                        <View style={[
                            styles.section,
                            isDark && styles.sectionDark
                        ]}>
                            <Text style={[
                                styles.label,
                                isDark && styles.labelDark
                            ]}>
                                Numéro Mobile Money
                            </Text>
                            <View style={styles.phoneInputContainer}>
                                <View style={[
                                    styles.networkIndicator,
                                    isDark && styles.networkIndicatorDark
                                ]}>
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
                                        <View style={[
                                            styles.placeholderIcon,
                                            isDark && styles.placeholderIconDark
                                        ]}/>
                                    )}
                                </View>
                                <TextInput
                                    style={[
                                        styles.input,
                                        isDark && styles.inputDark
                                    ]}
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

                        <View style={[
                            styles.section,
                            isDark && styles.sectionDark
                        ]}>
                            <Text style={[
                                styles.sectionTitle,
                                isDark && styles.sectionTitleDark
                            ]}>
                                Récapitulatif
                            </Text>
                            {programs.map((item) => (
                                <View
                                    key={item.id}
                                    style={[
                                        styles.cartItem,
                                        isDark && styles.cartItemDark
                                    ]}
                                >
                                    <View style={styles.itemInfo}>
                                        <Text style={[
                                            styles.itemName,
                                            isDark && styles.itemNameDark
                                        ]}>
                                            {item.learning_path?.title}
                                        </Text>
                                        <View style={styles.tagsContainer}>
                                            <View style={[
                                                styles.tag,
                                                isDark && styles.tagDark
                                            ]}>
                                                <Text style={[
                                                    styles.tagText,
                                                    isDark && styles.tagTextDark
                                                ]}>
                                                    {item.concour?.name}
                                                </Text>
                                            </View>
                                            <View style={[
                                                styles.tag,
                                                styles.schoolTag,
                                                isDark && styles.schoolTagDark
                                            ]}>
                                                <Text style={[
                                                    styles.tagText,
                                                    isDark && styles.tagTextDark
                                                ]}>
                                                    {item.concour?.school?.name}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                    <Text style={[
                                        styles.itemPrice,
                                        isDark && styles.itemPriceDark
                                    ]}>
                                        {item.price.toLocaleString("fr-FR")} FCFA
                                    </Text>
                                </View>
                            ))}
                            <View style={[
                                styles.totalContainer,
                                isDark && styles.totalContainerDark
                            ]}>
                                <Text style={[
                                    styles.totalLabel,
                                    isDark && styles.totalLabelDark
                                ]}>
                                    Total:
                                </Text>
                                <Text style={[
                                    styles.totalAmount,
                                    isDark && styles.totalAmountDark
                                ]}>
                                    {calculateTotal().toLocaleString("fr-FR")} FCFA
                                </Text>
                            </View>
                        </View>
                    </>
                )}
            </View>
        );
    }
);


const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    containerDark: {
        // backgroundColor: theme.color.dark.background.secondary,
    },
    section: {
        backgroundColor: "#fff",
        marginBottom: theme.spacing.medium,
    },
    sectionDark: {
        backgroundColor: theme.color.dark.background.primary,
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
        marginTop: theme.spacing.medium,
        paddingTop: theme.spacing.medium,
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
    loadingContainer: {
        flex: 1,
        marginTop: "40%",
        alignItems: "center",
        padding: theme.spacing.medium,
    },
    loadingContainerDark: {
        // backgroundColor: theme.color.dark.background.secondary,
    },
    loadingText: {
        marginTop: theme.spacing.medium,
        fontSize: theme.typography.fontSize.medium,
        color: theme.color.text,
    },
    loadingTextDark: {
        color: theme.color.gray[50],
    },
    retryButton: {
        marginTop: theme.spacing.medium,
        padding: theme.spacing.small,
    },
    retryButtonText: {
        color: theme.color.link,
        fontSize: theme.typography.fontSize.medium,
    },
    retryButtonTextDark: {
        color: theme.color.primary[400],
    },
    successContainer: {
        alignItems: "center",
        justifyContent: "center",
        padding: theme.spacing.medium,
    },
    successContainerDark: {
        // backgroundColor: theme.color.dark.background.secondary,
    },
    successText: {
        fontSize: theme.typography.fontSize.large,
        color: theme.color.success,
        fontWeight: "600",
        marginTop: theme.spacing.medium,
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
});

export default React.memo(PaymentPage);
