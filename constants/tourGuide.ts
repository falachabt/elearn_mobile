import type { TourGuideConfig } from "@wrack/react-native-tour-guide";

import { theme } from "@/constants/theme";

export const EXERCISE_DETAIL_TOUR_ID = "secondary-exercise-detail-v1";
export const HOME_MENU_TOUR_ID = "home-menu-tour-v2";
export const FEED_POST_INTRO_TOUR_ID = "feed-post-intro-v1";
export const CREATE_POST_FEATURES_TOUR_ID = "create-post-features-v2";
export const SEARCH_FEATURE_TOUR_ID = "search-feature-tour-v3";
export const FEED_COMMENTS_TOUR_ID = "feed-comments-tour-v1";
// Base id du tour "Partager sur le fil" (écrans de contenu) — suffixé d'un
// bucket temporel par useShareToFeedTour pour pouvoir le re-déclencher après
// un mois si l'utilisateur n'a toujours jamais tagué de contenu.
export const SHARE_TO_FEED_TOUR_ID = "share-to-feed-tour";

export function getTourGuideConfig(
  isDarkMode: boolean,
  tourId = EXERCISE_DETAIL_TOUR_ID,
  overrides?: Partial<TourGuideConfig>,
): TourGuideConfig {
  return {
    tourId,
    autoPositionTooltip: true,
    showProgressDots: true,
    showStepCounter: true,
    enableBackButton: true,
    defaultBackdropBehavior: "next",
    tooltipWidth: 300,
    animationDuration: 220,
    nextButtonText: "Suivant",
    prevButtonText: "Retour",
    skipButtonText: "Passer",
    doneButtonText: "Compris",
    tooltipStyles: {
      backgroundColor: isDarkMode ? "#0F172A" : "#FFFFFF",
      borderRadius: 18,
      titleColor: isDarkMode ? "#F8FAFC" : "#0F172A",
      descriptionColor: isDarkMode ? "#CBD5E1" : "#334155",
      buttonTextColor: "#FFFFFF",
      primaryButtonColor: theme.color.primary[500],
      secondaryButtonColor: isDarkMode ? "#1E293B" : "#E2E8F0",
      skipButtonColor: isDarkMode ? "#CBD5E1" : "#475569",
    },
    spotlightStyles: {
      overlayColor: isDarkMode ? "#020617" : "#0F172A",
      overlayOpacity: isDarkMode ? 0.78 : 0.68,
      enablePulse: true,
      pulseColor: theme.color.primary[500],
      pulseWidth: 3,
      pulseDuration: 1400,
      pulseMinOpacity: 0.35,
      pulseMaxOpacity: 0.85,
    },
    ...overrides,
  };
}
