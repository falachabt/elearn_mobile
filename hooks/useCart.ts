import { useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { CartService } from '@/services/cart.service';
import { CartItems, Carts } from '@/types/type';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth';

interface Cart extends Carts {
  items: CartItems[];
}

const CART_KEY = 'currentCart';

const fetcher = async () => {
  const cart = await CartService.getCurrentCart();
  return cart;
};

export const useCart = () => {
  const { data: currentCart, error, isLoading } = useSWR<Cart>(CART_KEY, fetcher);
  const { user } = useAuth();
  const { mutate } = useSWRConfig();

  useEffect(() => {
    console.log("user", user?.id, currentCart?.id);
    const cartChannel = supabase
      .channel('cart-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'carts',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          console.log('cart changed');
          mutate(CART_KEY);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
          filter: currentCart ? `cart_id=eq.${currentCart.id}` : undefined,
        },
        () => {
          console.log('cart items changed');
          mutate(CART_KEY);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(cartChannel);
    };
  }, [currentCart?.id]);

  const addToCart = async (programId: number, price: number) => {
    try {
    const { data , error } =  await CartService.addItem(programId, price);

    if(error) throw new Error('Erreur lors de l\'ajout au panier');
    
      await mutate(CART_KEY);
    } catch (err) {
      throw new Error('Erreur lors de l\'ajout au panier');
    }
  };

  const removeFromCart = async (programId: number) => {
    try {
      await CartService.removeItem(programId);
      await mutate(CART_KEY);
    } catch (err) {
      throw new Error('Erreur lors de la suppression du panier');
    }
  };

  return {
    cartItems: currentCart?.items || [],
    loading: isLoading,
    error,
    addToCart,
    removeFromCart,
    currentCart,
  };
};