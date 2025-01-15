// app/(auth)/login.tsx
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  StyleSheet,
  Animated,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";

import { StatusBar } from "expo-status-bar";
import Ionicons from '@expo/vector-icons/Ionicons';

// import { Button, ActivityIndicator } from '@ant-design/react-native'


import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/auth";
import { theme } from "@/constants/theme";
import { Button } from "antd-mobile";
import { Pressable } from "react-native-gesture-handler";
import AntDesign from '@expo/vector-icons/AntDesign';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [attemptCount, setAttemptCount] = useState(0);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Refs for focus management
  const passwordRef = useRef<TextInput>(null);

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

  const handleLogin = async () => {
    try {
      // Validate fields
      const isEmailValid = validateEmail(email);
      const isPasswordValid = validatePassword(password);

      if (!isEmailValid || !isPasswordValid) {
        shakeError();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      setIsLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

     await signIn(email, password)

      // Success haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      setAttemptCount((prev) => prev + 1);
      shakeError();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      // Handle specific error cases
      if (error.message.includes("Invalid login")) {
        Alert.alert(
          "Échec de la connexion",
          attemptCount >= 2
            ? "Plusieurs tentatives de connexion ont échoué. Besoin de réinitialiser votre mot de passe ?"
            : "Email ou mot de passe invalide. Veuillez réessayer."
        );
      } else {
        Alert.alert("Erreur", "Une erreur inattendue s'est produite. Veuillez réessayer.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <StatusBar style="dark" />
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
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.logo}
            />
            <Text style={styles.title}>Elearn</Text>
          </View>
          <Text style={styles.subtitle}>Connectez vous pour continuer </Text>

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
            ) : <Text style={styles.errorText}>{null}</Text>}
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
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                {
                  showPassword ? <AntDesign name="eye" size={24} color="black" /> : <AntDesign name="eyeo" size={24} color="black" />
                }
               
              </TouchableOpacity>
            </View>
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : <Text style={styles.errorText}>{null}</Text>}
          </View>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => router.push("/(auth)")}
          >
            <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          <Pressable onPress={handleLogin} style={styles.loginButton}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Se connecter</Text>
            )}
          </Pressable>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.socialLoginContainer}>
            <TouchableOpacity style={{...styles.socialButton, ...styles.googleButton}}>
              <AntDesign name="google" size={24} color="white" />
              <Text style={styles.buttonText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{...styles.socialButton, ...styles.facebookButton}}>
              <AntDesign name="facebook-square" size={24} color="white" />
              <Text style={styles.buttonText}>Facebook</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>vous n'avez pas de compte ?  </Text>
            <TouchableOpacity onPress={() => router.push("/register")}>
              <Text style={styles.signupLink}>Inscrivez vous</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
    marginBottom: 15,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 5,
    color: "#333",
  },
  input: {
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
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
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: "#1677ff",
    fontSize: 14,
    textAlign: 'center',
  },
  loginButton: {
    height: 40,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: theme.color.primary["500"],
    // Remove redundant display:"flex" since it's default
    justifyContent: "center",
    alignItems: "center",
    // Remove alignContent and textAlign since they don't affect button content centering
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center", // Add textAlign center to text itself
    // Remove alignItems since it has no effect on Text component
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25,
  },
  signupText: {
    color: "#666",
    fontSize: 14,
  },
  signupLink: {
    color: theme.color.primary[500],
    fontSize: 14,
    fontWeight: "600",
  },
  socialLoginContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Changez la couleur pour Facebook si nécessaire
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  buttonText: {
    color: 'white',
    marginLeft: 10,
    textAlign: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DB4437',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  facebookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b5998',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#666',
  },
});
