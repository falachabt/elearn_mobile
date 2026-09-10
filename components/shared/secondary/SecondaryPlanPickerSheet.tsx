import React, { useEffect, useState } from "react";
import { View, StyleSheet, Pressable, Dimensions, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Modal from "react-native-modal";

import { ThemedText } from "@/components/ThemedText";
import { theme } from "@/constants/theme";
import {
  SECONDARY_PLAN_LABELS,
  SecondaryPlan,
  secondaryPlanDescription,
} from "@/types/secondaryPayment.types";
import {
  convertXafToLocal,
  formatLocalPrice,
  getExchangeRates,
  ExchangeRate,
} from "@/services/currency.service";
import {
  getSecondaryPlansConfig,
  SecondaryPlanConfig,
} from "@/services/secondary/secondaryPlansConfig.service";

const { height } = Dimensions.get("window");
const PLANS: SecondaryPlan[] = ["monthly", "quarterly", "semiannual"];

interface SecondaryPlanPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  programName: string;
  currencyCode: string;
  isDark: boolean;
  onNext: (plan: SecondaryPlan) => void;
}

/**
 * Étape "choisir un abonnement" -- déclenchée depuis le bouton "Débloquer la
 * formation" en haut de la page programme. Une fois un plan choisi, "Suivant"
 * ferme la sheet et renvoie vers la page de paiement (numéro + PawaPay) avec
 * le plan déjà sélectionné, sans redemander.
 */
export const SecondaryPlanPickerSheet: React.FC<SecondaryPlanPickerSheetProps> = ({
  visible,
  onClose,
  programName,
  currencyCode,
  isDark,
  onNext,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<SecondaryPlan>("monthly");
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [plansConfig, setPlansConfig] = useState<Record<SecondaryPlan, SecondaryPlanConfig> | null>(null);

  useEffect(() => {
    if (visible) {
      getExchangeRates().then(setRates);
      getSecondaryPlansConfig().then(setPlansConfig);
    }
  }, [visible]);

  const localPriceLabel = (plan: SecondaryPlan) => {
    const priceXaf = plansConfig?.[plan]?.price_xaf;
    if (priceXaf === undefined) return "…";
    if (currencyCode === "XAF") return `${priceXaf} FCFA`;
    const local = convertXafToLocal(priceXaf, currencyCode, rates);
    return `${formatLocalPrice(local, currencyCode)} (${priceXaf} FCFA)`;
  };

  const descriptionFor = (plan: SecondaryPlan) =>
    plansConfig ? secondaryPlanDescription(plansConfig[plan].duration_months) : "";

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={["down"]}
      style={styles.modal}
      backdropOpacity={0.5}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      useNativeDriver={true}
      statusBarTranslucent
      deviceHeight={height}
      propagateSwipe={Platform.OS === "ios"}
    >
      <View style={[styles.sheet, isDark && styles.sheetDark]}>
        <View style={[styles.handle, isDark && styles.handleDark]} />

        <ThemedText style={styles.title}>Débloquer {programName}</ThemedText>
        <ThemedText style={styles.subtitle}>
          Choisissez la durée de votre abonnement
        </ThemedText>

        <View style={[styles.planList, isDark && styles.planListDark]}>
          {PLANS.map((plan) => (
            <Pressable
              key={plan}
              style={[styles.planOption, selectedPlan === plan && styles.planSelected]}
              onPress={() => setSelectedPlan(plan)}
            >
              <MaterialCommunityIcons
                name={selectedPlan === plan ? "radiobox-marked" : "radiobox-blank"}
                size={24}
                color={
                  selectedPlan === plan
                    ? isDark
                      ? theme.color.primary[300]
                      : theme.color.primary[500]
                    : theme.color.gray[400]
                }
              />
              <View style={styles.planTextContainer}>
                <ThemedText style={styles.planTitle}>
                  {SECONDARY_PLAN_LABELS[plan]} — {localPriceLabel(plan)}
                </ThemedText>
                <ThemedText style={styles.planDescription}>
                  {descriptionFor(plan)}
                </ThemedText>
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.nextButton, { backgroundColor: isDark ? theme.color.primary[600] : theme.color.primary[500] }]}
          onPress={() => onNext(selectedPlan)}
        >
          <ThemedText style={styles.nextButtonText}>Suivant</ThemedText>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: { margin: 0, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  sheetDark: { backgroundColor: theme.color.dark.background.secondary },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: theme.color.gray[300],
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
  },
  handleDark: { backgroundColor: theme.color.gray[600] },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[600],
    marginBottom: 16,
  },
  planList: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 6,
    marginBottom: 20,
  },
  planListDark: { backgroundColor: theme.color.dark.background.primary },
  planOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  planSelected: { backgroundColor: "rgba(76, 175, 80, 0.1)" },
  planTextContainer: { marginLeft: 12, flex: 1 },
  planTitle: { fontFamily: theme.typography.fontFamily, fontSize: 15, fontWeight: "600" },
  planDescription: { fontFamily: theme.typography.fontFamily, fontSize: 13, color: theme.color.gray[600] },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingVertical: 14,
    gap: 8,
  },
  nextButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
