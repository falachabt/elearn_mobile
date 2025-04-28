import {AuthProvider} from "@/contexts/auth";
import {ConfigProvider} from "antd-mobile";
import {AppState, AppStateStatus, BackHandler, ToastAndroid} from "react-native";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import {SWRConfig} from "swr";
import {useEffect, useRef, useState} from "react";
import {useLocalSearchParams, useRouter} from "expo-router";
import {QuizProvider} from "@/contexts/quizContext";
import {UserProvider} from "@/contexts/useUserInfo";
import UserActivityTracker from "@/components/shared/UserActivity";
import {HapticType, useHaptics} from "@/hooks/useHaptics";
import AuthDeepLinkHandler from "@/components/shared/DeepLinkHandler";
import {NotificationProvider} from "@/contexts/NotificationContext";
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Create a provider function that returns a Cache instance compatible with SWR
function asyncStorageProvider() {
  const SWR_CACHE_PREFIX = 'swr-cache:';
  const map = new Map<string, any>();
  let initialized = false;
  let initializing = false;
  let initPromise: Promise<void> | null = null;

  // Initialize cache from AsyncStorage
  const initCache = async () => {
    if (initialized || initializing) return initPromise;

    initializing = true;
    initPromise = (async () => {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const swrKeys = keys.filter(key => key.startsWith(SWR_CACHE_PREFIX));

        if (swrKeys.length > 0) {
          const items = await AsyncStorage.multiGet(swrKeys);

          items.forEach(([key, value]) => {
            if (value) {
              try {
                const parsedValue = JSON.parse(value);
                map.set(key.substring(SWR_CACHE_PREFIX.length), parsedValue);
              } catch (parseError) {
                console.error('Error parsing cached value:', parseError);
              }
            }
          });
        }
        initialized = true;
      } catch (error) {
        console.error('Error initializing SWR cache from AsyncStorage:', error);
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

    set(key: string, value: any) {
      map.set(key, value);

      // Asynchronously persist to AsyncStorage
      // We don't await this to avoid blocking
      (async () => {
        try {
          await AsyncStorage.setItem(`${SWR_CACHE_PREFIX}${key}`, JSON.stringify(value));
        } catch (error) {
          console.error('Error setting SWR cache in AsyncStorage:', error);
        }
      })();
    },

    delete(key: string) {
      map.delete(key);

      // Asynchronously remove from AsyncStorage
      // We don't await this to avoid blocking
      (async () => {
        try {
          await AsyncStorage.removeItem(`${SWR_CACHE_PREFIX}${key}`);
        } catch (error) {
          console.error('Error deleting SWR cache from AsyncStorage:', error);
        }
      })();
    }
  };
}

export function Provider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { quizId, attempId } = useLocalSearchParams();
  const { trigger } = useHaptics();
  const [exitAppCount, setExitAppCount] = useState(0);
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [lastUsedMessageIndex, setLastUsedMessageIndex] = useState(-1);
  const lastExitTimeRef = useRef<number>(0);

  // Listen for app state changes to track when app returns from background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App has come to the foreground
        console.log('App has returned to the foreground');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
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

          // Current time to check if we should always show a message
          const currentTime = Date.now();
          const timeSinceLastExit = currentTime - lastExitTimeRef.current;
          const showMessageAnyway = timeSinceLastExit > 30000; // 30 seconds

          // Get random motivational message (different from the last one if possible)
          let randomIndex;
          do {
            randomIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
          } while (randomIndex === lastUsedMessageIndex && MOTIVATIONAL_MESSAGES.length > 1);

          setLastUsedMessageIndex(randomIndex);
          const message = MOTIVATIONAL_MESSAGES[randomIndex];

          // Always show a toast with the message
          ToastAndroid.showWithGravity(
              `${message}\n\nAppuyez à nouveau pour quitter`,
              ToastAndroid.LONG,
              ToastAndroid.CENTER,
          );

          // Reset the exit counter after 2 seconds
          exitTimerRef.current = setTimeout(() => {
            setExitAppCount(0);
          }, 2000);

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
        console.error("Erreur lors de l'exécution de backAction:", error);
        return false;
      }
    };

    BackHandler.addEventListener("hardwareBackPress", backAction);

    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }
      BackHandler.removeEventListener("hardwareBackPress", backAction);
    };
  }, [router, exitAppCount, trigger]);

  return (
      <ConfigProvider>
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

              // Throttle focus revalidations
              focusThrottleInterval: 5000, // 5 seconds

              initFocus(callback) {
                let appState = AppState.currentState;

                const onAppStateChange = (nextAppState: AppStateStatus) => {
                  /* If it's resuming from background or inactive mode to active one */
                  console.log(appState, nextAppState);
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
            <AuthDeepLinkHandler />
            <AuthProvider>
              <UserProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <QuizProvider quizId={String(quizId)} attemptId={String(attempId)}>
                    <UserActivityTracker/>
                    {children}
                  </QuizProvider>
                </GestureHandlerRootView>
              </UserProvider>
            </AuthProvider>
          </NotificationProvider>
        </SWRConfig>
      </ConfigProvider>
  );
}