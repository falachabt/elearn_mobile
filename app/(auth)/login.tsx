import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  useColorScheme,
  Animated,
} from "react-native";
import { Redirect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/auth";
import { theme } from "@/constants/theme";
import { Pressable } from "react-native-gesture-handler";
import { MaterialCommunityIcons } from '@expo/vector-icons';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {

  const router = useRouter();
  const { signIn } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const passwordRef = useRef<TextInput | null>(null);
  // const passwordRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Animation on mount
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const validateEmail = (email: string) => {
    if (!email) {
      setEmailError("L'email est requis");
      return false;
    }
    if (!EMAIL_REGEX.test(email)) {
      setEmailError("Email invalide");
      return false;
    }
    setEmailError("");
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

  const handleLogin = async () => {
    try {
      const isEmailValid = validateEmail(email);
      const isPasswordValid = validatePassword(password);

      if (!isEmailValid || !isPasswordValid) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      setIsLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await signIn(email, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return <Redirect href={"/(app)"} />;
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
          "Erreur de connexion",
          "Email ou mot de passe incorrect"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.container, isDark && styles.containerDark]}
      >
        <StatusBar style={isDark ? "light" : "dark"} />

        <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <Image
                  source={require("@/assets/images/icon.png")}
                  style={styles.logo}
              />
              <Text style={[styles.appName, isDark && styles.textDark]}>
                Elearn
              </Text>
            </View>

            {/* Welcome Text */}
            <View style={styles.welcomeSection}>
              <Text style={[styles.welcomeTitle, isDark && styles.textDark]}>
                Bon retour! 👋
              </Text>
              <Text style={[styles.welcomeSubtitle, isDark && styles.textGray]}>
                Connectez-vous pour continuer
              </Text>
            </View>

            {/* Form Section */}
            <View style={styles.form}>
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
                      color={isDark ? "#CCCCCC" : "#666666"}
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
                      onSubmitEditing={() => passwordRef?.current?.focus()}
                  />
                </View>
                {emailError && (
                    <Text style={styles.errorText}>{emailError}</Text>
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
                      color={isDark ? "#CCCCCC" : "#666666"}
                      style={styles.inputIcon}
                  />
                  <TextInput
                      ref={(ref) => (passwordRef.current = ref)}
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (passwordError) validatePassword(text);
                      }}
                      style={[styles.input, isDark && styles.inputDark]}
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
                    <Text style={styles.errorText}>{passwordError}</Text>
                )}
              </View>

              {/* Forgot Password */}
              <TouchableOpacity
                  style={styles.forgotPassword}
                  onPress={() => router.push("/(auth)/forgot_password")}
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
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.loginButtonText}>Se connecter</Text>
                )}
              </Pressable>

              {/* Social Login Section */}
              <View style={styles.socialSection}>
                <View style={styles.divider}>
                  <View style={[styles.dividerLine, isDark && styles.dividerLineDark]} />
                  <Text style={[styles.dividerText, isDark && styles.textGray]}>
                    ou continuer avec
                  </Text>
                  <View style={[styles.dividerLine, isDark && styles.dividerLineDark]} />
                </View>

                <View style={styles.socialButtons}>
                  <TouchableOpacity style={[styles.socialButton, styles.googleButton]}>
                    <MaterialCommunityIcons name="google" size={24} color="white" />
                    <Text style={styles.socialButtonText}>Google</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.socialButton, styles.facebookButton]}>
                    <MaterialCommunityIcons name="facebook" size={24} color="white" />
                    <Text style={styles.socialButtonText}>Facebook</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Register Link */}
              <View style={styles.registerSection}>
                <Text style={[styles.registerText, isDark && styles.textGray]}>
                  Vous n'avez pas de compte ?
                </Text>
                <TouchableOpacity onPress={() => router.push("/register")}>
                  <Text style={styles.registerLink}>S'inscrire</Text>
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
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  welcomeSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  welcomeSubtitle: {
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
  errorText: {
    color: theme.color.error,
    fontSize: 12,
    marginTop: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  forgotPasswordText: {
    color: theme.color.primary[500],
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
    fontSize: 14,
    color: '#666666',
  },
  registerLink: {
    color: theme.color.primary[500],
    fontSize: 14,
    fontWeight: '600',
  },
  textDark: {
    color: '#FFFFFF',
  },
  textGray: {
    color: '#CCCCCC',
  },
});