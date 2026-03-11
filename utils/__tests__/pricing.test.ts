jest.mock('@/contexts/useAppConfig', () => ({
  useAppConfig: () => ({
    getPricingConfig: () => null,
    isLoading: false,
  }),
}));

import {
  calculateDiscountedTotal,
  getApplicableFormula,
  getDisplayPrice,
  getNextPossibleFormula,
  isFixedPriceModeActive,
  type PricingPlan,
} from '../pricing';

const pricingPlans: PricingPlan[] = [
  {
    id: 'essential',
    name: 'Essential',
    description: 'Pour debuter',
    color: '#3B82F6',
    threshold: 1,
    basePrice: 15000,
    additionalPrice: 5000,
  },
  {
    id: 'advantage',
    name: 'Avantage',
    description: 'Le plus populaire',
    color: '#10B981',
    threshold: 3,
    price: 25000,
    recommended: true,
  },
  {
    id: 'excellence',
    name: 'Excellence',
    description: 'Le meilleur rapport',
    color: '#8B5CF6',
    threshold: 5,
    price: 40000,
  },
];

describe('pricing utilities', () => {
  describe('isFixedPriceModeActive', () => {
    it('returns false when the user has no enrollments', () => {
      expect(isFixedPriceModeActive(0)).toBe(false);
    });

    it('returns true when the user already has enrollments', () => {
      expect(isFixedPriceModeActive(1)).toBe(true);
    });
  });

  describe('getApplicableFormula', () => {
    it('returns the essential plan for one or two items', () => {
      expect(getApplicableFormula(1, false, pricingPlans)?.id).toBe('essential');
      expect(getApplicableFormula(2, false, pricingPlans)?.id).toBe('essential');
    });

    it('returns the advantage plan for exactly three items', () => {
      expect(getApplicableFormula(3, false, pricingPlans)?.id).toBe('advantage');
    });

    it('returns the excellence plan for five items or more', () => {
      expect(getApplicableFormula(5, false, pricingPlans)?.id).toBe('excellence');
      expect(getApplicableFormula(6, false, pricingPlans)?.id).toBe('excellence');
    });

    it('returns null when fixed pricing mode is active or the cart is empty', () => {
      expect(getApplicableFormula(2, true, pricingPlans)).toBeNull();
      expect(getApplicableFormula(0, false, pricingPlans)).toBeNull();
    });
  });

  describe('getNextPossibleFormula', () => {
    it('suggests the next formula when the user is one item away', () => {
      expect(getNextPossibleFormula(2, false, pricingPlans)).toEqual({
        formula: pricingPlans[1],
        itemsNeeded: 1,
      });

      expect(getNextPossibleFormula(4, false, pricingPlans)).toEqual({
        formula: pricingPlans[2],
        itemsNeeded: 1,
      });
    });

    it('returns null when no next formula applies', () => {
      expect(getNextPossibleFormula(0, false, pricingPlans)).toBeNull();
      expect(getNextPossibleFormula(1, false, pricingPlans)).toBeNull();
      expect(getNextPossibleFormula(2, true, pricingPlans)).toBeNull();
    });
  });

  describe('calculateDiscountedTotal', () => {
    it('returns zero for an empty cart', () => {
      expect(calculateDiscountedTotal(0, 0, false, false, 10000, 10000, pricingPlans)).toBe(0);
    });

    it('applies generous week pricing before any other rule', () => {
      expect(calculateDiscountedTotal(3, 45000, false, true, 10000, 12000, pricingPlans)).toBe(
        30000
      );
    });

    it('applies fixed pricing mode when enabled', () => {
      expect(calculateDiscountedTotal(2, 30000, true, false, 10000, 12000, pricingPlans)).toBe(
        24000
      );
    });

    it('calculates the essential formula for one or two items', () => {
      expect(calculateDiscountedTotal(1, 15000, false, false, 10000, 12000, pricingPlans)).toBe(
        15000
      );
      expect(calculateDiscountedTotal(2, 30000, false, false, 10000, 12000, pricingPlans)).toBe(
        20000
      );
    });

    it('uses the packaged formulas for three and five items', () => {
      expect(calculateDiscountedTotal(3, 45000, false, false, 10000, 12000, pricingPlans)).toBe(
        25000
      );
      expect(calculateDiscountedTotal(5, 75000, false, false, 10000, 12000, pricingPlans)).toBe(
        40000
      );
    });
  });

  describe('getDisplayPrice', () => {
    it('shows the generous week price when the promotion is active', () => {
      expect(getDisplayPrice(15000, false, true, 10000, 12000)).toBe(10000);
    });

    it('falls back to the fixed price value otherwise', () => {
      expect(getDisplayPrice(15000, true, false, 10000, 12000)).toBe(12000);
      expect(getDisplayPrice(15000, false, false, 10000, 12000)).toBe(12000);
    });
  });
});
