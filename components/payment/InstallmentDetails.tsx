import React, { useState, useEffect, FC } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { theme } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import WhatsAppContact from "@/components/WhatsappSupport";
import { ProgramPayment } from "@/types/payment.types";
import { logger } from "@/utils/logger";
import { ProgramPaymentService } from "@/services/program-payment.service";

interface InstallmentDetailsProps {
  installmentPayment: ProgramPayment | null;
  programName: string;
  isDark: boolean;
  onPayNext: () => void;
  onBack: () => void;
}

export const InstallmentDetails: FC<InstallmentDetailsProps> = ({
  installmentPayment,
  programName,
  isDark,
  onPayNext,
  onBack,
}) => {
  const [allInstallments, setAllInstallments] = useState<ProgramPayment[]>([]);
  const [loadingInstallments, setLoadingInstallments] = useState(false);

  // Charger tous les paiements liés à ce plan échelonné
  useEffect(() => {
    const fetchAllInstallments = async () => {
      if (!installmentPayment?.id) return;

      setLoadingInstallments(true);
      try {
        const data = await ProgramPaymentService.getAllInstallmentsForPlan(installmentPayment.id);
        setAllInstallments(data);
      } catch (error) {
        logger.error("Error fetching installments:", error);
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
              color={theme.color.warning[500]}
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
            <ActivityIndicator size="small" color={isDark ? theme.color.success[300] : theme.color.success[500]} />
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
              if (isPaid && matchingPayment?.payment_status === 'completed') return isDark ? theme.color.success[300] : theme.color.success[500];
              if (isPaid && matchingPayment?.payment_status === 'failed') return theme.color.error[500];
              if (isOverdue) return theme.color.warning[500];
              if (isCurrent) return theme.color.info[500];
              return isDark ? theme.color.gray[600] : theme.color.gray[400];
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
                  <View style={{ flex: 1, flexShrink: 1, marginRight: 8 }}>
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
                        isOverdue && { color: theme.color.warning[500] }
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
                        { color: isDark ? theme.color.gray[600] : theme.color.gray[400] }
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
                <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                  <ThemedText style={styles.paymentHistoryItemAmount} numberOfLines={1}>
                    {installmentAmount} FCFA
                  </ThemedText>
                  <ThemedText 
                    style={[
                      styles.paymentHistoryItemDate,
                      { color: getStatusColor(), fontWeight: '600', fontSize: 11 }
                    ]}
                    numberOfLines={1}
                  >
                    {getStatusLabel()}
                  </ThemedText>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* WhatsApp Support */}
      <WhatsAppContact
        message={`Bonjour, j'ai besoin d'aide concernant mon plan de paiement échelonné pour ${programName}`}
        style={{ marginTop: 16, marginBottom: 16 }}
      />

      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>Retourner au programme</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
    color: theme.color.gray[600],
  },
  continueButton: {
    backgroundColor: theme.color.success[500],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
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
    color: theme.color.gray[600],
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
    backgroundColor: theme.color.dark.background.secondary,
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
    color: theme.color.success[500],
  },
  installmentProgressBar: {
    height: 8,
    backgroundColor: theme.color.gray[200],
    borderRadius: 4,
    overflow: "hidden",
  },
  installmentProgressFill: {
    height: "100%",
    backgroundColor: theme.color.success[500],
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
    backgroundColor: theme.color.dark.background.secondary,
  },
  installmentInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.gray[200],
  },
  installmentInfoLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[600],
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
    backgroundColor: theme.color.dark.background.secondary,
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
    color: theme.color.gray[600],
    marginBottom: 8,
  },
  nextPaymentDaysUrgent: {
    color: theme.color.error[500],
    fontWeight: "600",
  },
  nextPaymentAmount: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 20,
    fontWeight: "700",
    color: theme.color.success[500],
  },
  payNowButton: {
    backgroundColor: theme.color.success[500],
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
      },
      android: {
        elevation: 2,
      },
    }),
  },
  paymentHistoryContainerDark: {
    backgroundColor: theme.color.dark.background.secondary,
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
    borderBottomColor: theme.color.gray[200],
  },
  paymentHistoryItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
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
    color: theme.color.gray[600],
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
    backgroundColor: theme.color.gray[600],
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
});
