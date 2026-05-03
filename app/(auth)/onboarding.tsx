import { Redirect } from "expo-router";

import MainOnboarding from "@/components/shared/onboarding/Main";
import { useAuth } from "@/contexts/auth";

const Onboarding = () => {
  const { session, user } = useAuth();

  if (!session) return <Redirect href="/(auth)/login" />;
  if (user?.onboarding_done) return <Redirect href="/(app)" />;

  return <MainOnboarding />;
};

export default Onboarding;
