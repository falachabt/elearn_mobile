import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Linking,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { theme } from "@/constants/theme";
import { useProgramPayment } from "@/hooks/useProgramPayment";
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import {
  usePricing,
  isFixedPriceModeActive,
  getDisplayPrice,
} from "@/utils/pricing";
import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/useUserInfo";
import WhatsAppContact from "@/components/WhatsappSupport";

// Types and Enums
export enum PaymentFlowState {
  LOADING = "loading",

  INSTRUCTIONS = "instructions",

  PAYMENT_OPTIONS = "payment_options",
  PROCESSING = "processing",
  VERIFYING = "verifying",
  SUCCESS = "success",
  FAILED = "failed",
  CANCELED = "canceled",
  INSTALLMENT_DETAILS = "installment_details",

  // Nouveaux états pour les paiements d'échéances
  NEXT_PAYMENT_OPTIONS = "next_payment_options",
  NEXT_PAYMENT_PROCESSING = "next_payment_processing",
  NEXT_PAYMENT_VERIFYING = "next_payment_verifying",
  NEXT_PAYMENT_SUCCESS = "next_payment_success",
  NEXT_PAYMENT_FAILED = "next_payment_failed",
  NEXT_PAYMENT_CANCELED = "next_payment_canceled",
}

export interface Payment {
  id: string;
  user_id?: string;
  program_id?: number | string;
  amount: number;
  payment_status: string;
  payment_reference: string | null;
  payment_date?: string | null;
  created_at: string | null;
  updated_at?: string | null;
  expiry_date?: string | null;
  is_installment?: boolean | null;
  total_installments?: number | null;
  current_installment?: number | null;
  next_payment_due_date?: string | null;
  total_amount?: number | null;
  promo_code_id?: string | null;
  parent_payment_id?: string | null;
  has_seen_result?: boolean | null;
  [key: string]: unknown;
}

export interface PromoCodeDetails {
  id: string;
  discount_percentage: number;
  [key: string]: unknown;
}

export interface PaymentContextData {
  programId: string | null;
  programName: string;
  programPrice: number;
  user: { id: string; email?: string } | null;
  hasCompletedFirstInstallment: boolean;
  latestPayment: Payment | null;
  installmentPayment: Payment | null;
}

// Session Storage Helper pour les notifications vues
const NotificationManager = {
  markAsViewed(paymentId: string, type: "success" | "failed") {
    if (typeof window !== "undefined") {
      const key = `payment_notification_${paymentId}_${type}`;
      sessionStorage.setItem(key, "viewed");
    }
  },

  hasBeenViewed(paymentId: string, type: "success" | "failed"): boolean {
    if (typeof window !== "undefined") {
      const key = `payment_notification_${paymentId}_${type}`;
      return sessionStorage.getItem(key) === "viewed";
    }
    return false;
  },

  clearForPayment(paymentId: string) {
    if (typeof window !== "undefined") {
      const successKey = `payment_notification_${paymentId}_success`;
      const failedKey = `payment_notification_${paymentId}_failed`;
      sessionStorage.removeItem(successKey);
      sessionStorage.removeItem(failedKey);
    }
  },

  clearAll() {
    if (typeof window !== "undefined") {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith("payment_notification_")) {
          sessionStorage.removeItem(key);
        }
      });
    }
  },
};

// Helper function to get program ID from pdId
async function getProgramIdFromPdId(
  pdId: string | undefined
): Promise<string | null> {
  if (!pdId) return null;

  const { data, error } = await supabase
    .from("concours_learningpaths")
    .select("id")
    .eq("learningPathId", pdId)
    .single();

  if (error) {
    console.error("Error fetching program ID:", error);
    return null;
  }

  if (!data || !data.id) {
    console.error("No program found for pdId:", pdId);
    return null;
  }

  // Convert id to string if it's a number
  const id = typeof data.id === "number" ? String(data.id) : data.id;
  return typeof id === "string" ? id : null;
}

// Helper function to get the latest payment timestamp
function getLatestPaymentTimestamp(payment: Payment | null): Date | null {
  if (!payment) return null;
  return payment.updated_at ? new Date(payment.updated_at) : payment.created_at ? new Date(payment.created_at) : null;
}

// Helper function to check if a timestamp is older than X minutes
function isOlderThanMinutes(timestamp: Date | null, minutes: number): boolean {
  if (!timestamp) return true;
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  return diff > minutes * 60 * 1000;
}

// PaymentInstructions Component
interface PaymentInstructionsProps {
  programName: string;
  hasInstallmentPayment: boolean;
  isLoading: boolean;
  isDark: boolean;
  onContinue: () => void;
  programId: string | number | null;
}

