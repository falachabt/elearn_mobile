import { useEffect, useRef } from 'react';
import type { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TourStep, useTourPersistence } from '@wrack/react-native-tour-guide';

import { hasEverTaggedContent } from '@/services/feed.service';
import { SHARE_TO_FEED_TOUR_ID, getTourGuideConfig } from '@/constants/tourGuide';

const RESHOW_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // 1 mois
const STORAGE_KEY = 'share_to_feed_tour_last_shown_at';

interface Options {
  targetRef: React.RefObject<View | null>;
  userId: string | undefined;
  isDarkMode: boolean;
  // Le tour n'est tenté qu'une fois cette condition vraie (données chargées,
  // le bouton "Partager sur le fil" bien monté, etc.).
  ready: boolean;
}

/**
 * Tour "Partager sur le fil" sur les écrans de contenu (exercice, quiz,
 * document...). Contrairement aux autres tours (vus une fois pour toutes),
 * celui-ci se re-déclenche après un mois si l'utilisateur n'a toujours
 * jamais publié de contenu tagué — d'où un tourId suffixé par bucket
 * temporel : la lib de tour ne bloque que la répétition d'un MÊME tourId.
 */
export function useShareToFeedTour({ targetRef, userId, isDarkMode, ready }: Options) {
  const { startTour } = useTourPersistence(AsyncStorage);
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!ready || !userId || attemptedRef.current) return;
    attemptedRef.current = true;

    (async () => {
      try {
        const lastShownRaw = await AsyncStorage.getItem(STORAGE_KEY);
        const lastShown = lastShownRaw ? Number(lastShownRaw) : 0;
        if (Date.now() - lastShown < RESHOW_INTERVAL_MS) return;

        const alreadyTagged = await hasEverTaggedContent(userId);
        if (alreadyTagged) return;

        const bucket = Math.floor(Date.now() / RESHOW_INTERVAL_MS);
        const steps: TourStep[] = [
          {
            id: 'share-to-feed',
            targetRef,
            title: 'Partagez ce contenu sur le fil',
            description:
              "Vous pouvez publier ce cours, cet exercice ou ce document sur le fil pour en discuter avec les autres membres — il sera automatiquement tagué dans le post.",
            targetStyle: { borderRadius: 16 },
            spotlightPadding: 8,
            delayBefore: 400,
          },
        ];

        await startTour(steps, getTourGuideConfig(isDarkMode, `${SHARE_TO_FEED_TOUR_ID}-${bucket}`));
        await AsyncStorage.setItem(STORAGE_KEY, String(Date.now()));
      } catch {
        // silencieux : un tour manqué n'est jamais bloquant
      }
    })();
  }, [ready, userId, targetRef, isDarkMode, startTour]);
}
