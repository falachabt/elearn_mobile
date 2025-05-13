import React, {useRef, useState} from "react";
import {
    ActivityIndicator,
    Animated,
    Image,
    KeyboardAvoidingView, Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from "react-native";
import {Redirect, useRouter} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {useAuth} from "@/contexts/auth";
import {theme} from "@/constants/theme";
import {Pressable} from "react-native-gesture-handler";
import {MaterialCommunityIcons} from '@expo/vector-icons';
import GoogleAuth from "@/components/GoogleLogin";
import {AppleLogin} from "@/components/AppleLogin";
import {HapticType, useHaptics} from "@/hooks/useHaptics";
import Head from "expo-router/head";


const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;

// Toast Component
const Toast = ({visible, message, type, onDismiss}: {
    visible: boolean;
    message: string;
    type: string;
    onDismiss: () => void
}) => {
    const translateY = useRef(new Animated.Value(70)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start();

            // Auto hide after 3 seconds
            const timer = setTimeout(() => {
                hideToast();
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    const hideToast = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 70,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start(() => {
            if (onDismiss) onDismiss();
        });
    };

    const getBackgroundColor = () => {
        switch (type) {
            case 'error':
                return theme.color.error;
            case 'success':
                return '#4CAF50';
            case 'warning':
                return '#FF9800';
            default:
                return theme.color.primary[500];
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'error':
                return 'alert-circle';
            case 'success':
                return 'check-circle';
            case 'warning':
                return 'alert';
            default:
                return 'information';
        }
    };

    if (!visible) return null;

    return (
        <Animated.View
            style={[
                styles.toastContainer,
                {
                    backgroundColor: getBackgroundColor(),
                    transform: [{translateY}],
                    opacity,
                }
            ]}
        >
            <MaterialCommunityIcons name={getIcon()} size={24} color="white"/>
            <Text style={styles.toastText}>{message}</Text>
            <TouchableOpacity onPress={hideToast}>
                <MaterialCommunityIcons name="close" size={20} color="white"/>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default function Login() {
    const router = useRouter();
    const {signIn} = useAuth();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { trigger } = useHaptics();

    // States
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [phoneError, setPhoneError] = useState("");
    const [passwordError, setPasswordError] = useState("");

    // Toast state
    const [toast, setToast] = useState({
        visible: false,
        message: "",
        type: "error"
    });

    const passwordRef = useRef<TextInput>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const phoneErrorAnim = useRef(new Animated.Value(0)).current;
    const passwordErrorAnim = useRef(new Animated.Value(0)).current;

    // Shake animation for form errors
    const shakeAnim = useRef(new Animated.Value(0)).current;

    // Animation on mount
    React.useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    // Animation for error messages
    React.useEffect(() => {
        if (phoneError) {
            Animated.sequence([
                Animated.timing(phoneErrorAnim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                }),
                Animated.timing(phoneErrorAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start();
        }
    }, [phoneError]);

    React.useEffect(() => {
        if (passwordError) {
            Animated.sequence([
                Animated.timing(passwordErrorAnim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                }),
                Animated.timing(passwordErrorAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start();
        }
    }, [passwordError]);

    const validatePhone = (phone: string) => {
        if (!phone) {
            setPhoneError("Le numéro de téléphone est requis");
            return false;
        }
        if (!PHONE_REGEX.test(phone)) {
            setPhoneError("Numéro de téléphone invalide");
            return false;
        }
        setPhoneError("");
        return true;
    };

    const validatePassword = (password: string | any[]) => {
        if (!password) {
            setPasswordError("Le mot de passe est requis");
            return false;
        }
        if (password.length < 6) {
            setPasswordError("6 caractères minimum");
            return false;
        }
        setPasswordError("");
        return true;
    };

    // Shake animation function
    const shakeForm = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, {toValue: 10, duration: 50, useNativeDriver: true}),
            Animated.timing(shakeAnim, {toValue: -10, duration: 50, useNativeDriver: true}),
            Animated.timing(shakeAnim, {toValue: 10, duration: 50, useNativeDriver: true}),
            Animated.timing(shakeAnim, {toValue: -10, duration: 50, useNativeDriver: true}),
            Animated.timing(shakeAnim, {toValue: 0, duration: 50, useNativeDriver: true})
        ]).start();
    };

    const handleLogin = async () => {
        try {
            const isPhoneValid = validatePhone(phone);
            const isPasswordValid = validatePassword(password);

            if (!isPhoneValid || !isPasswordValid) {
                trigger(HapticType.ERROR);
                shakeForm();
                return;
            }

            setIsLoading(true);
            trigger(HapticType.LIGHT);

            await signIn(phone, password);
            trigger(HapticType.SUCCESS);

            setToast({
                visible: true,
                message: "Connexion réussie",
                type: "success"
            });
            return <Redirect href={"/(app)"}/>;
        } catch (error) {
            trigger(HapticType.ERROR);
            shakeForm();
            setToast({
                visible: true,
                message: "Numéro de téléphone ou mot de passe incorrect",
                type: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (<KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={[styles.container, isDark && styles.containerDark]}
        >
            <Head>
                ( <title>E{"lear Prepa | Connexion"} </title>)
                <meta name="description" content="Préparez les concours de vos reves" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link rel="icon" href="/favicon.ico" />

            </Head>
            <StatusBar style={isDark ? "light" : "dark"}/>

            {/* Toast notification */}
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onDismiss={() => setToast({...toast, visible: false})}
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Animated.View
                    style={[
                        styles.content,
                        {
                            opacity: fadeAnim,
                            transform: [{translateX: shakeAnim}]
                        }
                    ]}
                >
                    {/* Logo Section */}
                    <View style={styles.logoSection}>
                        <Image
                            source={require("@/assets/images/icon.png")}
                            style={styles.logo}
                        />
                        <View style={{
                            flexDirection: "column",
                            justifyContent: "flex-start",
                            alignItems: "flex-start"
                        }}>
                            <Text style={[styles.welcomeTitle, isDark && styles.textDark]}>
                                Elearn Prepa
                            </Text>
                            <Text style={[styles.welcomeSubtitle, isDark && styles.textGray]}>
                                Formez vous pour réussir
                            </Text>
                        </View>
                    </View>

                    {/* Welcome Text */}
                    <View style={styles.welcomeSection}>
                        <Text style={[styles.welcomeSubtitle, isDark && styles.textGray]}>
                            👋 Connectez-vous pour continuer
                        </Text>
                    </View>

                    {/* Form Section */}
                    <View style={styles.form}>
                        {/* Phone Input */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, isDark && styles.textDark]}>
                                Numéro de téléphone
                            </Text>
                            <View style={[
                                styles.inputWrapper,
                                isDark && styles.inputWrapperDark,
                                phoneError && styles.inputError
                            ]}>
                                <MaterialCommunityIcons
                                    name="phone-outline"
                                    size={24}
                                    color={phoneError ? theme.color.error : (isDark ? "#CCCCCC" : "#666666")}
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    value={phone}
                                    onChangeText={(text) => {
                                        setPhone(text);
                                        if (phoneError) validatePhone(text);
                                    }}
                                    style={[styles.input, isDark && styles.inputDark, {outline: 'none'}]}
                                    placeholder="6XX XX XX XX"
                                    placeholderTextColor={isDark ? "#666666" : "#999999"}
                                    keyboardType="phone-pad"
                                    returnKeyType="next"
                                    onSubmitEditing={() => passwordRef?.current?.focus()}
                                />
                                {phoneError && (
                                    <MaterialCommunityIcons
                                        name="alert-circle"
                                        size={20}
                                        color={theme.color.error}
                                        style={styles.errorIcon}
                                    />
                                )}
                            </View>
                            {phoneError && (
                                <Animated.View
                                    style={[
                                        styles.errorContainer,
                                        {
                                            opacity: phoneErrorAnim, transform: [{
                                                translateY: phoneErrorAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [-10, 0]
                                                })
                                            }]
                                        }
                                    ]}
                                >
                                    <MaterialCommunityIcons
                                        name="alert-circle"
                                        size={16}
                                        color={theme.color.error}
                                    />
                                    <Text style={styles.errorText}>{phoneError}</Text>
                                </Animated.View>
                            )}
                        </View>

                        {/* Password Input */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, isDark && styles.textDark]}>
                                Mot de passe
                            </Text>
                            <View style={[
                                styles.inputWrapper,
                                isDark && styles.inputWrapperDark,
                                passwordError && styles.inputError
                            ]}>
                                <MaterialCommunityIcons
                                    name="lock-outline"
                                    size={24}
                                    color={passwordError ? theme.color.error : (isDark ? "#CCCCCC" : "#666666")}
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    ref={passwordRef}
                                    value={password}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        if (passwordError) validatePassword(text);
                                    }}
                                    style={[styles.input, isDark && styles.inputDark, {outline: 'none'}]}
                                    placeholder="Votre mot de passe"
                                    placeholderTextColor={isDark ? "#666666" : "#999999"}
                                    secureTextEntry={!showPassword}
                                    returnKeyType="done"
                                    onSubmitEditing={handleLogin}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeIcon}
                                >
                                    <MaterialCommunityIcons
                                        name={showPassword ? "eye-off" : "eye"}
                                        size={24}
                                        color={isDark ? "#CCCCCC" : "#666666"}
                                    />
                                </TouchableOpacity>
                            </View>
                            {passwordError && (
                                <Animated.View
                                    style={[
                                        styles.errorContainer,
                                        {
                                            opacity: passwordErrorAnim, transform: [{
                                                translateY: passwordErrorAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [-10, 0]
                                                })
                                            }]
                                        }
                                    ]}
                                >
                                    <MaterialCommunityIcons
                                        name="alert-circle"
                                        size={16}
                                        color={theme.color.error}
                                    />
                                    <Text style={styles.errorText}>{passwordError}</Text>
                                </Animated.View>
                            )}
                        </View>

                        {/* Forgot Password */}

                        <TouchableOpacity
                            style={styles.forgotPassword}
                            onPress={() => Platform.OS === 'ios'
                                ? Linking.openURL('https://app.elearnprepa.com/forgot_password?come_from=mobile')
                                : router.push("/(auth)/forgot_password")}
                        >
                            <Text style={styles.forgotPasswordText}>
                                Mot de passe oublié ?
                            </Text>
                        </TouchableOpacity>

                        {/* Login Button */}
                        <Pressable
                            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                            onPress={handleLogin}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff"/>
                            ) : (
                                <Text style={styles.loginButtonText}>Se connecter</Text>
                            )}
                        </Pressable>

                        {/* Social Login Section */}
                        {
                         Platform.OS !== "ios" &&

                        <View style={styles.socialSection}>
                            <View style={styles.divider}>
                                <View style={[styles.dividerLine, isDark && styles.dividerLineDark]}/>
                                <Text style={[styles.dividerText, isDark && styles.textGray]}>
                                    ou continuer avec
                                </Text>
                                <View style={[styles.dividerLine, isDark && styles.dividerLineDark]}/>
                            </View>

                            <View style={styles.socialButtons}>
                                <GoogleAuth onAuthSuccess={() => router.push("/")}>
                                    <View style={[styles.socialButton, styles.googleButton]}>
                                        <MaterialCommunityIcons name="google" size={20} color="white"/>
                                        <Text style={styles.socialButtonText}>Google</Text>
                                    </View>
                                </GoogleAuth>

                                <AppleLogin/>
                            </View>
                        </View>
                        }
                        {/* Register Link */}
                        <View style={styles.registerSection}>
                            <Text style={[styles.registerText, isDark && styles.textGray]}>
                                Vous n'avez pas de compte ?
                            </Text>
                            <TouchableOpacity onPress={() => router.push(Platform.OS === "ios" ? "/(auth)" : "/register")}>
                                {
                                    Platform.OS === "ios" ?
                                <Text style={styles.registerLink}>Créez votre compte</Text>
                                        :
                                <Text style={styles.registerLink}>S'inscrire</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    containerDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    content: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 32,
        flexDirection: 'row',
        gap: 12,
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: 12,
        borderRadius: 16,
    },
    appName: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    welcomeSection: {
        marginBottom: 32,
        alignItems: 'center',
    },
    welcomeTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    welcomeSubtitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: '#666666',
    },
    form: {
        gap: 20,
    },
    inputContainer: {
        gap: 8,
    },
    label: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E5E5E5',
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
    },
    inputWrapperDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderColor: '#333333',
    },
    inputIcon: {
        padding: 12,
    },
    input: {
        flex: 1,
        height: 50,
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: '#1A1A1A',
    },
    inputDark: {
        color: '#FFFFFF',
    },
    inputError: {
        borderColor: theme.color.error,
    },
    eyeIcon: {
        padding: 12,
    },
    errorIcon: {
        padding: 12,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        marginTop: 4,
        gap: 6,
    },
    errorText: {
        color: theme.color.error,
        fontFamily: theme.typography.fontFamily,
        fontSize: 12,
        fontWeight: '500',
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 8,
    },
    forgotPasswordText: {
        color: theme.color.primary[500],
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '500',
    },
    loginButton: {
        height: 50,
        backgroundColor: theme.color.primary[500],
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
    },
    socialSection: {
        marginTop: 24,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E5E5',
    },
    dividerLineDark: {
        backgroundColor: '#333333',
    },
    dividerText: {
        paddingHorizontal: 16,
        color: '#666666',
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
    },
    socialButtons: {
        flexDirection: 'row',
        gap: 16,
    },
    socialButton: {
        flex: 1,
        flexDirection: 'row',
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    googleButton: {
        backgroundColor: '#DB4437',
    },
    facebookButton: {
        backgroundColor: '#4267B2',
    },
    socialButtonText: {
        color: '#FFFFFF',
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '500',
    },
    registerSection: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: 24,
    },
    registerText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#666666',
    },
    registerLink: {
        color: theme.color.primary[500],
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '600',
    },
    textDark: {
        color: '#FFFFFF',
    },
    textGray: {
        color: '#CCCCCC',
    },
    toastContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: theme.color.primary[500],
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1000,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
        elevation: 6,
    },
    toastText: {
        color: 'white',
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
        marginHorizontal: 12,
    },
});