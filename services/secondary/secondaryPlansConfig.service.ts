// services/secondary/secondaryPlansConfig.service.ts
// Prix + durée des 3 formules d'abonnement secondaire, éditables depuis le
// backoffice (instructor/mobile/config -> app_config.data.secondary_plans).
// Voir supabase/schemas/2_secondary_school.sql:calculate_secondary_expiry()
// côté backend -- même clé "secondary_plans" utilisée comme source de vérité.

import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { SECONDARY_PLAN_PRICES_XAF, SecondaryPlan } from '@/types/secondaryPayment.types';

export type SecondaryPlanConfig = { price_xaf: number; duration_months: number };

const DEFAULT_DURATION_MONTHS: Record<SecondaryPlan, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
};

const DEFAULT_PLANS_CONFIG: Record<SecondaryPlan, SecondaryPlanConfig> = {
  monthly: { price_xaf: SECONDARY_PLAN_PRICES_XAF.monthly, duration_months: DEFAULT_DURATION_MONTHS.monthly },
  quarterly: { price_xaf: SECONDARY_PLAN_PRICES_XAF.quarterly, duration_months: DEFAULT_DURATION_MONTHS.quarterly },
  semiannual: { price_xaf: SECONDARY_PLAN_PRICES_XAF.semiannual, duration_months: DEFAULT_DURATION_MONTHS.semiannual },
};

/**
 * Lit app_config.data.secondary_plans. Toute formule absente ou mal formée
 * retombe sur les valeurs par défaut -- ne bloque jamais l'écran de paiement.
 */
export async function getSecondaryPlansConfig(): Promise<Record<SecondaryPlan, SecondaryPlanConfig>> {
  try {
    const { data, error } = await (supabase as any)
      .from('app_config')
      .select('data')
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    const remote = (data?.data?.secondary_plans ?? {}) as Partial<Record<SecondaryPlan, Partial<SecondaryPlanConfig>>>;

    return {
      monthly: mergePlan('monthly', remote.monthly),
      quarterly: mergePlan('quarterly', remote.quarterly),
      semiannual: mergePlan('semiannual', remote.semiannual),
    };
  } catch (err) {
    logger.error('[secondaryPlansConfig] getSecondaryPlansConfig error:', err);
    return DEFAULT_PLANS_CONFIG;
  }
}

function mergePlan(plan: SecondaryPlan, value?: Partial<SecondaryPlanConfig>): SecondaryPlanConfig {
  const priceXaf = Number(value?.price_xaf);
  const durationMonths = Number(value?.duration_months);
  return {
    price_xaf: Number.isFinite(priceXaf) && priceXaf > 0 ? priceXaf : DEFAULT_PLANS_CONFIG[plan].price_xaf,
    duration_months: Number.isFinite(durationMonths) && durationMonths > 0 ? durationMonths : DEFAULT_PLANS_CONFIG[plan].duration_months,
  };
}
