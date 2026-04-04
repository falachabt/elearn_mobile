import { Redirect } from "expo-router";

import MainOnboarding from "@/components/shared/onboarding/Main";
import { useAuth } from "@/contexts/auth";

const Onboarding = () => {
  const { session } = useAuth();

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return <MainOnboarding />;
};

export default Onboarding;
