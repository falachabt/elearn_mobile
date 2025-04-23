import { supabase } from '@/lib/supabase';
import { Payments } from '@/types/type';

export const PaymentService = {
    async createPayment(
        cartId: string,
        phoneNumber: string,
        amount: number,
        trx_reference: string,
        promoCodeId?: string // Add optional promo code ID parameter
    ) {
        const { data: payment, error } = await supabase
            .from('payments')
            .insert({
                cart_id: cartId,
                user_id: (await supabase.auth.getUser()).data.user?.id,
                amount,
                status: '',
                phone_number: phoneNumber,
                payment_provider: phoneNumber.startsWith('655') ? 'orange' : 'mtn',
                trx_reference,
                promo_code_id: promoCodeId // Add promo code ID to the payment record
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating payment:', error);
            throw new Error(error.message);
        }

        return payment;
    },

    async setStatus(paymentId: string, status: string) {
        const { error } = await supabase
            .from('payments')
            .update({
                status
            })
            .eq('id', paymentId);

        if (error) {
            console.error('Error updating payment status:', error);
            throw new Error(error.message);
        }
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
    },

    // Add function to verify a promo code
    async verifyPromoCode(code: string) {
        if (!code) return null;

        const { data, error } = await supabase
            .from('influencers')
            .select('id, name, promo_code, discount_percentage, valid_until, status')
            .eq('promo_code', code)
            .eq('status', 'active')
            .single();

        if (error || !data) {
            return null;
        }

        // Check if promo code is still valid based on valid_until date
        const now = new Date();
        const validUntil = data.valid_until ? new Date(data.valid_until) : null;

        if (validUntil && validUntil < now) {
            return null;
        }

        return {
            id: data.id,
            name: data.name,
            discount_percentage: data.discount_percentage
        };
    }
};