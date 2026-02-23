/**
 * Global error handler for uncaught errors and unhandled promise rejections
 * Sends errors to PostHog for monitoring
 */

import { posthog } from '@/lib/posthog';
import { logger } from '@/utils/logger';

/**
 * Initialize global error handlers
 * Call this early in your app initialization
 */
export const initializeErrorHandlers = () => {
  // Handle uncaught JavaScript errors
  if (ErrorUtils) {
    const defaultHandler = ErrorUtils.getGlobalHandler();
    
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      logger.error('Uncaught error:', error, { isFatal });
      
      // Send to PostHog
      try {
        posthog.capture('uncaught_exception', {
          error_name: error.name,
          error_message: error.message,
          error_stack: error.stack || '',
          is_fatal: isFatal || false,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        logger.error('Failed to send uncaught error to PostHog:', e);
      }
      
      // Call the default handler
      if (defaultHandler) {
        defaultHandler(error, isFatal);
      }
    });
  }

  // Handle unhandled promise rejections
  const rejectionTracker = require('promise/setimmediate/rejection-tracking');
  rejectionTracker.enable({
    allRejections: true,
    onUnhandled: (id: string, error: Error) => {
      logger.error('Unhandled promise rejection:', error);
      
      // Send to PostHog
      try {
        posthog.capture('unhandled_promise_rejection', {
          rejection_id: id,
          error_name: error?.name || 'Unknown',
          error_message: error?.message || String(error),
          error_stack: error?.stack || '',
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        logger.error('Failed to send promise rejection to PostHog:', e);
      }
    },
    onHandled: (id: string) => {
      if (__DEV__) {
        logger.debug('Promise rejection handled:', id);
      }
    },
  });

  logger.info('Global error handlers initialized');
};

/**
 * Manually report an error to PostHog
 * Useful for caught errors that you still want to track
 */
export const reportError = (
  error: Error,
  context?: Record<string, unknown>
) => {
  logger.error('Manual error report:', error, context);
  
  try {
    posthog.capture('manual_error_report', {
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack || '',
      ...context,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    logger.error('Failed to report error to PostHog:', e);
  }
};

/**
 * Track a handled exception with additional context
 * Use this for expected errors that you handle gracefully but still want to monitor
 */
export const trackHandledException = (
  errorMessage: string,
  errorType: string,
  context?: Record<string, unknown>
) => {
  try {
    posthog.capture('handled_exception', {
      error_type: errorType,
      error_message: errorMessage,
      ...context,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    logger.error('Failed to track handled exception:', e);
  }
};
