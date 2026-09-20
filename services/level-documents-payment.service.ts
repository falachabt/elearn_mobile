import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import type { Database } from '@/types/supabase';

// 1000 XAF / 1 year unlock for the "documents par niveau" feature, scoped
// PER LEVEL (one payment unlocks exactly one secondary_levels row for a
// year, not the whole feature). Modeled on competition-payment.service.ts
// (same PawaPay rail, same payment_status lifecycle) but without the
// competition_id FK -- uses level_id instead.

export type LevelDocumentsPayment = Database['public']['Tables']['user_level_documents_payments']['Row'];

export const LevelDocumentsPaymentService = {
  async markAsSeen(paymentId: string): Promise<void> {
    const { error } = await supabase
      .from('user_level_documents_payments')
      .update({ has_seen_results: true, updated_at: new Date().toISOString() })
      .eq('id', paymentId);

    if (error) {
      logger.error('Error marking level documents payment as seen:', error);
    }
  },

  async createPayment(
    levelId: string,
    phoneNumber: string,
    amount: number,
    trxReference: string
  ): Promise<LevelDocumentsPayment> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);

    const { data: payment, error } = await supabase
      .from('user_level_documents_payments')
      .insert({
        user_id: user.id,
        level_id: levelId,
        amount,
        expiry_date: expiry.toISOString(),
        payment_status: 'pending',
        phone_number: phoneNumber,
        payment_provider: 'mtn_momo',
        payment_reference: trxReference,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating level documents payment:', error);
      throw new Error(error.message);
    }

    return payment as LevelDocumentsPayment;
  },

  async setStatus(paymentId: string, status: string) {
    const { error } = await supabase
      .from('user_level_documents_payments')
      .update({ payment_status: status, updated_at: new Date().toISOString() })
      .eq('id', paymentId);

    if (error) {
      logger.error('Error updating level documents payment status:', error);
      throw new Error(error.message);
    }
  },

  subscribeToPaymentStatus(
    paymentId: string,
    callback: (status: string, payment: LevelDocumentsPayment) => void
  ) {
    return supabase
      .channel('level_documents_payments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_level_documents_payments',
          filter: `id=eq.${paymentId}`,
        },
        (payload) =>
          callback(
            (payload.new as { payment_status: string }).payment_status,
            payload.new as LevelDocumentsPayment
          )
      )
      .subscribe();
  },

  /** Does the current user have a completed, non-expired payment for this level? */
  async checkAccess(levelId: string): Promise<boolean> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return false;

    const { data, error } = await supabase
      .from('user_level_documents_payments')
      .select('id')
      .eq('user_id', user.id)
      .eq('level_id', levelId)
      .eq('payment_status', 'completed')
      .gt('expiry_date', new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error('Error checking level documents access:', error);
      return false;
    }

    return !!data;
  },

  async getLatestPayment(levelId: string): Promise<LevelDocumentsPayment | null> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_level_documents_payments')
      .select('*')
      .eq('user_id', user.id)
      .eq('level_id', levelId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error('Error getting latest level documents payment:', error);
      throw new Error(error.message);
    }

    return data as LevelDocumentsPayment | null;
  },

  isFinalStatus(status: string): boolean {
    return ['completed', 'canceled', 'failed'].includes(status);
  },
};
