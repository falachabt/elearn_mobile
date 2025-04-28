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
} from "react-native";

import {theme} from "@/constants/theme";
import {supabase} from "@/lib/supabase";
import {StatusBar} from "expo-status-bar";
import * as Haptics from "expo-haptics";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import OTPInput from "../../components/ui/OTPInput";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

    const getIcon = () => {
        switch (type) {
            case 'error':
                return 'alert-circle' as const;
            case 'success':
                return 'check-circle' as const;
            case 'warning':
                return 'alert' as const;
            default:
                return 'information' as const;
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
                <MaterialCommunityIcons name={getIcon()} size={24} color="white"/>
                <Text style={styles.toastText}>{message}</Text>
            </View>
            {action && (
                <TouchableOpacity onPress={action.onPress} style={styles.toastAction}>
                    <Text style={styles.toastActionText}>{action.label}</Text>
                </TouchableOpacity>
            )}
            <TouchableOpacity onPress={hideToast} style={styles.toastClose}>
                <MaterialCommunityIcons name={"close" as const} size={20} color="white"/>
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

const ResetPassword: React.FC = () => {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // State variables to manage the multi-step flow
    const [currentStep, setCurrentStep] = useState<number>(1); // 1: Email entry, 2: OTP verification, 3: New password
    const [email, setEmail] = useState<string>("");
    const [otp, setOtp] = useState<string>("");
    const [newPassword, setNewPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [countdown, setCountdown] = useState<number>(60);
    const [isOtpValid, setIsOtpValid] = useState<boolean>(false);

    // Error states
    const [emailError, setEmailError] = useState<string>("");
    const [passwordError, setPasswordError] = useState<string>("");
    const [confirmPasswordError, setConfirmPasswordError] = useState<string>("");

    // Toast state
    const [toast, setToast] = useState<ToastState>({
        visible: false,
        message: "",
        type: "error",
        action: null
    });

    // Refs for animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const slideInRight = useRef(new Animated.Value(300)).current;
    const slideOutLeft = useRef(new Animated.Value(0)).current;
    const slideInRight2 = useRef(new Animated.Value(300)).current;
    const slideOutLeft2 = useRef(new Animated.Value(0)).current;

    // Refs for focus management
    const newPasswordRef = useRef<TextInput>(null);
    const confirmPasswordRef = useRef<TextInput>(null);
    const emailErrorAnim = useRef(new Animated.Value(0)).current;
    const passwordErrorAnim = useRef(new Animated.Value(0)).current;
    const confirmPasswordErrorAnim = useRef(new Animated.Value(0)).current;

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

    // Effect for step transitions
    useEffect(() => {
        if (currentStep === 2) {
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
        } else if (currentStep === 3) {
            // Animate transition to new password step
            Animated.parallel([
                Animated.timing(slideOutLeft2, {
                    toValue: -300,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(slideInRight2, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Reset animations
            slideOutLeft.setValue(0);
            slideInRight.setValue(300);
            slideOutLeft2.setValue(0);
            slideInRight2.setValue(300);
        }
    }, [currentStep]);

    // Animation for error messages
    useEffect(() => {
        if (emailError) animateError(emailErrorAnim);
    }, [emailError]);

    useEffect(() => {
        if (passwordError) animateError(passwordErrorAnim);
    }, [passwordError]);

    useEffect(() => {
        if (confirmPasswordError) animateError(confirmPasswordErrorAnim);
    }, [confirmPasswordError]);

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
        if (currentStep === 2 && countdown > 0) {
            timer = setInterval(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [currentStep, countdown]);

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

    const handleSendResetEmail = async (): Promise<void> => {
        try {
            // Validate email
            const isEmailValid = validateEmail(email);
            if (!isEmailValid) {
                shakeError();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                return;
            }

            setIsLoading(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // Send reset password email with OTP
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: undefined, // Don't redirect, we'll handle OTP verification
            });

            if (error) throw error;

            // Move to OTP verification step
            setCurrentStep(2);
            startCountdown();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            setToast({
                visible: true,
                message: "Code de réinitialisation envoyé à votre email",
                type: "success",
                action: null
            });
        } catch (error: any) {
            shakeError();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

            setToast({
                visible: true,
                message: "Erreur lors de l'envoi du code de réinitialisation",
                type: "error",
                action: null
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (): Promise<void> => {
        try {
            if (!isOtpValid) {
                shakeError();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                return;
            }

            setIsLoading(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // Verify OTP
            const { error } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'recovery'
            });

            if (error) throw error;

            // Move to new password step
            setCurrentStep(3);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

    const handleResetPassword = async (): Promise<void> => {
        try {
            // Validate password fields
            const isPasswordValid = validatePassword(newPassword);
            const isConfirmPasswordValid = validateConfirmPassword(
                newPassword,
                confirmPassword
            );

            if (!isPasswordValid || !isConfirmPasswordValid) {
                shakeError();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                return;
            }

            setIsLoading(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // Update password
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setToast({
                visible: true,
                message: "Mot de passe réinitialisé avec succès",
                type: "success",
                action: {
                    label: "Se connecter",
                    onPress: () => router.push("/login")
                }
            });

            // Reset form after successful password reset
            setTimeout(() => {
                router.push("/login");
            }, 2000);
        }  catch (error: unknown) {
            if (error instanceof Error) {
                console.log("error", error.message);
                setToast({
                    visible: true,
                    message: error.message.includes("old password") && error.message.includes("different") ? "Le nouveau mot de passe doit être différent de l'ancien" : "Erreur lors de la réinitialisation du mot de passe",
                    type: "error",
                    action: null
                });
            } else {
                console.log("error", error);
                setToast({
                    visible: true,
                    message: "Erreur inconnue lors de la réinitialisation du mot de passe",
                    type: "error",
                    action: null
                });
            }
            shakeError();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async (): Promise<void> => {
        try {
            setIsLoading(true);

            // Resend reset password email
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: undefined,
            });

            if (error) throw error;

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

    const startCountdown = (): void => {
        setCountdown(60);
    };

    const handleModifyEmail = (): void => {
        setCurrentStep(1);
        setOtp("");
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={[styles.container, isDark && styles.containerDark]}
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
                            <Text style={[styles.title, isDark && styles.textDark]}>
                                Elearn Prepa
                            </Text>
                            <Text style={[styles.subtitle, isDark && styles.textGray]}>
                                Réinitialisation de mot de passe
                            </Text>
                        </View>
                    </View>

                    {/* Main content with animations for step transition */}
                    <View style={styles.contentContainer}>
                        {/* Step 1: Email Entry */}
                        {currentStep === 1 && (
                            <Animated.View
                                style={[
                                    styles.formStep,
                                    {transform: [{translateX: slideOutLeft}]}
                                ]}
                            >
                                <Text style={[styles.subtitle, isDark && styles.textGray]}>
                                    Entrez votre adresse email pour réinitialiser votre mot de passe
                                </Text>

                                {/* Email Input */}
                                <View style={styles.inputContainer}>
                                    <Text style={[styles.label, isDark && styles.textDark]}>
                                        Email
                                    </Text>
                                    <View style={[
                                        styles.inputWrapper,
                                        isDark && styles.inputWrapperDark,
                                        emailError && styles.inputError
                                    ]}>
                                        <MaterialCommunityIcons
                                            name={"email-outline" as const}
                                            size={24}
                                            color={emailError ? theme.color.error : (isDark ? "#CCCCCC" : "#666666")}
                                            style={styles.inputIcon}
                                        />
                                        <TextInput
                                            value={email}
                                            onChangeText={(text) => {
                                                setEmail(text);
                                                if (emailError) validateEmail(text);
                                            }}
                                            style={[styles.input, isDark && styles.inputDark]}
                                            placeholder="Votre email"
                                            placeholderTextColor={isDark ? "#666666" : "#999999"}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            returnKeyType="done"
                                        />
                                        {emailError && (
                                            <MaterialCommunityIcons
                                                name={"alert-circle" as const}
                                                size={20}
                                                color={theme.color.error}
                                                style={styles.errorIcon}
                                            />
                                        )}
                                    </View>
                                    {emailError && (
                                        <Animated.View
                                            style={[
                                                styles.errorContainer,
                                                {
                                                    opacity: emailErrorAnim, transform: [{
                                                        translateY: emailErrorAnim.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [-10, 0]
                                                        })
                                                    }]
                                                }
                                            ]}
                                        >
                                            <MaterialCommunityIcons
                                                name={"alert-circle" as const}
                                                size={16}
                                                color={theme.color.error}
                                            />
                                            <Text style={styles.errorText}>{emailError}</Text>
                                        </Animated.View>
                                    )}
                                </View>

                                {/* Send Button */}
                                <TouchableOpacity
                                    style={[
                                        styles.primaryButton,
                                        isLoading && styles.buttonDisabled
                                    ]}
                                    onPress={handleSendResetEmail}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#FFFFFF"/>
                                    ) : (
                                        <Text style={styles.primaryButtonText}>
                                            Envoyer le code de réinitialisation
                                        </Text>
                                    )}
                                </TouchableOpacity>

                                {/* Login Link */}
                                <View style={styles.footerText}>
                                    <Text style={[styles.footerLabel, isDark && styles.textGray]}>
                                        Revenir à{" "}
                                    </Text>
                                    <TouchableOpacity onPress={() => router.push("/login")}>
                                        <Text style={styles.footerLink}>la connexion</Text>
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>
                        )}

                        {/* Step 2: OTP Verification */}
                        {currentStep === 2 && (
                            <Animated.View
                                style={[
                                    styles.formStep,
                                    {transform: [{translateX: slideInRight}]}
                                ]}
                            >
                                <Text style={[styles.title, isDark && styles.textDark]}>
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
                                            name={"email-edit-outline" as const}
                                            size={20}
                                            color={theme.color.primary[500]}
                                            style={styles.buttonIcon}
                                        />
                                        <Text style={styles.secondaryButtonText}>Modifier l'email</Text>
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>
                        )}

                        {/* Step 3: New Password Entry */}
                        {currentStep === 3 && (
                            <Animated.View
                                style={[
                                    styles.formStep,
                                    {transform: [{translateX: slideInRight2}]}
                                ]}
                            >
                                <Text style={[styles.title, isDark && styles.textDark]}>
                                    Nouveau mot de passe
                                </Text>
                                <Text style={[styles.subtitle, isDark && styles.textGray]}>
                                    Créez un nouveau mot de passe sécurisé
                                </Text>

                                {/* New Password Input */}
                                <View style={styles.inputContainer}>
                                    <Text style={[styles.label, isDark && styles.textDark]}>
                                        Nouveau mot de passe
                                    </Text>
                                    <View style={[
                                        styles.inputWrapper,
                                        isDark && styles.inputWrapperDark,
                                        passwordError && styles.inputError
                                    ]}>
                                        <MaterialCommunityIcons
                                            name={"lock-outline" as const}
                                            size={24}
                                            color={passwordError ? theme.color.error : (isDark ? "#CCCCCC" : "#666666")}
                                            style={styles.inputIcon}
                                        />
                                        <TextInput
                                            ref={newPasswordRef}
                                            value={newPassword}
                                            onChangeText={(text) => {
                                                setNewPassword(text);
                                                if (passwordError) validatePassword(text);
                                                if (confirmPassword && confirmPasswordError)
                                                    validateConfirmPassword(text, confirmPassword);
                                            }}
                                            style={[styles.input, isDark && styles.inputDark]}
                                            placeholder="Votre nouveau mot de passe"
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
                                                name={(showPassword ? "eye-off" : "eye") }
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
                                            name={"lock-check-outline" as const}
                                            size={24}
                                            color={confirmPasswordError ? theme.color.error : (isDark ? "#CCCCCC" : "#666666")}
                                            style={styles.inputIcon}
                                        />
                                        <TextInput
                                            ref={confirmPasswordRef}
                                            value={confirmPassword}
                                            onChangeText={(text) => {
                                                setConfirmPassword(text);
                                                if (confirmPasswordError) validateConfirmPassword(newPassword, text);
                                            }}
                                            style={[styles.input, isDark && styles.inputDark]}
                                            placeholder="Confirmez votre nouveau mot de passe"
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

                                {/* Reset Password Button */}
                                <TouchableOpacity
                                    style={[
                                        styles.primaryButton,
                                        isLoading && styles.buttonDisabled
                                    ]}
                                    onPress={handleResetPassword}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#FFFFFF"/>
                                    ) : (
                                        <Text style={styles.primaryButtonText}>Réinitialiser le mot de passe</Text>
                                    )}
                                </TouchableOpacity>
                            </Animated.View>
                        )}
                    </View>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
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
        padding: 20,
    },
    formContainer: {
        width: "100%",
        maxWidth: 400,
        alignSelf: "center",
    },
    logoSection: {
        alignItems: "center",
        flexDirection: "row",
        gap: 12,
        marginBottom: 24,
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: 12,
        borderRadius: 16,
    },
    contentContainer: {
        position: "relative",
        overflow: "hidden",
    },
    formStep: {
        width: "100%",
    },
    title: {
        fontFamily : theme.typography.fontFamily,
fontSize: 26,
        fontWeight: "bold",
        color: "#1A1A1A",
        textAlign: "center",
        marginBottom: 12,
    },
    subtitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 15,
        color: "#666666",
        textAlign: "center",
        marginBottom: 24,
    },
    emailHighlight: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: "600",
        color: "#1A1A1A",
        textAlign: "center",
        marginBottom: 24,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontFamily : theme.typography.fontFamily,
fontSize: 15,
        fontWeight: "600",
        color: "#1A1A1A",
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#E5E5E5",
        borderRadius: 12,
        backgroundColor: "#FFFFFF",
        overflow: "hidden",
    },
    inputWrapperDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderColor: "#333333",
    },
    inputIcon: {
        padding: 12,
    },
    input: {
        flex: 1,
        height: 50,
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        color: "#1A1A1A",
    },
    inputDark: {
        color: "#FFFFFF",
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
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 6,
        marginTop: 4,
        gap: 6,
    },
    errorText: {
        color: theme.color.error,
        fontFamily : theme.typography.fontFamily,
fontSize: 12,
        fontWeight: "500",
    },
    primaryButton: {
        height: 50,
        backgroundColor: theme.color.primary[500],
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginVertical: 20,
    },
    primaryButtonText: {
        color: "#FFFFFF",
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: "600",
    },
    secondaryButton: {
        height: 50,
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
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: "600",
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    footerText: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 24,
        marginBottom: 16,
    },
    footerLabel: {
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        color: "#666666",
    },
    footerLink: {
        color: theme.color.primary[500],
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        fontWeight: "600",
    },
    otpContainer: {
        alignItems: "center",
        marginVertical: 24,
    },
    countdownContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 20,
        gap: 10,
    },
    countdownText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        color: "#666666",
        fontWeight: "500",
    },
    resendLink: {
        color: theme.color.primary[500],
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
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
        gap: 12,
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
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: theme.color.primary[500],
        borderRadius: 12,
        padding: 16,
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
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        fontWeight: "500",
        marginLeft: 12,
        flex: 1,
    },
    toastAction: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderRadius: 8,
        marginHorizontal: 8,
    },
    toastActionText: {
        color: "white",
        fontFamily : theme.typography.fontFamily,
fontSize: 13,
        fontWeight: "600",
    },
    toastClose: {
        padding: 4,
    },
});

export default ResetPassword;