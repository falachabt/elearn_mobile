import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth";
import { usePathname, useRouter } from "expo-router";

interface RouteGuardContextType {
    isChecking: boolean;
}

const RouteGuardContext = createContext<RouteGuardContextType>({
    isChecking: true,
});

export function RouteGuardProvider({ children }: { children: React.ReactNode }) {
    const { session, user, isLoading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        if (isLoading) {
            setIsChecking(true);
            return;
        }

        // Utilisateur connecté et onboarding terminé
        if (session && user?.onboarding_done) {
            if (!pathname.startsWith("/(app)") && !pathname.includes("/forgot_password")) {
                router.replace("/(app)");
                setIsChecking(false);
                return;
            }
        }

        // Utilisateur connecté mais onboarding non terminé
        if (session && user && !user.onboarding_done && !pathname.includes("/onboarding")) {
            router.replace("/(auth)/onboarding");
            setIsChecking(false);
            return;
        }

        // Utilisateur non connecté
        if (!session && !pathname.startsWith("/(auth)")) {
            router.replace("/(auth)");
            setIsChecking(false);
            return;
        }

        // Pas de redirection nécessaire
        setIsChecking(false);
    }, [session, user?.onboarding_done, pathname, isLoading, router]);

    return (
        <RouteGuardContext.Provider value={{ isChecking }}>
            {children}
        </RouteGuardContext.Provider>
    );
}

export function useRouteGuard() {
    return useContext(RouteGuardContext);
}
