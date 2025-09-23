/**
 * Centralized pricing utility for the application
 * This file contains all pricing constants and logic used across the application
 */

// Price for generous week or special promotions
export const GENEROUS_WEEK_PRICE = 5000;

// Regular price for the first course
export const REGULAR_FIRST_COURSE_PRICE = 15000;

// Price for additional courses in the Essential formula
export const ADDITIONAL_COURSE_PRICE = 15000;

// Fixed price for all formations when user already has enrollments
export const FIXED_PRICE = 15000;

// Durée de validité d'un achat (en jours)
export const PURCHASE_VALIDITY_DAYS = 300; // 3 mois

// Pricing plans definitions
export const PRICING_PLANS = [
  {
    id: 'essential',
    name: 'Formule Essentielle',
    description: 'Première formation: 9 000 FCFA + 7900 FCFA pour toutes nouvelles souscriptions à une formation.',
    basePrice: REGULAR_FIRST_COURSE_PRICE,
    additionalPrice: ADDITIONAL_COURSE_PRICE,
    threshold: 1,
    color: 'green'
  },
  {
    id: 'advantage',
    name: 'Formule Avantage',
    description: 'Pack complet de trois formations',
    price: 24900,
    threshold: 3,
    color: 'orange',
    recommended: true
  },
  {
    id: 'excellence',
    name: 'Formule Excellence',
    description: 'Formations illimitées pendant 12 mois',
    price: 39500,
    threshold: 5,
    color: '#4F46E5'
  }
] as const;

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
 * Determines if the fixed price mode is active based on user enrollments
 * @param userEnrollmentsCount Number of user enrollments
 * @returns Boolean indicating if fixed price mode is active
 */
export const isFixedPriceModeActive = (userEnrollmentsCount: number): boolean => {
  return userEnrollmentsCount > 0;
};

/**
 * Gets the applicable pricing formula based on the number of items in the cart
 * @param itemCount Number of items in the cart
 * @param isFixedPriceMode Whether fixed price mode is active
 * @returns The applicable pricing formula or null if none applies
 */
export const getApplicableFormula = (itemCount: number, isFixedPriceMode: boolean): PricingPlan | null => {
  // In fixed price mode, no formula is applicable
  if (isFixedPriceMode) return null;

  if (itemCount >= 5) {
    // Excellence formula: only for 5 or more courses
    return PRICING_PLANS.find(plan => plan.id === 'excellence') || null;
  } else if (itemCount === 3) {
    // Advantage formula: only for exactly 3 courses
    return PRICING_PLANS.find(plan => plan.id === 'advantage') || null;
  } else if (itemCount > 0) {
    // Essential formula: for 1, 2, or 4 courses
    return PRICING_PLANS.find(plan => plan.id === 'essential') || null;
  }

  return null;
};

/**
 * Gets the next possible formula based on the current number of items in the cart
 * @param itemCount Number of items in the cart
 * @param isFixedPriceMode Whether fixed price mode is active
 * @returns Information about the next possible formula or null if none applies
 */
export const getNextPossibleFormula = (itemCount: number, isFixedPriceMode: boolean): NextFormula | null => {
  if (isFixedPriceMode) return null;

  if (itemCount === 0) return null;

  if (itemCount === 2) {
    // One item away from Advantage formula
    const advantageFormula = PRICING_PLANS.find(plan => plan.id === 'advantage');
    if (advantageFormula) {
      return { formula: advantageFormula, itemsNeeded: 1 };
    }
  } else if (itemCount === 4) {
    // One item away from Excellence formula
    const excellenceFormula = PRICING_PLANS.find(plan => plan.id === 'excellence');
    if (excellenceFormula) {
      return { formula: excellenceFormula, itemsNeeded: 1 };
    }
  }

  return null;
};

/**
 * Calculates the total price based on the applicable formula or fixed price mode
 * @param itemCount Number of items in the cart
 * @param regularTotal Regular total price without any discounts
 * @param isFixedPriceMode Whether fixed price mode is active
 * @param isGenerousWeekActive Whether the generous week is active
 * @returns The calculated total price with applicable discounts
 */
export const calculateDiscountedTotal = (
  itemCount: number, 
  regularTotal: number, 
  isFixedPriceMode: boolean,
  isGenerousWeekActive: boolean = false
): number => {
  if (itemCount === 0) return 0;

  // If generous week is active, use the generous week price for all items
  if (isGenerousWeekActive) {
    return itemCount * GENEROUS_WEEK_PRICE;
  }

  // If fixed price mode is active, multiply the number of items by the fixed price
  if (isFixedPriceMode) {
    return itemCount * FIXED_PRICE;
  }

  const applicableFormula = getApplicableFormula(itemCount, isFixedPriceMode);

  if (!applicableFormula) return regularTotal;

  switch (applicableFormula.id) {
    case 'excellence':
      // Fixed price for 5 or more courses
      return applicableFormula.price || 0;
    case 'advantage':
      // Fixed price only for exactly 3 courses
      if (itemCount === 3) {
        return applicableFormula.price || 0;
      } else {
        // Otherwise apply the essential formula
        const essentialFormula = PRICING_PLANS.find(plan => plan.id === 'essential');
        if (!essentialFormula) return regularTotal;

        const firstCoursePrice = essentialFormula.basePrice || 0;
        const additionalCoursesPrice = (itemCount - 1) * (essentialFormula.additionalPrice || 0);
        return firstCoursePrice + additionalCoursesPrice;
      }
    case 'essential':
      // First course at regular price + additional courses at reduced price
      const firstCoursePrice = applicableFormula.basePrice || 0;
      const additionalCoursesPrice = (itemCount - 1) * (applicableFormula.additionalPrice || 0);
      return firstCoursePrice + additionalCoursesPrice;
    default:
      return regularTotal;
  }
};

/**
 * Gets the display price for an item based on whether fixed price mode is active or generous week is active
 * @param itemPrice Original price of the item
 * @param isFixedPriceMode Whether fixed price mode is active
 * @param isGenerousWeekActive Whether the generous week is active
 * @returns The price to display for the item
 */
export const getDisplayPrice = (
  itemPrice: number, 
  isFixedPriceMode: boolean, 
  isGenerousWeekActive: boolean = false
): number => {
  if (isGenerousWeekActive) {
    return GENEROUS_WEEK_PRICE;
  }
  return isFixedPriceMode ? FIXED_PRICE : itemPrice;
};
