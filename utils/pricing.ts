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

 * Default validity period in days for purchased programs.

 * Used as a fallback when dynamic config is not available (e.g. in services).

 */

export const PURCHASE_VALIDITY_DAYS = 300;



/**

 * Hook to get pricing configuration from app config

 */

export const usePricing = () => {

  const { getPricingConfig, isLoading } = useAppConfig();

  const config = getPricingConfig();



  // Valeurs par défaut si la configuration n'est pas encore chargée

  const DEFAULT_CONFIG = {

    generous_week_price: 10000,

    regular_first_course_price: 15000,

    additional_course_price: 5000,

    fixed_price: 10000,

    purchase_validity_days: PURCHASE_VALIDITY_DAYS,

    plans: {

      essential: {

        name: 'Essential',

        description: 'Pour débuter',

        base_price: 15000,

        additional_price: 5000,

        threshold: 1,

        color: '#3B82F6'

      },

      advantage: {

        name: 'Avantage',

        description: 'Le plus populaire',

        price: 25000,

        threshold: 3,

        color: '#10B981',

        recommended: true

      },

      excellence: {

        name: 'Excellence',

        description: 'Le meilleur rapport',

        price: 40000,

        threshold: 5,

        color: '#8B5CF6'

      }

    }

  };



  const effectiveConfig = config || DEFAULT_CONFIG;



  const PRICING_PLANS: PricingPlan[] = [

    {

      id: 'essential',

      name: effectiveConfig.plans.essential.name,

      description: effectiveConfig.plans.essential.description,

      basePrice: effectiveConfig.plans.essential.base_price,

      additionalPrice: effectiveConfig.plans.essential.additional_price,

      threshold: effectiveConfig.plans.essential.threshold,

      color: effectiveConfig.plans.essential.color

    },

    {

      id: 'advantage',

      name: effectiveConfig.plans.advantage.name,

      description: effectiveConfig.plans.advantage.description,

      price: effectiveConfig.plans.advantage.price,

      threshold: effectiveConfig.plans.advantage.threshold,

      color: effectiveConfig.plans.advantage.color,

      recommended: effectiveConfig.plans.advantage.recommended

    },

    {

      id: 'excellence',

      name: effectiveConfig.plans.excellence.name,

      description: effectiveConfig.plans.excellence.description,

      price: effectiveConfig.plans.excellence.price,

      threshold: effectiveConfig.plans.excellence.threshold,

      color: effectiveConfig.plans.excellence.color

    }

  ];



  return {

    GENEROUS_WEEK_PRICE: effectiveConfig.generous_week_price,

    REGULAR_FIRST_COURSE_PRICE: effectiveConfig.regular_first_course_price,

    ADDITIONAL_COURSE_PRICE: effectiveConfig.additional_course_price,

    FIXED_PRICE: effectiveConfig.fixed_price,

    PURCHASE_VALIDITY_DAYS: effectiveConfig.purchase_validity_days ?? PURCHASE_VALIDITY_DAYS,

    PRICING_PLANS,

    isLoading,

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
