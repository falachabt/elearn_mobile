import * as amplitude from '@amplitude/analytics-react-native';

import { posthog } from '@/lib/posthog';

type TrackingProperties = Record<string, string | number | boolean>;

/**
 * Track an event in Amplitude and PostHog
 * @param eventName The name of the event to track
 * @param eventProperties Optional properties to include with the event
 */
export const trackEvent = (eventName: string, eventProperties?: TrackingProperties) => {
  try {
    amplitude.track(eventName, eventProperties);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    posthog.capture(eventName, eventProperties as any);
  } catch (error) {
    console.error(`Failed to track event: ${eventName}`, error);
  }
};

/**
 * Set user ID for Amplitude and PostHog tracking
 * @param userId The user ID to set
 */
export const setUserId = (userId: string) => {
  try {
    amplitude.setUserId(userId);
    posthog.identify(userId);
  } catch (error) {
    console.error(`Failed to set user ID: ${userId}`, error);
  }
};

/**
 * Set user properties for Amplitude and PostHog tracking
 * @param userProperties The user properties to set
 */
export const setUserProperties = (userProperties: TrackingProperties) => {
  try {
    const identify = new amplitude.Identify();
    Object.entries(userProperties).forEach(([key, value]) => {
      identify.set(key, value);
    });
    amplitude.identify(identify);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    posthog.setPersonProperties(userProperties as any);
  } catch (error) {
    console.error('Failed to set user properties', error);
  }
};

/**
 * Reset PostHog user on logout
 */
export const resetPostHogUser = () => {
  try {
    posthog.reset();
  } catch (error) {
    console.error('Failed to reset PostHog user', error);
  }
};

/**
 * Track an error with context using PostHog captureException
 * @param error The error to track
 * @param context Additional context about the error
 */
export const trackError = (error: Error, context?: Record<string, string | number | boolean>) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    posthog.captureException(error, context as any);
  } catch (e) {
    console.error('Failed to track error:', e);
  }
};

/**
 * Track an API error
 * @param endpoint The API endpoint that failed
 * @param error The error object
 * @param statusCode Optional HTTP status code
 */
export const trackApiError = (
  endpoint: string,
  error: Error,
  statusCode?: number
) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    posthog.captureException(error, {
      error_type: 'api_error',
      endpoint,
      status_code: statusCode || 0,
    } as any);
  } catch (e) {
    console.error('Failed to track API error:', e);
  }
};

/**
 * Track a data validation error
 * @param field The field that failed validation
 * @param reason Why it failed
 * @param value The invalid value (if safe to log)
 */
export const trackValidationError = (
  field: string,
  reason: string,
  value?: unknown
) => {
  try {
    const error = new Error(`Validation failed for ${field}: ${reason}`);
    error.name = 'ValidationError';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    posthog.captureException(error, {
      field,
      reason,
      value: value !== undefined ? String(value) : '',
    } as any);
  } catch (e) {
    console.error('Failed to track validation error:', e);
  }
};

/**
 * Common events that can be tracked throughout the app
 */
export const Events = {
  // Auth events
  SIGN_UP: 'Sign Up',
  LOGIN: 'Login',
  LOGOUT: 'Logout',

  // Navigation events
  VIEW_SCREEN: 'View Screen',

  // Learning path events
  START_LEARNING_PATH: 'Start Learning Path',
  COMPLETE_LEARNING_PATH: 'Complete Learning Path',

  // Lesson events
  START_LESSON: 'Start Lesson',
  COMPLETE_LESSON: 'Complete Lesson',

  // Video events
  START_VIDEO: 'Start Video',
  COMPLETE_VIDEO: 'Complete Video',
  VIDEO_PROGRESS: 'Video Progress',

  // Exercise events
  START_EXERCISE: 'Start Exercise',
  COMPLETE_EXERCISE: 'Complete Exercise',

  // Quiz events
  START_QUIZ: 'Start Quiz',
  COMPLETE_QUIZ: 'Complete Quiz',

  // E-commerce events
  ADD_TO_CART: 'Add To Cart',
  REMOVE_FROM_CART: 'Remove From Cart',
  PURCHASE: 'Purchase',

  // News events
  CLICK_NEWS_CTA: 'Click News CTA',

  // Search events
  SEARCH: 'Search',

  // Chat events
  CHAT_OPENED: 'Chat Opened',
  MESSAGE_SENT: 'Message Sent',

  // Error events
  ERROR_OCCURRED: 'Error Occurred',
  API_ERROR: 'API Error',
  VALIDATION_ERROR: 'Validation Error',
  PAYMENT_ERROR: 'Payment Error',
  NETWORK_ERROR: 'Network Error',
};
