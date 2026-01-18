/**
 * usePromoCode Hook
 * Handles promo code validation and discount calculations
 */

import { useState, useCallback } from 'react';
import { PromoCode } from '@/types/payment.types';
import { PromoCodeService } from '@/services/promo-code.service';
import { logger } from '@/utils/logger';

interface UsePromoCodeProps {
  originalAmount: number;
  onApply?: (promoCode: PromoCode, discountedAmount: number) => void;
  onClear?: () => void;
}

export const usePromoCode = ({ originalAmount, onApply, onClear }: UsePromoCodeProps) => {
  const [promoCode, setPromoCode] = useState<string>('');
  const [appliedPromoCode, setAppliedPromoCode] = useState<PromoCode | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [discountedAmount, setDiscountedAmount] = useState<number>(originalAmount);

  // Validate and apply promo code
  const validateAndApply = useCallback(async () => {
    if (!promoCode || promoCode.trim().length === 0) {
      setValidationError('Veuillez entrer un code promo');
      return;
    }

    // Check format
    if (!PromoCodeService.isValidFormat(promoCode)) {
      setValidationError('Format de code promo invalide');
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      logger.info('[PromoCode] Validating code:', promoCode);
      
      const validatedCode = await PromoCodeService.validatePromoCode(promoCode);
      
      if (!validatedCode) {
        setValidationError('Code promo invalide ou expiré');
        setIsValidating(false);
        return;
      }

      // Calculate discounted amount
      const newAmount = PromoCodeService.calculateDiscountedAmount(
        originalAmount,
        validatedCode.discount_percentage
      );

      logger.info('[PromoCode] Applied discount:', {
        original: originalAmount,
        discount: validatedCode.discount_percentage,
        final: newAmount,
      });

      setAppliedPromoCode(validatedCode);
      setDiscountedAmount(newAmount);
      setValidationError(null);
      
      onApply?.(validatedCode, newAmount);
    } catch (error) {
      logger.error('[PromoCode] Validation error:', error);
      setValidationError('Erreur lors de la validation du code promo');
    } finally {
      setIsValidating(false);
    }
  }, [promoCode, originalAmount, onApply]);

  // Clear applied promo code
  const clearPromoCode = useCallback(() => {
    logger.info('[PromoCode] Clearing promo code');
    
    setPromoCode('');
    setAppliedPromoCode(null);
    setValidationError(null);
    setDiscountedAmount(originalAmount);
    
    onClear?.();
  }, [originalAmount, onClear]);

  // Update promo code input
  const updatePromoCode = useCallback((code: string) => {
    setPromoCode(code);
    setValidationError(null);
  }, []);

  // Calculate discount amount
  const discountAmount = appliedPromoCode
    ? PromoCodeService.calculateDiscountAmount(originalAmount, appliedPromoCode.discount_percentage)
    : 0;

  // Check if promo code is applied
  const hasPromoCode = appliedPromoCode !== null;

  // Get formatted promo code for display
  const formattedPromoCode = promoCode ? PromoCodeService.formatPromoCode(promoCode) : '';

  return {
    // State
    promoCode,
    appliedPromoCode,
    isValidating,
    validationError,
    discountedAmount,
    discountAmount,
    hasPromoCode,
    formattedPromoCode,
    
    // Actions
    updatePromoCode,
    validateAndApply,
    clearPromoCode,
  };
};
