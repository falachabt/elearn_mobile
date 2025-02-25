// src/providers/index.tsx
import {AuthProvider} from "@/contexts/auth";
import {ConfigProvider} from "antd-mobile";
import {AppState, AppStateStatus, BackHandler} from "react-native";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import {SWRConfig} from "swr";
import {useEffect} from "react";
import {useLocalSearchParams, useRouter} from "expo-router";
import {QuizProvider} from "@/contexts/quizContext";
import {UserProvider} from "@/contexts/useUserInfo";
import UserActivityTracker from "@/components/shared/UserActivity";
import {HapticType, useHaptics} from "@/hooks/useHaptics";

export function Provider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { quizId, attempId } = useLocalSearchParams();
  const { trigger } = useHaptics();

  useEffect(() => {
    const backAction = () => {
      console.log("backAction");
        trigger(HapticType.LIGHT);
      // Intercept the back button press and navigate using the Expo Router
      router.back();
      return true; // Return true to prevent the default behavior
    };

    BackHandler.addEventListener("hardwareBackPress", backAction);

    return () => {
      BackHandler.removeEventListener("hardwareBackPress", backAction);
    };
  }, [router]);

  return (
    <ConfigProvider>
      <SWRConfig
        value={{
          provider: () => new Map(),
          isVisible: () => {
            return true;
          },
          
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
        <AuthProvider>
          <UserProvider>
          <GestureHandlerRootView>
          <QuizProvider quizId={String(quizId)} attemptId={String(attempId)} >
            <UserActivityTracker/> 
            {children}
              </QuizProvider> 
            </GestureHandlerRootView>
            </UserProvider> 
        </AuthProvider>
      </SWRConfig>
    </ConfigProvider>
  );
}
