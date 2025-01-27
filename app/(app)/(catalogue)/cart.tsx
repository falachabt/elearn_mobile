import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useColorScheme, Animated, ListRenderItemInfo } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useCart } from '@/hooks/useCart';
import { supabase } from '@/lib/supabase';
import { Concours, ConcoursLearningpaths, LearningPaths } from '@/types/type';

interface CartItem {
    id : number;
//   program_id: number;
  price: number;
learning_path?: LearningPaths;
concour?: Concours
  
}

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export default function CartScreen() {
  const { cartItems, removeFromCart, currentCart } = useCart();
  const [programs, setPrograms] = React.useState<CartItem[]>([]);
  const isDark = useColorScheme() === 'dark';
  const router = useRouter();
  const scrollY = React.useRef(new Animated.Value(0)).current;


  useEffect(() => {
    const fetchCartItems = async () => {
      const { data } = await supabase
        .from("cart_items")
        .select(
          "*, program:concours_learningpaths(*, concour : concours(name, school:schools(name)), learning_path:learning_paths(*))"
        )
        .eq("cart_id", currentCart?.id);

      setPrograms(data?.map((item) => item.program) || []);
    };

    fetchCartItems();
  }, [cartItems]);

  const renderItem = ({ item }: ListRenderItemInfo<unknown>) => (
    <View style={[styles.cartItem, isDark && styles.cartItemDark]}>
      <View style={styles.itemLeftContent}>
        <View style={[styles.itemIcon, isDark && styles.itemIconDark]}>
          <MaterialCommunityIcons name="book-education" size={24} color={isDark ? '#86EFAC' : '#166534'} />
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemTitle, isDark && styles.itemTitleDark]} numberOfLines={2}>
            {(item as CartItem)?.learning_path?.title}
          </Text>
          <View style={styles.itemMeta}>
            <MaterialCommunityIcons name="school" size={16} color={isDark ? '#86EFAC' : '#166534'} />
            <Text style={[styles.itemMetaText, isDark && styles.itemMetaTextDark]}>
              {(item as CartItem)?.concour?.name}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.itemRightContent}>
        <Text style={[styles.itemPrice, isDark && styles.itemPriceDark]}>
          {(item as CartItem).price.toLocaleString('fr-FR')} FCFA
        </Text>
        <TouchableOpacity
          style={[styles.removeButton, isDark && styles.removeButtonDark]}
          onPress={() => removeFromCart((item as CartItem).id)}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={20} color={isDark ? '#FCA5A5' : '#DC2626'} />
        </TouchableOpacity>
      </View>
    </View>
  );


    

  if (cartItems.length === 0) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconContainer, isDark && styles.emptyIconContainerDark]}>
            <MaterialCommunityIcons name="cart-off" size={48} color={isDark ? '#86EFAC' : '#166534'} />
          </View>
          <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>Votre panier est vide</Text>
          <TouchableOpacity
            style={[styles.browseCatalogButton, isDark && styles.browseCatalogButtonDark]}
            onPress={() => router.push('/(app)/(catalogue)/shop')}
          >
            <MaterialCommunityIcons name="shopping" size={20} color={isDark ? '#022c22' : '#FFFFFF'} />
            <Text style={[styles.browseCatalogText, isDark && styles.browseCatalogTextDark]}>
              Parcourir le catalogue
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [-100, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Animated.View 
        style={[
          styles.stickyHeader,
          isDark && styles.stickyHeaderDark,
          { transform: [{ translateY: headerTranslateY }] }
        ]}
      >
        <Text style={[styles.stickyTitle, isDark && styles.stickyTitleDark]}>
          Panier ({cartItems.length})
        </Text>
        <Text style={styles.stickyTotal}>
          {cartItems.reduce((sum, item) => sum + item.price, 0).toLocaleString('fr-FR')} FCFA
        </Text>
      </Animated.View>
      
      <AnimatedFlatList
        data={programs}
        renderItem={renderItem}
        keyExtractor={(item) => (item as CartItem)?.id.toString()}
        contentContainerStyle={styles.list}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      />

      <View style={[styles.footer, isDark && styles.footerDark]}>
        <View style={styles.footerContent}>
          <View style={styles.totalInfo}>
            <Text style={[styles.totalLabel, isDark && styles.totalLabelDark]}>Total</Text>
            <Text style={[styles.totalAmount, isDark && styles.totalAmountDark]}>
              {programs.reduce((sum, item) => sum + item.price, 0).toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.checkoutButton, isDark && styles.checkoutButtonDark]}
            onPress={() => router.push('/(app)/(catalogue)/payment')}
          >
            <MaterialCommunityIcons name="lock" size={20} color={isDark ? '#022c22' : '#FFFFFF'} />
            <Text style={[styles.checkoutButtonText, isDark && styles.checkoutButtonTextDark]}>
              Payer en sécurité
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    marginBottom: 65,
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  stickyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(249, 250, 251, 0.98)',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  stickyHeaderDark: {
    backgroundColor: 'rgba(10, 10, 10, 0.98)',
    borderBottomColor: '#27272A',
  },
  stickyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  stickyTitleDark: {
    color: '#F9FAFB',
  },
  stickyTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
  },
  list: {
    padding: 10,
    paddingTop: 20,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: theme.border.radius.small,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cartItemDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  itemLeftContent: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#DCF5E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconDark: {
    backgroundColor: '#052e16',
  },
  itemInfo: {
    flex: 1,
    gap: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  itemTitleDark: {
    color: '#F9FAFB',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemMetaText: {
    fontSize: 14,
    color: '#4B5563',
  },
  itemMetaTextDark: {
    color: '#9CA3AF',
  },
  itemRightContent: {
    alignItems: 'flex-end',
    gap: 8,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
  },
  itemPriceDark: {
    color: '#86EFAC',
  },
  removeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  removeButtonDark: {
    backgroundColor: '#450A0A',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  footerDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderBottomColor: theme.color.gray[800],
    borderBottomWidth: 1,
  },
  footerContent: {
    padding: 20,
    gap: 20,
  },
  totalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: '#4B5563',
  },
  totalLabelDark: {
    color: '#9CA3AF',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#166534',
  },
  totalAmountDark: {
    color: '#86EFAC',
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#166534',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  checkoutButtonDark: {
    backgroundColor: '#86EFAC',
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  checkoutButtonTextDark: {
    color: '#022c22',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 16,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#DCF5E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyIconContainerDark: {
    backgroundColor: '#052e16',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyTitleDark: {
    color: '#F9FAFB',
  },
  browseCatalogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#166534',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  browseCatalogButtonDark: {
    backgroundColor: '#86EFAC',
  },
  browseCatalogText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  browseCatalogTextDark: {
    color: '#022c22',
  },
});