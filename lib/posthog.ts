import PostHog from "posthog-react-native";

import { logger } from "@/utils/logger";

const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;

if (!posthogApiKey) {
  logger.warn(
    "EXPO_PUBLIC_POSTHOG_API_KEY is not set. PostHog analytics will not work correctly.",
  );
}

export const posthog = new PostHog(posthogApiKey ?? "", {
  host: "https://us.i.posthog.com",
  captureAppLifecycleEvents: true,
  // Enable session replay for React Native
  enableSessionReplay: true,

  sessionReplayConfig: {
    // Whether text inputs are masked. Default is true.
    // Password inputs are always masked regardless
    maskAllTextInputs: true,
    maskAllImages: false,
    captureLog: true,

    // Whether network requests are captured in recordings. Default is true
    // Only metric-like data like speed, size, and response code are captured.
    // No data is captured from the request or response body.
    // iOS only
    captureNetworkTelemetry: true,

    // Throttling delay used to reduce the number of snapshots captured
    // and reduce performance impact. Default is 1000ms
    throttleDelayMs: 1000,
  },
  // Enable automatic error tracking (no console logs as events)
  errorTracking: {
    autocapture: {
      uncaughtExceptions: true,
      unhandledRejections: true,
      // Do NOT capture console logs as events
      console: [],
    },
  },
});
