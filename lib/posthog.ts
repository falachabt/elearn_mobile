import PostHog from 'posthog-react-native';
import { logger } from '@/utils/logger';

const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;

if (!posthogApiKey) {
  logger.warn('EXPO_PUBLIC_POSTHOG_API_KEY is not set. PostHog analytics will not work correctly.');
}

export const posthog = new PostHog(posthogApiKey ?? '', {
  host: 'https://eu.i.posthog.com',
  captureAppLifecycleEvents: true,
});
