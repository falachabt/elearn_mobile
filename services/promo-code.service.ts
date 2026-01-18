/**
 * Promo Code Service
 * Handles promo code validation and discount calculations
 */

import { supabase } from '@/lib/supabase';
import { PromoCode } from '@/types/payment.types';
import { logger } from '@/utils/logger';

export const PromoCodeService = {
  /**
   * Validate a promo code and return its details
   */
  async validatePromoCode(code: string): Promise<PromoCode | null> {
    if (!code || code.trim().length === 0) {
      logger.warn('PromoCodeService: Empty promo code provided');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code.trim().toUpperCase())
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          logger.info(`Promo code not found: ${code}`);
          return null;
        }
        logger.error('Error validating promo code:', error);
        throw error;
      }

      return data as PromoCode;
    } catch (error) {
      logger.error('Error in validatePromoCode:', error);
      return null;
    }
  },

  /**
   * Calculate the discounted amount based on promo code
   */
  calculateDiscountedAmount(originalAmount: number, discountPercentage: number): number {
    if (originalAmount <= 0 || discountPercentage <= 0 || discountPercentage > 100) {
      return originalAmount;
    }

    const discount = (originalAmount * discountPercentage) / 100;
    const discountedAmount = originalAmount - discount;

    // Return rounded amount
    return Math.max(0, Math.round(discountedAmount));
  },

  /**
   * Calculate discount amount (not the final price)
   */
  calculateDiscountAmount(originalAmount: number, discountPercentage: number): number {
    if (originalAmount <= 0 || discountPercentage <= 0 || discountPercentage > 100) {
      return 0;
    }

    return Math.round((originalAmount * discountPercentage) / 100);
  },

  /**
   * Format promo code for display
   */
  formatPromoCode(code: string): string {
    return code.trim().toUpperCase();
  },

  /**
   * Check if promo code is valid (basic format check)
   */
  isValidFormat(code: string): boolean {
    if (!code || code.trim().length === 0) {
      return false;
    }

    // Basic format: 3-20 alphanumeric characters
    const formatted = code.trim();
    return /^[A-Z0-9]{3,20}$/i.test(formatted);
  },
};
