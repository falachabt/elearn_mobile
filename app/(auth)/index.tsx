import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Image,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
    useWindowDimensions,
    Linking,
} from 'react-native';
import { theme } from '@/constants/theme';
import Lottie from 'lottie-react-native';
import { Link } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import Head from "expo-router/head";

// Component for iOS
const IOSStartPage = ({ dimensions, isDark, fadeAnim, slideUpAnim, scaleAnim, trigger }) => {
    const handleButtonPress = async () => {
        trigger(HapticType.LIGHT);
    };

    return (
        <SafeAreaView style={[styles(dimensions, isDark).container, isDark && styles(dimensions, isDark).containerDark]}>
            <Head>
                <title>Elearn Prepa | Acceuil</title>
                <meta name="description" content="Préparez les concours de vos reves" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={isDark ? theme.color.dark.background.primary : '#FFFFFF'}
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



                    </Animated.View>


                    <Image
                        source={require('@/assets/images/icon.png')}
                        style={[styles(dimensions, isDark).logo, { paddingBottom : 20 }]}
                        resizeMode="contain"
                    />

                    {/* Welcome Message for iOS */}
                    <Animated.View style={[styles(dimensions, isDark).messageContainer, { opacity: fadeAnim }]}>
                        <Text style={[styles(dimensions, isDark).title, isDark && styles(dimensions, isDark).textDark]}>
                            Bienvenue sur Elearn Prepa
                        </Text>
                        <Text style={[styles(dimensions, isDark).subtitle, isDark && styles(dimensions, isDark).textGray]}>
                            Pour créer un compte, veuillez visiter notre site web.
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
                        {/* Register Button - Main Action */}
                        <TouchableOpacity
                            style={styles(dimensions, isDark).registerButton}
                            onPress={() => Linking.openURL('https://app.elearnprepa.com/register')}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons name="account-plus" size={20} color="white" />
                            <Text style={styles(dimensions, isDark).registerButtonText}>Créer un compte</Text>
                        </TouchableOpacity>

                        {/* Login Button - Secondary Action */}
                        <Link href="/(auth)/login" asChild style={[styles(dimensions, isDark).loginButton, isDark && styles(dimensions, isDark).loginButtonDark]}>
                            <TouchableOpacity
                                onPress={handleButtonPress}
                                activeOpacity={0.8}
                            >
                                <MaterialCommunityIcons
                                    name="login"
                                    size={20}
                                    color={theme.color.primary[500]}
                                />
                                <Text style={styles(dimensions, isDark).loginButtonText}>Déjà inscrit ? Se connecter</Text>
                            </TouchableOpacity>
                        </Link>
                    </Animated.View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

// Component for other platforms
const DefaultStartPage = ({ dimensions, isDark, fadeAnim, slideUpAnim, scaleAnim, trigger }) => {
    const handleButtonPress = async () => {
        trigger(HapticType.LIGHT);
    };

    return (
        <SafeAreaView style={[styles(dimensions, isDark).container, isDark && styles(dimensions, isDark).containerDark]}>
            <Head>
                <title>Elearn Prepa | Acceuil</title>
                <meta name="description" content="Préparez les concours de vos reves" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={isDark ? theme.color.dark.background.primary : '#FFFFFF'}
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
                            source={require('@/assets/images/icon.png')}
                            style={styles(dimensions, isDark).logo}
                            resizeMode="contain"
                        />
                        <View style={styles(dimensions, isDark).brandingContainer}>
                            <Text style={[styles(dimensions, isDark).appName, isDark && styles(dimensions, isDark).textDark]}>
                                Elearn Prepa
                            </Text>
                            <Text style={[styles(dimensions, isDark).tagline, isDark && styles(dimensions, isDark).textGray]}>
                                Votre succès commence ici
                            </Text>
                        </View>
                    </Animated.View>

                    {/* Animated Illustration */}
                    <Animated.View style={[styles(dimensions, isDark).illustrationWrapper, { opacity: fadeAnim }]}>
                        <Lottie
                            source={require('@/assets/lotties/welcome.json')}
                            autoPlay
                            loop
                            style={styles(dimensions, isDark).lottie}
                            resizeMode="contain"
                        />
                    </Animated.View>

                    {/* Welcome Message */}
                    <Animated.View style={[styles(dimensions, isDark).messageContainer, { opacity: fadeAnim }]}>
                        <Text style={[styles(dimensions, isDark).title, isDark && styles(dimensions, isDark).textDark]}>
                            Apprenez, Explorez, Progressez
                        </Text>
                        <Text style={[styles(dimensions, isDark).subtitle, isDark && styles(dimensions, isDark).textGray]}>
                            Votre voyage éducatif commence ici. Découvrez des contenus de qualité et suivez votre progression.
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
                        {/* Register Button - Main Action */}
                        <Link href="/(auth)/register" asChild>
                            <TouchableOpacity
                                style={styles(dimensions, isDark).registerButton}
                                onPress={handleButtonPress}
                                activeOpacity={0.8}
                            >
                                <MaterialCommunityIcons name="account-plus" size={20} color="white" />
                                <Text style={styles(dimensions, isDark).registerButtonText}>Créer un compte</Text>
                            </TouchableOpacity>
                        </Link>

                        {/* Login Button - Secondary Action */}
                        <Link href="/(auth)/login" asChild style={[styles(dimensions, isDark).loginButton, isDark && styles(dimensions, isDark).loginButtonDark]}>
                            <TouchableOpacity
                                onPress={handleButtonPress}
                                activeOpacity={0.8}
                            >
                                <MaterialCommunityIcons
                                    name="login"
                                    size={20}
                                    color={theme.color.primary[500]}
                                />
                                <Text style={styles(dimensions, isDark).loginButtonText}>Déjà inscrit ? Se connecter</Text>
                            </TouchableOpacity>
                        </Link>
                    </Animated.View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const StartPage = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { trigger } = useHaptics();

    const dimensions = useWindowDimensions();

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

    return Platform.OS === 'ios' ? (
        <IOSStartPage dimensions={dimensions} isDark={isDark} fadeAnim={fadeAnim} slideUpAnim={slideUpAnim} scaleAnim={scaleAnim} trigger={trigger} />
    ) : (
        <DefaultStartPage dimensions={dimensions} isDark={isDark} fadeAnim={fadeAnim} slideUpAnim={slideUpAnim} scaleAnim={scaleAnim} trigger={trigger} />
    );
};

const styles = (dimensions: { width: number; height: number; }, isDark: boolean) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#FFFFFF',
        },
        containerDark: {
            backgroundColor: theme.color.dark.background.primary,
        },
        scrollViewContent: {
            flex: 1,
            width: dimensions.width,
            height: dimensions.height,
            flexGrow: 0,
            minHeight: '100%',
        },
        content: {
            flex: 1,
            padding: dimensions.width * 0.05,
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 10,
            paddingBottom: Platform.select({ ios: 20, android: 10 }),
        },
        logoSection: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: dimensions.height * 0.02,
            width: '100%',
            maxWidth: 400,
            paddingHorizontal: dimensions.width < 375 ? 5 : 10,
        },
        logo: {
            width: dimensions.width < 375 ? 60 : 80,
            height: dimensions.width < 375 ? 60 : 80,
            borderRadius: 16,
        },
        brandingContainer: {
            marginLeft: dimensions.width < 375 ? 10 : 15,
            flex: 1,
        },
        appName: {
            fontFamily: theme.typography.fontFamily,
            fontSize: dimensions.width < 375 ? 20 : 24,
            fontWeight: 'bold',
            color: '#1A1A1A',
        },
        tagline: {
            fontFamily: theme.typography.fontFamily,
            fontSize: dimensions.width < 375 ? 14 : 16,
            color: '#666666',
            marginTop: 4,
        },
        illustrationWrapper: {
            width: '100%',
            height: Math.min(220, dimensions.height * 0.25),
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: dimensions.height * 0.03,
        },
        lottie: {
            width: Math.min(280, dimensions.width * 0.8),
            height: Math.min(280, dimensions.width * 0.8),
        },
        messageContainer: {
            width: '100%',
            maxWidth: 400,
            marginBottom: dimensions.height * 0.03,
            alignItems: 'center',
        },
        title: {
            fontFamily: theme.typography.fontFamily,
            fontSize: dimensions.width < 375 ? 24 : 28,
            fontWeight: 'bold',
            color: '#1A1A1A',
            textAlign: 'center',
            marginBottom: 12,
        },
        subtitle: {
            fontFamily: theme.typography.fontFamily,
            fontSize: dimensions.width < 375 ? 14 : 16,
            color: '#666666',
            textAlign: 'center',
            lineHeight: dimensions.width < 375 ? 20 : 22,
            paddingHorizontal: 10,
        },
        buttonSection: {
            width: '100%',
            maxWidth: 400,
            marginBottom: dimensions.height * 0.03,
            paddingHorizontal: dimensions.width < 400 ? dimensions.width * 0.05 : 20,
        },
        // Main CTA - Register button
        registerButton: {
            height: dimensions.width < 375 ? 50 : 55,
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
            fontSize: dimensions.width < 375 ? 15 : 16,
            fontWeight: '600',
            lineHeight: dimensions.width < 375 ? 20 : 22,
            marginLeft: 8,
        },
        // Secondary action - Login button
        loginButton: {
            height: dimensions.width < 375 ? 50 : 55,
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
            fontSize: dimensions.width < 375 ? 15 : 16,
            fontWeight: '600',
            lineHeight: dimensions.width < 375 ? 20 : 22,
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
