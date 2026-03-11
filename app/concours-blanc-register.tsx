import React, { useState, useRef } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    useColorScheme,
    Alert,
    StatusBar
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebViewErrorEvent, WebViewHttpErrorEvent, WebViewProgressEvent } from 'react-native-webview/lib/WebViewTypes';

import { logger } from '@/utils/logger';
import { useAuth } from '@/contexts/auth';
import { theme } from '@/constants/theme';

const ConcoursBlancRegisterScreen = () => {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const { session } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [webViewKey, setWebViewKey] = useState(1); // Key for re-rendering WebView on retry
    const webViewRef = useRef<WebView>(null);
    const [firstload, setFirstLoad] = useState(false);

    const WEBVIEW_URL = 'https://elearnbac.ezadrive.com/';

    // Handle WebView loading error
    const handleError = (event: WebViewErrorEvent) => {
        const { nativeEvent } = event;
        logger.error('WebView error:', nativeEvent);
        
        Alert.alert(
            'Erreur de connexion',
            'Impossible de charger la page d\'inscription. Veuillez vérifier votre connexion internet et réessayer.',
            [
                {
                    text: 'Réessayer',
                    onPress: () => {
                        setWebViewKey(prev => prev + 1);
                    }
                },
                {
                    text: 'Retour',
                    style: 'cancel',
                    onPress: () => router.back()
                }
            ]
        );
    };

    // Handle WebView HTTP error
    const handleHttpError = (event: WebViewHttpErrorEvent) => {
        const { nativeEvent } = event;
        logger.error('WebView HTTP error:', nativeEvent);
        
        Alert.alert(
            'Erreur de serveur',
            'Le serveur d\'inscription n\'est pas disponible. Veuillez réessayer plus tard.',
            [
                {
                    text: 'Réessayer',
                    onPress: () => {
                        setWebViewKey(prev => prev + 1);
                    }
                },
                {
                    text: 'Retour',
                    style: 'cancel',
                    onPress: () => router.back()
                }
            ]
        );
    };

    // Handle WebView load end
    const handleLoadEnd = () => {
        if(!firstload) {
            setWebViewKey(prev => prev + 1);
            setFirstLoad(true);
        }
        setIsLoading(false);
    };

    // Handle WebView load progress
    const handleLoadProgress = (event: WebViewProgressEvent) => {
        setLoadingProgress(event.nativeEvent.progress);
    };

    // Handle WebView load start
    const handleLoadStart = () => {
        setIsLoading(true);
        setLoadingProgress(0);
    };

    return (
        <SafeAreaView style={[
            styles.container,
            isDarkMode && styles.containerDark
        ]}>
            <StatusBar
                backgroundColor={isDarkMode ? theme.color.dark.background.primary : '#FFFFFF'}
                barStyle={isDarkMode ? 'light-content' : 'dark-content'}
            />
            
            {/* Header */}
            <View style={[styles.header, isDarkMode && styles.headerDark]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <MaterialCommunityIcons
                        name="arrow-left"
                        size={24}
                        color={isDarkMode ? '#FFFFFF' : '#1F2937'}
                    />
                </TouchableOpacity>
                
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>
                        Concours Blanc 2
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={() => {
                        setWebViewKey(prev => prev + 1);
                    }}
                >
                    <MaterialCommunityIcons
                        name="refresh"
                        size={24}
                        color={isDarkMode ? '#FFFFFF' : '#1F2937'}
                    />
                </TouchableOpacity>
            </View>

            {/* Loading Progress Bar */}
            {isLoading && (
                <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${loadingProgress * 100}%` }]} />
                </View>
            )}

            {/* WebView */}
            <View style={styles.webViewContainer}>
                <WebView
                    key={webViewKey}
                    ref={webViewRef}
                    source={{
                        uri: WEBVIEW_URL,
                        headers: {
                            Authorization: `Bearer ${session?.access_token}`,
                            "color-scheme": isDarkMode ? "dark" : "light",
                        },
                    }}
                    style={[
                        styles.webView,
                        isDarkMode && styles.webViewDark,
                    ]}
                    originWhitelist={["*"]}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    cacheEnabled={true}
                    allowsInlineMediaPlayback={true}
                    mediaPlaybackRequiresUserAction={false}
                    mixedContentMode="compatibility"
                    injectedJavaScript={
                        `(function() {
                        sessionStorage.setItem('authToken', '${session?.access_token}');
                        localStorage.setItem('authToken', '${session?.access_token}');
                        document.cookie = "authToken=${session?.access_token}; path=/; secure; SameSite=Strict";                       
                        })();`
                    }
                    allowsFullscreenVideo={true}
                    onLoadStart={handleLoadStart}
                    onLoadEnd={handleLoadEnd}
                    onLoadProgress={handleLoadProgress}
                    onError={handleError}
                    onHttpError={handleHttpError}
                    renderError={() => (
                        <View style={styles.errorContainer}>
                            <MaterialCommunityIcons
                                name="wifi-off"
                                size={48}
                                color={theme.color.primary[500]}
                            />
                            <Text style={[styles.errorTitle, isDarkMode && styles.errorTitleDark]}>
                                Erreur de connexion
                            </Text>
                            <Text style={[styles.errorMessage, isDarkMode && styles.errorMessageDark]}>
                                Impossible de charger la page d'inscription.
                            </Text>
                            <TouchableOpacity
                                style={styles.retryButton}
                                onPress={() => setWebViewKey(prev => prev + 1)}
                            >
                                <Text style={styles.retryButtonText}>Réessayer</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                />
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerDark: {
        backgroundColor: theme.color.dark.background.primary,
        borderBottomColor: '#374151',
    },
    backButton: {
        padding: 8,
        marginRight: 12,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
    },
    headerTitleDark: {
        color: '#FFFFFF',
    },
    refreshButton: {
        padding: 8,
        marginLeft: 12,
    },
    progressContainer: {
        height: 3,
        backgroundColor: '#E5E7EB',
    },
    progressBar: {
        height: '100%',
        backgroundColor: theme.color.primary[500],
    },
    webViewContainer: {
        flex: 1,
    },
    webView: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    webViewDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    errorTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
        marginTop: 16,
        marginBottom: 8,
    },
    errorTitleDark: {
        color: '#FFFFFF',
    },
    errorMessage: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
    },
    errorMessageDark: {
        color: '#D1D5DB',
    },
    retryButton: {
        backgroundColor: theme.color.primary[500],
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: theme.border.radius.small,
    },
    retryButtonText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default ConcoursBlancRegisterScreen;
