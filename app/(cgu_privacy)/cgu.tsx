import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, useColorScheme, Platform, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

// URL fixe pour les CGU
const CGU_URL = 'https://elearn.ezadrive.com/en/privacy/cgu';
const PAGE_TITLE = 'Conditions Générales d\'Utilisation';

export default function CGUScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const isDark = useColorScheme() === 'dark';

    const handleBackPress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.back();
    }, [router]);

    const onLoadEnd = useCallback(() => {
        setLoading(false);
    }, []);

    return (
        <SafeAreaView
            style={[
                styles.container,
                { backgroundColor: isDark ? theme.color.dark.background.primary : theme.color.light.background.primary }
            ]}
            edges={['top', 'right', 'left']} // Ne pas inclure 'bottom' pour éviter des espaces vides
        >
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={isDark ? theme.color.dark.background.tertiary : theme.color.light.background.primary}
                translucent={false}
            />

            {/* En-tête avec bouton retour et titre */}
            <View style={[
                styles.header,
                { backgroundColor: isDark ? theme.color.dark.background.tertiary : theme.color.light.background.primary }
            ]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBackPress}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons
                        name="arrow-left"
                        size={24}
                        color={isDark ? theme.color.dark.text.primary : theme.color.light.text.primary}
                    />
                </TouchableOpacity>

                <Text style={[
                    styles.headerTitle,
                    { color: isDark ? theme.color.dark.text.primary : theme.color.light.text.primary }
                ]}>
                    {PAGE_TITLE}
                </Text>

                <View style={styles.placeholder} />
            </View>

            {/* WebView pour afficher le contenu */}
            <View style={styles.webViewContainer}>
                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.color.primary[500]} />
                        <Text style={[
                            styles.loadingText,
                            { color: isDark ? theme.color.dark.text.secondary : theme.color.light.text.secondary }
                        ]}>
                            Chargement en cours...
                        </Text>
                    </View>
                )}

                <WebView
                    source={{ uri: CGU_URL }}
                    style={styles.webView}
                    onLoadEnd={onLoadEnd}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,

    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
        elevation: 2,
        shadowOpacity: 0.1,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
    },
    backButton: {
        padding: 8,
        borderRadius: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
        fontFamily: theme.typography.fontFamily,
    },
    placeholder: {
        width: 40,
    },
    webViewContainer: {
        flex: 1,
        position: 'relative',
    },
    webView: {
        flex: 1,
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
        zIndex: 1000,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        fontFamily: theme.typography.fontFamily,
    },
});