import React, { useState, FC } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { theme } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { supabase } from "@/lib/supabase";
import WhatsAppContact from "@/components/WhatsappSupport";
import { PromoCode } from "@/types/payment.types";
import { logger } from "@/utils/logger";

interface PaymentOptionsProps {
  programName: string;
  programPrice: number;
  isDark: boolean;
  isLoading: boolean;
  onPayment: (paymentData: {
    phoneNumber: string;
    promoCode: string;
    promoCodeDetails: PromoCode | null;
    isInstallment: boolean;
    totalInstallments: number;
  }) => void;
}

export const PaymentOptions: FC<PaymentOptionsProps> = ({
  programName,
  programPrice,
  isDark,
  isLoading,
  onPayment,
}) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoCodeStatus, setPromoCodeStatus] = useState<
    "idle" | "verifying" | "valid" | "invalid"
  >("idle");
  const [promoCodeDetails, setPromoCodeDetails] = useState<PromoCode | null>(null);
  const [promoCodeError, setPromoCodeError] = useState<string | null>(null);
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState(4);

  const displayAmount = () => {
    if (isInstallment) {
      return Math.ceil(programPrice / totalInstallments);
    }
    return programPrice;
  };

  const verifyPromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoCodeStatus("idle");
      setPromoCodeDetails(null);
      setPromoCodeError(null);
      return;
    }

    setPromoCodeStatus("verifying");
    try {
      const { data: user } = await supabase.auth.getUser();
      if (user?.user?.id) {
        const { data: existingPromoUsage, error: usageError } = await supabase
          .from("payments")
          .select("id")
          .eq("user_id", user.user.id)
          .eq("status", "completed")
          .not("promo_code_id", "is", null)
          .limit(1);

        if (
          !usageError &&
          existingPromoUsage &&
          existingPromoUsage.length > 0
        ) {
          setPromoCodeStatus("invalid");
          setPromoCodeDetails(null);
          setPromoCodeError(
            "Vous avez déjà utilisé un code promo dans une commande précédente."
          );
          return;
        }
      }

      const { data, error } = await supabase
        .from("influencers")
        .select(
          "id, name, promo_code, discount_percentage, valid_until, status"
        )
        .eq("promo_code", promoCode)
        .eq("status", "active")
        .single();

      if (error || !data) {
        setPromoCodeStatus("invalid");
        setPromoCodeDetails(null);
        setPromoCodeError("Code promo invalide ou expiré");
        return;
      }

      const now = new Date();
      const validUntil = data.valid_until ? new Date(data.valid_until) : null;

      if (validUntil && validUntil < now) {
        setPromoCodeStatus("invalid");
        setPromoCodeDetails(null);
        setPromoCodeError("Ce code promo a expiré");
        return;
      }

      setPromoCodeStatus("valid");
      setPromoCodeError(null);
      setPromoCodeDetails({
        id: data.id,
        code: data.promo_code,
        discount_percentage: data.discount_percentage,
        is_active: data.status === "active",
        created_at: "",
        updated_at: "",
      });
    } catch (err) {
      logger.error("Error verifying promo code:", err);
      setPromoCodeStatus("invalid");
      setPromoCodeDetails(null);
      setPromoCodeError("Erreur lors de la vérification du code promo");
    }
  };

  const handlePayment = () => {
    onPayment({
      phoneNumber,
      promoCode,
      promoCodeDetails,
      isInstallment,
      totalInstallments,
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.paymentOptionsContainer}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.paymentHeader}>
          <ThemedText style={styles.paymentTitle}>
            Paiement pour {programName}
          </ThemedText>
          <ThemedText style={styles.paymentAmount}>
            {displayAmount()} FCFA
            {isInstallment && ` (Versement 1/${totalInstallments})`}
          </ThemedText>
        </View>

        <View
          style={[
            styles.paymentTypeContainer,
            isDark && styles.paymentTypeContainerDark,
          ]}
        >
          <TouchableOpacity
            style={[
              styles.paymentTypeOption,
              !isInstallment && styles.paymentTypeSelected,
            ]}
            onPress={() => setIsInstallment(false)}
          >
            <MaterialCommunityIcons
              name={!isInstallment ? "radiobox-marked" : "radiobox-blank"}
              size={24}
              color={
                !isInstallment ? (isDark ? theme.color.success[300] : theme.color.success[500]) : theme.color.gray[400]
              }
            />
            <View style={styles.paymentTypeTextContainer}>
              <ThemedText style={styles.paymentTypeTitle}>
                Paiement complet
              </ThemedText>
              <ThemedText style={styles.paymentTypeDescription}>
                Payez {programPrice} FCFA en une seule fois
              </ThemedText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentTypeOption,
              isInstallment && styles.paymentTypeSelected,
            ]}
            onPress={() => setIsInstallment(true)}
          >
            <MaterialCommunityIcons
              name={isInstallment ? "radiobox-marked" : "radiobox-blank"}
              size={24}
              color={
                isInstallment ? (isDark ? theme.color.success[300] : theme.color.success[500]) : theme.color.gray[400]
              }
            />
            <View style={styles.paymentTypeTextContainer}>
              <ThemedText style={styles.paymentTypeTitle}>
                Paiement échelonné
              </ThemedText>
              <ThemedText style={styles.paymentTypeDescription}>
                Payez en {totalInstallments} versements de{" "}
                {Math.ceil(programPrice / totalInstallments)} FCFA
              </ThemedText>
            </View>
          </TouchableOpacity>

          {isInstallment && (
            <View style={styles.installmentOptionsContainer}>
              <ThemedText style={styles.installmentOptionsTitle}>
                Nombre de versements
              </ThemedText>
              <View style={styles.installmentButtonsContainer}>
                {[2, 4].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.installmentButton,
                      totalInstallments === num &&
                        styles.installmentButtonSelected,
                    ]}
                    onPress={() => setTotalInstallments(num)}
                  >
                    <Text
                      style={[
                        styles.installmentButtonText,
                        totalInstallments === num &&
                          styles.installmentButtonTextSelected,
                      ]}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.inputContainer}>
          <ThemedText style={styles.inputLabel}>Numéro de téléphone</ThemedText>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="Ex: 6XXXXXXXX"
            placeholderTextColor={isDark ? theme.color.gray[600] : theme.color.gray[400]}
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
        </View>

        <View style={styles.inputContainer}>
          <ThemedText style={styles.inputLabel}>
            Code promo (optionnel)
          </ThemedText>
          <View style={styles.promoCodeContainer}>
            <TextInput
              style={[styles.promoCodeInput, isDark && styles.inputDark]}
              placeholder="Entrez votre code promo"
              placeholderTextColor={isDark ? theme.color.gray[600] : theme.color.gray[400]}
              value={promoCode}
              onChangeText={(text) => {
                setPromoCode(text);
                if (
                  promoCodeStatus === "valid" ||
                  promoCodeStatus === "invalid"
                ) {
                  setPromoCodeStatus("idle");
                  setPromoCodeError(null);
                }
              }}
            />
            <TouchableOpacity
              style={[
                styles.verifyButton,
                promoCodeStatus === "verifying" && styles.verifyingButton,
                promoCodeStatus === "valid" && styles.validButton,
                promoCodeStatus === "invalid" && styles.invalidButton,
              ]}
              onPress={verifyPromoCode}
              disabled={promoCodeStatus === "verifying" || !promoCode.trim()}
            >
              {promoCodeStatus === "verifying" ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : promoCodeStatus === "valid" ? (
                <MaterialCommunityIcons
                  name="check"
                  size={20}
                  color="#FFFFFF"
                />
              ) : promoCodeStatus === "invalid" ? (
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color="#FFFFFF"
                />
              ) : (
                <Text style={styles.verifyButtonText}>Vérifier</Text>
              )}
            </TouchableOpacity>
          </View>

          {promoCodeStatus === "valid" && promoCodeDetails && (
            <View style={styles.promoCodeValidContainer}>
              <MaterialCommunityIcons
                name="tag-check"
                size={20}
                color={isDark ? theme.color.success[300] : theme.color.success[500]}
              />
              <ThemedText style={styles.promoCodeValidText}>
                Code promo valide: {promoCodeDetails.discount_percentage}% de
                réduction
              </ThemedText>
            </View>
          )}

          {promoCodeStatus === "invalid" && promoCodeError && (
            <ThemedText style={styles.promoCodeErrorText}>
              {promoCodeError}
            </ThemedText>
          )}
        </View>

        <View style={styles.paymentMethodsContainer}>
          <ThemedText style={styles.paymentMethodsTitle}>
            Méthode de paiement
          </ThemedText>

          <TouchableOpacity
            style={[
              styles.paymentMethodButton,
              isDark && { backgroundColor: theme.color.dark.background.secondary, borderColor: theme.color.gray[600] },
              {
                backgroundColor: isDark ? theme.color.success[600] : theme.color.success[500],
                opacity: isLoading || !phoneNumber.trim() ? 0.5 : 1,
              },
            ]}
            onPress={handlePayment}
            disabled={isLoading || !phoneNumber.trim()}
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
                Payer maintenant
              </ThemedText>
            </View>
            {isLoading && <ActivityIndicator size="small" color="#FFFFFF" />}
          </TouchableOpacity>
        </View>

        {/* WhatsApp Support */}
        <WhatsAppContact
          message={`Bonjour, j'ai besoin d'aide pour effectuer un paiement pour ${programName}`}
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
    color: theme.color.success[500],
  },
  paymentTypeContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
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
  paymentTypeContainerDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  paymentTypeOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  paymentTypeSelected: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
  },
  paymentTypeTextContainer: {
    marginLeft: 12,
  },
  paymentTypeTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
  },
  paymentTypeDescription: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[600],
  },
  installmentOptionsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.color.gray[200],
  },
  installmentOptionsTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  installmentButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  installmentButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: theme.color.gray[200],
    alignItems: "center",
    justifyContent: "center",
  },
  installmentButtonSelected: {
    borderColor: theme.color.success[500],
    backgroundColor: "rgba(76, 175, 80, 0.1)",
  },
  installmentButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    color: theme.color.gray[600],
  },
  installmentButtonTextSelected: {
    color: theme.color.success[500],
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
  promoCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  promoCodeInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.color.gray[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
  },
  verifyButton: {
    marginLeft: 8,
    backgroundColor: theme.color.gray[600],
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  verifyingButton: {
    backgroundColor: theme.color.warning[500],
  },
  validButton: {
    backgroundColor: theme.color.success[500],
  },
  invalidButton: {
    backgroundColor: theme.color.error[500],
  },
  verifyButtonText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "600",
  },
  promoCodeValidContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  promoCodeValidText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.success[500],
    marginLeft: 8,
  },
  promoCodeErrorText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.error[500],
    marginTop: 8,
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
