import {useRouter} from "expo-router";
import React, {useEffect, useRef, useState} from "react";
import {
    ActivityIndicator,
    Animated,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useColorScheme,
    Dimensions,
    StatusBar as RNStatusBar,
    SafeAreaView,
} from "react-native";

import {theme} from "@/constants/theme";
import {useAuth} from "@/contexts/auth";
import {supabase} from "@/lib/supabase";
import {StatusBar} from "expo-status-bar";
import * as Haptics from "expo-haptics";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import OTPInput from "../../components/ui/OTPInput";
import GoogleAuth from "@/components/GoogleLogin";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Get screen dimensions
const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;
const scale = width / 390; // Base scale on standard iPhone size

// Helper function to get responsive sizes
const rs = (size: number) => Math.round(size * scale);

interface ToastProps {
    visible: boolean;
    message: string;
    type: 'error' | 'success' | 'warning' | 'info';
    onDismiss: () => void;
    action?: {
        label: string;
        onPress: () => void;
    } | null;
}

// Toast Component
const Toast: React.FC<ToastProps> = ({visible, message, type, onDismiss, action}) => {
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

            // Auto hide after 5 seconds
            const timer = setTimeout(() => {
                hideToast();
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    const hideToast = (): void => {
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

    const getBackgroundColor = (): string => {
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

    const getIcon = (): string => {
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
            <View style={styles.toastContent}>
                {/* @ts-ignore */}
                <MaterialCommunityIcons name={getIcon()} size={24} color="white"/>
                <Text style={styles.toastText}>{message}</Text>
            </View>
            {action && (
                <TouchableOpacity onPress={action.onPress} style={styles.toastAction}>
                    <Text style={styles.toastActionText}>{action.label}</Text>
                </TouchableOpacity>
            )}
            <TouchableOpacity onPress={hideToast} style={styles.toastClose}>
                <MaterialCommunityIcons name="close" size={20} color="white"/>
            </TouchableOpacity>
        </Animated.View>
    );
};

interface ToastState {
    visible: boolean;
    message: string;
    type: 'error' | 'success' | 'warning' | 'info';
    action: {
        label: string;
        onPress: () => void;
    } | null;
}

const Register: React.FC = () => {
    const router = useRouter();
    const {signUp, verifyOtp} = useAuth();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // States
    const [email, setEmail] = useState<string>("");
    const [phone, setPhone] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [emailError, setEmailError] = useState<string>("");
    const [phoneError, setPhoneError] = useState<string>("");
    const [passwordError, setPasswordError] = useState<string>("");
    const [confirmPasswordError, setConfirmPasswordError] = useState<string>("");
    const [otp, setOtp] = useState<string>("");
    const [countdown, setCountdown] = useState<number>(300);
    const [isOtpStep, setIsOtpStep] = useState<boolean>(false);
    const [isOtpValid, setIsOtpValid] = useState<boolean>(false);
    const [isChecked, setIsChecked] = useState<boolean>(false);
    const [termsError, setTermsError] = useState<string>("");

    // Toast state
    const [toast, setToast] = useState<ToastState>({
        visible: false,
        message: "",
        type: "error",
        action: null
    });

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const slideInRight = useRef(new Animated.Value(300)).current;
    const slideOutLeft = useRef(new Animated.Value(0)).current;

    // Refs for focus management
    const passwordRef = useRef<TextInput>(null);
    const confirmPasswordRef = useRef<TextInput>(null);

    const emailErrorAnim = useRef(new Animated.Value(0)).current;
    const phoneErrorAnim = useRef(new Animated.Value(0)).current;
    const passwordErrorAnim = useRef(new Animated.Value(0)).current;
    const confirmPasswordErrorAnim = useRef(new Animated.Value(0)).current;
    const termsErrorAnim = useRef(new Animated.Value(0)).current;

    // Animate component mount
    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Animation for OTP step transition
    useEffect(() => {
        if (isOtpStep) {
            // Animate transition to OTP step
            Animated.parallel([
                Animated.timing(slideOutLeft, {
                    toValue: -300,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(slideInRight, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Reset animations
            slideOutLeft.setValue(0);
            slideInRight.setValue(300);
        }
    }, [isOtpStep]);

    // Animation for error messages
    useEffect(() => {
        if (emailError) animateError(emailErrorAnim);
    }, [emailError]);

    useEffect(() => {
        if (phoneError) animateError(phoneErrorAnim);
    }, [phoneError]);

    useEffect(() => {
        if (passwordError) animateError(passwordErrorAnim);
    }, [passwordError]);

    useEffect(() => {
        if (confirmPasswordError) animateError(confirmPasswordErrorAnim);
    }, [confirmPasswordError]);

    useEffect(() => {
        if (termsError) animateError(termsErrorAnim);
    }, [termsError]);

    const animateError = (animValue: Animated.Value): void => {
        Animated.sequence([
            Animated.timing(animValue, {
                toValue: 0,
                duration: 0,
                useNativeDriver: true,
            }),
            Animated.timing(animValue, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start();
    };

    const shakeError = (): void => {
        Animated.sequence([
            Animated.timing(shakeAnim, {
                toValue: 10,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
                toValue: -10,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
                toValue: 10,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
                toValue: 0,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();
    };

    // OTP validation
    useEffect(() => {
        if (otp?.length === 6) {
            setIsOtpValid(true);
        } else {
            setIsOtpValid(false);
        }
    }, [otp]);

    // Countdown timer
    useEffect(() => {
        let timer: NodeJS.Timeout | undefined;
        if (isOtpStep && countdown > 0) {
            timer = setInterval(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [isOtpStep, countdown]);

    const formatCountdown = (): string => {
        const minutes = Math.floor(countdown / 60);
        const seconds = countdown % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const validateEmail = (email: string): boolean => {
        if (!email) {
            setEmailError("L'email est requis");
            return false;
        }
        if (!EMAIL_REGEX.test(email)) {
            setEmailError("Format d'email invalide");
            return false;
        }
        setEmailError("");
        return true;
    };

    const validatePhone = (phone: string): boolean => {
        if (!phone) {
            setPhoneError("Le numéro de téléphone est requis");
            return false;
        }

        const regex = /^6[5-9]{1}[0-9]{7}$/;

        if (!regex.test(phone)) {
            setPhoneError("Format invalide. Ex: 65XXXXXXX, 66XXXXXXX");
            return false;
        }

        setPhoneError("");
        return true;
    }

    const validatePassword = (password: string): boolean => {
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

    const validateConfirmPassword = (password: string, confirmPassword: string): boolean => {
        if (password !== confirmPassword) {
            setConfirmPasswordError("Les mots de passe ne correspondent pas");
            return false;
        }
        setConfirmPasswordError("");
        return true;
    };

    const validateTerms = (): boolean => {
        if (!isChecked) {
            setTermsError("Vous devez accepter les conditions d'utilisation");
            return false;
        }
        setTermsError("");
        return true;
    };

    const handleSignUp = async (): Promise<void> => {
        try {
            // Validate fields
            const isPhoneValid = validatePhone(phone);
            const isPasswordValid = validatePassword(password);
            const isConfirmPasswordValid = validateConfirmPassword(
                password,
                confirmPassword
            );
            const isTermsValid = validateTerms();

            if (!isPhoneValid || !isPasswordValid || !isConfirmPasswordValid || !isTermsValid ) {
                shakeError();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                return;
            }

            setIsLoading(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            await signUp(phone, password);

            // TODO : remove in update case we trust user and validate after
            setIsOtpStep(true);
            startCountdown();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            setToast({
                visible: true,
                message: "Code de vérification envoyé à votre email",
                type: "success",
                action: null
            });
        } catch (error: any) {
            shakeError();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

            if (error.message === "email exists") {
                setToast({
                    visible: true,
                    message: "Cet email ou phone est déjà utilisé",
                    type: "error",
                    action: {
                        label: "Se connecter",
                        onPress: () => router.push("/login")
                    }
                });
            } else {
                setToast({
                    visible: true,
                    message: "Une erreur est survenue, veuillez réessayer",
                    type: "error",
                    action: null
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const startCountdown = (): void => {
        setCountdown(300);
    };

    const handleVerifyOtp = async (): Promise<void> => {
        try {
            setIsLoading(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            await verifyOtp(email, otp, password);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setToast({
                visible: true,
                message: "Votre compte a été créé avec succès",
                type: "success",
                action: null
            });
        } catch (error) {
            shakeError();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

            setToast({
                visible: true,
                message: "Code de vérification invalide",
                type: "error",
                action: null
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async (): Promise<void> => {
        try {
            setIsLoading(true);
            await supabase.auth.signInWithOtp({phone: phone});
            startCountdown();

            setToast({
                visible: true,
                message: "Nouveau code envoyé à votre email",
                type: "success",
                action: null
            });
        } catch (error) {
            setToast({
                visible: true,
                message: "Échec de l'envoi du code",
                type: "error",
                action: null
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleModifyEmail = (): void => {
        setIsOtpStep(false);
        setOtp("");
    };

    return (
        <SafeAreaView style={[styles.safeArea, isDark && styles.safeAreaDark]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={[styles.container, isDark && styles.containerDark]}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <StatusBar style={isDark ? "light" : "dark"}/>

                {/* Toast notification */}
                <Toast
                    visible={toast.visible}
                    message={toast.message}
                    type={toast.type}
                    action={toast.action}
                    onDismiss={() => setToast({...toast, visible: false})}
                />

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    <Animated.View
                        style={[
                            styles.formContainer,
                            {
                                opacity: fadeAnim,
                                transform: [{translateY: slideAnim}, {translateX: shakeAnim}],
                            },
                        ]}
                    >
                        {/* Logo section */}
                        {
                            !isOtpStep &&
                            <View style={styles.logoSection}>
                                <Image
                                    source={require("@/assets/images/icon.png")}
                                    style={styles.logo}
                                    resizeMode="contain"
                                />
                                <View style={{
                                    flexDirection: "column",
                                    justifyContent: "flex-start",
                                    alignItems: "flex-start"
                                }}>
                                    <Text style={[styles.title, isDark && styles.textDark]}>
                                        Elearn Prepa
                                    </Text>
                                    <Text style={[styles.subtitle, isDark && styles.textGray]}>
                                        Formez vous pour réussir
                                    </Text>
                                </View>
                            </View>
                        }

                        {/* Main content with animations for step transition */}
                        <View style={styles.contentContainer}>
                            {/* Step 1: Registration Form */}
                            {!isOtpStep && (
                                <Animated.View
                                    style={[
                                        styles.formStep,
                                        {transform: [{translateX: slideOutLeft}]}
                                    ]}
                                >
                                    <Text style={[styles.subtitle, isDark && styles.textGray]}>
                                        Inscrivez vous avec
                                    </Text>

                                    {/* Social Login Options */}
                                    <View style={styles.socialButtons}>
                                        <GoogleAuth onAuthSuccess={() => router.push("/")}>
                                            <View style={[styles.socialButton, styles.googleButton]}>
                                                <MaterialCommunityIcons name="google" size={20} color="white"/>
                                                <Text style={styles.socialButtonText}>Google</Text>
                                            </View>
                                        </GoogleAuth>
                                    </View>

                                    <View style={styles.divider}>
                                        <View style={[styles.dividerLine, isDark && styles.dividerLineDark]}/>
                                        <Text style={[styles.dividerText, isDark && styles.textGray]}>
                                            ou continuer avec
                                        </Text>
                                        <View style={[styles.dividerLine, isDark && styles.dividerLineDark]}/>
                                    </View>

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
                                                    const numericText = text.replace(/[^0-9]/g, '');
                                                    if (numericText.length <= 9) {
                                                        setPhone(numericText);
                                                        if (phoneError) validatePhone(numericText);
                                                    }
                                                }}
                                                style={[styles.input, isDark && styles.inputDark]}
                                                placeholder="65X XX XX XX"
                                                placeholderTextColor={isDark ? "#666666" : "#999999"}
                                                keyboardType="numeric"
                                                maxLength={9}
                                                returnKeyType="next"
                                                onSubmitEditing={() => passwordRef.current?.focus()}
                                            />
                                           
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
                                                    if (confirmPassword && confirmPasswordError)
                                                        validateConfirmPassword(text, confirmPassword);
                                                }}
                                                style={[styles.input, isDark && styles.inputDark]}
                                                placeholder="Votre mot de passe"
                                                placeholderTextColor={isDark ? "#666666" : "#999999"}
                                                secureTextEntry={!showPassword}
                                                returnKeyType="next"
                                                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
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

                                    {/* Confirm Password Input */}
                                    <View style={styles.inputContainer}>
                                        <Text style={[styles.label, isDark && styles.textDark]}>
                                            Confirmer le mot de passe
                                        </Text>
                                        <View style={[
                                            styles.inputWrapper,
                                            isDark && styles.inputWrapperDark,
                                            confirmPasswordError && styles.inputError
                                        ]}>
                                            <MaterialCommunityIcons
                                                name="lock-check-outline"
                                                size={24}
                                                color={confirmPasswordError ? theme.color.error : (isDark ? "#CCCCCC" : "#666666")}
                                                style={styles.inputIcon}
                                            />
                                            <TextInput
                                                ref={confirmPasswordRef}
                                                value={confirmPassword}
                                                onChangeText={(text) => {
                                                    setConfirmPassword(text);
                                                    if (confirmPasswordError) validateConfirmPassword(password, text);
                                                }}
                                                style={[styles.input, isDark && styles.inputDark]}
                                                placeholder="Confirmez votre mot de passe"
                                                placeholderTextColor={isDark ? "#666666" : "#999999"}
                                                secureTextEntry={!showPassword}
                                                returnKeyType="done"
                                            />
                                        </View>
                                        {confirmPasswordError && (
                                            <Animated.View
                                                style={[
                                                    styles.errorContainer,
                                                    {
                                                        opacity: confirmPasswordErrorAnim, transform: [{
                                                            translateY: confirmPasswordErrorAnim.interpolate({
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
                                                <Text style={styles.errorText}>{confirmPasswordError}</Text>
                                            </Animated.View>
                                        )}
                                    </View>

                                    {/* Terms and Conditions Checkbox */}
                                    <View style={styles.checkboxContainer}>
                                        <TouchableOpacity
                                            style={[
                                                styles.checkbox,
                                                termsError && styles.checkboxError,
                                                isChecked && styles.checkboxChecked
                                            ]}
                                            onPress={() => {
                                                setIsChecked(!isChecked);
                                                if (termsError) validateTerms();
                                            }}
                                        >
                                            {isChecked && (
                                                <MaterialCommunityIcons
                                                    name="check"
                                                    size={18}
                                                    color="#FFFFFF"
                                                />
                                            )}
                                        </TouchableOpacity>
                                        <Text style={[styles.checkboxLabel, isDark && styles.textGray]}>
                                            J'accepte les{" "}
                                            <Text
                                                style={styles.link}
                                                onPress={() => router.push("/(app)/(CGU)/terms" as any)}
                                            >
                                                conditions d'utilisation
                                            </Text>
                                        </Text>
                                    </View>

                                    {termsError && (
                                        <Animated.View
                                            style={[
                                                styles.errorContainer,
                                                {
                                                    opacity: termsErrorAnim, transform: [{
                                                        translateY: termsErrorAnim.interpolate({
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
                                            <Text style={styles.errorText}>{termsError}</Text>
                                        </Animated.View>
                                    )}

                                    {/* Sign Up Button */}
                                    <TouchableOpacity
                                        style={[
                                            styles.primaryButton,
                                            isLoading && styles.buttonDisabled
                                        ]}
                                        onPress={handleSignUp}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color="#FFFFFF"/>
                                        ) : (
                                            <Text style={styles.primaryButtonText}>S'inscrire</Text>
                                        )}
                                    </TouchableOpacity>

                                    {/* Login Link */}
                                    <View style={styles.footerText}>
                                        <Text style={[styles.footerLabel, isDark && styles.textGray]}>
                                            Déjà un compte ?{" "}
                                        </Text>
                                        <TouchableOpacity onPress={() => router.push("/login")}>
                                            <Text style={styles.footerLink}>Se connecter</Text>
                                        </TouchableOpacity>
                                    </View>
                                </Animated.View>
                            )}

                            {/* Step 2: OTP Verification */}
                            {isOtpStep && (
                                <Animated.View
                                    style={[
                                        styles.formStep,
                                        {transform: [{translateX: slideInRight}]}
                                    ]}
                                >
                                    <Text style={[styles.otpTitle, isDark && styles.textDark]}>
                                        Vérification
                                    </Text>
                                    <Text style={[styles.subtitle, isDark && styles.textGray]}>
                                        Entrez le code à 6 chiffres envoyé à
                                    </Text>
                                    <Text style={[styles.emailHighlight, isDark && styles.textDark]}>
                                        {email}
                                    </Text>

                                    <View style={styles.otpContainer}>
                                        <OTPInput
                                            value={otp}
                                            onChangeText={setOtp}
                                            isError={!isOtpValid && otp.length === 6}
                                        />

                                        <View style={styles.countdownContainer}>
                                            <Text style={[styles.countdownText, isDark && styles.textGray]}>
                                                {formatCountdown()}
                                            </Text>
                                            <TouchableOpacity
                                                onPress={handleResendOtp}
                                                disabled={countdown > 0 || isLoading}
                                                style={[countdown > 0 && styles.resendDisabled]}
                                            >
                                                <Text style={[
                                                    styles.resendLink,
                                                    countdown > 0 && styles.resendDisabledText
                                                ]}>
                                                    Renvoyer le code
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={styles.otpButtonsContainer}>
                                        <TouchableOpacity
                                            style={[
                                                styles.primaryButton,
                                                (!isOtpValid || isLoading) && styles.buttonDisabled
                                            ]}
                                            onPress={handleVerifyOtp}
                                            disabled={!isOtpValid || isLoading}
                                        >
                                            {isLoading ? (
                                                <ActivityIndicator color="#FFFFFF"/>
                                            ) : (
                                                <Text style={styles.primaryButtonText}>Vérifier</Text>
                                            )}
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.secondaryButton, isLoading && styles.buttonDisabled]}
                                            onPress={handleModifyEmail}
                                            disabled={isLoading}
                                        >
                                            <MaterialCommunityIcons
                                                name="email-edit-outline"
                                                size={20}
                                                color={theme.color.primary[500]}
                                                style={styles.buttonIcon}
                                            />
                                            <Text style={styles.secondaryButtonText}>Modifier l'email</Text>
                                        </TouchableOpacity>
                                    </View>
                                </Animated.View>
                            )}
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
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
    scrollContent: {
        flexGrow: 1,
        justifyContent: "center",
        padding: width * 0.05,
        paddingBottom: height * 0.05,
    },
    formContainer: {
        width: "100%",
        maxWidth: Math.min(400, width * 0.95),
        alignSelf: "center",
    },
    logoSection: {
        alignItems: "center",
        flexDirection: "row",
        gap: rs(12),
        marginBottom: rs(20),
    },
    logo: {
        width: isSmallDevice ? 60 : 80,
        height: isSmallDevice ? 60 : 80,
        marginBottom: rs(12),
        borderRadius: 16,
    },
    appName: {
        fontFamily: theme.typography.fontFamily,
        fontSize: rs(28),
        fontWeight: "bold",
        color: "#1A1A1A",
    },
    contentContainer: {
        position: "relative",
        overflow: "hidden",
    },
    formStep: {
        width: "100%",
    },
    title: {
        fontFamily: theme.typography.fontFamily,
        fontSize: isSmallDevice ? rs(22) : rs(26),
        fontWeight: "bold",
        lineHeight : isSmallDevice ? rs(28) : rs(32),
        color: "#1A1A1A",
        textAlign: "center",
        marginBottom: rs(12),
    },
    otpTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: isSmallDevice ? rs(22) : rs(26),
        fontWeight: "bold",
        color: "#1A1A1A",
        textAlign: "center",
        marginBottom: rs(12),
        marginTop: rs(20),
    },
    subtitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: isSmallDevice ? rs(14) : rs(15),
        color: "#666666",
        textAlign: "center",
        marginBottom: rs(24),
    },
    emailHighlight: {
        fontFamily: theme.typography.fontFamily,
        fontSize: isSmallDevice ? rs(15) : rs(16),
        fontWeight: "600",
        color: "#1A1A1A",
        textAlign: "center",
        marginBottom: rs(24),
    },
    inputContainer: {
        marginBottom: rs(20),
    },
    label: {
        fontFamily: theme.typography.fontFamily,
        fontSize: isSmallDevice ? rs(14) : rs(15),
        fontWeight: "600",
        color: "#1A1A1A",
        marginBottom: rs(8),
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#E5E5E5",
        borderRadius: 12,
        backgroundColor: "#FFFFFF",
        overflow: "hidden",
        height: isSmallDevice ? rs(45) : rs(50),
    },
    inputWrapperDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderColor: "#333333",
    },
    inputIcon: {
        padding: isSmallDevice ? rs(10) : rs(12),
    },
    input: {
        flex: 1,
        height: isSmallDevice ? rs(45) : rs(50),
        fontFamily: theme.typography.fontFamily,
        fontSize: isSmallDevice ? rs(15) : rs(16),
        color: "#1A1A1A",
    },
    inputDark: {
        color: "#FFFFFF",
    },
    inputError: {
        borderColor: theme.color.error,
    },
    eyeIcon: {
        padding: isSmallDevice ? rs(10) : rs(12),
    },
    errorIcon: {
        padding: isSmallDevice ? rs(10) : rs(12),
    },
    errorContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: rs(6),
        marginTop: rs(4),
        gap: rs(6),
    },
    errorText: {
        color: theme.color.error,
        fontFamily: theme.typography.fontFamily,
        fontSize: isSmallDevice ? rs(11) : rs(12),
        fontWeight: "500",
    },
    checkboxContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: rs(10),
    },
    checkbox: {
        width: isSmallDevice ? rs(22) : rs(24),
        height: isSmallDevice ? rs(22) : rs(24),
        borderWidth: 2,
        borderColor: "#E5E5E5",
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
        marginRight: rs(10),
    },
    checkboxError: {
        borderColor: theme.color.error,
    },
    checkboxChecked: {
        backgroundColor: theme.color.primary[500],
        borderColor: theme.color.primary[500],
    },
    checkboxLabel: {
        fontFamily: theme.typography.fontFamily,
        fontSize: isSmallDevice ? rs(13) : rs(14),
        color: "#666666",
        flex: 1,
    },
    link: {
        color: theme.color.primary[500],
        fontWeight: "600",
    },
    primaryButton: {
        height: isSmallDevice ? rs(45) : rs(50),
        backgroundColor: theme.color.primary[500],
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginVertical: rs(20),
    },
    primaryButtonText: {
        color: "#FFFFFF",
        fontFamily: theme.typography.fontFamily,
        fontSize: isSmallDevice ? rs(15) : rs(16),
        fontWeight: "600",
    },
    secondaryButton: {
        height: isSmallDevice ? rs(45) : rs(50),
        backgroundColor: "transparent",
        borderWidth: 2,
        borderColor: theme.color.primary[100],
        borderRadius: 12,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
    secondaryButtonText: {
        color: theme.color.primary[500],
        fontFamily: theme.typography.fontFamily,
        fontSize: isSmallDevice ? rs(15) : rs(16),
        fontWeight: "600",
    },
    buttonIcon: {
        marginRight: rs(8),
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    divider: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: rs(20),
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: "#E5E5E5",
    },
    dividerLineDark: {
        backgroundColor: "#333333",
    },
    dividerText: {
        paddingHorizontal: rs(5),
        color: "#666666",
        fontFamily: theme.typography.fontFamily,
        fontSize: isSmallDevice ? rs(13) : rs(14),
    },
    socialButtons: {
        marginVertical: rs(0),
        flexDirection: "row",
        justifyContent: "space-between",
        gap: rs(12),
    },
    socialButton: {
        flex: 1,
        flexDirection: "row",
        height: isSmallDevice ? rs(45) : rs(48),
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        gap: rs(8),
    },
    socialButtonText: {
        color: "#FFFFFF",
        fontFamily: theme.typography.fontFamily,
        fontSize: isSmallDevice ? rs(14) : rs(15),
        fontWeight: "500",
    },
    googleButton: {
        backgroundColor: "#DB4437",
    },
    facebookButton: {
        backgroundColor: "#4267B2",
    },
    footerText: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: rs(24),
        marginBottom: rs(16),
    },
    footerLabel: {
        fontFamily: theme.typography.fontFamily,
        fontSize: isSmallDevice ? rs(13) : rs(14),
        color: "#666666",
    },
    footerLink: {
        color: theme.color.primary[500],
        lineHeight: isSmallDevice ? rs(18) : rs(20),
        fontFamily: theme.typography.fontFamily,
        fontSize: isSmallDevice ? rs(13) : rs(14),
        fontWeight: "600",
    },
    otpContainer: {
        alignItems: "center",
        marginVertical: rs(24),
    },
    countdownContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: rs(20),
        gap: rs(10),
    },
    countdownText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: isSmallDevice ? rs(15) : rs(16),
        color: "#666666",
        fontWeight: "500",
    },
    resendLink: {
        color: theme.color.primary[500],
        fontFamily: theme.typography.fontFamily,
        fontSize: isSmallDevice ? rs(13) : rs(14),
        fontWeight: "600",
        textDecorationLine: "underline",
    },
    resendDisabled: {
        opacity: 0.5,
    },
    resendDisabledText: {
        color: "#999999",
    },
    otpButtonsContainer: {
        gap: rs(12),
    },
    textDark: {
        color: "#FFFFFF",
    },
    textGray: {
        color: "#CCCCCC",
    },
    // Toast styles
    toastContainer: {
        position: "absolute",
        bottom: height * 0.03,
        left: width * 0.05,
        right: width * 0.05,
        maxWidth: 600,
        alignSelf: 'center',
        backgroundColor: theme.color.primary[500],
        borderRadius: 12,
        padding: rs(16),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
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
    toastContent: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    toastText: {
        color: "white",
        fontFamily: theme.typography.fontFamily,
        fontSize: isSmallDevice ? rs(13) : rs(14),
        fontWeight: "500",
        marginLeft: rs(12),
        flex: 1,
    },
    toastAction: {
        paddingHorizontal: rs(12),
        paddingVertical: rs(4),
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderRadius: 8,
        marginHorizontal: rs(8),
    },
    toastActionText: {
        color: "white",
        fontFamily: theme.typography.fontFamily,
        fontSize: isSmallDevice ? rs(12) : rs(13),
        fontWeight: "600",
    },
    toastClose: {
        padding: rs(4),
    },
});

export default Register;