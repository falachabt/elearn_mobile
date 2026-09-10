// types/secondaryPayment.types.ts
// Abonnement secondaire : 3 périodes prépayées à prix fixe (pas de
// versements comme le concours -- voir services/secondary/secondary-payment.service.ts).

export type SecondaryPlan = 'monthly' | 'quarterly' | 'semiannual';

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

export const SECONDARY_PLAN_DESCRIPTIONS: Record<SecondaryPlan, string> = {
  monthly: '1 mois d\'accès',
  quarterly: '3 mois d\'accès',
  semiannual: '6 mois d\'accès',
};

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
