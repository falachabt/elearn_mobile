import {
  AppState,
  AppStateStatus,
  BackHandler,
  Platform,
  ToastAndroid,
  View,
  Text,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SWRConfig } from "swr";
import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as amplitude from "@amplitude/analytics-react-native";
import { PostHogProvider, PostHogErrorBoundary } from "posthog-react-native";
import type { PostHogErrorBoundaryFallbackProps } from 'posthog-react-native';
import React from "react";

import { AuthProvider } from "@/contexts/auth";
import { QuizProvider } from "@/contexts/quizContext";
import { UserProvider } from "@/contexts/useUserInfo";
import { AppConfigProvider } from "@/contexts/useAppConfig";
import UserActivityTracker from "@/components/shared/UserActivity";
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import AuthDeepLinkHandler from "@/components/shared/DeepLinkHandler";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ChatProvider } from "@/contexts/chatBotContext";
import { UpdatesProvider } from "@/contexts/UpdatesContext";
import UpdatesManager from "@/components/shared/UpdatesManager";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { posthog } from "@/lib/posthog";
import { theme } from "@/constants/theme";
import { logger } from "@/utils/logger";
// import {useRouteRevalidation} from "@/hooks/useRouteRevalidation";

// Array of motivational messages to show when user tries to exit
const MOTIVATIONAL_MESSAGES = [
  "Encore quelques minutes pour apprendre quelque chose de nouveau?",
  "N'abandonnez pas maintenant, la persistance est la clé du succès!",
  "Un petit effort de plus vous rapproche de votre objectif!",
  "Prendre une pause? Vous êtes sur la bonne voie!",
  "Chaque minute d'apprentissage compte. Continuez!",
  "Votre cerveau vous remerciera de continuer à apprendre!",
  "Les grands succès commencent par de petits efforts quotidiens.",
  "Une leçon de plus aujourd'hui, un grand pas vers la réussite!",
  "Le savoir est la seule richesse que l'on peut donner sans s'appauvrir.",
  "Apprendre, c'est découvrir ce que vous savez déjà.",
  "La connaissance s'acquiert par l'expérience, tout le reste n'est que de l'information.",
  "L'éducation est l'arme la plus puissante pour changer le monde.",
  "Le succès, c'est tomber sept fois et se relever huit.",
  "Le meilleur moment pour commencer était hier, le deuxième meilleur moment est maintenant.",
  "Chaque jour est une nouvelle opportunité d'apprendre.",
  "Un investissement dans la connaissance paie toujours les meilleurs intérêts.",
  "La pratique régulière est le secret de l'apprentissage efficace.",
  "Le chemin vers l'excellence n'a pas de ligne d'arrivée.",
  "Votre potentiel est illimité. Continuez à apprendre!",
  "Petit à petit, l'oiseau fait son nid. Continuez votre apprentissage!",
];

// IndexedDB helper for web platform
const openIndexedDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("SWRCache", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("cache")) {
        db.createObjectStore("cache");
      }
    };
  });
};

