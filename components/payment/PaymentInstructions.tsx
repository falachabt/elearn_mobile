import React, { useState, useEffect, FC } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { theme } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import WhatsAppContact from "@/components/WhatsappSupport";
import { ProgramPayment } from "@/types/payment.types";
import { logger } from "@/utils/logger";
import { ProgramPaymentService } from "@/services/program-payment.service";

interface PaymentInstructionsProps {
  programName: string;
  hasInstallmentPayment: boolean;
  isLoading: boolean;
  isDark: boolean;
  onContinue: () => void;
  programId: string | number | null;
}

export const PaymentInstructions: FC<PaymentInstructionsProps> = ({
  programName,
  hasInstallmentPayment,
  isLoading,
  isDark,
  onContinue,
  programId,
}) => {
  const [allPayments, setAllPayments] = useState<ProgramPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Charger l'historique des paiements
  useEffect(() => {
    const fetchPayments = async () => {
      if (!programId) return;

      setLoadingPayments(true);
      try {
        const data = await ProgramPaymentService.getPaymentHistory(programId);
        setAllPayments(data);
      } catch (error) {
        logger.error("Error fetching payments:", error);
      } finally {
        setLoadingPayments(false);
      }
    };

    fetchPayments();
  }, [programId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return theme.color.success[500];
      case "failed":
        return theme.color.error[500];
      case "canceled":
        return theme.color.warning[500];
      case "pending":
        return theme.color.info[500];
      default:
        return theme.color.gray[500];
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
            color={isDark ? theme.color.info[400] : theme.color.info[500]}
          />
          <ThemedText
            style={[
              styles.instructionNoteText,
              { color: isDark ? theme.color.info[400] : theme.color.info[500] },
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
            color={isDark ? theme.color.success[300] : theme.color.success[500]}
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
              color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
            />
            <ThemedText style={styles.paymentHistorySectionTitle}>
              Historique des paiements
            </ThemedText>
          </View>

          {loadingPayments ? (
            <View style={styles.paymentHistoryList}>
              <ActivityIndicator
                size="small"
                color={isDark ? theme.color.success[300] : theme.color.success[500]}
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
                          color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
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
                            color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
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
                                ? theme.color.error[500]
                                : isDark
                                ? theme.color.gray[400]
                                : theme.color.gray[600]
                            }
                          />
                          <ThemedText
                            style={[
                              styles.paymentHistoryCardLabel,
                              isExpired && { color: theme.color.error[500] },
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
                            color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
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

const styles = StyleSheet.create({
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
    backgroundColor: theme.color.success[500],
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
    backgroundColor: theme.color.success[500],
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
    color: theme.color.gray[400],
    fontStyle: "italic",
  },
  paymentHistorySection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: theme.color.gray[200],
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentHistoryCardDark: {
    backgroundColor: theme.color.dark.background.secondary,
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
    color: theme.color.gray[600],
    marginLeft: 8,
  },
  paymentHistoryCardReference: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: theme.color.gray[600],
    marginLeft: 8,
  },
});
