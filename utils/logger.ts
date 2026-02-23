/**
 * Utility for conditional logging
 * Only logs in development mode
 * Errors are always logged and sent to PostHog
 */

import { posthog } from '@/lib/posthog';

const isDevelopment = __DEV__;

/**
 * Format log arguments for PostHog
 */
const formatLogMessage = (args: unknown[]): string => {
  return args
    .map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return `${arg.name}: ${arg.message}\n${arg.stack}`;
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    })
    .join(' ');
};

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
    // Send warnings to PostHog in production
    if (!isDevelopment) {
      try {
        posthog.capture('console_warning', {
          message: formatLogMessage(args),
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        // Silent fail to avoid infinite loops
      }
    }
  },
  
  error: (...args: unknown[]) => {
    // Always log errors, even in production
    console.error(...args);
    
    // Send errors to PostHog
    try {
      const errorMessage = formatLogMessage(args);
      const errorObject = args.find(arg => arg instanceof Error) as Error | undefined;
      
      posthog.capture('console_error', {
        message: errorMessage,
        error_name: errorObject?.name,
        error_message: errorObject?.message,
        error_stack: errorObject?.stack,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      // Silent fail to avoid infinite loops
    }
  },
  
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};
