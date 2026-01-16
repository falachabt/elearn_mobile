import { useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';
import { useSWRConfig } from 'swr';

interface RouteRevalidationOptions {
  enabled?: boolean;
  aggressive?: boolean; // Si true, revalide TOUTES les clés. Si false, revalide uniquement les clés avec revalidateOnFocus
}

/**
 * Hook personnalisé qui force la revalidation SWR quand on change de route
 * Résout le problème où Expo Router ne démonte pas les pages lors de la navigation
 */
export function useRouteRevalidation(options?: RouteRevalidationOptions) {
  const pathname = usePathname();
  const { mutate, cache } = useSWRConfig();
  const previousPathRef = useRef<string | null>(null);
  const lastRevalidationRef = useRef<number>(0);
  const enabled = options?.enabled ?? true;
  const aggressive = options?.aggressive ?? false; // Par défaut, mode conservateur

  useEffect(() => {
    // Skip si désactivé (ex: pendant l'authentification)
    if (!enabled) {
      return;
    }

    // Ne pas revalider sur les routes d'authentification
    const isAuthRoute = pathname.includes('/(auth)') || pathname === '/auth' || pathname.includes('/onboarding');
    if (isAuthRoute) {
      previousPathRef.current = pathname;
      return;
    }

    // Si c'est la première visite de la page, pas besoin de revalider
    if (previousPathRef.current === null) {
      previousPathRef.current = pathname;
      return;
    }

    // Si on revient sur une page qu'on avait déjà visitée
    if (previousPathRef.current !== pathname) {
      const now = Date.now();
      // Throttle: ne revalide pas plus d'une fois toutes les 2 secondes
      const THROTTLE_MS = 2000;

      if (now - lastRevalidationRef.current > THROTTLE_MS) {
        console.log(`[SWR] Route change detected: ${previousPathRef.current} → ${pathname}`);
        
        if (aggressive) {
          // Mode agressif : Revalide TOUTES les clés
          console.log(`[SWR] Aggressive revalidation: all keys`);
          mutate(
            () => true, // Matcher: revalide toutes les clés
            undefined,
            { revalidate: true }
          );
        } else {
          // Mode conservateur : Ne force pas la revalidation
          // Laisse SWR gérer naturellement avec revalidateOnFocus
          console.log(`[SWR] Conservative mode: relying on revalidateOnFocus`);
        }

        lastRevalidationRef.current = now;
      }

      previousPathRef.current = pathname;
    }
  }, [pathname, mutate, cache, enabled, aggressive]);
}

/**
 * Hook pour revalider une clé SWR spécifique quand on revient sur la page
 * Utilise le focus de la page plutôt que le changement de route global
 */
export function usePageFocusRevalidation(swrKey: string | string[] | null | undefined) {
  const pathname = usePathname();
  const { mutate } = useSWRConfig();
  const isFirstRenderRef = useRef(true);
  const previousPathRef = useRef<string>(pathname);

  useEffect(() => {
    // Skip first render
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      previousPathRef.current = pathname;
      return;
    }

    // Si on revient sur cette page après avoir été ailleurs
    if (previousPathRef.current !== pathname && swrKey) {
      console.log(`[SWR] Revalidating key on page focus:`, swrKey);
      mutate(swrKey, undefined, { revalidate: true });
    }

    previousPathRef.current = pathname;
  }, [pathname, swrKey, mutate]);
}
