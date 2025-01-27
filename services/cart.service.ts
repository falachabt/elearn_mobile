import { supabase } from '@/lib/supabase';

export const CartService = {
  async getCurrentCart() {
    const { data: existingCart } = await supabase
      .from('carts')
      .select('*, items:cart_items(*)')
      .eq('user_id', (await supabase.auth.getUser()).data?.user?.id)
      .eq('status', 'active')
      .single();


    if (!existingCart) {
      const { data: newCart } = await supabase
        .from('carts')
        .insert({ user_id: (await supabase.auth.getUser()).data?.user?.id })
        .select()
        .single();
      return newCart;
    }

    return existingCart;
  },

  async addItem(programId: number, price: number) {
    const cart = await this.getCurrentCart();
    return await supabase
      .from('cart_items')
      .insert({ cart_id: cart.id, program_id: programId, price })
      .select()
      .single();
  },

  async removeItem(programId: number) {
    const cart = await this.getCurrentCart();
    return await supabase
      .from('cart_items')
      .delete()
      .match({ cart_id: cart.id, program_id: programId });
  }
};