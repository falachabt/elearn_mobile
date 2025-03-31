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
    GestureResponderEvent,
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

        // put phone regex for cameroun phones here
        const regex = /^6[5-9]{1}[0-9]{7}$/;
        // if (!regex.test(phone)) {
        //     setPhoneError("Format de téléphone invalide");
        //     return false;
        // }
        setPhoneError("");
        return true
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
            const isEmailValid = validateEmail(email);
            // const isPhoneValid = validatePhone(phone);
            const isPasswordValid = validatePassword(password);
            // const isPasswordValid = true
            const isConfirmPasswordValid = validateConfirmPassword(
                password,
                confirmPassword
            );
            // const isConfirmPasswordValid = true
            const isTermsValid = validateTerms();

            if (!isEmailValid || !isPasswordValid || !isConfirmPasswordValid || !isTermsValid ) {
                shakeError();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                return;
            }

            setIsLoading(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // await signUp(email, phone, password);
            await signUp(email, password);

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
            await supabase.auth.signInWithOtp({phone:  phone});
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

                    {
                        !isOtpStep &&
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
                                {/*<Text style={[styles.title, isDark && styles.textDark]}>*/}
                                {/*  Inscription*/}
                                {/*</Text>*/}
                                <Text style={[styles.subtitle, isDark && styles.textGray]}>
                                    Créez votre compte pour accéder à la plateforme
                                </Text>

                                {/* Social Login Options */}


                                <View style={styles.socialButtons}>
                                    {/*<TouchableOpacity style={[styles.socialButton, styles.googleButton]}>*/}
                                    {/*    <MaterialCommunityIcons name="google" size={20} color="white"/>*/}
                                    {/*    <Text style={styles.socialButtonText}>Google</Text>*/}

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
                                            name="email-outline"
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
                                            returnKeyType="next"
                                            onSubmitEditing={() => passwordRef.current?.focus()}
                                        />
                                        {emailError && (
                                            <MaterialCommunityIcons
                                                name="alert-circle"
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
                                                name="alert-circle"
                                                size={16}
                                                color={theme.color.error}
                                            />
                                            <Text style={styles.errorText}>{emailError}</Text>
                                        </Animated.View>
                                    )}
                                </View>

                                {/* Phone Input */}
                                {/*<View style={styles.inputContainer}>*/}
                                {/*    <Text style={[styles.label, isDark && styles.textDark]}>*/}
                                {/*        Téléphone*/}
                                {/*    </Text>*/}
                                {/*    <View style={[*/}
                                {/*        styles.inputWrapper,*/}
                                {/*        isDark && styles.inputWrapperDark,*/}
                                {/*        emailError && styles.inputError*/}
                                {/*    ]}>*/}
                                {/*        <MaterialCommunityIcons*/}
                                {/*            name="phone"*/}
                                {/*            size={24}*/}
                                {/*            color={phoneError ? theme.color.error : (isDark ? "#CCCCCC" : "#666666")}*/}
                                {/*            style={styles.inputIcon}*/}
                                {/*        />*/}
                                {/*        <TextInput*/}
                                {/*            value={phone}*/}
                                {/*            onChangeText={(text) => {*/}
                                {/*                setPhone(text);*/}
                                {/*                if (phoneError) validatePhone(text);*/}
                                {/*            }}*/}
                                {/*            style={[styles.input, isDark && styles.inputDark]}*/}
                                {/*            placeholder="6xxxxxxxx"*/}
                                {/*            placeholderTextColor={isDark ? "#666666" : "#999999"}*/}
                                {/*            keyboardType="phone-pad"*/}
                                {/*            autoCapitalize="none"*/}
                                {/*            returnKeyType="next"*/}
                                {/*            onSubmitEditing={() => passwordRef.current?.focus()}*/}
                                {/*        />*/}
                                {/*        {phoneError && (*/}
                                {/*            <MaterialCommunityIcons*/}
                                {/*                name="alert-circle"*/}
                                {/*                size={20}*/}
                                {/*                color={theme.color.error}*/}
                                {/*                style={styles.errorIcon}*/}
                                {/*            />*/}
                                {/*        )}*/}
                                {/*    </View>*/}
                                {/*    {phoneError && (*/}
                                {/*        <Animated.View*/}
                                {/*            style={[*/}
                                {/*                styles.errorContainer,*/}
                                {/*                {*/}
                                {/*                    opacity: emailErrorAnim, transform: [{*/}
                                {/*                        translateY: emailErrorAnim.interpolate({*/}
                                {/*                            inputRange: [0, 1],*/}
                                {/*                            outputRange: [-10, 0]*/}
                                {/*                        })*/}
                                {/*                    }]*/}
                                {/*                }*/}
                                {/*            ]}*/}
                                {/*        >*/}
                                {/*            <MaterialCommunityIcons*/}
                                {/*                name="alert-circle"*/}
                                {/*                size={16}*/}
                                {/*                color={theme.color.error}*/}
                                {/*            />*/}
                                {/*            <Text style={styles.errorText}>{phoneError}</Text>*/}
                                {/*        </Animated.View>*/}
                                {/*    )}*/}
                                {/*</View>*/}


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
                                            /* "TODO handle the right path to  cgu and terms" */
                                            /* @ts-ignore*/
                                            onPress={() => router.push("/(app)/(CGU)/terms") }
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
        // marginBottom: 24,
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: 12,
        borderRadius: 16,
    },
    appName: {
        fontSize: 28,
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
        fontSize: 26,
        fontWeight: "bold",
        color: "#1A1A1A",
        textAlign: "center",
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 15,
        color: "#666666",
        textAlign: "center",
        marginBottom: 24,
    },
    emailHighlight: {
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
        fontSize: 12,
        fontWeight: "500",
    },
    checkboxContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: "#E5E5E5",
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    checkboxError: {
        borderColor: theme.color.error,
    },
    checkboxChecked: {
        backgroundColor: theme.color.primary[500],
        borderColor: theme.color.primary[500],
    },
    checkboxLabel: {
        fontSize: 14,
        color: "#666666",
        flex: 1,
    },
    link: {
        color: theme.color.primary[500],
        fontWeight: "600",
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
        fontSize: 16,
        fontWeight: "600",
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    divider: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 20,
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
        paddingHorizontal: 16,
        color: "#666666",
        fontSize: 14,
    },
    socialButtons: {
        marginVertical: 20,
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
    },
    socialButton: {
        flex: 1,
        flexDirection: "row",
        height: 48,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
    },
    socialButtonText: {
        color: "#FFFFFF",
        fontSize: 15,
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
        marginTop: 24,
        marginBottom: 16,
    },
    footerLabel: {
        fontSize: 14,
        color: "#666666",
    },
    footerLink: {
        color: theme.color.primary[500],
        lineHeight : 20,
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
        fontSize: 16,
        color: "#666666",
        fontWeight: "500",
    },
    resendLink: {
        color: theme.color.primary[500],
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
        fontSize: 13,
        fontWeight: "600",
    },
    toastClose: {
        padding: 4,
    },
});

export default Register;