import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native';
import { theme } from '@/constants/theme';
import * as Animatable from 'react-native-animatable';
import Lottie from 'lottie-react-native';
import { Link } from 'expo-router';

const StartPage = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* App Logo */}
        <Animatable.View animation="fadeInDown" style={styles.logoWrapper}>
          <Image
            source={require('@/assets/images/icon.png')} // Replace with your app logo
            style={styles.logo}
            resizeMode="contain"
          />
        </Animatable.View>

        {/* Animated Illustration */}
        <Animatable.View animation="fadeIn" delay={300} style={styles.illustrationWrapper}>
          <Lottie
            source={require('@/assets/lotties/welcome.json')} // Replace with your learning-related animation
            autoPlay
            loop
            style={styles.lottie}
          />
        </Animatable.View>

        {/* Welcome Message */}
        <Animatable.View animation="fadeInUp" delay={500}>
          <Text style={styles.title}>Apprenez, Explorez, Progressez</Text>
          <Text style={styles.subtitle}>
            Votre voyage éducatif commence ici.
          </Text>
        </Animatable.View>

        {/* Buttons */}
        <Animatable.View animation="fadeInUp" delay={700} style={styles.buttonWrapper}>
          <Link href={"/(auth)/login"} asChild>
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Connexion</Text>
            </TouchableOpacity>
          </Link>

          <Link href={"/(auth)/register"} asChild>
            <TouchableOpacity style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>S'inscrire</Text>
            </TouchableOpacity>
          </Link>
        </Animatable.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color.primary[100], // Soft background
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.large,
  },
  logoWrapper: {
    marginBottom: theme.spacing.medium,
  },
  logo: {
    width: 120,
    height: 120,
  },
  illustrationWrapper: {
    marginBottom: theme.spacing.large,
  },
  lottie: {
    width: 300,
    height: 300,
  },
  title: {
    fontSize: theme.typography.fontSize.xlarge,
    fontWeight: '900',
    color: theme.color.primary[700],
    textAlign: 'center',
    marginBottom: theme.spacing.small,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.medium,
    color: theme.color.text,
    textAlign: 'center',
    marginBottom: theme.spacing.large,
  },
  buttonWrapper: {
    width: '100%',
    maxWidth: 350,
  },
  primaryButton: {
    backgroundColor: theme.color.primary[500],
    padding: theme.spacing.medium,
    borderRadius: theme.border.radius.small,
    alignItems: 'center',
    marginBottom: theme.spacing.medium,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.medium,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: theme.border.width.thin,
    borderColor: theme.color.primary[500],
    padding: theme.spacing.medium,
    borderRadius: theme.border.radius.small,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: theme.color.primary[500],
    fontSize: theme.typography.fontSize.medium,
    fontWeight: 'bold',
  },
});

export default StartPage;
