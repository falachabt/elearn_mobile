// services/secondary/secondary-payment.service.ts
// Abonnement secondaire, mirroring services/program-payment.service.ts (le
// flux PawaPay concours) mais pour user_secondary_payments. Différences clés :
// - pas de versements/installments, juste un plan fixe (monthly/quarterly/semiannual)
// - expiry_date n'est jamais posé côté client : calculé serveur (trigger
//   calculate_secondary_expiry) uniquement quand payment_status passe à 'completed'
// - l'accès payant est lu directement sur cette table (voir
//   contexts/useUserInfo.tsx: secondaryProgramAccessMap), jamais via
//   user_secondary_enrollments (qui reste la sélection gratuite de classe)

import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import type {
  SecondaryPaymentRow,
  SecondaryPaymentStatus,
  SecondaryPlan,
} from '@/types/secondaryPayment.types';

const TABLE = 'user_secondary_payments';

export const SecondaryPaymentService = {
  async createPayment(
    programId: string,
    plan: SecondaryPlan,
    phoneNumber: string,
    amount: number,
    trxReference: string
  ): Promise<SecondaryPaymentRow> {
    const authUser = (await supabase.auth.getUser()).data.user;
    if (!authUser) throw new Error('User not authenticated');

    const { data: payment, error } = await (supabase as any)
      .from(TABLE)
      .insert({
        program_id: programId,
        user_id: authUser.id,
        amount,
        plan,
        payment_status: 'pending',
        phone_number: phoneNumber,
        payment_provider: 'mtn_momo',
        payment_reference: trxReference,
      })
      .select()
      .single();

    if (error) {
      logger.error('[SecondaryPayment] createPayment error:', error);
      throw new Error(error.message);
    }

    return payment as SecondaryPaymentRow;
  },

  async setStatus(paymentId: string, status: SecondaryPaymentStatus): Promise<void> {
    const { error } = await (supabase as any)
      .from(TABLE)
      .update({ payment_status: status, updated_at: new Date().toISOString() })
      .eq('id', paymentId);

    if (error) {
      logger.error('[SecondaryPayment] setStatus error:', error);
      throw new Error(error.message);
    }
  },

  async markAsSeen(paymentId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from(TABLE)
      .update({ has_seen_result: true, updated_at: new Date().toISOString() })
      .eq('id', paymentId);

    if (error) {
      logger.error('[SecondaryPayment] markAsSeen error:', error);
    }
  },

  async getLatestPayment(programId: string): Promise<SecondaryPaymentRow | null> {
    const authUser = (await supabase.auth.getUser()).data.user;
    if (!authUser) return null;

    const { data, error } = await (supabase as any)
      .from(TABLE)
      .select('*')
      .eq('user_id', authUser.id)
      .eq('program_id', programId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      logger.error('[SecondaryPayment] getLatestPayment error:', error);
      return null;
    }
    return (data?.[0] as SecondaryPaymentRow) ?? null;
  },

  async getPaymentHistory(programId: string): Promise<SecondaryPaymentRow[]> {
    const authUser = (await supabase.auth.getUser()).data.user;
    if (!authUser) return [];

    const { data, error } = await (supabase as any)
      .from(TABLE)
      .select('*')
      .eq('user_id', authUser.id)
      .eq('program_id', programId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[SecondaryPayment] getPaymentHistory error:', error);
      return [];
    }
    return (data as SecondaryPaymentRow[]) ?? [];
  },

  isFinalStatus(status: string): boolean {
    return ['completed', 'canceled', 'failed'].includes(status);
  },
};
