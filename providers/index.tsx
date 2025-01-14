// src/providers/index.tsx
import { theme } from "@/constants/theme";
import { AuthProvider } from "@/contexts/auth";
import { ConfigProvider } from "antd-mobile";
import enUS from "antd-mobile/es/locales/en-US";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider>
      <AuthProvider>
        <GestureHandlerRootView>{children}</GestureHandlerRootView>
      </AuthProvider>
    </ConfigProvider>
  );
}
