// src/providers/index.tsx
import { AuthProvider } from "@/contexts/auth";
import { ConfigProvider } from "antd-mobile";
import { AppState, AppStateStatus } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SWRConfig } from "swr";

export function Provider({ children }: { children: React.ReactNode }) {
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
              console.log(appState, nextAppState)
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
          <GestureHandlerRootView>{children}</GestureHandlerRootView>
        </AuthProvider>
      </SWRConfig>
    </ConfigProvider>
  );
}
