// app/(auth)/register.tsx
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  GestureResponderEvent,
  StatusBar,
} from "react-native";

import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import AntDesign from "@expo/vector-icons/AntDesign";
import * as Haptics from "expo-haptics";
import { Pressable } from "react-native-gesture-handler";
import OTPInput from "../../components/ui/OTPInput";
import CustomMessage from "../../components/shared/CustomMessage";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const register = () => {
  const router = useRouter();
  const { signUp, verifyOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [attemptCount, setAttemptCount] = useState(0);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [otpError, setOtpError] = useState("");
  const [isChecked, setIsChecked] = useState(false);
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [isOtpValid, setIsOtpValid] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Email, 2: OTP
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Refs for focus management
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Animate component mount
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const shakeError = () => {
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

  const validateEmail = (email: string) => {
    if (!email) {
      setEmailError("Email is required");
      return false;
    }
    if (!EMAIL_REGEX.test(email)) {
      setEmailError("Please enter a valid email");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError("Password is required");
      return false;
    }
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const validateConfirmPassword = (
    password: string,
    confirmPassword: string
  ) => {
    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      return false;
    }
    setConfirmPasswordError("");
    return true;
  };

  interface MessageTypes {
    error: 'error';
    success: 'success';
    warning: 'warning';
    info: 'info';
  }

  const showMessage = (msg: string, type: keyof MessageTypes = "error"): void => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
    }, 3000);
  };

  const handleSignUp = async () => {
    try {
      // Validate fields
      const isEmailValid = validateEmail(email);
      const isPasswordValid = validatePassword(password);
      const isConfirmPasswordValid = validateConfirmPassword(
        password,
        confirmPassword
      );

      if (!isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
        shakeError();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      setIsLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await signUp(email, password);

      setOtpSent(true);
      setIsOtpStep(true);
      setCurrentStep(2);
      startCountdown();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      setAttemptCount((prev) => prev + 1);
      shakeError();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if(error.message == "email exists"){
        showMessage("Email already exists", "error")
      }
      
      Alert.alert(
        "Erreur",
        "Une erreur inattendue s'est produite. Veuillez réessayer."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const startCountdown = () => {
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(interval);
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect( () => {
    if(otp?.length === 6){
      setIsOtpValid(true)
    }else{
      setIsOtpValid(false)
    }
  }, [otp] )

  const handleVerifyOtp = async () => {
    try {

      setIsLoading(true);
      await verifyOtp(email, otp, password);
    } catch (error) {
      console.error("Error verifying OTP:", error);
      Alert.alert("Error", "Failed to verify OTP. Please try again.");
     
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
  };

  const handleOtpChange = (text: string) => {
    setOtp(text);
    setIsOtpValid(text.length === 6);
  };

  const modifyEmail = () => {
    setCurrentStep(1);
    setIsOtpStep(false);
    setOtp("");

  }

  const handleResendOtp = async () => {
    try {
      setIsLoading(true);
      // Logic to resend OTP
      await supabase.auth.signInWithOtp({ email });
      setCountdown(60);
      startCountdown();
      Alert.alert("OTP Resent", "A new OTP has been sent to your email.");
    } catch (error) {
      Alert.alert("Error", "Failed to resend OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleModifyEmail = (event: GestureResponderEvent) => {
    setCurrentStep(1);
    setIsOtpStep(false);
    setOtp("");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <StatusBar backgroundColor={theme.color.primary[500]} barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { translateX: shakeAnim }],
            },
          ]}
        >
          <View style={styles.lo}>
            {/* <Image
              source={require("@/assets/images/icon.png")}
              style={styles.logo}
            /> */}
            <Text style={styles.title}>
              {" "}
              {currentStep == 1 ? "Inscription" : "Confirmez votre email"}{" "}
            </Text>
          </View>
          <Text style={styles.subtitle}>
            {currentStep == 1
              ? "Inscrivez-vous pour continuer"
              : "Entrez le code à 6 chiffre envoyé à votre adresse mail " +
                email}{" "}
          </Text>

          {!isOtpStep ? (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, emailError && styles.inputError]}
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (emailError) validateEmail(text);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                />
                {emailError ? (
                  <Text style={styles.errorText}>{emailError}</Text>
                ) : null}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    ref={passwordRef}
                    style={[styles.input, passwordError && styles.inputError]}
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (passwordError) validatePassword(text);
                    }}
                    secureTextEntry={!showPassword}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <AntDesign name="eye" size={24} color="black" />
                    ) : (
                      <AntDesign name="eyeo" size={24} color="black" />
                    )}
                  </TouchableOpacity>
                </View>
                {passwordError ? (
                  <Text style={styles.errorText}>{passwordError}</Text>
                ) : null}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    ref={confirmPasswordRef}
                    style={[
                      styles.input,
                      confirmPasswordError && styles.inputError,
                    ]}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (confirmPasswordError)
                        validateConfirmPassword(password, text);
                    }}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    // onSubmitEditing={handleSignUp}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <AntDesign name="eye" size={24} color="black" />
                    ) : (
                      <AntDesign name="eyeo" size={24} color="black" />
                    )}
                  </TouchableOpacity>
                </View>
                {confirmPasswordError ? (
                  <Text style={styles.errorText}>{confirmPasswordError}</Text>
                ) : null}
              </View>

              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setIsChecked(!isChecked)}
                >
                  {isChecked && (
                    <AntDesign
                      name="check"
                      size={16}
                      color={theme.color.primary[500]}
                    />
                  )}
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>
                  I agree to the{" "}
                  <Text
                    style={styles.link}
                    onPress={() => router.push("/(app)/(CGU)/terms" as any)}
                  >
                    Terms and Conditions
                  </Text>
                </Text>
              </View>

              <Pressable onPress={handleSignUp} style={styles.signUpButton}>
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.signUpButtonText}>Inscription</Text>
                )}
              </Pressable>

              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.socialLoginContainer}>
                <TouchableOpacity
                  style={{ ...styles.socialButton, ...styles.googleButton }}
                >
                  <AntDesign name="google" size={24} color="white" />
                  <Text style={styles.buttonText}>Google</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ ...styles.socialButton, ...styles.facebookButton }}
                >
                  <AntDesign name="facebook-square" size={24} color="white" />
                  <Text style={styles.buttonText}>Facebook</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push("/login")}>
                  <Text style={styles.loginLink}>Log In</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.otpContainer}>
                <OTPInput otp={otp} setOtp={setOtp} isOtpValid={isOtpValid} />
                <View style={styles.countdownContainer}>
                  <Text style={styles.countdownText}>00:30</Text>
                  <TouchableOpacity onPress={handleResendOtp}>
                    <Text style={styles.resendLink}>Renvoyer OTP</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  onPress={handleVerifyOtp}
                  style={[styles.button, !isOtpValid && styles.buttonDisabled]}
                  disabled={!isOtpValid}
                >
                  <Text style={styles.buttonText}>Vérifier</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleModifyEmail} style={styles.button}>
                  <Text style={styles.buttonText}>Modifier Email</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default register

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffff",
  },
  lo: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  formContainer: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
    textAlign: "center",
  },
  stepText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#ffff",
  },
  inputError: {
    borderColor: "#ff4d4f",
  },
  errorText: {
    color: "#ff4d4f",
    fontSize: 12,
    marginTop: 4,
  },
  passwordContainer: {
    position: "relative",
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#333",
  },
  link: {
    color: theme.color.primary[500],
    textDecorationLine: "underline",
  },
  signUpButton: {
    height: 40,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: theme.color.primary["500"],
    justifyContent: "center",
    alignItems: "center",
  },
  signUpButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  dividerText: {
    marginHorizontal: 10,
    color: "#666",
  },
  socialLoginContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  buttonText: {
    color: "white",
    marginLeft: 10,
    textAlign: "center",
  },
  googleButton: {
    backgroundColor: "#DB4437",
  },
  facebookButton: {
    backgroundColor: "#3b5998",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25,
  },
  loginText: {
    color: "#666",
    fontSize: 14,
  },
  loginLink: {
    color: theme.color.primary[500],
    fontSize: 14,
    fontWeight: "600",
  },
  otpContainer: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  otpTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  otpInput: {
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    width: "80%",
    textAlign: "center",
    marginBottom: 20,
  },
  verifyButton: {
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.color.primary["500"],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  resendText: {
    color: "#666",
    fontSize: 14,
  },
  button: {
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.color.primary["500"],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: "#ddd",
  },
  resendLink: {
    color: theme.color.primary[500],
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  countdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  countdownText: {
    fontSize: 16,
    color: "#666",
    marginRight: 10,
  },
  buttonContainer: {
    flexDirection: "column",
    justifyContent: "space-between",
    marginTop: 20,
  },
});
