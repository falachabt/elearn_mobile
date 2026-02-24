/**
 * Utility for conditional logging
 * Only logs in development mode
 * Does NOT send logs to PostHog as events
 * Use posthog.captureException() directly for error tracking
 */

const isDevelopment = __DEV__;

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
  },
  
  error: (...args: unknown[]) => {
    if (isDevelopment) {
      // En dev, console.error pour avoir le stack trace complet
      console.error(...args);
    } else {
      // En prod, console.warn pour éviter de déclencher le reactConsoleErrorHandler
      // de la nouvelle architecture React Native (qui provoque des error boundaries)
      console.warn('[ERROR]', ...args);
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
