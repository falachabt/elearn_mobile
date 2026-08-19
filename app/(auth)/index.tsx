import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
const Lottie = Platform.OS !== 'web' ? require("lottie-react-native").default : null;
const WebLottie = Platform.OS === "web" ? require("@lottiefiles/dotlottie-react").DotLottieReact : null;
const welcomeAnimation = require("@/assets/lotties/welcome.json");
const welcomeAnimationData = JSON.stringify(welcomeAnimation);
import { useRouter } from "expo-router";
import Head from "expo-router/head";

import GoogleAuth from "@/components/GoogleLogin";
import GoogleLogo from "@/components/GoogleLogo";
import AppleAuth from "@/components/AppleLogin";
import AppleLogo from "@/components/AppleLogo";

import { theme } from "@/constants/theme";
import WhatsAppContact from "@/components/WhatsappSupport";

// Component for iOS
const IOSStartPage = ({
  dimensions,
  isDark,
  fadeAnim,
  slideUpAnim,
  scaleAnim,
}: {
  dimensions: { width: number; height: number };
  isDark: boolean;
  fadeAnim: Animated.Value;
  slideUpAnim: Animated.Value;
  scaleAnim: Animated.Value;
}) => {
  const router = useRouter();

  return (
    <SafeAreaView
      style={[
        styles(dimensions, isDark).container,
        isDark && styles(dimensions, isDark).containerDark,
      ]}
    >
      <Head>
        <title>Elearn Prepa | Accueil</title>
        <meta name="description" content="Préparez les concours de vos reves" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={
          isDark ? theme.color.dark.background.primary : "#FFFFFF"
        }
      />
      <ScrollView
        contentContainerStyle={styles(dimensions, isDark).scrollViewContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles(dimensions, isDark).content}>
          {/* App Logo and Name */}
          <Animated.View
            style={[
              styles(dimensions, isDark).logoSection,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles(dimensions, isDark).logo}
              resizeMode="contain"
            />
            <View style={styles(dimensions, isDark).brandingContainer}>
              <Text
                style={[
                  styles(dimensions, isDark).appName,
                  isDark && styles(dimensions, isDark).textDark,
                ]}
              >
                Elearn Prepa
              </Text>
              <Text
                style={[
                  styles(dimensions, isDark).tagline,
                  isDark && styles(dimensions, isDark).textGray,
                ]}
              >
                Votre succès commence ici
              </Text>
            </View>
          </Animated.View>

          {/* Welcome Message for iOS */}
          <Animated.View
            style={[
              styles(dimensions, isDark).messageContainer,
              { opacity: fadeAnim },
            ]}
          >
            <Text
              style={[
                styles(dimensions, isDark).title,
                isDark && styles(dimensions, isDark).textDark,
              ]}
            >
              Apprenez, Explorez, Progressez
            </Text>
            <Text
              style={[
                styles(dimensions, isDark).subtitle,
                isDark && styles(dimensions, isDark).textGray,
              ]}
            >
              Préparez vos concours avec des contenus de qualité.
            </Text>
          </Animated.View>

          {/* Buttons for iOS */}
          <Animated.View
            style={[
              styles(dimensions, isDark).buttonSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideUpAnim }],
              },
            ]}
          >
            {/* S'inscrire Section */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={[
                  styles(dimensions, isDark).sectionLabel,
                  isDark && styles(dimensions, isDark).textDark,
                ]}
              >
                S'inscrire
              </Text>
              <View style={styles(dimensions, isDark).socialRow}>
                <GoogleAuth onAuthSuccess={() => router.replace("/(auth)/onboarding")}>
                  <View style={styles(dimensions, isDark).socialRowButton}>
                    <GoogleLogo size={18} />
                    <Text style={styles(dimensions, isDark).socialRowButtonText}>
                      Google
                    </Text>
                  </View>
                </GoogleAuth>
                <AppleAuth onAuthSuccess={() => router.replace("/(auth)/onboarding")}>
                  <View
                    style={[
                      styles(dimensions, isDark).socialRowButton,
                      styles(dimensions, isDark).appleRowButton,
                      isDark && styles(dimensions, isDark).appleRowButtonDark,
                    ]}
                  >
                    <AppleLogo size={18} color={isDark ? "#000000" : "#FFFFFF"} />
                    <Text
                      style={[
                        styles(dimensions, isDark).socialRowButtonText,
                        styles(dimensions, isDark).appleRowButtonText,
                        isDark && styles(dimensions, isDark).appleRowButtonTextDark,
                      ]}
                    >
                      Apple
                    </Text>
                  </View>
                </AppleAuth>
              </View>
            </View>

            {/* Se connecter Section */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={[
                  styles(dimensions, isDark).sectionLabel,
                  isDark && styles(dimensions, isDark).textDark,
                ]}
              >
                Se connecter
              </Text>
              <View style={styles(dimensions, isDark).socialRow}>
                <GoogleAuth onAuthSuccess={() => router.replace("/(auth)/onboarding")}>
                  <View
                    style={[
                      styles(dimensions, isDark).socialRowButton,
                      styles(dimensions, isDark).socialRowButtonSecondary,
                      isDark && styles(dimensions, isDark).socialRowButtonSecondaryDark,
                    ]}
                  >
                    <GoogleLogo size={18} />
                    <Text
                      style={[
                        styles(dimensions, isDark).socialRowButtonText,
                        styles(dimensions, isDark).socialRowButtonTextSecondary,
                      ]}
                    >
                      Google
                    </Text>
                  </View>
                </GoogleAuth>
                <AppleAuth onAuthSuccess={() => router.replace("/(auth)/onboarding")}>
                  <View
                    style={[
                      styles(dimensions, isDark).socialRowButton,
                      styles(dimensions, isDark).socialRowButtonSecondary,
                      isDark && styles(dimensions, isDark).socialRowButtonSecondaryDark,
                    ]}
                  >
                    <AppleLogo size={18} color={isDark ? "#FFFFFF" : "#000000"} />
                    <Text
                      style={[
                        styles(dimensions, isDark).socialRowButtonText,
                        styles(dimensions, isDark).socialRowButtonTextSecondary,
                      ]}
                    >
                      Apple
                    </Text>
                  </View>
                </AppleAuth>
              </View>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Component for other platforms
const DefaultStartPage = ({
  dimensions,
  isDark,
  fadeAnim,
  slideUpAnim,
  scaleAnim,
}: {
  dimensions: { width: number; height: number };
  isDark: boolean;
  fadeAnim: Animated.Value;
  slideUpAnim: Animated.Value;
  scaleAnim: Animated.Value;
}) => {
  const router = useRouter();

  return (
    <SafeAreaView
      style={[
        styles(dimensions, isDark).container,
        isDark && styles(dimensions, isDark).containerDark,
      ]}
    >
      <Head>
        <title>Elearn Prepa | Accueil</title>
        <meta name="description" content="Préparez les concours de vos reves" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={
          isDark ? theme.color.dark.background.primary : "#FFFFFF"
        }
      />
      <ScrollView
        contentContainerStyle={styles(dimensions, isDark).scrollViewContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles(dimensions, isDark).content}>
          {/* App Logo and Name */}
          <Animated.View
            style={[
              styles(dimensions, isDark).logoSection,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles(dimensions, isDark).logo}
              resizeMode="contain"
            />
            <View style={styles(dimensions, isDark).brandingContainer}>
              <Text
                style={[
                  styles(dimensions, isDark).appName,
                  isDark && styles(dimensions, isDark).textDark,
                ]}
              >
                Elearn Prepa
              </Text>
              <Text
                style={[
                  styles(dimensions, isDark).tagline,
                  isDark && styles(dimensions, isDark).textGray,
                ]}
              >
                Votre succès commence ici
              </Text>
            </View>
          </Animated.View>

          {/* Animated Illustration */}
          {Platform.OS === "web" && WebLottie ? (
            <Animated.View
              style={[
                styles(dimensions, isDark).illustrationWrapper,
                { opacity: fadeAnim },
              ]}
            >
              <WebLottie
                data={welcomeAnimationData}
                autoplay
                loop
                style={styles(dimensions, isDark).lottie}
              />
            </Animated.View>
          ) : Lottie ? (
            <Animated.View
              style={[
                styles(dimensions, isDark).illustrationWrapper,
                { opacity: fadeAnim },
              ]}
            >
              <Lottie
                source={welcomeAnimation}
                autoPlay
                loop
                style={styles(dimensions, isDark).lottie}
                resizeMode="contain"
              />
            </Animated.View>
          ) : null}

          {/* Welcome Message */}
          <Animated.View
            style={[
              styles(dimensions, isDark).messageContainer,
              { opacity: fadeAnim },
            ]}
          >
            <Text
              style={[
                styles(dimensions, isDark).title,
                isDark && styles(dimensions, isDark).textDark,
              ]}
            >
              Apprenez, Explorez, Progressez
            </Text>
            <Text
              style={[
                styles(dimensions, isDark).subtitle,
                isDark && styles(dimensions, isDark).textGray,
              ]}
            >
              Préparez vos concours avec des contenus de qualité.
            </Text>
          </Animated.View>

          {/* Buttons */}
          <Animated.View
            style={[
              styles(dimensions, isDark).buttonSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideUpAnim }],
              },
            ]}
          >
            {/* Google Sign Up Button */}
            <GoogleAuth onAuthSuccess={() => router.replace("/(auth)/onboarding")}>
              <View style={styles(dimensions, isDark).registerButton}>
                <GoogleLogo size={20} />
                <Text style={styles(dimensions, isDark).registerButtonText}>
                  S'inscrire avec Google
                </Text>
              </View>
            </GoogleAuth>

            {/* Google Sign In Button */}
            <GoogleAuth onAuthSuccess={() => router.replace("/(auth)/onboarding")}>
              <View
                style={[
                  styles(dimensions, isDark).loginButton,
                  isDark && styles(dimensions, isDark).loginButtonDark,
                ]}
              >
                <GoogleLogo size={20} />
                <Text style={styles(dimensions, isDark).loginButtonText}>
                  Se connecter avec Google
                </Text>
              </View>
            </GoogleAuth>
          </Animated.View>
          <WhatsAppContact
            phoneNumber="+237 6 51 05 56 63"
            message="Bonjour, j'ai besoin d'aide"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const StartPage = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const dimensions = useWindowDimensions();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const isNative = Platform.OS !== 'web';

    // Logo animation
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: isNative,
    }).start();

    // Content fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: isNative,
    }).start();

    // Button slide up
    Animated.timing(slideUpAnim, {
      toValue: 0,
      duration: 800,
      delay: 400,
      useNativeDriver: isNative,
    }).start();
  }, []);

  return Platform.OS === "ios" ? (
    <IOSStartPage
      dimensions={dimensions}
      isDark={isDark}
      fadeAnim={fadeAnim}
      slideUpAnim={slideUpAnim}
      scaleAnim={scaleAnim}
    />
  ) : (
    <DefaultStartPage
      dimensions={dimensions}
      isDark={isDark}
      fadeAnim={fadeAnim}
      slideUpAnim={slideUpAnim}
      scaleAnim={scaleAnim}
    />
  );
};

