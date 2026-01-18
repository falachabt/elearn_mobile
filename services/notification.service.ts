/**
 * Notification Service
 * Manages session storage for payment notification tracking
 */

import { STORAGE_KEYS } from '@/constants/payment.constants';
import { logger } from '@/utils/logger';

type NotificationType = 'success' | 'failed';

export const NotificationService = {
  /**
   * Mark a payment notification as viewed
   */
  markAsViewed(paymentId: string, type: NotificationType): void {
    if (typeof window === 'undefined') {
      logger.warn('NotificationService: window is undefined, skipping markAsViewed');
      return;
    }

    try {
      const key = `${STORAGE_KEYS.PAYMENT_NOTIFICATION_PREFIX}${paymentId}_${type}`;
      sessionStorage.setItem(key, 'viewed');
      logger.debug(`Marked notification as viewed: ${key}`);
    } catch (error) {
      logger.error('Error marking notification as viewed:', error);
    }
  },

  /**
   * Check if a payment notification has been viewed
   */
  hasBeenViewed(paymentId: string, type: NotificationType): boolean {
    if (typeof window === 'undefined') {
      logger.warn('NotificationService: window is undefined, assuming not viewed');
      return false;
    }

    try {
      const key = `${STORAGE_KEYS.PAYMENT_NOTIFICATION_PREFIX}${paymentId}_${type}`;
      return sessionStorage.getItem(key) === 'viewed';
    } catch (error) {
      logger.error('Error checking if notification has been viewed:', error);
      return false;
    }
  },

  /**
   * Clear notification tracking for a specific payment
   */
  clearForPayment(paymentId: string): void {
    if (typeof window === 'undefined') {
      logger.warn('NotificationService: window is undefined, skipping clearForPayment');
      return;
    }

    try {
      const successKey = `${STORAGE_KEYS.PAYMENT_NOTIFICATION_PREFIX}${paymentId}_success`;
      const failedKey = `${STORAGE_KEYS.PAYMENT_NOTIFICATION_PREFIX}${paymentId}_failed`;
      
      sessionStorage.removeItem(successKey);
      sessionStorage.removeItem(failedKey);
      
      logger.debug(`Cleared notifications for payment: ${paymentId}`);
    } catch (error) {
      logger.error('Error clearing notification for payment:', error);
    }
  },

  /**
   * Clear all payment notification tracking
   */
  clearAll(): void {
    if (typeof window === 'undefined') {
      logger.warn('NotificationService: window is undefined, skipping clearAll');
      return;
    }

    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(STORAGE_KEYS.PAYMENT_NOTIFICATION_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach((key) => sessionStorage.removeItem(key));
      
      logger.debug(`Cleared ${keysToRemove.length} payment notifications`);
    } catch (error) {
      logger.error('Error clearing all notifications:', error);
    }
  },
};
