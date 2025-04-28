import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Animated,
  Dimensions,
  useColorScheme,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { theme } from '@/constants/theme';
import Lottie from 'lottie-react-native';
import { Link } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

const StartPage = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Logo animation
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Content fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Button slide up
    Animated.timing(slideUpAnim, {
      toValue: 0,
      duration: 800,
      delay: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleButtonPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
        <StatusBar
            barStyle={isDark ? 'light-content' : 'dark-content'}
            backgroundColor={isDark ? theme.color.dark.background.primary : '#FFFFFF'}
        />
        <ScrollView
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
        >
          <View style={styles.content}>
            {/* App Logo and Name */}
            <Animated.View
                style={[
                  styles.logoSection,
                  {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }]
                  }
                ]}
            >
              <Image
                  source={require('@/assets/images/icon.png')}
                  style={styles.logo}
                  resizeMode="contain"
              />
              <View style={styles.brandingContainer}>
                <Text style={[styles.appName, isDark && styles.textDark]}>Elearn Prepa</Text>
                <Text style={[styles.tagline, isDark && styles.textGray]}>Votre succès commence ici</Text>
              </View>
            </Animated.View>

            {/* Animated Illustration */}
            <Animated.View style={[styles.illustrationWrapper, { opacity: fadeAnim }]}>
              <Lottie
                  source={require('@/assets/lotties/welcome.json')}
                  autoPlay
                  loop
                  style={styles.lottie}
                  resizeMode="contain"
              />
            </Animated.View>

            {/* Welcome Message */}
            <Animated.View style={[styles.messageContainer, { opacity: fadeAnim }]}>
              <Text style={[styles.title, isDark && styles.textDark]}>
                Apprenez, Explorez, Progressez
              </Text>
              <Text style={[styles.subtitle, isDark && styles.textGray]}>
                Votre voyage éducatif commence ici. Découvrez des contenus de qualité et suivez votre progression.
              </Text>
            </Animated.View>

            {/* Buttons */}
            <Animated.View
                style={[
                  styles.buttonSection,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideUpAnim }]
                  }
                ]}
            >
              {/* Register Button - Main Action */}
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity
                    style={styles.registerButton}
                    onPress={handleButtonPress}
                    activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="account-plus" size={20} color="white" />
                  <Text style={styles.registerButtonText}>Créer un compte</Text>
                </TouchableOpacity>
              </Link>

              {/* Login Button - Secondary Action */}
              <Link href="/(auth)/login" asChild    style={[styles.loginButton, isDark && styles.loginButtonDark]}>
                <TouchableOpacity

                    onPress={handleButtonPress}
                    activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                      name="login"
                      size={20}
                      color={theme.color.primary[500]}
                  />
                  <Text style={styles.loginButtonText}>Déjà inscrit ? Se connecter</Text>
                </TouchableOpacity>
              </Link>
            </Animated.View>
          </View>
        </ScrollView>
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  scrollViewContent: {
    flexGrow: 1,
    minHeight: '100%',
  },
  content: {
    flex: 1,
    padding: width * 0.05, // Responsive padding
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 10,
    paddingBottom: Platform.select({ ios: 20, android: 10 }),
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: height * 0.02,
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: isSmallDevice ? 5 : 10,
  },
  logo: {
    width: isSmallDevice ? 60 : 80,
    height: isSmallDevice ? 60 : 80,
    borderRadius: 16,
  },
  brandingContainer: {
    marginLeft: isSmallDevice ? 10 : 15,
    flex: 1,
  },
  appName: {
    fontFamily: theme.typography.fontFamily,
    fontSize: isSmallDevice ? 20 : 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  tagline: {
    fontFamily: theme.typography.fontFamily,
    fontSize: isSmallDevice ? 14 : 16,
    color: '#666666',
    marginTop: 4,
  },
  illustrationWrapper: {
    width: '100%',
    height: Math.min(220, height * 0.25), // Responsive height
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: height * 0.03,
  },
  lottie: {
    width: Math.min(280, width * 0.8),
    height: Math.min(280, width * 0.8),
  },
  messageContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: height * 0.03,
    alignItems: 'center',
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: isSmallDevice ? 24 : 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: isSmallDevice ? 14 : 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: isSmallDevice ? 20 : 22,
    paddingHorizontal: 10,
  },
  buttonSection: {
    width: '100%',
    maxWidth: 400,
    marginBottom: height * 0.03,
    paddingHorizontal: width < 400 ? width * 0.05 : 20,
  },
  // Main CTA - Register button
  registerButton: {
    height: isSmallDevice ? 50 : 55,
    backgroundColor: theme.color.primary[500],
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: theme.color.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily,
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '600',
    lineHeight: isSmallDevice ? 20 : 22,
    marginLeft: 8,
  },
  // Secondary action - Login button
  loginButton: {
    height: isSmallDevice ? 50 : 55,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: theme.color.primary[500],
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
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
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '600',
    lineHeight: isSmallDevice ? 20 : 22,
    marginLeft: 8,
  },
  textDark: {
    color: '#FFFFFF',
  },
  textGray: {
    color: '#CCCCCC',
  },
});

export default StartPage;