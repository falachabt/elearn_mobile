import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TourStep, useTourPersistence } from '@wrack/react-native-tour-guide';

import { SEARCH_FEATURE_TOUR_ID, getTourGuideConfig } from '@/constants/tourGuide';
import { Events, trackEvent } from '@/utils/analytics';
import type { FloatingSearchBarHandle } from '@/components/shared/FloatingSearchBar';

const DEMO_QUERY = 'nombre premier';

interface Options {
  barRef: React.RefObject<FloatingSearchBarHandle | null>;
  userId: string | undefined;
  isDarkMode: boolean;
  // Le tour n'est tenté que si la barre est effectivement rendue (flag ON).
  enabled: boolean;
}

/**
 * Tour "search anything" sur la pastille flottante — fait la démo en vrai :
 * ouvre la barre, tape une requête de démo, montre les résultats, bascule en
 * mode "explication IA" et montre le résultat, referme. Piloté via
 * FloatingSearchBarHandle plutôt qu'un simple spotlight statique.
 *
 * Chaque step a un vrai targetRef (barRef.current.barNodeRef, la pastille/
 * barre elle-même) — un step sans targetRef a fait planter la lib de tour au
 * démarrage la première fois (cas jamais exercé par les autres tours de ce
 * code base, qui utilisent tous un vrai targetRef).
 */
export function useSearchFeatureTour({ barRef, userId, isDarkMode, enabled }: Options) {
  const { startTour } = useTourPersistence(AsyncStorage);
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !userId || attemptedRef.current || !barRef.current) return;
    attemptedRef.current = true;

    const target = barRef.current.barNodeRef;

    const steps: TourStep[] = [
      {
        id: 'intro',
        targetRef: target,
        title: 'Ton assistant de recherche',
        description:
          "Cette pastille reste accessible sur toutes les pages. Appuie dessus pour trouver un cours, un exercice, un quiz, un document ou une classe en quelques mots.",
        spotlightPadding: 8,
        delayBefore: 400,
      },
      {
        id: 'open',
        targetRef: target,
        title: "Elle s'étire comme le Dynamic Island",
        description: "Un tap et elle s'ouvre en largeur pour devenir une vraie barre de recherche.",
        spotlightPadding: 8,
        delayBefore: 500,
      },
      {
        id: 'typing',
        targetRef: target,
        title: 'Tape ta recherche',
        description:
          'Par défaut, une IA résume les résultats trouvés en 2-3 phrases — ici pour "nombre premier", elle explique pourquoi le dénombrement apparaît.',
        spotlightPadding: 8,
        delayBefore: 900,
      },
      {
        id: 'mode',
        targetRef: target,
        title: 'Mode liste simple',
        description: "Ce bouton bascule vers une liste brute triée par pertinence, sans l'explication IA.",
        spotlightPadding: 8,
        delayBefore: 1200,
      },
      {
        id: 'done',
        targetRef: target,
        title: 'Et voilà',
        description: "Retrouve la même recherche en plein écran depuis l'icône en haut de l'écran.",
        spotlightPadding: 8,
        delayBefore: 900,
      },
    ];

    trackEvent(Events.TOUR_STARTED, { tour_id: SEARCH_FEATURE_TOUR_ID });

    void startTour(
      steps,
      getTourGuideConfig(isDarkMode, SEARCH_FEATURE_TOUR_ID, {
        onStepChange: (_from, toIndex) => {
          switch (toIndex) {
            case 1:
              barRef.current?.demoOpen();
              break;
            case 2:
              barRef.current?.demoSetQuery(DEMO_QUERY);
              break;
            case 3:
              barRef.current?.demoSetMode('results');
              break;
            case 4:
              barRef.current?.demoClose();
              break;
            default:
              break;
          }
        },
        onTourEnd: () => {
          barRef.current?.demoClose();
        },
      })
    );
  }, [enabled, userId, isDarkMode, barRef, startTour]);
}
