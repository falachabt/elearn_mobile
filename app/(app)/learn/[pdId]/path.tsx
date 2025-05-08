import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Alert,
    Platform,
    Text,
    ActivityIndicator,
} from 'react-native';
import WebView from 'react-native-webview';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { HapticType, useHaptics } from '@/hooks/useHaptics';

// URL for your Next.js backend
const NEXT_JS_BASE_URL = 'https://elearn.ezadrive.com/fr/webview';

export default function PathPage() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [isLoading, setIsLoading] = useState(Platform.OS !== 'web' ? true : false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [webViewKey, setWebViewKey] = useState(1); // Key for re-rendering WebView on retry
    const webViewRef = useRef<WebView>(null);
    const router = useRouter();
    const params = useLocalSearchParams();
    const programId = params.pdId as string;
    const { user } = useAuth();
    const [userToken, setUserToken] = useState<string | null>(null);
    const { trigger } = useHaptics();
    const [retryCount, setRetryCount] = useState(0);
    const MAX_RETRIES = 3;

    // Get user session token for authentication with the web service
    useEffect(() => {
        const getUserToken = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) {
                    setUserToken(session.access_token);
                }
            } catch (error) {
                console.error('Error getting user token:', error);
            }
        };

        getUserToken();
    }, []);

    // Handle messages from WebView
    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('Message received:', data);

            // Handle navigation based on message type
            switch (data.type) {
                case 'OPEN_COURSE':
                    if (data.programId && data.courseId) {
                        trigger(HapticType.LIGHT);
                        router.push(`/(app)/learn/${data.programId}/courses/${data.courseId}`);
                    }
                    break;

                case 'EXPLORE_PROGRAM':
                    if (data.programId) {
                        trigger(HapticType.LIGHT);
                        router.push(`/(app)/learn/${data.programId}`);
                    }
                    break;

                case 'BACK_TO_PROGRAM':
                    trigger(HapticType.LIGHT);
                    router.replace(`/(app)/learn/${programId}`);
                    break;

                case 'NOTIFY_ME':
                    trigger(HapticType.SUCCESS);
                    Alert.alert(
                        'Notification activée',
                        'Vous serez notifié dès que le parcours d\'apprentissage personnalisé sera disponible.',
                        [{ text: 'OK' }]
                    );
                    break;

                case 'LOADED':
                    console.log('LOADED message received');
                    setIsLoading(false);
                    break;

                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.log('Message parsing error:', error);
            console.log('Raw message:', event.nativeEvent.data);
        }
    };

    // Direct HTML content instead of URL to avoid darkMode parameter issues
    const getHtmlContent = () => {
        return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Parcours d'Apprentissage</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
            tailwind.config = {
                darkMode: 'class',
                theme: {
                    extend: {
                        colors: {
                            emerald: {
                                600: '#059669',
                                700: '#047857'
                            }
                        },
                        keyframes: {
                            float: {
                                '0%, 100%': { transform: 'translateY(0px)' },
                                '50%': { transform: 'translateY(-10px)' }
                            }
                        },
                        animation: {
                            float: 'float 4s ease-in-out infinite'
                        }
                    }
                }
            };
        </script>
    </head>
    <body class="${isDark ? 'dark' : ''}">
        <main class="${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'} min-h-screen flex justify-center items-center p-4">
            <div id="loading" class="flex justify-center items-center h-screen w-full">
                <div class="${isDark ? 'border-slate-600 border-t-emerald-600' : 'border-gray-200 border-t-emerald-600'} w-10 h-10 rounded-full border-4 animate-spin"></div>
            </div>

            <div id="content" class="${isDark ? 'bg-slate-800' : 'bg-white'} flex-col items-center justify-center text-center p-8 rounded-2xl shadow-lg max-w-md w-full hidden">
                <div class="w-48 h-48 mb-6 animate-float">
                    <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="256" cy="256" r="220" class="fill-gray-100"/>
                        <path
                            d="M120 150C120 145.582 123.582 142 128 142H160C164.418 142 168 145.582 168 150V182C168 186.418 164.418 190 160 190H128C123.582 190 120 186.418 120 182V150Z"
                            class="fill-emerald-600"/>
                        <path
                            d="M232 240C232 235.582 235.582 232 240 232H272C276.418 232 280 235.582 280 240V272C280 276.418 276.418 280 272 280H240C235.582 280 232 276.418 232 272V240Z"
                            class="fill-emerald-600"/>
                        <path
                            d="M344 330C344 325.582 347.582 322 352 322H384C388.418 322 392 325.582 392 330V362C392 366.418 388.418 370 384 370H352C347.582 370 344 366.418 344 362V330Z"
                            class="fill-emerald-600"/>
                        <path d="M168 166H232" class="stroke-emerald-600" stroke-width="6"
                              stroke-linecap="round" stroke-dasharray="12 12"/>
                        <path d="M280 256H344" class="stroke-emerald-600" stroke-width="6"
                              stroke-linecap="round" stroke-dasharray="12 12"/>
                        <circle cx="144" cy="166" r="16" class="fill-emerald-700"/>
                        <circle cx="256" cy="256" r="16" class="fill-emerald-700"/>
                        <circle cx="368" cy="346" r="16" class="fill-emerald-700"/>
                        <path d="M142 158L146 170" class="stroke-white" stroke-width="2"
                              stroke-linecap="round"/>
                        <path d="M254 248L258 260" class="stroke-white" stroke-width="2"
                              stroke-linecap="round"/>
                        <path d="M366 338L370 350" class="stroke-white" stroke-width="2"
                              stroke-linecap="round"/>
                    </svg>
                </div>
                <h2 class="text-2xl font-bold text-emerald-600 mb-4">Parcours d'apprentissage personnalisé</h2>
                <p class="${isDark ? 'text-gray-300' : 'text-gray-600'} mb-6">
                    Nous développons actuellement un parcours d'apprentissage adaptatif qui vous guidera
                    étape par étape à travers ce programme de formation selon votre niveau et vos objectifs.
                </p>
                <div class="w-full">
                    <button
                        id="backButton"
                        class="${isDark ? 'border-gray-600 text-white hover:bg-slate-700' : 'border-gray-200 text-gray-900 hover:bg-gray-50'} w-full py-3.5 px-6 rounded-lg font-semibold border transition-all duration-200 hover:-translate-y-0.5"
                    >
                        Retourner au programme
                    </button>
                </div>
            </div>

            <div id="error" class="${isDark ? 'bg-slate-800' : 'bg-white'} flex-col items-center justify-center text-center p-8 rounded-2xl shadow-lg max-w-md w-full hidden">
                <div class="mb-6">
                    <svg width="120" height="120" viewBox="0 0 120 120" fill="none"
                         xmlns="http://www.w3.org/2000/svg">
                        <circle cx="60" cy="60" r="60" fill="#fee2e2"/>
                        <path d="M60 40V65" stroke="#ef4444" stroke-width="6" stroke-linecap="round"/>
                        <circle cx="60" cy="80" r="4" fill="#ef4444"/>
                    </svg>
                </div>
                <h2 class="text-2xl font-bold text-red-600 mb-4">Ce n'est pas vous, c'est nous</h2>
                <p class="${isDark ? 'text-gray-300' : 'text-gray-600'} mb-6">
                    Une erreur est survenue lors du chargement du parcours d'apprentissage.
                    Notre équipe technique a été informée et travaille à résoudre le problème.
                </p>
                <button
                    id="errorBackButton"
                    class="${isDark ? 'border-gray-600 text-white hover:bg-slate-700' : 'border-gray-200 text-gray-900 hover:bg-gray-50'} w-full py-3.5 px-6 rounded-lg font-semibold border transition-all duration-200 hover:-translate-y-0.5"
                >
                    Retourner au programme
                </button>
            </div>
        </main>

        <script>
            // Simulate loading
            setTimeout(() => {
                console.log('Simulated loading complete');
                document.getElementById('loading').style.display = 'none';
                document.getElementById('content').style.display = 'flex';

                // Send loaded message to React Native
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'LOADED'
                    }));
                }
            }, 1000);

            // Handle button clicks
            document.getElementById('backButton').addEventListener('click', function() {
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'BACK_TO_PROGRAM',
                        programId: '${programId}'
                    }));
                } else {
                    history.back();
                }
            });

            document.getElementById('errorBackButton').addEventListener('click', function() {
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'BACK_TO_PROGRAM',
                        programId: '${programId}'
                    }));
                } else {
                    history.back();
                }
            });
        </script>
    </body>
    </html>
    `;
    };

    // Handle WebView loading error
    const handleError = (syntheticEvent: any) => {
        const { nativeEvent } = syntheticEvent;
        console.error('WebView error:', nativeEvent);

        if (retryCount < MAX_RETRIES) {
            // Retry loading
            setRetryCount(prev => prev + 1);
            setWebViewKey(prev => prev + 1);
        } else {
            // After max retries, show error state
            setLoadError('Unable to load content');
            setIsLoading(false);
        }
    };

    // Handle WebView HTTP error
    const handleHttpError = (syntheticEvent: any) => {
        const { nativeEvent } = syntheticEvent;
        console.error('WebView HTTP error:', nativeEvent);

        if (nativeEvent.statusCode === 404) {
            // 404 errors are expected for the "coming soon" feature
            setIsLoading(false);
        } else if (retryCount < MAX_RETRIES) {
            // Retry loading for other HTTP errors
            setRetryCount(prev => prev + 1);
            setWebViewKey(prev => prev + 1);
        } else {
            // After max retries, show error state
            setLoadError(`HTTP Error: ${nativeEvent.statusCode}`);
            setIsLoading(false);
        }
    };

    // Handle WebView load end
    const handleLoadEnd = () => {
        console.log('WebView load end');
        setIsLoading(false);
    };

    // Error fallback view
    const renderErrorView = () => (
        <View style={[
            styles.errorContainer,
            isDark && styles.errorContainerDark
        ]}>
            <View style={[
                styles.errorContent,
                isDark && styles.errorContentDark
            ]}>
                <View style={styles.errorIconContainer}>
                    <View style={styles.errorIconCircle}>
                        <Text style={styles.errorIconText}>!</Text>
                    </View>
                </View>
                <Text style={[
                    styles.errorTitle,
                    isDark && styles.errorTitleDark
                ]}>
                    Ce n'est pas vous, c'est nous
                </Text>
                <Text style={[
                    styles.errorMessage,
                    isDark && styles.errorMessageDark
                ]}>
                    Une erreur est survenue lors du chargement du parcours d'apprentissage.
                    Notre équipe technique a été informée et travaille à résoudre le problème.
                </Text>
                <View style={styles.buttonContainer}>
                    <Text
                        style={[
                            styles.secondaryButton,
                            isDark && styles.secondaryButtonDark
                        ]}
                        onPress={() => {
                            trigger(HapticType.LIGHT);
                            router.replace(`/(app)/learn/${programId}`);
                        }}
                    >
                        Retourner au programme
                    </Text>
                </View>
            </View>
        </View>
    );

    // Render main content
    return (
        <View style={[
            styles.container,
            isDark && styles.containerDark
        ]}>
            {loadError ? (
                // Show error view if there's an error
                renderErrorView()
            ) : (
                <>
                    {Platform.OS === 'web' ? (
                        // Render HTML content directly for web
                        <View style={styles.webView}>
                            <iframe
                                src={`${NEXT_JS_BASE_URL}/learning-path/${programId}?darkMode=${isDark}`}
                                style={{width: '100%', height: '100%', border: 'none'}}
                                onLoadedData={ () => setIsLoading(false) }

                            />
                        </View>
                    ) : (
                        // Use WebView for mobile
                        <WebView
                            key={webViewKey}
                            ref={webViewRef}
                            source={{
                                uri: `${NEXT_JS_BASE_URL}/learning-path/${programId}`,
                                headers: {
                                    'Authorization': `Bearer ${userToken}`
                                },
                                body: JSON.stringify({
                                    darkMode: isDark
                                })
                            }}
                            onMessage={handleMessage}
                            showsVerticalScrollIndicator={false}
                            originWhitelist={['*']}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            style={styles.webView}
                            scrollEnabled={true}
                            onLoadEnd={handleLoadEnd}
                            onError={handleError}
                            onHttpError={handleHttpError}
                        />
                    )}
                </>
            )}

            {/* Loading spinner overlay */}
            {isLoading && (
                <View style={[
                    styles.loadingOverlay,
                    isDark && styles.loadingOverlayDark
                ]}>
                    <View style={[
                        styles.spinner,
                        isDark && styles.spinnerDark
                    ]}>
                        <ActivityIndicator
                            size="large"
                            color={theme.color.primary[500]}
                        />
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb', // gray-50
    },
    containerDark: {
        backgroundColor: '#0f172a', // slate-900 - matches Tailwind CSS dark mode
    },
    webView: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(249, 250, 251, 0.8)', // gray-50 with opacity
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingOverlayDark: {
        backgroundColor: 'rgba(15, 23, 42, 0.8)', // slate-900 with opacity
    },
    spinner: {
        padding: 20,
        borderRadius: 10,
        backgroundColor: 'white',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    spinnerDark: {
        backgroundColor: '#1e293b', // slate-800
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9fafb', // gray-50
        padding: 16,
    },
    errorContainerDark: {
        backgroundColor: '#0f172a', // slate-900
    },
    errorContent: {
        backgroundColor: 'white',
        borderRadius: 16, // rounded-2xl
        padding: 32, // p-8
        width: '100%',
        maxWidth: 400, // max-w-md
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    errorContentDark: {
        backgroundColor: '#1e293b', // slate-800
    },
    errorIconContainer: {
        marginBottom: 24,
        alignItems: 'center',
    },
    errorIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fee2e2', // red-100
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorIconText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#ef4444', // red-500
    },
    errorTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 22,
        fontWeight: '700',
        color: '#ef4444', // red-600
        marginBottom: 16,
        textAlign: 'center',
    },
    errorTitleDark: {
        color: '#ef4444', // red-600 - same for dark mode
    },
    errorMessage: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: '#6b7280', // gray-600
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 24,
    },
    errorMessageDark: {
        color: '#d1d5db', // gray-300
    },
    buttonContainer: {
        width: '100%',
        marginBottom: 12,
    },
    secondaryButton: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937', // gray-900
        backgroundColor: 'transparent',
        paddingVertical: 14, // py-3.5
        paddingHorizontal: 24, // px-6
        borderRadius: 8, // rounded-lg
        borderWidth: 1,
        borderColor: '#e5e7eb', // border-gray-200
        overflow: 'hidden',
        textAlign: 'center',
    },
    secondaryButtonDark: {
        color: 'white',
        borderColor: '#4b5563', // border-gray-600
    }
});
