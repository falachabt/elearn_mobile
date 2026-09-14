import React, { useState, FC } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { theme } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import WhatsAppContact from "@/components/WhatsappSupport";
import {
  PhoneNumberField,
  findPhoneCountryByName,
  isProfileCountrySupported,
} from "@/components/payment/PhoneNumberField";
import { UnsupportedCountryBanner } from "@/components/payment/UnsupportedCountryBanner";
import type { Country } from "@/components/ui/CountryPickerBottomSheet";
import { currencyForCountryName } from "@/constants/pawapayCountries";
import { formatPriceWithConversion } from "@/services/currency.service";
import type { ExchangeRate } from "@/services/currency.service";

interface NextPaymentOptionsProps {
  programName: string;
  installmentAmount: number;
  currentInstallment: number;
  totalInstallments: number;
  isDark: boolean;
  isLoading: boolean;
  defaultCountryName?: string | null;
  exchangeRates?: ExchangeRate[];
  onPayment: (phoneNumber: string, callingCode: string, currencyCode: string) => void;
}

export const NextPaymentOptions: FC<NextPaymentOptionsProps> = ({
  programName,
  installmentAmount,
  currentInstallment,
  totalInstallments,
  isDark,
  isLoading,
  defaultCountryName,
  exchangeRates = [],
  onPayment,
}) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [country, setCountry] = useState<Country>(() => findPhoneCountryByName(defaultCountryName));
  const isPhoneValid = phoneNumber.trim().length > 0 && country.regex.test(phoneNumber);
  const currencyCode = currencyForCountryName(country.name);

  const localPriceLabel = (amountXaf: number) => formatPriceWithConversion(amountXaf, currencyCode, exchangeRates);

  const handlePayment = () => {
    onPayment(phoneNumber, country.code.replace('+', ''), currencyCode);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.paymentOptionsContainer}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.paymentHeader}>
          <ThemedText style={styles.paymentTitle}>
            Prochain versement - {programName}
          </ThemedText>
          <ThemedText style={styles.paymentAmount}>
            {localPriceLabel(installmentAmount)}
          </ThemedText>
          <ThemedText style={styles.installmentInfo}>
            Versement {currentInstallment + 1}/{totalInstallments}
          </ThemedText>
        </View>

        {!isProfileCountrySupported(defaultCountryName) && (
          <UnsupportedCountryBanner countryName={defaultCountryName} isDark={isDark} />
        )}

        <PhoneNumberField
          localNumber={phoneNumber}
          onChangeLocalNumber={setPhoneNumber}
          country={country}
          onChangeCountry={setCountry}
          isDark={isDark}
        />

        <View style={styles.promoCodeDisabledContainer}>
          <ThemedText style={styles.promoCodeDisabledText}>
            Les codes promo ne sont pas disponibles pour les prochains
            versements
          </ThemedText>
        </View>

        <View style={styles.paymentMethodsContainer}>
          <ThemedText style={styles.paymentMethodsTitle}>
            Méthode de paiement
          </ThemedText>

          <TouchableOpacity
            style={[
              styles.paymentMethodButton,
              {
                backgroundColor: isDark ? theme.color.primary[600] : theme.color.primary[500],
                opacity: isLoading || !isPhoneValid ? 0.5 : 1,
              },
            ]}
            onPress={handlePayment}
            disabled={isLoading || !isPhoneValid}
          >
            <View style={styles.paymentMethodContent}>
              <MaterialCommunityIcons
                name="cellphone"
                size={24}
                color="#FFFFFF"
              />
              <ThemedText
                style={[styles.paymentMethodText, { color: "#FFFFFF" }]}
              >
                Payer le versement
              </ThemedText>
            </View>
            {isLoading && <ActivityIndicator size="small" color="#FFFFFF" />}
          </TouchableOpacity>
        </View>

        {/* WhatsApp Support */}
        <WhatsAppContact
          message={`Bonjour, j'ai besoin d'aide pour payer mon versement ${currentInstallment + 1}/${totalInstallments} pour ${programName}`}
          style={{ marginTop: 16, marginBottom: 16 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  paymentOptionsContainer: {
    flex: 1,
    padding: 16,
  },
  paymentHeader: {
    marginBottom: 24,
  },
  paymentTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  paymentAmount: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "600",
    color: theme.color.primary[500],
  },
  installmentInfo: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[600],
    marginTop: 4,
  },
  inputContainer: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  inputLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
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
  promoCodeDisabledContainer: {
    backgroundColor: theme.color.gray[100],
    borderWidth: 1,
    borderColor: theme.color.gray[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  promoCodeDisabledText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[600],
    fontStyle: "italic",
  },
  paymentMethodsContainer: {
    marginTop: 8,
  },
  paymentMethodsTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  paymentMethodButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.color.gray[200],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  paymentMethodContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentMethodText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 12,
  },
});
