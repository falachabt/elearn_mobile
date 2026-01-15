import { useAppConfig } from '@/contexts/useAppConfig';

/**
 * Centralized pricing utility for the application
 * This file contains all pricing constants and logic used across the application
 */

// Type definitions for pricing plans
export type PricingPlanId = 'essential' | 'advantage' | 'excellence';

export type PricingPlan = {
  id: PricingPlanId;
  name: string;
  description: string;
  color: string;
  threshold: number;
  price?: number;
  basePrice?: number;
  additionalPrice?: number;
  recommended?: boolean;
};

export type NextFormula = {
  formula: PricingPlan;
  itemsNeeded: number;
};

/**
 * Hook to get pricing configuration from app config
 */
export const usePricing = () => {
  const { getPricingConfig } = useAppConfig();
  const config = getPricingConfig();

  const PRICING_PLANS: PricingPlan[] = [
    {
      id: 'essential',
      name: config.plans.essential.name,
      description: config.plans.essential.description,
      basePrice: config.plans.essential.base_price,
      additionalPrice: config.plans.essential.additional_price,
      threshold: config.plans.essential.threshold,
      color: config.plans.essential.color
    },
    {
      id: 'advantage',
      name: config.plans.advantage.name,
      description: config.plans.advantage.description,
      price: config.plans.advantage.price,
      threshold: config.plans.advantage.threshold,
      color: config.plans.advantage.color,
      recommended: config.plans.advantage.recommended
    },
    {
      id: 'excellence',
      name: config.plans.excellence.name,
      description: config.plans.excellence.description,
      price: config.plans.excellence.price,
      threshold: config.plans.excellence.threshold,
      color: config.plans.excellence.color
    }
  ];

  return {
    GENEROUS_WEEK_PRICE: config.generous_week_price,
    REGULAR_FIRST_COURSE_PRICE: config.regular_first_course_price,
    ADDITIONAL_COURSE_PRICE: config.additional_course_price,
    FIXED_PRICE: config.fixed_price,
    PURCHASE_VALIDITY_DAYS: config.purchase_validity_days,
    PRICING_PLANS,
  };
};

/**
 * Determines if the fixed price mode is active based on user enrollments
 */
export const isFixedPriceModeActive = (userEnrollmentsCount: number): boolean => {
  return userEnrollmentsCount > 0;
};

/**
 * Gets the applicable pricing formula based on the number of items in the cart
 */
export const getApplicableFormula = (
  itemCount: number, 
  isFixedPriceMode: boolean,
  pricingPlans: PricingPlan[]
): PricingPlan | null => {
  if (isFixedPriceMode) return null;

  if (itemCount >= 5) {
    return pricingPlans.find(plan => plan.id === 'excellence') || null;
  } else if (itemCount === 3) {
    return pricingPlans.find(plan => plan.id === 'advantage') || null;
  } else if (itemCount > 0) {
    return pricingPlans.find(plan => plan.id === 'essential') || null;
  }

  return null;
};

/**
 * Gets the next possible formula based on the current number of items in the cart
 */
export const getNextPossibleFormula = (
  itemCount: number, 
  isFixedPriceMode: boolean,
  pricingPlans: PricingPlan[]
): NextFormula | null => {
  if (isFixedPriceMode) return null;
  if (itemCount === 0) return null;

  if (itemCount === 2) {
    const advantageFormula = pricingPlans.find(plan => plan.id === 'advantage');
    if (advantageFormula) {
      return { formula: advantageFormula, itemsNeeded: 1 };
    }
  } else if (itemCount === 4) {
    const excellenceFormula = pricingPlans.find(plan => plan.id === 'excellence');
    if (excellenceFormula) {
      return { formula: excellenceFormula, itemsNeeded: 1 };
    }
  }

  return null;
};

/**
 * Calculates the total price based on the applicable formula or fixed price mode
 */
export const calculateDiscountedTotal = (
  itemCount: number, 
  regularTotal: number, 
  isFixedPriceMode: boolean,
  isGenerousWeekActive: boolean,
  generousWeekPrice: number,
  fixedPrice: number,
  pricingPlans: PricingPlan[]
): number => {
  if (itemCount === 0) return 0;

  if (isGenerousWeekActive) {
    return itemCount * generousWeekPrice;
  }

  if (isFixedPriceMode) {
    return itemCount * fixedPrice;
  }

  const applicableFormula = getApplicableFormula(itemCount, isFixedPriceMode, pricingPlans);

  if (!applicableFormula) return regularTotal;

  switch (applicableFormula.id) {
    case 'excellence':
      return applicableFormula.price || 0;
    case 'advantage':
      if (itemCount === 3) {
        return applicableFormula.price || 0;
      } else {
        const essentialFormula = pricingPlans.find(plan => plan.id === 'essential');
        if (!essentialFormula) return regularTotal;
        const firstCoursePrice = essentialFormula.basePrice || 0;
        const additionalCoursesPrice = (itemCount - 1) * (essentialFormula.additionalPrice || 0);
        return firstCoursePrice + additionalCoursesPrice;
      }
    case 'essential':
      const firstCoursePrice = applicableFormula.basePrice || 0;
      const additionalCoursesPrice = (itemCount - 1) * (applicableFormula.additionalPrice || 0);
      return firstCoursePrice + additionalCoursesPrice;
    default:
      return regularTotal;
  }
};

/**
 * Gets the display price for an item
 */
export const getDisplayPrice = (
  itemPrice: number, 
  isFixedPriceMode: boolean, 
  isGenerousWeekActive: boolean,
  generousWeekPrice: number,
  fixedPrice: number
): number => {
  if (isGenerousWeekActive) {
    return generousWeekPrice;
  }
  return isFixedPriceMode ? fixedPrice : fixedPrice;
};
