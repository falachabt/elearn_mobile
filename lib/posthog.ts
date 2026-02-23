import PostHog from 'posthog-react-native';

const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY as string;

export const posthog = new PostHog(posthogApiKey, {
  host: 'https://eu.i.posthog.com',
  captureAppLifecycleEvents: true,
});
