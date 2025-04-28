import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useColorScheme, Animated, ListRenderItemInfo, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useCart } from '@/hooks/useCart';
import { supabase } from '@/lib/supabase';
import { Concours, ConcoursLearningpaths, LearningPaths } from '@/types/type';
import useSWR from "swr";
import { useAuth } from '@/contexts/auth';

// Prix en mode prix unique
const FIXED_PRICE = 7900; // Prix de toutes les formations en mode prix fixe

// Définition des formules de prix avec types TypeScript
const PRICING_PLANS = [
  {
    id: 'essential',
    name: 'Formule Essentielle',
    description: 'Première formation: 14 900 FCFA + 7900 FCFA pour toutes nouvelles souscriptions à une formation.',
    basePrice: 14900,
    additionalPrice: 7900,
    threshold: 1,
    color: 'green'
  },
  {
    id: 'advantage',
    name: 'Formule Avantage',
    description: 'Pack complet de trois formations',
    price: 24900,
    threshold: 3,
    color: 'orange',
    recommended: true
  },
  {
    id: 'excellence',
    name: 'Formule Excellence',
    description: 'Formations illimitées pendant 12 mois',
    price: 39500,
    threshold: 5,
    color: '#4F46E5'
  }
] as const;

interface CartItem {
  id: number;
  price: number;
  learning_path?: LearningPaths;
  concour?: Concours;
}

// Définir un type pour les formules de prix
type PricingPlan = {
  id: 'essential' | 'advantage' | 'excellence';
  name: string;
  description: string;
  color: string;
  threshold: number;
  price?: number;
  basePrice?: number;
  additionalPrice?: number;
  recommended?: boolean;
}

type NextFormula = {
  formula: PricingPlan;
  itemsNeeded: number;
}

