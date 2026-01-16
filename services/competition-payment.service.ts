import { supabase } from '@/lib/supabase';
import { NotchPayService } from '@/lib/notchpay';

export interface CompetitionPayment {
  id: string;
  user_id: string;
  competition_id: string;
  amount: number;
  payment_date: string;
  expiry_date: string;
  payment_reference: string;
  payment_status: string;
  payment_provider: string;
  phone_number: string;
  promo_code_id?: string;
  has_seen_results?: boolean;
  created_at: string;
  updated_at: string;
}

export const CompetitionPaymentService = {
  // Mark the payment result as seen by the user
  async markAsSeen(paymentId: string): Promise<void> {
    const { error } = await supabase
      .from('user_competition_payments')
      .update({
        has_seen_results: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (error) {
      console.error('Error marking competition payment as seen:', error);
    }
  },

  async createPayment(
    competitionId: string,
    phoneNumber: string,
    amount: number = 2500, // Default amount is 2500
    trx_reference: string,
    promoCodeId?: string
  ): Promise<CompetitionPayment> {
    const { data: payment, error } = await supabase
      .from('user_competition_payments')
      .insert({
        competition_id: competitionId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        amount,
        payment_status: 'pending',
        phone_number: phoneNumber,
        payment_provider: phoneNumber.startsWith('655') ? 'orange' : 'mtn',
        payment_reference: trx_reference,
        promo_code_id: promoCodeId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating competition payment:', error);
      throw new Error(error.message);
    }

    return payment;
  },

  async setStatus(paymentId: string, status: string) {
    const { error } = await supabase
      .from('user_competition_payments')
      .update({
        payment_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (error) {
      console.error('Error updating competition payment status:', error);
      throw new Error(error.message);
    }
  },

  subscribeToPaymentStatus(paymentId: string, callback: (status: string, payment: CompetitionPayment) => void) {
    return supabase
      .channel('competition_payments')
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'user_competition_payments',
          filter: `id=eq.${paymentId}`
        },
        (payload: { new: { payment_status: string } }) => callback(payload.new.payment_status, payload.new as CompetitionPayment)
      )
      .subscribe();
  },

  async checkCompetitionAccess(competitionId: string): Promise<boolean> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return false;

    const { data, error } = await supabase.rpc('check_competition_access', {
      p_user_id: user.id,
      p_competition_id: competitionId
    });

    if (error) {
      console.error('Error checking competition access:', error);
      return false;
    }

    return data || false;
  },

  async getActivePayment(competitionId: number): Promise<CompetitionPayment | null> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_competition_payments')
      .select('*')
      .eq('user_id', user.id)
      .eq('competition_id', competitionId)
      .eq('payment_status', 'completed')
      .gt('expiry_date', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No active payment found
        return null;
      }
      console.error('Error getting active competition payment:', error);
      throw new Error(error.message);
    }

    return data;
  },

  async getLatestPayment(competitionId: string): Promise<CompetitionPayment | null> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_competition_payments')
      .select('*')
      .eq('user_id', user.id)
      .eq('competition_id', competitionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No payment found
        return null;
      }
      console.error('Error getting latest competition payment:', error);
      throw new Error(error.message);
    }

    return data;
  },

  // Check if a payment status is final (completed or canceled)
  isFinalStatus(status: string): boolean {
    return ['completed', 'canceled', 'failed'].includes(status);
  },

  async initiateDirectPayment(
    competitionId: string,
    phoneNumber: string,
    amount: number = 2500,
    promoCodeId?: string
  ) {
    try {
      const notchpay = new NotchPayService();
      const network = phoneNumber.startsWith('655') ? 'orange' : 'mtn';

      const result = await notchpay.initiateDirectCharge({
        phone: phoneNumber,
        channel: network === 'orange' ? 'cm.orange' : 'cm.mtn',
        currency: 'XAF',
        amount: amount,
        customer: {
          email: 'default@gmail.com', // This should be user's email if available
        },
      });

      // If we got an error during charge but initialization was successful
      if (result.error && result.initResponse.transaction?.reference) {
        // Create payment record with pending status
        const payment = await this.createPayment(
          competitionId,
          phoneNumber,
          amount,
          result.initResponse.transaction.reference,
          promoCodeId
        );

        await this.setStatus(payment.id, 'pending');

        return {
          payment,
          needsFallback: true,
          authorizationUrl: result.initResponse.authorization_url,
          trxReference: result.initResponse.transaction.reference
        };
      }

      // If charge was successful
      if (result.chargeResponse && result.initResponse.transaction?.reference) {
        const payment = await this.createPayment(
          competitionId,
          phoneNumber,
          amount,
          result.initResponse.transaction.reference,
          promoCodeId
        );

        await this.setStatus(payment.id, 'initialized');

        return {
          payment,
          needsFallback: false,
          trxReference: result.initResponse.transaction.reference
        };
      }

      throw new Error("Payment initialization failed");
    } catch (error) {
      console.error("Error in direct competition payment:", error);
      throw error;
    }
  },

  async verifyPaymentStatus(reference: string, paymentId?: string) {
    if (!reference) return;

    try {
      const notchpay = new NotchPayService();
      const result = await notchpay.verifyTransaction(reference);

      if (paymentId && result?.transaction?.status === "complete") {
        await this.setStatus(paymentId, "completed");
      }

      return result;
    } catch (error) {
      console.error("Error verifying competition payment status:", error);
    }
  },

  async cancelPayment(paymentId: string, reference: string) {
    try {
      // First, check the current status of the payment
      const { data: payment, error: fetchError } = await supabase
        .from('user_competition_payments')
        .select('payment_status')
        .eq('id', paymentId)
        .single();

      if (fetchError) {
        console.error("Error fetching payment status:", fetchError);
        throw fetchError;
      }

      // If payment is already canceled, don't try to update it again
      if (payment.payment_status === "canceled") {
        return;
      }

      // Mark as canceled in our system
      await this.setStatus(paymentId, "canceled");

      // Try to cancel with NotchPay (this might fail silently if payment already processed)
      try {
        // Uncomment if you want to cancel in NotchPay
        // const notchpay = new NotchPayService();
        // await notchpay.cancelPayment(reference);
      } catch (e) {
        // Payment cancellation with NotchPay failed
      }
    } catch (error) {
      console.error("Error cancelling competition payment:", error);
      throw error;
    }
  }
};
