import {supabase} from '@/lib/supabase';

export const CartService = {
        async getCurrentCart() {
            const user = await supabase.auth.getUser();
            const {data: existingCart} = await supabase
                .from('carts')
                .select('*, items:cart_items(*)')
                .eq('user_id', user.data.user?.id)
                .eq('status', 'active')
                .order('created_at', {ascending: false})
                .limit(1);


            if (!existingCart?.length) {
                const {data: newCart} = await supabase
                    .from('carts')
                    .insert({user_id: (await supabase.auth.getUser()).data?.user?.id})
                    .select()
                    .single();
                return newCart;
            }

            return existingCart[0];
        },

       async addItem(programId: number, price: number, cartId: string | undefined) {
           const cartIdToUse = cartId || (await this.getCurrentCart()).id;
           return supabase
               .from('cart_items')
               .insert({cart_id: cartIdToUse, program_id: programId, price})
               .select()
               .single();
       },

       async removeItem(programId: number, cartId: string | undefined) {
            const cartIdToUse = cartId || (await this.getCurrentCart()).id;
            return supabase
                .from('cart_items')
                .delete()
                .match({cart_id: cartIdToUse, program_id: programId});
        }
    }
;