const styles = (
  dimensions: { width: number; height: number },
  isDark: boolean
) => {
  const illustrationSize = Math.min(280, dimensions.width * 0.8, dimensions.height * 0.28);

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#FFFFFF",
    },
    containerDark: {
      backgroundColor: theme.color.dark.background.primary,
    },
    scrollViewContent: {
      flex: 1,
      width: dimensions.width,
      height: dimensions.height,
      flexGrow: 0,
      minHeight: "100%",
    },
    content: {
      flex: 1,
      padding: dimensions.width * 0.05,
      alignItems: "center",
      justifyContent: "center",
      paddingTop:
        Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 10 : 10,
      paddingBottom: Platform.select({ ios: 20, android: 10 }),
    },
    logoSection: {
      flexDirection: dimensions.width < 430 ? "column" : "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: dimensions.height * 0.02,
      width: "100%",
      maxWidth: 400,
      paddingHorizontal: dimensions.width < 430 ? 0 : dimensions.width < 375 ? 5 : 10,
    },
    logo: {
      width: dimensions.width < 375 ? 60 : 80,
      height: dimensions.width < 375 ? 60 : 80,
      borderRadius: 16,
    },
    brandingContainer: {
      marginLeft: dimensions.width < 430 ? 0 : dimensions.width < 375 ? 10 : 15,
      marginTop: dimensions.width < 430 ? 12 : 0,
      flex: dimensions.width < 430 ? 0 : 1,
      alignItems: dimensions.width < 430 ? "center" : "flex-start",
    },
    appName: {
      fontFamily: theme.typography.fontFamily,
      fontSize: dimensions.width < 375 ? 20 : 24,
      fontWeight: "bold",
      color: "#1A1A1A",
      textAlign: dimensions.width < 430 ? "center" : "left",
    },
    tagline: {
      fontFamily: theme.typography.fontFamily,
      fontSize: dimensions.width < 375 ? 14 : 16,
      color: "#666666",
      marginTop: 4,
      textAlign: dimensions.width < 430 ? "center" : "left",
    },
    illustrationWrapper: {
      width: "100%",
      height: illustrationSize,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: dimensions.height * 0.03,
    },
    lottie: {
      width: illustrationSize,
      height: illustrationSize,
    },
    messageContainer: {
      width: "100%",
      maxWidth: 400,
      marginBottom: dimensions.height * 0.03,
      alignItems: "center",
    },
    title: {
      fontFamily: theme.typography.fontFamily,
      fontSize: dimensions.width < 375 ? 24 : 28,
      fontWeight: "bold",
      color: "#1A1A1A",
      textAlign: "center",
      marginBottom: 12,
    },
    subtitle: {
      fontFamily: theme.typography.fontFamily,
      fontSize: dimensions.width < 375 ? 14 : 16,
      color: "#666666",
      textAlign: "center",
      lineHeight: dimensions.width < 375 ? 20 : 22,
      paddingHorizontal: 10,
    },
    buttonSection: {
      width: "100%",
      maxWidth: 400,
      marginBottom: dimensions.height * 0.03,
      paddingHorizontal: dimensions.width < 400 ? dimensions.width * 0.05 : 20,
    },
    // Main CTA - Register button
    registerButton: {
      height: dimensions.width < 375 ? 50 : 55,
      backgroundColor: theme.color.primary[500],
      borderRadius: 12,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
      shadowColor: theme.color.primary[500],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
    },
    registerButtonText: {
      color: "#FFFFFF",
      fontFamily: theme.typography.fontFamily,
      fontSize: dimensions.width < 375 ? 15 : 16,
      fontWeight: "600",
      lineHeight: dimensions.width < 375 ? 20 : 22,
      marginLeft: 8,
    },
    // Secondary action - Login button
    loginButton: {
      height: dimensions.width < 375 ? 50 : 55,
      backgroundColor: "#FFFFFF",
      borderWidth: 2,
      borderColor: theme.color.primary[500],
      borderRadius: 12,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    loginButtonDark: {
      backgroundColor: theme.color.dark.background.secondary,
      borderColor: theme.color.primary[100],
    },
    loginButtonText: {
      color: theme.color.primary[500],
      fontFamily: theme.typography.fontFamily,
      fontSize: dimensions.width < 375 ? 15 : 16,
      fontWeight: "600",
      lineHeight: dimensions.width < 375 ? 20 : 22,
      marginLeft: 8,
    },
    textDark: {
      color: "#FFFFFF",
    },
    textGray: {
      color: "#CCCCCC",
    },
    // Social Row Styles for iOS
    sectionLabel: {
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: "600",
      color: "#666666",
      marginBottom: 8,
      textAlign: "left",
      paddingLeft: 4,
    },
    socialRow: {
      flexDirection: "row",
      gap: 12,
      width: "100%",
    },
    socialRowButton: {
      flex: 1,
      flexDirection: "row",
      height: 50,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#DADCE0",
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
    },
    socialRowButtonText: {
      color: "#3C4043",
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: "600",
    },
    appleRowButton: {
      backgroundColor: "#000000",
      borderColor: "#000000",
    },
    appleRowButtonDark: {
      backgroundColor: "#FFFFFF",
      borderColor: "#FFFFFF",
    },
    appleRowButtonText: {
      color: "#FFFFFF",
    },
    appleRowButtonTextDark: {
      color: "#000000",
    },
    socialRowButtonSecondary: {
      backgroundColor: "#FFFFFF",
      borderWidth: 2,
      borderColor: theme.color.primary[500],
    },
    socialRowButtonSecondaryDark: {
      backgroundColor: theme.color.dark.background.secondary,
      borderColor: theme.color.primary[100],
    },
    socialRowButtonTextSecondary: {
      color: theme.color.primary[500],
    },
  });
};

export default StartPage;
