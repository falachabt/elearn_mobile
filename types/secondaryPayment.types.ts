// types/secondaryPayment.types.ts
// Abonnement secondaire : 3 périodes prépayées à prix fixe (pas de
// versements comme le concours -- voir services/secondary/secondary-payment.service.ts).

export type SecondaryPlan = 'monthly' | 'quarterly' | 'semiannual';

// Prix par défaut/fallback : le vrai prix + durée affichés viennent de
// services/secondary/secondaryPlansConfig.service.ts (app_config.data.secondary_plans,
// éditable depuis le backoffice). Ces constantes ne servent que si la lecture DB échoue.
export const SECONDARY_PLAN_PRICES_XAF: Record<SecondaryPlan, number> = {
  monthly: 1000,
  quarterly: 2000,
  semiannual: 3000,
};

export const SECONDARY_PLAN_LABELS: Record<SecondaryPlan, string> = {
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
  semiannual: 'Semestriel',
};

export const secondaryPlanDescription = (durationMonths: number): string =>
  `${durationMonths} mois d'accès`;

export type SecondaryPaymentStatus =
  | 'pending'
  | 'initialized'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'expired';

export interface SecondaryPaymentRow {
  id: string;
  user_id: string;
  program_id: string;
  amount: number;
  plan: SecondaryPlan | null;
  payment_date: string | null;
  expiry_date: string | null;
  payment_reference: string | null;
  payment_status: SecondaryPaymentStatus;
  payment_provider: string | null;
  phone_number: string | null;
  has_seen_result: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}
