/**
 * Program Utility Service
 * Helper functions for program-related operations
 */

import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

export const ProgramUtilsService = {
  /**
   * Convert learning path ID (pdId) to program ID
   */
  async getProgramIdFromPdId(pdId: string | undefined): Promise<string | null> {
    if (!pdId) {
      logger.warn('ProgramUtilsService: pdId is undefined');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('concours_learningpaths')
        .select('id')
        .eq('learningPathId', pdId)
        .single();

      if (error) {
        logger.error('Error fetching program ID:', error);
        return null;
      }

      if (!data || !data.id) {
        logger.error('No program found for pdId:', pdId);
        return null;
      }

      // Convert id to string if it's a number
      const id = typeof data.id === 'number' ? String(data.id) : data.id;
      return typeof id === 'string' ? id : null;
    } catch (error) {
      logger.error('Error in getProgramIdFromPdId:', error);
      return null;
    }
  },

  /**
   * Get the latest payment timestamp from a payment object
   */
  getLatestPaymentTimestamp(payment: any | null): Date | null {
    if (!payment) return null;
    
    if (payment.updated_at) {
      return new Date(payment.updated_at);
    }
    
    if (payment.created_at) {
      return new Date(payment.created_at);
    }
    
    return null;
  },

  /**
   * Check if a timestamp is older than X minutes
   */
  isOlderThanMinutes(timestamp: Date | null, minutes: number): boolean {
    if (!timestamp) return true;
    
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    return diff > minutes * 60 * 1000;
  },

  /**
   * Check if access has expired
   */
  isAccessExpired(expiryDate: string | null | undefined): boolean {
    if (!expiryDate) return true;
    
    try {
      const expiry = new Date(expiryDate);
      const now = new Date();
      return now > expiry;
    } catch (error) {
      logger.error('Error checking access expiry:', error);
      return true;
    }
  },
};
