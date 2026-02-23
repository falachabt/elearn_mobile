import * as amplitude from '@amplitude/analytics-react-native';

import { reportError, trackHandledException } from './errorHandler';

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
 * Track an error with context
 * Helper function that wraps reportError for easier use
 * @param error The error to track
 * @param context Additional context about the error
 */
export const trackError = (error: Error, context?: Record<string, unknown>) => {
  reportError(error, context);
};

/**
 * Track a handled exception
 * Use this for expected errors that are handled gracefully
 * @param message Description of what went wrong
 * @param errorType Category/type of the error
 * @param context Additional context
 */
export const trackException = (
  message: string,
  errorType: string,
  context?: Record<string, unknown>
) => {
  trackHandledException(message, errorType, context);
};

/**
 * Track an API error
 * Specialized function for tracking API/network errors
 * @param endpoint The API endpoint that failed
 * @param error The error object
 * @param statusCode Optional HTTP status code
 */
export const trackApiError = (
  endpoint: string,
  error: Error,
  statusCode?: number
) => {
  reportError(error, {
    error_type: 'api_error',
    endpoint,
    status_code: statusCode,
  });
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
  trackHandledException(
    `Validation failed for ${field}: ${reason}`,
    'ValidationError',
    {
      field,
      reason,
      value: value !== undefined ? String(value) : undefined,
    }
  );
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