// Create a provider function that returns a Cache instance compatible with SWR
function asyncStorageProvider() {
  const SWR_CACHE_PREFIX = "swr-cache:";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = new Map<string, any>();
  let initialized = false;
  let initializing = false;
  let initPromise: Promise<void> | null = null;

  // Check if we're in a browser/native environment (not SSR)
  const isClient = typeof window !== "undefined";
  const isWeb = Platform.OS === "web";
  let db: IDBDatabase | null = null;

  // Initialize cache from IndexedDB (web) or AsyncStorage (native)
  const initCache = async () => {
    if (initialized || initializing) return initPromise;

    // Skip initialization on server-side (SSR)
    if (!isClient) {
      initialized = true;
      return Promise.resolve();
    }

    initializing = true;
    initPromise = (async () => {
      try {
        if (isWeb) {
          // Use IndexedDB on web
          db = await openIndexedDB();
          const transaction = db.transaction(["cache"], "readonly");
          const store = transaction.objectStore("cache");
          const request = store.getAllKeys();

          const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });

          // Load all cached items
          for (const key of keys) {
            const getRequest = store.get(key);
            const value = await new Promise((resolve, reject) => {
              getRequest.onsuccess = () => resolve(getRequest.result);
              getRequest.onerror = () => reject(getRequest.error);
            });
            if (value) {
              map.set(key as string, value);
            }
          }
        } else {
          // Use AsyncStorage on native
          const keys = await AsyncStorage.getAllKeys();
          const swrKeys = keys
            .filter((key) => key.startsWith(SWR_CACHE_PREFIX))
            .slice(-50);

          if (swrKeys.length > 0) {
            const items = await AsyncStorage.multiGet(swrKeys);
            items.forEach(([key, value]) => {
              if (value) {
                try {
                  const parsedValue = JSON.parse(value);
                  map.set(key.substring(SWR_CACHE_PREFIX.length), parsedValue);
                } catch (parseError) {
                  logger.error("Error parsing cached value:", parseError);
                }
              }
            });

            const keysToRemove = keys
              .filter((key) => key.startsWith(SWR_CACHE_PREFIX))
              .slice(0, -50);

            if (keysToRemove.length > 0) {
              await AsyncStorage.multiRemove(keysToRemove);
            }
          }
        }
        initialized = true;
      } catch (error) {
        logger.error("Error initializing SWR cache:", error);
      } finally {
        initializing = false;
      }
    })();

    return initPromise;
  };

  // Initialize the cache immediately
  initCache();

  // Return a Cache interface compatible with SWR
  return {
    keys() {
      return map.keys();
    },

    get(key: string) {
      return map.get(key);
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    set(key: string, value: any) {
      map.set(key, value);

      if (!isClient) return;

      (async () => {
        try {
          if (isWeb && db) {
            // Use IndexedDB on web
            const transaction = db.transaction(["cache"], "readwrite");
            const store = transaction.objectStore("cache");
            store.put(value, key);
          } else {
            // Use AsyncStorage on native
            await AsyncStorage.setItem(
              `${SWR_CACHE_PREFIX}${key}`,
              JSON.stringify(value)
            );
          }
        } catch (error) {
          logger.error("Error setting SWR cache:", error);
        }
      })();
    },

    delete(key: string) {
      map.delete(key);

      if (!isClient) return;

      (async () => {
        try {
          if (isWeb && db) {
            // Use IndexedDB on web
            const transaction = db.transaction(["cache"], "readwrite");
            const store = transaction.objectStore("cache");
            store.delete(key);
          } else {
            // Use AsyncStorage on native
            await AsyncStorage.removeItem(`${SWR_CACHE_PREFIX}${key}`);
          }
        } catch (error) {
          logger.error("Error deleting SWR cache:", error);
        }
      })();
    },
  };
}
// Separate BackHandler logic into its own component for better separation of concerns

const BackHandlerManager = React.memo(
  ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const { trigger } = useHaptics();
    const [exitAppCount, setExitAppCount] = useState(0);
    const exitTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [lastUsedMessageIndex, setLastUsedMessageIndex] = useState(-1);
    const lastExitTimeRef = useRef<number>(0);

    // Only run on native platforms (not web/SSR)
    const isNative = Platform.OS === "android" || Platform.OS === "ios";

    // Listen for app state changes to track when app returns from background
    useEffect(() => {
      if (!isNative) return;

      const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          // App has come to the foreground
        }
      };

      const subscription = AppState.addEventListener(
        "change",
        handleAppStateChange
      );
      return () => {
        subscription.remove();
      };
    }, [isNative]);

    useEffect(() => {
      if (!isNative) return;
      const backAction = () => {
        try {
          trigger(HapticType.LIGHT);

          // If we can go back to a previous screen, just do that
          if (router.canGoBack()) {
            router.back();
            return true;
          }

          // Handle app exit with double-press confirmation
          if (exitAppCount === 0) {
            // First press - show motivational message
            setExitAppCount(1);

            // Get random motivational message (different from the last one if possible)
            let randomIndex;
            do {
              randomIndex = Math.floor(
                Math.random() * MOTIVATIONAL_MESSAGES.length
              );
            } while (
              randomIndex === lastUsedMessageIndex &&
              MOTIVATIONAL_MESSAGES.length > 1
            );

            setLastUsedMessageIndex(randomIndex);
            const message = MOTIVATIONAL_MESSAGES[randomIndex];

            // Always show a toast with the message
            ToastAndroid.showWithGravity(
              `${message}\n\nAppuyez à nouveau pour quitter`,
              ToastAndroid.LONG,
              ToastAndroid.CENTER
            );

            // Reset the exit counter after 2 seconds
            exitTimerRef.current = setTimeout(() => {
              setExitAppCount(0);
            }, 2000) as unknown as NodeJS.Timeout;

            return true;
          } else {
            // Second press within 2 seconds - exit app
            if (exitTimerRef.current) {
              clearTimeout(exitTimerRef.current);
            }
            // Store the time when user exits
            lastExitTimeRef.current = Date.now();
            BackHandler.exitApp();
            return true;
          }
        } catch (error) {
          logger.error("Erreur lors de l'exécution de backAction:", error);
          return false;
        }
      };

      const backHandlerSubscription = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction
      );

      return () => {
        if (exitTimerRef.current) {
          clearTimeout(exitTimerRef.current);
        }
        backHandlerSubscription.remove();
      };
    }, [router, exitAppCount, trigger, isNative]);

    return <>{children}</>;
  }
);

// Composant qui déclenche la revalidation SWR lors des changements de route
// Placé après l'initialisation de l'auth pour éviter les conflits
// Mode conservateur par défaut : se fie à revalidateOnFocus de SWR
// const RouteRevalidationManager = React.memo(({ children }: { children: React.ReactNode }) => {
//     useRouteRevalidation({ enabled: true, aggressive: false });
//     return <>{children}</>;
// });

