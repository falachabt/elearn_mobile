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
} from 'react-native';
import { theme } from '@/constants/theme';
import Lottie from 'lottie-react-native';
import { Link } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

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
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity
                  style={styles.loginButton}
                  onPress={handleButtonPress}
                  activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="login" size={20} color="white" />
                <Text style={styles.loginButtonText}>Se connecter</Text>
              </TouchableOpacity>
            </Link>

            <Link   style={[styles.registerButton, isDark && styles.registerButtonDark]} href="/(auth)/register" asChild>
              <TouchableOpacity

                  onPress={handleButtonPress}
                  activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                    name="account-plus"
                    size={20}
                    color={theme.color.primary[500]}
                />
                <Text style={styles.registerButtonText}>S'inscrire</Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>

        </View>
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
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 10,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  brandingContainer: {
    marginLeft: 15,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  tagline: {
    fontSize: 16,
    color: '#666666',
    marginTop: 4,
  },
  illustrationWrapper: {
    width: '100%',
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  lottie: {
    width: 280,
    height: 280,
  },
  messageContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  buttonSection: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  loginButton: {
    height: 55,
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
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  registerButton: {
    height: 55,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    width: '100%',
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
  registerButtonDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.primary[700],
  },
  registerButtonText: {
    color: theme.color.primary[500],
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  featuresContainer: {
    width: '100%',
    maxWidth: 400,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  featureItem: {
    alignItems: 'center',
    padding: 10,
  },
  featureText: {
    color: '#666666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  textDark: {
    color: '#FFFFFF',
  },
  textGray: {
    color: '#CCCCCC',
  },
});

export default StartPage;