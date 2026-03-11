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
        .from('influencers')
        .select('id, promo_code, discount_percentage, status')
        .eq('promo_code', PromoCodeService.formatPromoCode(code))
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          logger.info(`Promo code not found: ${code}`);
          return null;
        }
        logger.error('Error validating promo code:', error);
        throw error;
      }

      return {
        id: data.id,
        code: data.promo_code ?? PromoCodeService.formatPromoCode(code),
        discount_percentage: data.discount_percentage ?? 0,
        is_active: true,
        created_at: '',
        updated_at: '',
      };
    } catch (error) {
      logger.error('Error in validatePromoCode:', error);
      return null;
    }
  },

  /**
   * Check if user has already used a promo code
   */
  async checkPromoCodeUsage(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('promo_code_id', 'is', null)
        .limit(1);

      if (error) {
        logger.error('Error checking promo code usage:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      logger.error('Error in checkPromoCodeUsage:', error);
      return false;
    }
  },

  /**
   * Validate influencer promo code (for backward compatibility)
   */
  async validateInfluencerPromoCode(code: string): Promise<{
    id: string;
    discount_percentage: number;
    name?: string;
  } | null> {
    if (!code || code.trim().length === 0) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('influencers')
        .select('id, name, promo_code, discount_percentage, valid_until, status')
        .eq('promo_code', code)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        return null;
      }

      const now = new Date();
      const validUntil = data.valid_until ? new Date(data.valid_until) : null;

      if (validUntil && validUntil < now) {
        return null;
      }

      return {
        id: data.id,
        discount_percentage: data.discount_percentage,
        name: data.name,
      };
    } catch (error) {
      logger.error('Error validating influencer promo code:', error);
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