/**
 * Fallback component for PostHogErrorBoundary
 * Displayed when a React error occurs
 */
const ErrorFallback = ({ error }: PostHogErrorBoundaryFallbackProps) => {
  const errorMessage = error instanceof Error ? error.message : String(error ?? "Unknown error");

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: 20,
        backgroundColor: theme.color.light.background.primary 
      }}>
        <View style={{ maxWidth: 400, alignItems: 'center' }}>
          <Text style={{ 
            fontSize: 24, 
            fontWeight: 'bold', 
            color: theme.color.primary[600], 
            marginBottom: 16, 
            textAlign: 'center' 
          }}>
            Oups! Une erreur s'est produite
          </Text>
          <Text style={{ 
            fontSize: 16, 
            color: theme.color.light.text.primary, 
            marginBottom: 24, 
            textAlign: 'center', 
            lineHeight: 24 
          }}>
            Nous sommes désolés pour ce désagrément. L'erreur a été signalée et nous travaillons à la corriger.
          </Text>
          
          {__DEV__ && error != null ? (
            <View style={{ 
              width: '100%', 
              padding: 16, 
              backgroundColor: '#f5f5f5', 
              borderRadius: 8, 
              marginBottom: 24 
            }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#d32f2f' }}>
                Détails de l'erreur:
              </Text>
              <Text style={{ fontSize: 12, color: '#d32f2f' }}>
                {errorMessage}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

export function Provider({ children }: { children: React.ReactNode }) {
  const { quizId, attempId } = useLocalSearchParams<{ quizId?: string; attempId?: string }>();

  // Initialize Amplitude
  useEffect(() => {
    // Initialize Amplitude with the API key
    amplitude.init("7487f52aac24f10f8ffd12ff25f4f48a", undefined, {
      serverZone: "EU", // ← OBLIGATOIRE,
      disableCookies: Platform.OS !== "web", // ← RECOMMANDE
    });
  }, []);

  return (
    <PostHogProvider client={posthog}>
      <PostHogErrorBoundary 
        fallback={ErrorFallback}
        additionalProperties={{ 
          screen: 'app',
          timestamp: new Date().toISOString() 
        }}
      >
        <SWRConfig
      value={{
        provider: asyncStorageProvider,
        isVisible: () => true,
        revalidateOnFocus: true,
        revalidateIfStale: true,
        revalidateOnReconnect: true,

        // Keep the cache for a reasonable time
        dedupingInterval: 60000, // 1 minute

        // Don't automatically refresh data
        refreshInterval: 0,

        // Réduire le throttle pour une meilleure réactivité
        focusThrottleInterval: 2000, // 2 secondes (au lieu de 5)

        initFocus(callback) {
          // Sur web, on utilise les événements de visibilité de la page
          if (typeof window !== "undefined" && Platform.OS === "web") {
            const onVisibilityChange = () => {
              if (document.visibilityState === "visible") {
                callback();
              }
            };

            const onFocus = () => {
              callback();
            };

            document.addEventListener("visibilitychange", onVisibilityChange);
            window.addEventListener("focus", onFocus);

            return () => {
              document.removeEventListener(
                "visibilitychange",
                onVisibilityChange
              );
              window.removeEventListener("focus", onFocus);
            };
          }

          // Skip on SSR
          if (typeof window === "undefined") {
            return () => {};
          }

          // Sur native, on utilise AppState
          let appState = AppState.currentState;

          const onAppStateChange = (nextAppState: AppStateStatus) => {
            /* If it's resuming from background or inactive mode to active one */
            if (
              appState.match(/inactive|background/) &&
              nextAppState === "active"
            ) {
              callback();
            }
            appState = nextAppState;
          };

          // Subscribe to the app state change events
          const subscription = AppState.addEventListener(
            "change",
            onAppStateChange
          );

          return () => {
            subscription.remove();
          };
        },
      }}
    >
      <NotificationProvider>
        <AppConfigProvider>
          <AuthDeepLinkHandler />
          <AuthProvider>
            <UserProvider>
              <NavigationProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <UpdatesProvider>
                    <ChatProvider>
                        <QuizProvider
                          quizId={quizId}
                          attemptId={attempId}
                        >
                          <UserActivityTracker />
                          <UpdatesManager />
                          {/* <RouteRevalidationManager> */}
                          <BackHandlerManager>{children}</BackHandlerManager>
                          {/* </RouteRevalidationManager> */}
                        </QuizProvider>
                    </ChatProvider>
                  </UpdatesProvider>
                </GestureHandlerRootView>
              </NavigationProvider>
            </UserProvider>
          </AuthProvider>
        </AppConfigProvider>
      </NotificationProvider>
    </SWRConfig>
      </PostHogErrorBoundary>
    </PostHogProvider>
  );
}
