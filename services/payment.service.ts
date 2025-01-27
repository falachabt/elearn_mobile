import { supabase } from '@/lib/supabase';
import { Payments } from '@/types/type';

export const PaymentService = {
  async createPayment(cartId: string, phoneNumber: string, amount: number, trx_reference: string) {
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        cart_id: cartId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        amount,
        status: '',
        phone_number: phoneNumber,
        payment_provider: phoneNumber.startsWith('655') ? 'orange' : 'mtn',
        trx_reference
      })
      .select()
      .single();

    return payment;
  },

  async setStatus(paymentId: string, status: string) {
    await supabase
      .from('payments')
      .update({
        status
      })
      .eq('id', paymentId);
  },

  subscribeToPaymentStatus(paymentId: string, callback: (status: string, payment : Payments) => void) {
    return supabase
      .channel('payments')
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `id=eq.${paymentId}`
        },
        (payload: { new: { status: string } }) => callback(payload.new.status, payload.new as Payments)
      )
      .subscribe();
  }
};