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
      // Don't proceed if we don't have the cart yet
      if (!currentCart) return;

      // Create an optimistic cart item that matches the CartItems type
      const optimisticCartItem = {
        id: `temp-${Date.now()}`, // Temporary ID
        cart_id: currentCart.id,
        program_id: programId,
        price: price,
        created_at: new Date().toISOString(),
        status: 'active'
      };

      // Create a copy of the current cart with the new item
      const optimisticData = {
        ...currentCart,
        items: [...(currentCart.items || []), optimisticCartItem]
      };

      // Update the local cache immediately (optimistic update)
      mutate(CART_KEY, optimisticData, false);

      // Make the API call
      const { data, error } = await CartService.addItem(programId, price, currentCart?.id);

      if (error) throw new Error('Erreur lors de l\'ajout au panier');

      // No need to mutate again if we have realtime, but if not:
      // mutate(CART_KEY);
    } catch (err) {
      // If there's an error, revalidate to get correct state
      mutate(CART_KEY);
      throw new Error('Erreur lors de l\'ajout au panier');
    }
  };

  const removeFromCart = async (programId: number) => {
    const start = performance.now();
    try {
      // Don't proceed if we don't have the cart yet
      if (!currentCart) return;

      // Create a copy of the current cart without the item
      const optimisticData = {
        ...currentCart,
        items: currentCart.items.filter(item => item.program_id !== programId)
      };

      // Update the local cache immediately (optimistic update)
      mutate(CART_KEY, optimisticData, false);

      // Make the API call
      await CartService.removeItem(programId, currentCart?.id);

      // No need to mutate again if we have realtime, but if not:
      // await mutate(CART_KEY);
    } catch (err) {
      // If there's an error, revalidate to get correct state
      mutate(CART_KEY);
      throw new Error('Erreur lors de la suppression du panier');
    } finally {
      const end = performance.now();
      const duration = end - start;
      console.log(`removeFromCart a pris ${duration} millisecondes`);
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