const PaymentInstructions: React.FC<PaymentInstructionsProps> = ({
  programName,
  hasInstallmentPayment,
  isLoading,
  isDark,
  onContinue,
  programId,
}) => {
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Charger l'historique des paiements
  useEffect(() => {
    const fetchPayments = async () => {
      if (!programId) return;

      setLoadingPayments(true);
      try {
        const { data, error } = await supabase
          .from("user_program_payments")
          .select("*")
          .eq("program_id", typeof programId === "string" ? parseInt(programId, 10) : programId)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setAllPayments(data as Payment[]);
        }
      } catch (error) {
        console.error("Error fetching payments:", error);
      } finally {
        setLoadingPayments(false);
      }
    };

    fetchPayments();
  }, [programId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#4CAF50";
      case "failed":
        return "#EF4444";
      case "canceled":
        return "#F59E0B";
      case "pending":
        return "#60A5FA";
      default:
        return "#6B7280";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "check-circle";
      case "failed":
        return "close-circle";
      case "canceled":
        return "cancel";
      case "pending":
        return "clock-outline";
      default:
        return "help-circle";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Réussi";
      case "failed":
        return "Échoué";
      case "canceled":
        return "Annulé";
      case "pending":
        return "En attente";
      default:
        return status;
    }
  };

  return (
    <ScrollView
      style={styles.instructionsContainer}
      showsVerticalScrollIndicator={false}
    >
      <ThemedText style={styles.instructionsTitle}>
        Comment payer pour {programName}
      </ThemedText>

      <View style={styles.instructionStep}>
        <View style={styles.instructionNumberContainer}>
          <Text style={styles.instructionNumber}>1</Text>
        </View>
        <ThemedText style={styles.instructionText}>
          Entrez votre numéro de téléphone Mobile Money
        </ThemedText>
      </View>

      <View style={styles.instructionStep}>
        <View style={styles.instructionNumberContainer}>
          <Text style={styles.instructionNumber}>2</Text>
        </View>
        <ThemedText style={styles.instructionText}>
          Si vous avez un code promo, entrez-le et vérifiez-le pour bénéficier
          d'une réduction
        </ThemedText>
      </View>

      <View style={styles.instructionStep}>
        <View style={styles.instructionNumberContainer}>
          <Text style={styles.instructionNumber}>3</Text>
        </View>
        <ThemedText style={styles.instructionText}>
          Suivez les instructions pour compléter votre paiement
        </ThemedText>
      </View>

      {hasInstallmentPayment && (
        <View style={styles.instructionNote}>
          <MaterialCommunityIcons
            name="information"
            size={20}
            color={isDark ? "#60A5FA" : "#2196F3"}
          />
          <ThemedText
            style={[
              styles.instructionNoteText,
              { color: isDark ? "#60A5FA" : "#2196F3" },
            ]}
          >
            Vous avez déjà un plan de paiement échelonné pour ce programme. Ce
            paiement sera considéré comme votre prochain versement.
          </ThemedText>
        </View>
      )}

      <TouchableOpacity
        style={[styles.continueButton, isLoading && { opacity: 0.5 }]}
        onPress={onContinue}
        disabled={isLoading}
      >
        <Text style={styles.continueButtonText}>Continuer</Text>
      </TouchableOpacity>

      {isLoading && (
        <View style={styles.paymentButtonDisabledMessage}>
          <ActivityIndicator
            size="small"
            color={isDark ? "#6EE7B7" : "#4CAF50"}
          />
          <ThemedText style={styles.paymentButtonDisabledText}>
            Nous récupérons les informations de paiement...
          </ThemedText>
        </View>
      )}

      {/* WhatsApp Support */}
      <WhatsAppContact
        message={`Bonjour, j'ai besoin d'aide pour effectuer un paiement pour ${programName}`}
        style={{ marginTop: 16, marginBottom: 16 }}
      />

      {/* Historique des paiements */}
      {allPayments.length > 0 && (
        <View style={styles.paymentHistorySection}>
          <View style={styles.paymentHistorySectionHeader}>
            <MaterialCommunityIcons
              name="history"
              size={24}
              color={isDark ? "#9CA3AF" : "#6B7280"}
            />
            <ThemedText style={styles.paymentHistorySectionTitle}>
              Historique des paiements
            </ThemedText>
          </View>

          {loadingPayments ? (
            <View style={styles.paymentHistoryList}>
              <ActivityIndicator
                size="small"
                color={isDark ? "#6EE7B7" : "#4CAF50"}
              />
            </View>
          ) : (
            <View style={styles.paymentHistoryList}>
              {allPayments.map((payment, index) => {
                const createdDate = payment.created_at ? new Date(payment.created_at) : new Date();
                const expiryDate = payment.expiry_date
                  ? new Date(payment.expiry_date)
                  : null;
                const isExpired = expiryDate && expiryDate < new Date();

                return (
                  <View
                    key={payment.id || index}
                    style={[
                      styles.paymentHistoryCard,
                      isDark && styles.paymentHistoryCardDark,
                    ]}
                  >
                    <View style={styles.paymentHistoryCardHeader}>
                      <View style={styles.paymentHistoryCardStatus}>
                        <MaterialCommunityIcons
                          name={getStatusIcon(payment.payment_status)}
                          size={20}
                          color={getStatusColor(payment.payment_status)}
                        />
                        <ThemedText
                          style={[
                            styles.paymentHistoryCardStatusText,
                            { color: getStatusColor(payment.payment_status) },
                          ]}
                        >
                          {getStatusLabel(payment.payment_status)}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.paymentHistoryCardAmount}>
                        {payment.amount} FCFA
                      </ThemedText>
                    </View>

                    <View style={styles.paymentHistoryCardBody}>
                      <View style={styles.paymentHistoryCardRow}>
                        <MaterialCommunityIcons
                          name="calendar"
                          size={16}
                          color={isDark ? "#9CA3AF" : "#6B7280"}
                        />
                        <ThemedText style={styles.paymentHistoryCardLabel}>
                          Date:{" "}
                          {createdDate.toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </ThemedText>
                      </View>

                      {payment.is_installment && (
                        <View style={styles.paymentHistoryCardRow}>
                          <MaterialCommunityIcons
                            name="credit-card-multiple"
                            size={16}
                            color={isDark ? "#9CA3AF" : "#6B7280"}
                          />
                          <ThemedText style={styles.paymentHistoryCardLabel}>
                            Échéance {payment.current_installment}/
                            {payment.total_installments}
                          </ThemedText>
                        </View>
                      )}

                      {expiryDate && (
                        <View style={styles.paymentHistoryCardRow}>
                          <MaterialCommunityIcons
                            name={isExpired ? "alert-circle" : "calendar-clock"}
                            size={16}
                            color={
                              isExpired
                                ? "#EF4444"
                                : isDark
                                ? "#9CA3AF"
                                : "#6B7280"
                            }
                          />
                          <ThemedText
                            style={[
                              styles.paymentHistoryCardLabel,
                              isExpired && { color: "#EF4444" },
                            ]}
                          >
                            {isExpired ? "Expiré le" : "Expire le"}:{" "}
                            {expiryDate.toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </ThemedText>
                        </View>
                      )}

                      {payment.payment_reference && (
                        <View style={styles.paymentHistoryCardRow}>
                          <MaterialCommunityIcons
                            name="barcode"
                            size={16}
                            color={isDark ? "#9CA3AF" : "#6B7280"}
                          />
                          <ThemedText
                            style={styles.paymentHistoryCardReference}
                            numberOfLines={1}
                          >
                            Réf: {payment.payment_reference}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

// PaymentOptions Component (pour nouveaux paiements)
interface PaymentOptionsProps {
  programName: string;
  programPrice: number;
  isDark: boolean;
  isLoading: boolean;
  onPayment: (paymentData: {
    phoneNumber: string;
    promoCode: string;
    promoCodeDetails: PromoCodeDetails | null;
    isInstallment: boolean;
    totalInstallments: number;
  }) => void;
}

const PaymentOptions: React.FC<PaymentOptionsProps> = ({
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
  const [promoCodeDetails, setPromoCodeDetails] = useState<PromoCodeDetails | null>(null);
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
        discount_percentage: data.discount_percentage,
        name: data.name,
      });
    } catch (err) {
      console.error("Error verifying promo code:", err);
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
                !isInstallment ? (isDark ? "#6EE7B7" : "#4CAF50") : "#9CA3AF"
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
                isInstallment ? (isDark ? "#6EE7B7" : "#4CAF50") : "#9CA3AF"
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
            placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
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
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
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
                color={isDark ? "#6EE7B7" : "#4CAF50"}
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
              isDark && { backgroundColor: "#374151", borderColor: "#4B5563" },
              {
                backgroundColor: isDark ? "#059669" : "#4CAF50",
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// NextPaymentOptions Component (pour paiements d'échéances)
interface NextPaymentOptionsProps {
  programName: string;
  installmentAmount: number;
  currentInstallment: number;
  totalInstallments: number;
  isDark: boolean;
  isLoading: boolean;
  onPayment: (phoneNumber: string) => void;
}

const NextPaymentOptions: React.FC<NextPaymentOptionsProps> = ({
  programName,
  installmentAmount,
  currentInstallment,
  totalInstallments,
  isDark,
  isLoading,
  onPayment,
}) => {
  const [phoneNumber, setPhoneNumber] = useState("");

  const handlePayment = () => {
    onPayment(phoneNumber);
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
            {installmentAmount} FCFA
          </ThemedText>
          <ThemedText style={styles.installmentInfo}>
            Versement {currentInstallment + 1}/{totalInstallments}
          </ThemedText>
        </View>

        <View style={styles.inputContainer}>
          <ThemedText style={styles.inputLabel}>Numéro de téléphone</ThemedText>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="Ex: 6XXXXXXXX"
            placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
        </View>

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
                backgroundColor: isDark ? "#059669" : "#4CAF50",
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
                Payer le versement
              </ThemedText>
            </View>
            {isLoading && <ActivityIndicator size="small" color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// PaymentProcessing Component
interface PaymentProcessingProps {
  state: "processing" | "verifying";
  isDark: boolean;
  currentMessage?: string;
  onCancel: () => void;
}

const PaymentProcessing: React.FC<PaymentProcessingProps> = ({
  state,
  isDark,
  currentMessage,
  onCancel,
}) => {
  if (state === "processing") {
    return (
      <View style={styles.processingContainer}>
        <ActivityIndicator
          size="large"
          color={isDark ? "#6EE7B7" : "#4CAF50"}
        />
        <ThemedText style={styles.processingText}>
          Initialisation du paiement...
        </ThemedText>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.verifyingContainer}>
      <View
        style={{
          maxWidth: 200,
          maxHeight: 200,
          alignItems: "center",
          overflow: "hidden",
          justifyContent: "center",
        }}
      >
        <LottieView
          source={require("@/assets/animations/payment-loading.json")}
          autoPlay
          loop
          resizeMode="contain"
          speed={1}
          style={{ width: 200, height: 200 }}
          key="verifyingAnimation"
        />
      </View>
      <ThemedText style={styles.verifyingTitle}>
        Vérification du paiement
      </ThemedText>
      <ThemedText style={styles.verifyingMessage}>
        {currentMessage || "En attente de validation sur votre téléphone..."}
      </ThemedText>
      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Annuler</Text>
      </TouchableOpacity>
    </View>
  );
};

// PaymentResult Component removed - now in payment-result.tsx

// InstallmentDetails Component
interface InstallmentDetailsProps {
  installmentPayment: Payment | null;
  programName: string;
  isDark: boolean;
  onPayNext: () => void;
  onBack: () => void;
}

const InstallmentDetails: React.FC<InstallmentDetailsProps> = ({
  installmentPayment,
  programName,
  isDark,
  onPayNext,
  onBack,
}) => {
  const [allInstallments, setAllInstallments] = useState<Payment[]>([]);
  const [loadingInstallments, setLoadingInstallments] = useState(false);

  // Charger tous les paiements liés à ce plan échelonné
  useEffect(() => {
    const fetchAllInstallments = async () => {
      if (!installmentPayment?.id) return;

      setLoadingInstallments(true);
      try {
        // Récupérer le paiement parent et tous ses enfants
        const parentId = installmentPayment.parent_payment_id || installmentPayment.id;
        
        const { data, error } = await supabase
          .from("user_program_payments")
          .select("*")
          .or(`id.eq.${parentId},parent_payment_id.eq.${parentId}`)
          .order("current_installment", { ascending: true });

        if (!error && data) {
          setAllInstallments(data as Payment[]);
        }
      } catch (error) {
        console.error("Error fetching installments:", error);
      } finally {
        setLoadingInstallments(false);
      }
    };

    fetchAllInstallments();
  }, [installmentPayment?.id]);

  if (!installmentPayment) {
    return (
      <View style={styles.noInstallmentContainer}>
        <ThemedText style={styles.noInstallmentText}>
          Aucun plan de paiement échelonné actif.
        </ThemedText>
        <TouchableOpacity style={styles.continueButton} onPress={onBack}>
          <Text style={styles.continueButtonText}>Retourner au programme</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentInstallment = installmentPayment.current_installment || 1;
  const totalInstallments = installmentPayment.total_installments || 1;
  const nextPaymentDueDate = installmentPayment.next_payment_due_date
    ? new Date(installmentPayment.next_payment_due_date)
    : null;
  const installmentAmount = installmentPayment.amount || 0;
  const totalAmount = installmentPayment.total_amount || 0;
  const paidAmount = installmentAmount * currentInstallment;
  const remainingAmount = totalAmount - paidAmount;

  const daysUntilNextPayment = nextPaymentDueDate
    ? Math.ceil(
        (nextPaymentDueDate.getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const formattedNextPaymentDate = nextPaymentDueDate
    ? nextPaymentDueDate.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Non défini";

  return (
    <ScrollView style={styles.installmentDetailsContainer}>
      <View style={styles.installmentHeader}>
        <ThemedText style={styles.installmentTitle}>
          Plan de paiement échelonné
        </ThemedText>
        <ThemedText style={styles.installmentSubtitle}>
          {programName}
        </ThemedText>
      </View>

      <View
        style={[
          styles.installmentProgressContainer,
          isDark && styles.installmentProgressContainerDark,
        ]}
      >
        <View style={styles.installmentProgressHeader}>
          <ThemedText style={styles.installmentProgressTitle}>
            Progression des paiements
          </ThemedText>
          <ThemedText style={styles.installmentProgressValue}>
            {currentInstallment}/{totalInstallments}
          </ThemedText>
        </View>
        <View style={styles.installmentProgressBar}>
          <View
            style={[
              styles.installmentProgressFill,
              { width: `${(currentInstallment / totalInstallments) * 100}%` },
            ]}
          />
        </View>
      </View>

      <View
        style={[
          styles.installmentInfoCard,
          isDark && styles.installmentInfoCardDark,
        ]}
      >
        <View style={styles.installmentInfoRow}>
          <ThemedText style={styles.installmentInfoLabel}>
            Montant total
          </ThemedText>
          <ThemedText style={styles.installmentInfoValue}>
            {totalAmount} FCFA
          </ThemedText>
        </View>
        <View style={styles.installmentInfoRow}>
          <ThemedText style={styles.installmentInfoLabel}>
            Montant payé
          </ThemedText>
          <ThemedText style={styles.installmentInfoValue}>
            {paidAmount} FCFA
          </ThemedText>
        </View>
        <View style={styles.installmentInfoRow}>
          <ThemedText style={styles.installmentInfoLabel}>
            Montant restant
          </ThemedText>
          <ThemedText style={styles.installmentInfoValue}>
            {remainingAmount} FCFA
          </ThemedText>
        </View>
        <View style={styles.installmentInfoRow}>
          <ThemedText style={styles.installmentInfoLabel}>
            Montant par versement
          </ThemedText>
          <ThemedText style={styles.installmentInfoValue}>
            {installmentAmount} FCFA
          </ThemedText>
        </View>
      </View>

      {nextPaymentDueDate && currentInstallment < totalInstallments && (
        <View
          style={[styles.nextPaymentCard, isDark && styles.nextPaymentCardDark]}
        >
          <View style={styles.nextPaymentHeader}>
            <MaterialCommunityIcons
              name="calendar-clock"
              size={24}
              color={isDark ? "#F59E0B" : "#F59E0B"}
            />
            <ThemedText style={styles.nextPaymentTitle}>
              Prochain paiement
            </ThemedText>
          </View>
          <View style={styles.nextPaymentInfo}>
            <ThemedText style={styles.nextPaymentDate}>
              {formattedNextPaymentDate}
            </ThemedText>
            {daysUntilNextPayment !== null && (
              <ThemedText
                style={[
                  styles.nextPaymentDays,
                  daysUntilNextPayment <= 3 && styles.nextPaymentDaysUrgent,
                ]}
              >
                {daysUntilNextPayment <= 0
                  ? "Paiement dû aujourd'hui"
                  : `Dans ${daysUntilNextPayment} jour${
                      daysUntilNextPayment !== 1 ? "s" : ""
                    }`}
              </ThemedText>
            )}
            <ThemedText style={styles.nextPaymentAmount}>
              {installmentAmount} FCFA
            </ThemedText>
          </View>
          {daysUntilNextPayment !== null && daysUntilNextPayment <= 30 && (
            <TouchableOpacity style={styles.payNowButton} onPress={onPayNext}>
              <Text style={styles.payNowButtonText}>Payer maintenant</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View
        style={[
          styles.paymentHistoryContainer,
          isDark && styles.paymentHistoryContainerDark,
        ]}
      >
        <ThemedText style={styles.paymentHistoryTitle}>
          Toutes les échéances ({currentInstallment}/{totalInstallments} payées)
        </ThemedText>
        
        {loadingInstallments ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={isDark ? "#6EE7B7" : "#4CAF50"} />
          </View>
        ) : (
          Array.from({ length: totalInstallments }).map((_, index) => {
            const installmentNumber = index + 1;
            const isPaid = installmentNumber <= currentInstallment;
            const isCurrent = installmentNumber === currentInstallment + 1;
            
            // Trouver le paiement correspondant dans allInstallments
            const matchingPayment = allInstallments.find(
              p => p.current_installment === installmentNumber
            );
            
            const paymentDate = matchingPayment?.payment_date 
              ? new Date(matchingPayment.payment_date)
              : null;
            
            const dueDate = isCurrent && nextPaymentDueDate
              ? nextPaymentDueDate
              : null;
            
            const isOverdue = dueDate && dueDate < new Date();
            
            const getStatusColor = () => {
              if (isPaid && matchingPayment?.payment_status === 'completed') return isDark ? "#6EE7B7" : "#4CAF50";
              if (isPaid && matchingPayment?.payment_status === 'failed') return "#EF4444";
              if (isOverdue) return "#F59E0B";
              if (isCurrent) return "#60A5FA";
              return isDark ? "#4B5563" : "#9CA3AF";
            };
            
            const getStatusIcon = () => {
              if (isPaid && matchingPayment?.payment_status === 'completed') return "check-circle";
              if (isPaid && matchingPayment?.payment_status === 'failed') return "close-circle";
              if (isOverdue) return "alert-circle";
              if (isCurrent) return "clock-outline";
              return "circle-outline";
            };
            
            const getStatusLabel = () => {
              if (isPaid && matchingPayment?.payment_status === 'completed') return "Payé";
              if (isPaid && matchingPayment?.payment_status === 'failed') return "Échoué";
              if (isOverdue) return "En retard";
              if (isCurrent) return "À payer";
              return "À venir";
            };

            return (
              <View 
                key={index} 
                style={[
                  styles.paymentHistoryItem,
                  !isPaid && styles.paymentHistoryItemFuture
                ]}
              >
                <View style={styles.paymentHistoryItemLeft}>
                  <View style={styles.paymentHistoryItemIcon}>
                    <MaterialCommunityIcons
                      name={getStatusIcon()}
                      size={24}
                      color={getStatusColor()}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.paymentHistoryItemTitle}>
                      Échéance {installmentNumber}/{totalInstallments}
                    </ThemedText>
                    {paymentDate ? (
                      <ThemedText style={styles.paymentHistoryItemDate}>
                        Payé le {paymentDate.toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </ThemedText>
                    ) : dueDate ? (
                      <ThemedText style={[
                        styles.paymentHistoryItemDate,
                        isOverdue && { color: "#F59E0B" }
                      ]}>
                        {isOverdue ? "En retard - " : ""}Échéance le {dueDate.toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </ThemedText>
                    ) : (
                      <ThemedText style={[
                        styles.paymentHistoryItemDate,
                        { color: isDark ? "#6B7280" : "#9CA3AF" }
                      ]}>
                        {getStatusLabel()}
                      </ThemedText>
                    )}
                    {matchingPayment?.payment_reference && (
                      <ThemedText 
                        style={[styles.paymentHistoryItemDate, { fontSize: 11, marginTop: 2 }]}
                        numberOfLines={1}
                      >
                        Réf: {matchingPayment.payment_reference}
                      </ThemedText>
                    )}
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <ThemedText style={styles.paymentHistoryItemAmount}>
                    {installmentAmount} FCFA
                  </ThemedText>
                  <ThemedText style={[
                    styles.paymentHistoryItemDate,
                    { color: getStatusColor(), fontWeight: '600', fontSize: 11 }
                  ]}>
                    {getStatusLabel()}
                  </ThemedText>
                </View>
              </View>
            );
          })
        )}
      </View>

      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>Retourner au programme</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// Main Component
const ProgramPaymentPage = () => {
  const local = useLocalSearchParams();
  const pdId = local.pdId as string | undefined;
  const router = useRouter();
  const { user } = useAuth();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const { trigger } = useHaptics();
  const { mutateUserPrograms, mutateProgramAccessMap } = useUser();

  // Get pricing configuration
  const pricing = usePricing();

  // Use the program payment hook
  const {
    paymentStatus,
    loading,
    payment,
    latestPayment,
    latestPaymentLoading,
    authorizationUrl,
    chargeError,
    hasAccess,
    programId,
    initiateDirectPayment,
    cancelPayment,
    verifyPaymentStatus,
    isFinalStatus,
  } = useProgramPayment(pdId);

  // Main state management
  const [currentState, setCurrentState] = useState<PaymentFlowState>(
    PaymentFlowState.LOADING
  );
  const [isInitialized, setIsInitialized] = useState(false); // Track if component is initialized
  const [programContext, setProgramContext] = useState<PaymentContextData>({
    programId: null,
    programName: "",
    programPrice: pricing.FIXED_PRICE || 0,
    user: null,
    hasCompletedFirstInstallment: false,
    latestPayment: null,
    installmentPayment: null,
  });

  // Processing states
  const [currentTrxReference, setCurrentTrxReference] = useState<string | null>(
    null
  );
  const [statusCheckInterval, setStatusCheckInterval] = useState<ReturnType<
    typeof setInterval
  > | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationMessages] = useState([
    "En attente de validation sur votre téléphone...",
    "Une fois validé, la vérification peut prendre jusqu'à 5 minutes...",
  ]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // Determine the initial state based on payment history
  const determineInitialState = (
    latestPayment: Payment | null,
    hasCompletedFirstInstallment: boolean
  ) => {
    console.log("[Payment] determineInitialState called with:", {
      latestPayment: latestPayment?.id,
      has_seen_result: latestPayment?.has_seen_result,
      payment_status: latestPayment?.payment_status,
      is_installment: latestPayment?.is_installment,
      hasCompletedFirstInstallment
    });

    if (!latestPayment) {
      console.log("[Payment] No latest payment, showing INSTRUCTIONS");
      setCurrentState(PaymentFlowState.INSTRUCTIONS);
      return;
    }

    // Vérifier localement si l'accès est expiré
    const isAccessExpired =
      latestPayment.expiry_date &&
      new Date(latestPayment.expiry_date) < new Date();

    // Si le paiement n'est pas en statut final (pending, initialized, processing), on continue la vérification
    if (!isFinalStatus(latestPayment.payment_status)) {
      console.log("[Payment] Payment not in final status, showing VERIFYING");
      if (
        hasCompletedFirstInstallment &&
        latestPayment.current_installment &&
        latestPayment.current_installment > 1
      ) {
        setCurrentState(PaymentFlowState.NEXT_PAYMENT_VERIFYING);
      } else {
        setCurrentState(PaymentFlowState.VERIFYING);
      }
      if (latestPayment.payment_reference) {
        setCurrentTrxReference(latestPayment.payment_reference);
        startStatusCheck(latestPayment.payment_reference);
      }
      return;
    }

    // === Paiement terminé (Completed, Failed, Canceled) ===

    // Si le résultat n'a pas encore été vu par l'utilisateur (has_seen_result = false ou null)
    // on redirige vers la page de résultat
    if (!latestPayment.has_seen_result) {
      console.log("[Payment] Payment result not seen, redirecting to payment-result");
      const currentInstallment = latestPayment.current_installment || 1;
      const totalInstallments = latestPayment.total_installments || 1;
      const hasMoreInstallments = currentInstallment < totalInstallments;

      router.replace({
        pathname: "/learn/[pdId]/payment-result",
        params: {
          pdId: pdId || "",
          result: latestPayment.payment_status === 'completed' ? 'success' : latestPayment.payment_status,
          programName: programContext.programName,
          programId: programContext.programId || "",
          paymentId: latestPayment.id,
          isInstallment: String(latestPayment.is_installment || false),
          hasMoreInstallments: String(hasMoreInstallments),
          errorMessage: latestPayment.payment_status === 'failed' ? "Le paiement a échoué." : undefined,
        },
      });
      return;
    }

    // === Le résultat a déjà été vu (has_seen_result = true) ===
    console.log("[Payment] Payment result already seen");

    // Si c'est un paiement échelonné (terminé ou non)
    if (latestPayment.is_installment) {
        const currentInstallment = latestPayment.current_installment || 1;
        const totalInstallments = latestPayment.total_installments || 1;
        
        console.log("[Payment] Installment payment detected, showing INSTALLMENT_DETAILS");
        // Afficher toujours les détails d'échelonnement pour les paiements échelonnés
        // même si tous les versements sont faits, pour que l'utilisateur puisse voir l'historique
        setCurrentState(PaymentFlowState.INSTALLMENT_DETAILS);
        return;
    }

    // Si c'est un paiement unique completed et pas expiré, afficher les instructions
    // (l'utilisateur peut vouloir acheter un autre programme ou voir les infos)
    if (latestPayment.payment_status === "completed" && !isAccessExpired) {
        console.log("[Payment] Single payment completed, showing INSTRUCTIONS");
        setCurrentState(PaymentFlowState.INSTRUCTIONS);
        return;
    }

    // Par défaut (nouvel achat, renouvellement, ou suite d'un échec vu)
    console.log("[Payment] Default case, showing INSTRUCTIONS");
    setCurrentState(PaymentFlowState.INSTRUCTIONS);
  };

  // Initialize programContext with data from the hook
  useEffect(() => {
    if (!pdId || !programId || latestPaymentLoading) return;
    
    // Ne pas réinitialiser si déjà initialisé, sauf si on revient sur la page après un paiement
    if (isInitialized && currentState !== PaymentFlowState.LOADING) {
      console.log("[Payment] Already initialized, skipping reinit");
      return;
    }

    // Fetch program details with learning path info
    const initializeProgramContext = async () => {
      try {
        const { data: programData, error } = await supabase
          .from("concours_learningpaths")
          .select("id, price, learningPathId, learning_paths(title)")
          .eq("learningPathId", pdId)
          .single();

        if (error || !programData) {
          console.error("[Payment] Error fetching program data:", error);
          // Use defaults if fetch fails
          setProgramContext(prev => ({
            ...prev,
            programId: programId || null,
            programName: "Programme",
            programPrice: pricing.FIXED_PRICE || 0,
            user,
            latestPayment: latestPayment ? { ...latestPayment, ['']: '' } : null,
          }));
          setCurrentState(PaymentFlowState.INSTRUCTIONS);
          setIsInitialized(true);
          return;
        }

        // Check if user has completed first installment
        const hasCompletedFirst = latestPayment?.is_installment && 
                                   latestPayment?.current_installment && 
                                   latestPayment?.current_installment > 1;

        // Extract learning path title
        const lpData = programData.learning_paths as any;
        const programName = (Array.isArray(lpData) ? lpData[0]?.title : lpData?.title) || "Programme";

        const updatedContext = {
          programId: String(programData.id),
          programName,
          programPrice: pricing.FIXED_PRICE || 0,
          user,
          hasCompletedFirstInstallment: hasCompletedFirst || false,
          latestPayment: latestPayment ? { ...latestPayment, ['']: '' } : null,
          installmentPayment: latestPayment?.is_installment ? { ...latestPayment, ['']: '' } : null,
        };

        setProgramContext(updatedContext);

        // Determine initial state based on payment history
        console.log("[Payment] Determining initial state with has_seen_result:", latestPayment?.has_seen_result);
        determineInitialState(latestPayment ? { ...latestPayment, ['']: '' } : null, hasCompletedFirst || false);
        setIsInitialized(true);
      } catch (error) {
        console.error("[Payment] Error initializing program context:", error);
        setCurrentState(PaymentFlowState.INSTRUCTIONS);
        setIsInitialized(true);
      }
    };

    initializeProgramContext();
  }, [pdId, programId, latestPaymentLoading, pricing.FIXED_PRICE]);

  // Handle payment status changes
  useEffect(() => {
    // Ne pas traiter si programContext n'est pas encore initialisé
    if (!programContext.programId || !programContext.programName) {
      console.log(
        "[Payment] programContext not initialized yet, skipping payment status handling"
      );
      return;
    }

    // Vérifier si le résultat a déjà été vu (has_seen_result = true)
    // Dans ce cas, ne pas rediriger automatiquement vers payment-result
    const latestPayment = programContext.latestPayment;
    if (latestPayment?.has_seen_result && isFinalStatus(latestPayment.payment_status)) {
      console.log(
        "[Payment] Payment result already seen, skipping automatic redirect:",
        paymentStatus
      );
      return;
    }

    // Ne rediriger que si le statut vient de changer (pendant une vérification active)
    // Pas si on arrive sur la page avec un paiement déjà terminé
    if (!currentTrxReference) {
      console.log(
        "[Payment] No active transaction reference, skipping redirect"
      );
      return;
    }

    if (paymentStatus === "successful" || paymentStatus === "completed") {
      stopStatusCheck();

      // Mutate data first
      mutateUserPrograms();
      mutateProgramAccessMap();

      // Navigate to success result page
      const hasMoreInstallments =
        latestPayment?.is_installment &&
        (latestPayment?.current_installment || 1) <
          (latestPayment?.total_installments || 1);

      console.log("[Payment] Navigating to success with:", {
        programName: programContext.programName,
        programId: programContext.programId,
      });

      router.replace({
        pathname: "/learn/[pdId]/payment-result",
        params: {
          pdId: pdId || "",
          result: "success",
          programName: programContext.programName,
          programId: programContext.programId || "",
          paymentId: latestPayment?.id || "",
          isInstallment: String(latestPayment?.is_installment || false),
          hasMoreInstallments: String(hasMoreInstallments),
        },
      });
    } else if (paymentStatus === "failed") {
      stopStatusCheck();

      // Navigate to failed result page
      router.replace({
        pathname: "/learn/[pdId]/payment-result",
        params: {
          pdId: pdId || "",
          result: "failed",
          programName: programContext.programName,
          programId: programContext.programId || "",
          isInstallment: String(programContext.hasCompletedFirstInstallment),
          hasMoreInstallments: "false",
          errorMessage:
            errorMessage || "Le paiement a échoué. Veuillez réessayer.",
          authorizationUrl: authorizationUrl || undefined,
        },
      });
    } else if (paymentStatus === "canceled") {
      stopStatusCheck();

      // Navigate to canceled result page
      router.replace({
        pathname: "/learn/[pdId]/payment-result",
        params: {
          pdId: pdId || "",
          result: "canceled",
          programName: programContext.programName,
          programId: programContext.programId || "",
          isInstallment: String(programContext.hasCompletedFirstInstallment),
          hasMoreInstallments: "false",
        },
      });
    }
  }, [
    paymentStatus,
    programContext.hasCompletedFirstInstallment,
    programContext.latestPayment,
    programContext.programId,
    programContext.programName,
    errorMessage,
    authorizationUrl,
    currentTrxReference,
  ]);

  // Handle authorization URL
  useEffect(() => {
    if (authorizationUrl) {
      Linking.openURL(authorizationUrl);
    }
  }, [authorizationUrl]);

  // Message rotation for verification
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex(
        (current) => (current + 1) % verificationMessages.length
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Status check functions
  const startStatusCheck = (reference: string) => {
    if (statusCheckInterval) return;

    const interval = setInterval(async () => {
      const result = await verifyPaymentStatus(reference);

      // Check if we've reached a terminal status and stop the check if we have
      if (result?.transaction?.status) {
        const status =
          result.transaction.status === "complete"
            ? "completed"
            : result.transaction.status;
        if (isFinalStatus(status)) {
          stopStatusCheck();

          // Ajout : mutation des programmes et du mapping d'accès
          await mutateUserPrograms();
          await mutateProgramAccessMap();
        }
      }
    }, 5000);

    setStatusCheckInterval(interval);
  };

  const stopStatusCheck = () => {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }
  };

  // Event handlers
  const handleContinueFromInstructions = () => {
    setCurrentState(PaymentFlowState.PAYMENT_OPTIONS);
  };

  const handlePayment = async (paymentData: {
    phoneNumber: string;
    promoCode: string;
    promoCodeDetails: PromoCodeDetails | null;
    isInstallment: boolean;
    totalInstallments: number;
  }) => {
    trigger(HapticType.MEDIUM);
    setCurrentState(PaymentFlowState.PROCESSING);
    setErrorMessage(null);

    try {
      let amount: number;

      amount = paymentData.isInstallment
        ? Math.ceil(programContext.programPrice / paymentData.totalInstallments)
        : programContext.programPrice;

      if (paymentData.promoCodeDetails) {
        const discountAmount = Math.ceil(
          (amount * paymentData.promoCodeDetails.discount_percentage) / 100
        );
        amount = amount - discountAmount;
      }

      const result = await initiateDirectPayment(
        programContext.programId!,
        paymentData.phoneNumber.trim(),
        amount,
        paymentData.promoCodeDetails?.id,
        paymentData.isInstallment,
        paymentData.isInstallment ? paymentData.totalInstallments : 1,
        1
      );

      // Extract payment from result
      const payment = "payment" in result ? result.payment : result;
      if (payment && payment.payment_reference) {
        setCurrentTrxReference(payment.payment_reference);
        setCurrentState(PaymentFlowState.VERIFYING);
        startStatusCheck(payment.payment_reference);
      } else {
        setCurrentState(PaymentFlowState.FAILED);
        setErrorMessage(
          "Impossible d'initier le paiement. Veuillez réessayer."
        );
      }
    } catch (error) {
      console.error("Payment initiation error:", error);
      setCurrentState(PaymentFlowState.FAILED);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors du paiement"
      );
    }
  };

  const handleNextPayment = async (phoneNumber: string) => {
    trigger(HapticType.MEDIUM);
    setCurrentState(PaymentFlowState.NEXT_PAYMENT_PROCESSING);
    setErrorMessage(null);

    try {
      const amount =
        programContext.installmentPayment?.amount ||
        programContext.programPrice;

      // get the next payment due start cournt ( default use lastpayemnt_next_due date if > Today else use today)
      let nextInstallationStartDate = new Date();
      if (programContext.installmentPayment?.next_payment_due_date) {
        const nextDueDate = new Date(
          programContext.installmentPayment.next_payment_due_date
        );
        if (nextDueDate > new Date()) {
          nextInstallationStartDate = nextDueDate;
        }
      }

      const result = await initiateDirectPayment(
        programContext.programId!,
        phoneNumber.trim(),
        amount,
        undefined, // pas de promo code pour les échéances
        true, // toujours installment
        programContext.installmentPayment?.total_installments || 1,
        (programContext.installmentPayment?.current_installment || 1) + 1,
        nextInstallationStartDate
      );
      // Extract payment reference from result
      const paymentRef =
        "payment_reference" in result
          ? result.payment_reference
          : "trxReference" in result
          ? (result as unknown as { trxReference: string }).trxReference
          : undefined;
      if (paymentRef) {
        setCurrentTrxReference(paymentRef);
        setCurrentState(PaymentFlowState.NEXT_PAYMENT_VERIFYING);
        startStatusCheck(paymentRef);
      } else {
        setCurrentState(PaymentFlowState.NEXT_PAYMENT_FAILED);
        setErrorMessage(
          "Impossible d'initier le paiement. Veuillez réessayer."
        );
      }
    } catch (error) {
      console.error("Next payment initiation error:", error);
      setCurrentState(PaymentFlowState.NEXT_PAYMENT_FAILED);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors du paiement"
      );
    }
  };

  const handleCancelPayment = async () => {
    if (currentTrxReference) {
      try {
        await cancelPayment();
        stopStatusCheck();

        // Retourner au bon état selon le contexte
        if (programContext.hasCompletedFirstInstallment) {
          setCurrentState(PaymentFlowState.INSTALLMENT_DETAILS);
        } else {
          setCurrentState(PaymentFlowState.CANCELED);
        }
      } catch (error) {
        console.error("Error canceling payment:", error);
      }
    }
  };

  const handlePayNextInstallment = () => {
    setCurrentState(PaymentFlowState.NEXT_PAYMENT_OPTIONS);
  };

  const handleBack = () => {
    router.back();
  };

  // Render content based on current state
  const renderContent = () => {
    switch (currentState) {
      case PaymentFlowState.LOADING:
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={isDark ? "#6EE7B7" : "#4CAF50"}
            />
            <ThemedText style={styles.loadingText}>
              Chargement des informations de paiement...
            </ThemedText>
          </View>
        );

      case PaymentFlowState.INSTRUCTIONS:
        return (
          <PaymentInstructions
            programId={programContext.programId}
            programName={programContext.programName}
            hasInstallmentPayment={!!programContext.installmentPayment}
            isLoading={loading || latestPaymentLoading}
            isDark={isDark}
            onContinue={handleContinueFromInstructions}
          />
        );

      case PaymentFlowState.PAYMENT_OPTIONS:
        return (
          <PaymentOptions
            programName={programContext.programName}
            programPrice={programContext.programPrice}
            isDark={isDark}
            isLoading={loading}
            onPayment={handlePayment}
          />
        );

      case PaymentFlowState.NEXT_PAYMENT_OPTIONS:
        return (
          <NextPaymentOptions
            programName={programContext.programName}
            installmentAmount={programContext.installmentPayment?.amount || 0}
            currentInstallment={
              programContext.installmentPayment?.current_installment || 1
            }
            totalInstallments={
              programContext.installmentPayment?.total_installments || 1
            }
            isDark={isDark}
            isLoading={loading}
            onPayment={handleNextPayment}
          />
        );

      case PaymentFlowState.PROCESSING:
        return (
          <PaymentProcessing
            state="processing"
            isDark={isDark}
            onCancel={() => setCurrentState(PaymentFlowState.PAYMENT_OPTIONS)}
          />
        );

      case PaymentFlowState.NEXT_PAYMENT_PROCESSING:
        return (
          <PaymentProcessing
            state="processing"
            isDark={isDark}
            onCancel={() =>
              setCurrentState(PaymentFlowState.INSTALLMENT_DETAILS)
            }
          />
        );

      case PaymentFlowState.VERIFYING:
        return (
          <PaymentProcessing
            state="verifying"
            isDark={isDark}
            currentMessage={verificationMessages[currentMessageIndex]}
            onCancel={handleCancelPayment}
          />
        );

      case PaymentFlowState.NEXT_PAYMENT_VERIFYING:
        return (
          <PaymentProcessing
            state="verifying"
            isDark={isDark}
            currentMessage={verificationMessages[currentMessageIndex]}
            onCancel={handleCancelPayment}
          />
        );

      case PaymentFlowState.INSTALLMENT_DETAILS:
        return (
          <InstallmentDetails
            installmentPayment={programContext.installmentPayment}
            programName={programContext.programName}
            isDark={isDark}
            onPayNext={handlePayNextInstallment}
            onBack={handleBack}
          />
        );

      default:
        return (
          <PaymentInstructions
            programId={programContext.programId}
            programName={programContext.programName}
            hasInstallmentPayment={!!programContext.installmentPayment}
            isLoading={false}
            isDark={isDark}
            onContinue={handleContinueFromInstructions}
          />
        );
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.header, isDark && styles.headerDark]}>
        <TouchableOpacity style={styles.backButtonHeader} onPress={handleBack}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={isDark ? "#FFFFFF" : "#111827"}
          />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>
          Paiement du programme
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>{renderContent()}</ScrollView>
    </View>
  );
};

// Complete Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    marginBottom: 60,
  },
  content: {
    flex: 1,
    paddingHorizontal: 0,
  },
  containerDark: {
    backgroundColor: "#111827",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderBottomColor: "#374151",
  },
  backButtonHeader: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    marginTop: 16,
    color: "#6B7280",
  },
  instructionsContainer: {
    padding: 20,
  },
  instructionsTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 24,
    textAlign: "center",
  },
  instructionStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  instructionNumberContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  instructionNumber: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  instructionText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    lineHeight: 24,
  },
  instructionNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(96, 165, 250, 0.1)",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  instructionNoteText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 8,
  },
  continueButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
  },
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
    color: "#4CAF50",
  },
  installmentInfo: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
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
    backgroundColor: "#374151",
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
    color: "#6B7280",
  },
  installmentOptionsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
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
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  installmentButtonSelected: {
    borderColor: "#4CAF50",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
  },
  installmentButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  installmentButtonTextSelected: {
    color: "#4CAF50",
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
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
  },
  inputDark: {
    backgroundColor: "#374151",
    borderColor: "#4B5563",
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
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
  },
  verifyButton: {
    marginLeft: 8,
    backgroundColor: "#4B5563",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  verifyingButton: {
    backgroundColor: "#F59E0B",
  },
  validButton: {
    backgroundColor: "#4CAF50",
  },
  invalidButton: {
    backgroundColor: "#EF4444",
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
    color: "#4CAF50",
    marginLeft: 8,
  },
  promoCodeErrorText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: "#EF4444",
    marginTop: 8,
  },
  promoCodeDisabledContainer: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  promoCodeDisabledText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: "#6B7280",
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
    borderColor: "#E5E7EB",
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
  paymentButtonDisabledMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    padding: 8,
  },
  paymentButtonDisabledText: {
    fontSize: 14,
    marginLeft: 8,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  processingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  processingText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  cancelButton: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 8,
  },
  cancelButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "500",
  },
  verifyingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  verifyingAnimation: {
    width: 200,
    height: 300,
  },
  verifyingTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  verifyingMessage: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    color: "#6B7280",
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  successAnimation: {
    width: 200,
    height: 200,
  },
  successTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 24,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
    color: "#4CAF50",
  },
  successMessage: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  successButtonsContainer: {
    width: "100%",
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#4CAF50",
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
  },
  failedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  failedAnimation: {
    width: 200,
    height: 200,
  },
  failedTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 24,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
    color: "#EF4444",
  },
  failedMessage: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    color: "#6B7280",
  },
  retryButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
  },
  canceledContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  canceledTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 24,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
    color: "#F87171",
  },
  canceledMessage: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    color: "#6B7280",
  },
  noInstallmentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  noInstallmentText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    color: "#6B7280",
  },
  installmentDetailsContainer: {
    flex: 1,
    padding: 16,
  },
  installmentHeader: {
    marginBottom: 24,
  },
  installmentTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  installmentSubtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: "#6B7280",
  },
  installmentProgressContainer: {
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
  installmentProgressContainerDark: {
    backgroundColor: "#374151",
  },
  installmentProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  installmentProgressTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
  },
  installmentProgressValue: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "700",
    color: "#4CAF50",
  },
  installmentProgressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  installmentProgressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 4,
  },
  installmentInfoCard: {
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
  installmentInfoCardDark: {
    backgroundColor: "#374151",
  },
  installmentInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  installmentInfoLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: "#6B7280",
  },
  installmentInfoValue: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "600",
  },
  nextPaymentCard: {
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
  nextPaymentCardDark: {
    backgroundColor: "#374151",
  },
  nextPaymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  nextPaymentTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  nextPaymentInfo: {
    alignItems: "center",
    marginBottom: 16,
  },
  nextPaymentDate: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  nextPaymentDays: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  nextPaymentDaysUrgent: {
    color: "#EF4444",
    fontWeight: "600",
  },
  nextPaymentAmount: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 20,
    fontWeight: "700",
    color: "#4CAF50",
  },
  payNowButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  payNowButtonText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
  },
  paymentHistoryContainer: {
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
        android: {
          elevation: 2,
        },
      },
    }),
  },
  paymentHistoryContainerDark: {
    backgroundColor: "#374151",
  },
  paymentHistoryTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  paymentHistoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  paymentHistoryItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentHistoryItemIcon: {
    marginRight: 12,
  },
  paymentHistoryItemTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "600",
  },
  paymentHistoryItemDate: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: "#6B7280",
  },
  paymentHistoryItemFuture: {
    opacity: 0.6,
  },
  paymentHistoryItemAmount: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "600",
  },
  backButton: {
    backgroundColor: "#4B5563",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 24,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
  },
  fallbackContainer: {
    marginTop: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 8,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F59E0B",
    width: "100%",
    alignItems: "center",
  },
  fallbackMessage: {
    color: "#92400E",
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
  },
  fallbackButton: {
    backgroundColor: "#F59E0B",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  fallbackButtonText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
  },
  // Payment History Styles
  paymentHistorySection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  paymentHistorySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  paymentHistorySectionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  paymentHistoryList: {
    gap: 12,
  },
  paymentHistoryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  paymentHistoryCardDark: {
    backgroundColor: "#374151",
  },
  paymentHistoryCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  paymentHistoryCardStatus: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  paymentHistoryCardStatusText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  paymentHistoryCardAmount: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  paymentHistoryCardBody: {
    marginTop: 12,
    gap: 8,
  },
  paymentHistoryCardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentHistoryCardLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 8,
  },
  paymentHistoryCardReference: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 8,
  }
});

export default ProgramPaymentPage;
