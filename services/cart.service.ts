import {supabase} from '@/lib/supabase';

export const CartService = {
        async getCurrentCart() {
            const user = await supabase.auth.getUser();
            const userId = user.data.user?.id;
            if (!userId) {
                return null;
            }
            const {data: existingCart} = await supabase
                .from('carts')
                .select('*, items:cart_items(*)')
                .eq('user_id', userId)
                .eq('status', 'active')
                .order('created_at', {ascending: false})
                .limit(1);


            if (!existingCart?.length) {
                const {data: newCart} = await supabase
                    .from('carts')
                    .insert({user_id: userId})
                    .select()
                    .single();
                return newCart;
            }

            return existingCart[0];
        },

       async addItem(programId: number, price: number, cartId: string | undefined) {
           const currentCart = await this.getCurrentCart();
           const cartIdToUse = cartId || currentCart?.id;
           if (!cartIdToUse) {
               throw new Error('No active cart found');
           }
           return supabase
               .from('cart_items')
               .insert({cart_id: cartIdToUse, program_id: programId, price})
               .select()
               .single();
       },

       async removeItem(programId: number, cartId: string | undefined) {
            const currentCart = await this.getCurrentCart();
            const cartIdToUse = cartId || currentCart?.id;
            if (!cartIdToUse) {
                throw new Error('No active cart found');
            }
            return supabase
                .from('cart_items')
                .delete()
                .match({cart_id: cartIdToUse, program_id: programId});
        }
    }
;
