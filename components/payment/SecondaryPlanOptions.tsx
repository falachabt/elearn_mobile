import React, { useEffect, useState, FC } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { theme } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import WhatsAppContact from "@/components/WhatsappSupport";
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
import {
  PhoneNumberField,
  findPhoneCountryByName,
  isProfileCountrySupported,
} from "@/components/payment/PhoneNumberField";
import { UnsupportedCountryBanner } from "@/components/payment/UnsupportedCountryBanner";
import type { Country } from "@/components/ui/CountryPickerBottomSheet";
import { currencyForCountryName } from "@/constants/pawapayCountries";

const PLANS: SecondaryPlan[] = ["monthly", "quarterly", "semiannual"];

interface SecondaryPlanOptionsProps {
  programName: string;
  isDark: boolean;
  isLoading: boolean;
  defaultCountryName?: string | null;
  onPayment: (data: { phoneNumber: string; callingCode: string; plan: SecondaryPlan; amountXaf: number }) => void;
  /** Si fourni, le plan a déjà été choisi (SecondaryPlanPickerSheet) -- on
   * saute le choix de plan et va direct au numéro de téléphone. */
  preselectedPlan?: SecondaryPlan;
}

export const SecondaryPlanOptions: FC<SecondaryPlanOptionsProps> = ({
  programName,
  isDark,
  isLoading,
  defaultCountryName,
  onPayment,
  preselectedPlan,
}) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [country, setCountry] = useState<Country>(() => findPhoneCountryByName(defaultCountryName));
  const isPhoneValid = phoneNumber.trim().length > 0 && country.regex.test(phoneNumber);
  const currencyCode = currencyForCountryName(country.name);
  const [selectedPlan, setSelectedPlan] = useState<SecondaryPlan>(preselectedPlan ?? "monthly");
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [plansConfig, setPlansConfig] = useState<Record<SecondaryPlan, SecondaryPlanConfig> | null>(null);

  useEffect(() => {
    getExchangeRates().then(setRates);
    getSecondaryPlansConfig().then(setPlansConfig);
  }, []);

  const priceXafFor = (plan: SecondaryPlan) => plansConfig?.[plan]?.price_xaf;

  const localPriceLabel = (plan: SecondaryPlan) => {
    const priceXaf = priceXafFor(plan);
    if (priceXaf === undefined) return "…";
    const hasRate = rates.some((r) => r.currency_code === currencyCode);
    if (currencyCode === "XAF" || !hasRate) return `${priceXaf} FCFA`;
    const local = convertXafToLocal(priceXaf, currencyCode, rates);
    return `${formatLocalPrice(local, currencyCode)} (${priceXaf} FCFA)`;
  };

  const descriptionFor = (plan: SecondaryPlan) =>
    plansConfig ? secondaryPlanDescription(plansConfig[plan].duration_months) : "";

  const handlePayment = () => {
    const amountXaf = priceXafFor(selectedPlan);
    if (amountXaf === undefined) return; // config pas encore chargée
    onPayment({ phoneNumber, callingCode: country.code.replace('+', ''), plan: selectedPlan, amountXaf });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Abonnement pour {programName}</ThemedText>
          <ThemedText style={styles.subtitle}>
            {preselectedPlan
              ? "Confirmez votre numéro pour finaliser l'abonnement"
              : "Choisissez la durée de votre abonnement"}
          </ThemedText>
        </View>

        {preselectedPlan ? (
          <View style={[styles.planList, isDark && styles.planListDark]}>
            <View style={[styles.planOption, styles.planSelected]}>
              <MaterialCommunityIcons
                name="check-circle"
                size={24}
                color={isDark ? theme.color.primary[300] : theme.color.primary[500]}
              />
              <View style={styles.planTextContainer}>
                <ThemedText style={styles.planTitle}>
                  {SECONDARY_PLAN_LABELS[preselectedPlan]} — {localPriceLabel(preselectedPlan)}
                </ThemedText>
                <ThemedText style={styles.planDescription}>
                  {descriptionFor(preselectedPlan)}
                </ThemedText>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.planList, isDark && styles.planListDark]}>
            {PLANS.map((plan) => (
              <TouchableOpacity
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
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!isProfileCountrySupported(defaultCountryName) && (
          <UnsupportedCountryBanner countryName={defaultCountryName} isDark={isDark} />
        )}

        <PhoneNumberField
          label="Numéro de téléphone (Mobile Money)"
          localNumber={phoneNumber}
          onChangeLocalNumber={setPhoneNumber}
          country={country}
          onChangeCountry={setCountry}
          isDark={isDark}
        />

        <TouchableOpacity
          style={[
            styles.payButton,
            {
              backgroundColor: isDark ? theme.color.primary[600] : theme.color.primary[500],
              opacity: isLoading || !isPhoneValid || !plansConfig ? 0.5 : 1,
            },
          ]}
          onPress={handlePayment}
          disabled={isLoading || !isPhoneValid || !plansConfig}
        >
          <View style={styles.payButtonContent}>
            <MaterialCommunityIcons name="cellphone" size={24} color="#FFFFFF" />
            <ThemedText style={styles.payButtonText}>Payer maintenant</ThemedText>
          </View>
          {isLoading && <ActivityIndicator size="small" color="#FFFFFF" />}
        </TouchableOpacity>

        <WhatsAppContact
          message={`Bonjour, j'ai besoin d'aide pour m'abonner à ${programName}`}
          style={{ marginTop: 16, marginBottom: 16 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 24 },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[600],
  },
  planList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  planListDark: { backgroundColor: theme.color.dark.background.secondary },
  planOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  planSelected: { backgroundColor: "rgba(76, 175, 80, 0.1)" },
  planTextContainer: { marginLeft: 12, flex: 1 },
  planTitle: { fontFamily: theme.typography.fontFamily, fontSize: 16, fontWeight: "600" },
  planDescription: { fontFamily: theme.typography.fontFamily, fontSize: 13, color: theme.color.gray[600] },
  inputContainer: { marginBottom: 16, paddingHorizontal: 4 },
  inputLabel: { fontFamily: theme.typography.fontFamily, fontSize: 14, fontWeight: "500", marginBottom: 8 },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.color.gray[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
  },
  inputDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.gray[600],
    color: "#FFFFFF",
  },
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
  },
  payButtonContent: { flexDirection: "row", alignItems: "center" },
  payButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
    color: "#FFFFFF",
  },
});
