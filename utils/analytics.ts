import * as amplitude from '@amplitude/analytics-react-native';

/**
 * Track an event in Amplitude
 * @param eventName The name of the event to track
 * @param eventProperties Optional properties to include with the event
 */
export const trackEvent = (eventName: string, eventProperties?: Record<string, any>) => {
  try {
    amplitude.track(eventName, eventProperties);
  } catch (error) {
    console.error(`Failed to track event: ${eventName}`, error);
  }
};

/**
 * Set user ID for Amplitude tracking
 * @param userId The user ID to set
 */
export const setUserId = (userId: string) => {
  try {
    amplitude.setUserId(userId);
  } catch (error) {
    console.error(`Failed to set user ID: ${userId}`, error);
  }
};

/**
 * Set user properties for Amplitude tracking
 * @param userProperties The user properties to set
 */
export const setUserProperties = (userProperties: Record<string, any>) => {
  try {
    amplitude.identify(new amplitude.Identify().setUserProperties(userProperties));
  } catch (error) {
    console.error('Failed to set user properties', error);
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
};
