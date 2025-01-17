import MainOnboarding from "@/components/shared/onboarding/Main";
import { useAuth } from "@/contexts/auth";
import { Redirect } from "expo-router";

const Onboarding = () => {
  const { session } = useAuth();

  if (!session) {
    Redirect({ href: "/(auth)" });
  }

  return <MainOnboarding />;
};

export default Onboarding;
