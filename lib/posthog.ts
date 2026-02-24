import PostHog from 'posthog-react-native';

import { logger } from '@/utils/logger';

const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;

if (!posthogApiKey) {
  logger.warn('EXPO_PUBLIC_POSTHOG_API_KEY is not set. PostHog analytics will not work correctly.');
}

export const posthog = new PostHog(posthogApiKey ?? '', {
  host: 'https://us.posthog.com',
  captureAppLifecycleEvents: true,
  // Enable session replay for React Native
  enableSessionReplay: true,
  sessionReplayConfig: {
    // Capture network requests in session replay
    maskAllTextInputs: true,
    maskAllImages: false,
    captureNetworkTelemetry: true,
  },
});
