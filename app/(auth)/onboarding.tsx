import { Redirect } from "expo-router";
import { View, useColorScheme } from "react-native";

import MainOnboarding from "@/components/shared/onboarding/Main";
import { LoadingAnimation } from "@/components/shared/LoadingAnimation1";
import { useAuth } from "@/contexts/auth";
import { theme } from "@/constants/theme";

const Onboarding = () => {
  const { session, user, isLoading } = useAuth();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  if (!session) return <Redirect href="/(auth)/login" />;
  if (isLoading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDarkMode ? theme.color.dark.background.primary : theme.color.light.background.primary }}>
      <LoadingAnimation isDarkMode={isDarkMode} />
    </View>
  );
  if (user?.onboarding_done) return <Redirect href="/(app)" />;

  return <MainOnboarding />;
};

export default Onboarding;