// Composant bouton pulsant
const PulsingButton: React.FC<{
  onPress: () => void;
  color: string;
  icon: string;
  label?: string;
}> = ({ onPress, color, icon, label }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.2,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      })
    ]);

    Animated.loop(pulse).start();

    return () => {
      pulseAnim.stopAnimation();
    };
  }, []);

  return (
      <TouchableOpacity
          onPress={onPress}
          style={styles.pulseButtonContainer}
      >
        <Animated.View
            style={[
              styles.pulseButton,
              {
                backgroundColor: color,
                transform: [{ scale: pulseAnim }]
              }
            ]}
        >
          <MaterialCommunityIcons name={icon  as any} size={24} color="#FFFFFF" />
        </Animated.View>
        {label && <Text style={styles.pulseButtonLabel}>{label}</Text>}
      </TouchableOpacity>
  );
};

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export default function CartScreen() {
  const { cartItems, removeFromCart, currentCart } = useCart();
  const isDark = useColorScheme() === 'dark';
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  const { user } = useAuth();

  // Déterminer si le mode prix fixe est activé (l'utilisateur a déjà un achat)
  const FIXED_PRICE_MODE = (user?.user_program_enrollments?.length || 0)  > 0 || false;

  // fetch promgram using swr instead
  const { data: programs, mutate } = useSWR<CartItem[]>(`cart_items/${currentCart?.id}`, async () => {
    const { data } = await supabase
        .from("cart_items")
        .select(
            "*, program:concours_learningpaths(*, concour : concours(name, school:schools(name)), learning_path:learning_paths(id, title))"
        )
        .eq("cart_id", currentCart?.id);

    return data?.map((item) => item.program) || [];
  })

  // État pour stocker l'alerte de formule suivante potentielle
  const [nextFormulaInfo, setNextFormulaInfo] = useState<NextFormula | null>(null);

  // État pour afficher/masquer le modal de suggestion de formule
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  useEffect(() => {
    mutate();

    // En mode prix fixe, pas besoin de suggérer de formule
    if (!FIXED_PRICE_MODE) {
      // Vérifier si l'utilisateur est proche d'une formule avantageuse
      const nextFormula = getNextPossibleFormula();
      setNextFormulaInfo(nextFormula);
    } else {
      setNextFormulaInfo(null);
    }
  }, [cartItems, currentCart?.id, programs, FIXED_PRICE_MODE]);

  // Calcul du prix régulier (sans remise)
  const regularTotal = useMemo(() =>
          programs?.reduce((sum, item) => sum + item.price, 0),
      [programs]
  );

  // Déterminer quelle formule est applicable selon le nombre d'items
  const applicableFormula = useMemo<PricingPlan | null>(() => {
    // En mode prix fixe, pas de formule applicable
    if (FIXED_PRICE_MODE) return null;

    const itemCount = cartItems.length;

    if (itemCount >= 5) {
      // Formule Excellence: uniquement à partir de 5 formations
      return PRICING_PLANS.find(plan => plan.id === 'excellence') || null;
    } else if (itemCount === 3) {
      // Formule Avantage: uniquement pour exactement 3 formations
      return PRICING_PLANS.find(plan => plan.id === 'advantage') || null;
    } else if (itemCount > 0) {
      // Formule Essentielle: pour 1, 2 ou 4 formations
      return PRICING_PLANS.find(plan => plan.id === 'essential') || null;
    }

    return null;
  }, [cartItems, FIXED_PRICE_MODE]);

  // Calculer la prochaine formule possible (seulement en mode normal)
  const getNextPossibleFormula = useCallback((): NextFormula | null => {
    if (FIXED_PRICE_MODE) return null;

    const itemCount = cartItems.length;

    if (itemCount === 0) return null;

    if (itemCount === 2) {
      // À un item de la formule Avantage
      const advantageFormula = PRICING_PLANS.find(plan => plan.id === 'advantage');
      if (advantageFormula) {
        return { formula: advantageFormula, itemsNeeded: 1 };
      }
    } else if (itemCount === 4) {
      // À un item de la formule Excellence
      const excellenceFormula = PRICING_PLANS.find(plan => plan.id === 'excellence');
      if (excellenceFormula) {
        return { formula: excellenceFormula, itemsNeeded: 1 };
      }
    }

    return null;
  }, [cartItems, FIXED_PRICE_MODE]);

  // Calcul du prix avec l'offre applicable ou mode prix fixe
  const discountedTotal = useMemo((): number | undefined => {
    if (!cartItems.length) return 0;

    // Si mode prix fixe, multiplier le nombre d'items par le prix fixe
    if (FIXED_PRICE_MODE) {
      return cartItems.length * FIXED_PRICE;
    }

    if (!applicableFormula) return regularTotal;

    switch (applicableFormula.id) {
      case 'excellence':
        // Prix fixe pour 5 formations ou plus
        return applicableFormula.price || 0;
      case 'advantage':
        // Prix fixe uniquement pour exactement 3 formations
        if (cartItems.length === 3) {
          return applicableFormula.price || 0;
        } else {
          // Sinon on applique la formule essentielle
          const essentialFormula = PRICING_PLANS.find(plan => plan.id === 'essential');
          if (!essentialFormula) return regularTotal;

          const firstCoursePrice = essentialFormula.basePrice || 0;
          const additionalCoursesPrice = (cartItems.length - 1) * (essentialFormula.additionalPrice || 0);
          return firstCoursePrice + additionalCoursesPrice;
        }
      case 'essential':
        // Première formation à prix normal + formations additionnelles à prix réduit
        const firstCoursePrice = applicableFormula.basePrice || 0;
        const additionalCoursesPrice = (cartItems.length - 1) * (applicableFormula.additionalPrice || 0);
        return firstCoursePrice + additionalCoursesPrice;
      default:
        return regularTotal;
    }
  }, [cartItems, regularTotal, applicableFormula, FIXED_PRICE_MODE]);

  // Calcul des économies
  const savings = (regularTotal || 0) - (discountedTotal || 0);

  // Gestion du bouton pulsant
  const handlePulseButtonPress = () => {
    setShowFormulaModal(true);
  };

  const renderItem = ({ item }: ListRenderItemInfo<unknown>) => {
    // Déterminer le prix à afficher
    const displayPrice = FIXED_PRICE_MODE ? FIXED_PRICE : (item as CartItem).price;
    const isDiscounted = FIXED_PRICE_MODE && displayPrice !== (item as CartItem).price;

    return (
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
            {isDiscounted && (
                <Text style={[styles.itemPriceStrikethrough, isDark && styles.itemPriceStrikethroughDark]}>
                  {(item as CartItem).price.toLocaleString('fr-FR')} FCFA
                </Text>
            )}
            <Text style={[styles.itemPrice, isDark && styles.itemPriceDark]}>
              {displayPrice.toLocaleString('fr-FR')} FCFA
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
  };

  // Modal pour afficher les détails de la formule suivante
  const renderFormulaModal = () => {
    if (!nextFormulaInfo) return null;

    return (
        <Modal
            visible={showFormulaModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowFormulaModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, isDark && styles.modalContainerDark]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
                  Offre spéciale
                </Text>
                <TouchableOpacity onPress={() => setShowFormulaModal(false)}>
                  <MaterialCommunityIcons
                      name="close"
                      size={24}
                      color={isDark ? theme.color.gray[300] : theme.color.gray[700]}
                  />
                </TouchableOpacity>
              </View>

              <View style={[styles.nextFormulaModalCard, { borderColor: nextFormulaInfo.formula.color, backgroundColor: `${nextFormulaInfo.formula.color}15` }]}>
                <View style={styles.nextFormulaModalContent}>
                  <MaterialCommunityIcons
                      name="lightbulb-outline"
                      size={40}
                      color={nextFormulaInfo.formula.color}
                      style={styles.nextFormulaModalIcon}
                  />

                  <Text style={[styles.nextFormulaModalTitle, { color: nextFormulaInfo.formula.color }]}>
                    {nextFormulaInfo.formula.name}
                  </Text>

                  <Text style={[styles.nextFormulaModalDescription, isDark && styles.nextFormulaModalDescriptionDark]}>
                    {nextFormulaInfo.formula.id === 'advantage'
                        ? "Ajoutez 1 formation pour profiter du pack à 24 900 FCFA. Cette offre spéciale vous permet d'économiser sur le prix régulier."
                        : "Ajoutez 1 formation pour accéder à l'offre illimitée à 39 500 FCFA et profitez de toutes nos formations sans limite."}
                  </Text>

                  <View style={styles.nextFormulaModalStats}>
                    <View style={styles.nextFormulaModalStat}>
                      <Text style={[styles.nextFormulaModalStatLabel, isDark && styles.nextFormulaModalStatLabelDark]}>
                        actuelles
                      </Text>
                      <Text style={[styles.nextFormulaModalStatValue, isDark && styles.nextFormulaModalStatValueDark]}>
                        {cartItems.length}
                      </Text>
                    </View>

                    <View style={styles.nextFormulaModalStat}>
                      <Text style={[styles.nextFormulaModalStatLabel, isDark && styles.nextFormulaModalStatLabelDark]}>
                        nécessaires
                      </Text>
                      <Text style={[styles.nextFormulaModalStatValue, isDark && styles.nextFormulaModalStatValueDark]}>
                        {nextFormulaInfo.formula.id === 'advantage' ? '3' : '5'}
                      </Text>
                    </View>

                    <View style={styles.nextFormulaModalStat}>
                      <Text style={[styles.nextFormulaModalStatLabel, isDark && styles.nextFormulaModalStatLabelDark]}>
                        à ajouter
                      </Text>
                      <Text style={[styles.nextFormulaModalStatValue, { color: nextFormulaInfo.formula.color }]}>
                        {nextFormulaInfo.itemsNeeded}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                      style={[styles.browseMoreButtonLarge, { backgroundColor: nextFormulaInfo.formula.color }]}
                      onPress={() => {
                        setShowFormulaModal(false);
                        router.push('/(app)/(catalogue)/shop');
                      }}
                  >
                    <MaterialCommunityIcons name="shopping" size={20} color="#FFFFFF" />
                    <Text style={styles.browseMoreButtonTextLarge}>
                      Voir plus de formations
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
    );
  };

  // Bannière pour mode prix fixe
  const renderFixedPriceBanner = () => {
    if (!FIXED_PRICE_MODE || !cartItems.length) return null;

    return (
        <View style={[styles.offerCard, { borderColor: '#166534', backgroundColor: '#F0FDF4' }]}>
          <View style={styles.offerHeader}>
            <MaterialCommunityIcons
                name="tag-heart"
                size={20}
                color="#166534"
            />
            <Text style={[styles.offerTitle, { color: '#166534' }]}>
              Tarif préférentiel appliqué
            </Text>
          </View>

          <View style={styles.offerDetails}>
            <Text style={[styles.offerDescription, isDark && styles.offerDescriptionDark]}>
              En tant que client fidèle, vous bénéficiez du tarif réduit de {FIXED_PRICE.toLocaleString('fr-FR')} FCFA sur toutes vos formations.
            </Text>

            <View style={styles.priceComparison}>
              <Text style={[styles.regularPrice, isDark && styles.regularPriceDark]}>
                Prix standard: {regularTotal?.toLocaleString('fr-FR')} FCFA
              </Text>

              <View style={styles.discountRow}>
                <Text style={[styles.discountLabel, isDark && styles.discountLabelDark]}>
                  Économie:
                </Text>
                <Text style={[styles.discountAmount, { color: '#166534' }]}>
                  -{savings.toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
            </View>
          </View>
        </View>
    );
  };

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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
            >
              <MaterialCommunityIcons
                  name="arrow-left"
                  size={20}
                  color={isDark ? '#FFF' : '#000'}
              />
            </TouchableOpacity>
            <Text style={[styles.stickyTitle, isDark && styles.stickyTitleDark]}>
              Panier ({cartItems.length})
            </Text>
          </View>
          <Text style={styles.stickyTotal}>
            {discountedTotal?.toLocaleString('fr-FR')} FCFA
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

        {/* Bouton pulsant pour proposition de formule (uniquement en mode normal) */}
        {nextFormulaInfo && !FIXED_PRICE_MODE && (
            <View style={styles.pulseButtonWrapper}>
              <PulsingButton
                  onPress={handlePulseButtonPress}
                  color={nextFormulaInfo.formula.color}
                  icon="lightbulb-outline"
              />
            </View>
        )}

        <View style={[styles.footer, isDark && styles.footerDark]}>
          <View style={styles.footerContent}>
            {/* Bannière mode prix fixe (uniquement en mode prix fixe) */}
            {FIXED_PRICE_MODE && renderFixedPriceBanner()}

            {/* Affichage de l'offre groupe quand applicable (uniquement en mode normal) */}
            {!FIXED_PRICE_MODE && applicableFormula && savings > 0 && (
                <View style={[styles.offerCard, { borderColor: applicableFormula.color, backgroundColor: `${applicableFormula.color}15` }]}>
                  <View style={styles.offerHeader}>
                    <MaterialCommunityIcons
                        name="tag-multiple"
                        size={20}
                        color={applicableFormula.color}
                    />
                    <Text style={[styles.offerTitle, { color: applicableFormula.color }]}>
                      {applicableFormula.name} appliquée
                    </Text>
                  </View>

                  <View style={styles.offerDetails}>
                    <Text style={[styles.offerDescription, isDark && styles.offerDescriptionDark]}>
                      {applicableFormula.id === 'excellence'
                          ? "Formule pour un accès illimité à toutes nos formations"
                          : applicableFormula.id === 'advantage'
                              ? "Pack de 3 formations à prix avantageux"
                              : "Prix réduit pour chaque formation supplémentaire"}
                    </Text>

                    <View style={styles.priceComparison}>
                      <Text style={[styles.regularPrice, isDark && styles.regularPriceDark]}>
                        Prix standard: {regularTotal?.toLocaleString('fr-FR')} FCFA
                      </Text>

                      <View style={styles.discountRow}>
                        <Text style={[styles.discountLabel, isDark && styles.discountLabelDark]}>
                          Économie:
                        </Text>
                        <Text style={[styles.discountAmount, { color: applicableFormula.color }]}>
                          -{savings.toLocaleString('fr-FR')} FCFA
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
            )}

            <View style={styles.totalInfo}>
              <Text style={[styles.totalLabel, isDark && styles.totalLabelDark]}>Total</Text>
              <Text style={[styles.totalAmount, isDark && styles.totalAmountDark]}>
                {discountedTotal?.toLocaleString('fr-FR')} FCFA
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

        {/* Modal pour la suggestion de formule */}
        {renderFormulaModal()}
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
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  stickyTitleDark: {
    color: '#F9FAFB',
  },
  stickyTotal: {
    fontFamily: theme.typography.fontFamily,
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
    shadowOffset: {width: 0, height: 2},
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
    fontFamily: theme.typography.fontFamily,
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
    fontFamily: theme.typography.fontFamily,
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
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
  },
  itemPriceDark: {
    color: '#86EFAC',
  },
  itemPriceStrikethrough: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  itemPriceStrikethroughDark: {
    color: '#9CA3AF',
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
    shadowOffset: {width: 0, height: -2},
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
    gap: 16,
  },
  backButton: {
    marginRight: 10,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  // Styles pour le bouton pulsant
  pulseButtonWrapper: {
    position: 'absolute',
    bottom: 84,
    right: 16,
    zIndex: 100,
  },
  pulseButtonContainer: {
    alignItems: 'center',
  },
  pulseButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pulseButtonLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: '#4B5563',
    marginTop: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  // Styles pour le modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalContainerDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.gray[200],
  },
  modalTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalTitleDark: {
    color: '#F9FAFB',
  },
  nextFormulaModalCard: {
    borderWidth: 1,
    borderRadius: 12,
    margin: 16,
    overflow: 'hidden',
  },
  nextFormulaModalContent: {
    padding: 16,
    alignItems: 'center',
  },
  nextFormulaModalIcon: {
    marginVertical: 8,
  },
  nextFormulaModalTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 22,
    fontWeight: '700',
    marginVertical: 8,
    textAlign: 'center',
  },
  nextFormulaModalDescription: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 16,
  },
  nextFormulaModalDescriptionDark: {
    color: '#9CA3AF',
  },
  nextFormulaModalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 16,
  },
  nextFormulaModalStat: {
    alignItems: 'center',
  },
  nextFormulaModalStatLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  nextFormulaModalStatLabelDark: {
    color: '#9CA3AF',
  },
  nextFormulaModalStatValue: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  nextFormulaModalStatValueDark: {
    color: '#F9FAFB',
  },
  browseMoreButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 8,
  },
  browseMoreButtonTextLarge: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  offerTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
  },
  offerDetails: {
    gap: 8,
  },
  priceComparison: {
    gap: 4,
  },
  regularPrice: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  regularPriceDark: {
    color: '#9CA3AF',
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  discountLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: '#4B5563',
  },
  discountLabelDark: {
    color: '#9CA3AF',
  },
  discountAmount: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: '700',
  },
  totalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  totalLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: '#4B5563',
  },
  totalLabelDark: {
    color: '#9CA3AF',
  },
  totalAmount: {
    fontFamily: theme.typography.fontFamily,
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
    marginTop: 8,
  },
  checkoutButtonDark: {
    backgroundColor: '#86EFAC',
  },
  checkoutButtonText: {
    fontFamily: theme.typography.fontFamily,
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
    fontFamily: theme.typography.fontFamily,
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
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  browseCatalogTextDark: {
    color: '#022c22',
  },
  offerCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  offerDescription: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 8,
  },
  offerDescriptionDark: {
    color: '#9CA3AF',
  },
});