import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  StyleSheet,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { theme } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { logger } from "@/utils/logger";
import * as Crypto from "expo-crypto";

import { ProgramPaymentService } from "@/services/program-payment.service";
import { PawaPayService, pawapayFailureMessage } from "@/lib/pawapay";
import { ProgramPayment, PaymentFlowState } from "@/types/payment.types";
import { InstallmentDetails, NextPaymentOptions, PaymentProcessing } from "@/components/payment";
import { useUser } from "@/contexts/useUserInfo";
import { HapticType, useHaptics } from "@/hooks/useHaptics";

// Cameroon MTN/Orange phone (9 digits, 64-69). In dev we charge a tiny test amount.
const CM_PHONE_REGEX = /^(6[4-9][0-9])[0-9]{6}$/;
const DEV_TEST_AMOUNT = 100;
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_S = 300;

const InstallmentPaymentPage = () => {
  const local = useLocalSearchParams();
  const pdId = local.pdId as string | undefined;
  const router = useRouter();
  const { user } = useAuth();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const { trigger } = useHaptics();
  const { mutateUserPrograms, mutateProgramAccessMap } = useUser();

  const [isLoading, setIsLoading] = useState(true);
  const [programId, setProgramId] = useState<string | null>(null);
  const [programName, setProgramName] = useState<string>("");
  const [installmentPayment, setInstallmentPayment] = useState<ProgramPayment | null>(null);
  const [currentState, setCurrentState] = useState<PaymentFlowState>(PaymentFlowState.INSTALLMENT_DETAILS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Load program and installment data
  useEffect(() => {
    const loadData = async () => {
      if (!pdId || !user) {
        setIsLoading(false);
        return;
      }

      try {
        // Get program ID from learning path ID
        const { data: programData, error: programError } = await supabase
          .from("concours_learningpaths")
          .select(`
            id,
            concour:concours(
              id,
              name,
              school:schools(
                sigle
              ),
              study_cycles(level)
            )
          `)
          .eq("learningPathId", pdId)
          .single();

        if (programError || !programData) {
          logger.error("Error fetching program:", programError);
          setErrorMessage("Impossible de charger les informations du programme");
          setIsLoading(false);
          return;
        }

        const programId = String(programData.id);
        setProgramId(programId);

        // Build program name
        const schoolSigle = programData.concour?.school?.sigle || "";
        const level = programData.concour?.study_cycles?.level || "";
        const name = `Programme ${schoolSigle} Niveau : ${level}`;
        setProgramName(name);

        // Get latest installment payment
        const payment = await ProgramPaymentService.getLatestPayment(programId);

        if (!payment || !payment.is_installment) {
          setErrorMessage("Aucun paiement échelonné trouvé pour ce programme");
          setIsLoading(false);
          return;
        }

        setInstallmentPayment(payment);
        setIsLoading(false);
      } catch (error) {
        logger.error("Error loading installment data:", error);
        setErrorMessage("Une erreur est survenue lors du chargement");
        setIsLoading(false);
      }
    };

    loadData();
  }, [pdId, user]);

  // Handle pay next installment
  const handlePayNext = () => {
    trigger(HapticType.LIGHT);
    setCurrentState(PaymentFlowState.NEXT_PAYMENT_OPTIONS);
  };

  // Handle back navigation
  const handleBack = () => {
    trigger(HapticType.LIGHT);
    
    if (currentState === PaymentFlowState.INSTALLMENT_DETAILS) {
      router.back();
    } else {
      setCurrentState(PaymentFlowState.INSTALLMENT_DETAILS);
    }
  };

  // Handle payment submission (next installment via PawaPay).
  const handlePaymentSubmit = async (phoneNumber: string) => {
    if (!installmentPayment?.id || !programId) {
      setErrorMessage("Paiement non trouvé");
      return;
    }
    if (!CM_PHONE_REGEX.test(phoneNumber)) {
      setErrorMessage("Numéro invalide. Utilisez un numéro MTN ou Orange (ex: 650123456).");
      setCurrentState(PaymentFlowState.NEXT_PAYMENT_FAILED);
      return;
    }

    setCurrentState(PaymentFlowState.NEXT_PAYMENT_PROCESSING);
    setErrorMessage(null);

    try {
      const depositId = Crypto.randomUUID();
      const total = installmentPayment.total_installments ?? 2;
      const nextNum = (installmentPayment.current_installment ?? 1) + 1;
      const fullTotal = installmentPayment.total_amount ?? installmentPayment.amount * total;
      const baseAmount = Math.ceil(fullTotal / total);
      const amount = __DEV__ ? DEV_TEST_AMOUNT : baseAmount;
      const trueParentId = installmentPayment.parent_payment_id || installmentPayment.id;

      // 1. Create the next pending installment row (DB trigger extends the
      //    enrollment expiry when this payment becomes "completed").
      const payment = await ProgramPaymentService.createPayment(
        programId,
        phoneNumber,
        amount,
        depositId,
        null,
        true,
        total,
        nextNum,
        fullTotal,
        trueParentId ?? undefined
      );

      // 2. Initiate the PawaPay deposit.
      const result = await PawaPayService.initiateDeposit({
        depositId,
        phoneNumber,
        amount,
        customerMessage: "Elearn Prepa",
      });

      if (!result.ok) {
        const code = (result.failureReason as { failureCode?: string })?.failureCode;
        setErrorMessage(
          code ? pawapayFailureMessage(code) : result.error || "Le paiement n'a pas pu être initié. Réessayez."
        );
        setCurrentState(PaymentFlowState.NEXT_PAYMENT_FAILED);
        if (payment.id) ProgramPaymentService.setStatus(payment.id, "failed").catch(() => {});
        return;
      }

      // 3. Poll for the final status.
      setCurrentState(PaymentFlowState.NEXT_PAYMENT_VERIFYING);
      startStatusCheck(depositId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur lors du traitement du paiement";
      logger.error("Error processing next installment:", error);
      setErrorMessage(msg);
      setCurrentState(PaymentFlowState.NEXT_PAYMENT_FAILED);
    }
  };

  // Poll the backoffice for the PawaPay deposit status.
  const startStatusCheck = (depositId: string) => {
    if (!depositId) return;
    let elapsed = 0;

    const interval = setInterval(async () => {
      elapsed += POLL_INTERVAL_MS / 1000;

      if (elapsed >= POLL_TIMEOUT_S) {
        clearInterval(interval);
        setStatusCheckInterval(null);
        setCurrentState(PaymentFlowState.NEXT_PAYMENT_FAILED);
        setErrorMessage("Le délai de vérification a expiré. Si le montant a été débité, contactez le support.");
        return;
      }

      try {
        const res = await PawaPayService.checkStatus(depositId);
        if (res.status === "completed") {
          clearInterval(interval);
          setStatusCheckInterval(null);
          setCurrentState(PaymentFlowState.NEXT_PAYMENT_SUCCESS);
          await mutateUserPrograms().catch(() => {});
          await mutateProgramAccessMap().catch(() => {});
          if (programId) {
            const updatedPayment = await ProgramPaymentService.getLatestPayment(programId);
            setInstallmentPayment(updatedPayment);
          }
        } else if (res.status === "failed") {
          clearInterval(interval);
          setStatusCheckInterval(null);
          setCurrentState(PaymentFlowState.NEXT_PAYMENT_FAILED);
          setErrorMessage(pawapayFailureMessage(res.failureCode));
        }
      } catch (error) {
        logger.error("Error checking payment status:", error);
        // Keep polling; only stop on final status or timeout.
      }
    }, POLL_INTERVAL_MS);

    setStatusCheckInterval(interval);
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, []); // Empty array ensures cleanup only runs on unmount

  // Handle payment success
  const handlePaymentSuccess = () => {
    trigger(HapticType.SUCCESS);

    
    
    Alert.alert(
      "Paiement réussi",
      "Votre paiement a été effectué avec succès. Vous pouvez maintenant continuer à accéder au programme.",
      [
        {
          text: "OK",
          onPress: () => {
            // Use replace to prevent user from going back to success screen
            // This ensures they return to program details with updated access
            router.replace(`/(app)/learn/${pdId}?fromPayment=success`);
          },
        },
      ]
    );
  };

  // Handle retry payment
  const handleRetryPayment = () => {
    trigger(HapticType.LIGHT);
    setCurrentState(PaymentFlowState.NEXT_PAYMENT_OPTIONS);
    setErrorMessage(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, styles.centerContainer]}>
        <ActivityIndicator size="large" color={theme.color.primary[500]} />
        <ThemedText style={styles.loadingText}>
          Chargement des informations...
        </ThemedText>
      </View>
    );
  }

  // Error state
  if (errorMessage && !installmentPayment) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, styles.centerContainer]}>
        <MaterialCommunityIcons
          name="alert-circle"
          size={48}
          color={isDark ? "#CCCCCC" : "#6B7280"}
        />
        <ThemedText style={[styles.errorText, isDark && styles.errorTextDark]}>
          {errorMessage}
        </ThemedText>
        <TouchableOpacity style={styles.retryButton} onPress={handleBack}>
          <ThemedText style={styles.retryButtonText}>Retour</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  // Render based on current state
  const renderContent = () => {
    switch (currentState) {
      case PaymentFlowState.INSTALLMENT_DETAILS:
        return (
          <InstallmentDetails
            installmentPayment={installmentPayment}
            programName={programName}
            isDark={isDark}
            onPayNext={handlePayNext}
            onBack={handleBack}
          />
        );

      case PaymentFlowState.NEXT_PAYMENT_OPTIONS:
        if (!installmentPayment) {
          // Fallback if installment payment is not available
          return (
            <View style={styles.centerContainer}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={48}
                color={isDark ? "#CCCCCC" : "#6B7280"}
              />
              <ThemedText style={[styles.errorText, isDark && styles.errorTextDark]}>
                Les informations de paiement ne sont pas disponibles.
              </ThemedText>
              <TouchableOpacity style={styles.retryButton} onPress={handleBack}>
                <ThemedText style={styles.retryButtonText}>Retour</ThemedText>
              </TouchableOpacity>
            </View>
          );
        }
        
        return (
          <View style={{ flex: 1 }}>
            <View style={[styles.header, isDark && styles.headerDark]}>
              <TouchableOpacity onPress={handleBack} style={styles.backIconButton}>
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={24}
                  color={isDark ? "#FFFFFF" : "#111827"}
                />
              </TouchableOpacity>
              <ThemedText style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
                Payer la prochaine échéance
              </ThemedText>
            </View>
            <NextPaymentOptions
              programName={programName}
              installmentAmount={installmentPayment.amount}
              currentInstallment={installmentPayment.current_installment || 1}
              totalInstallments={installmentPayment.total_installments || 1}
              onPayment={handlePaymentSubmit}
              isDark={isDark}
              isLoading={false}
            />
          </View>
        );

      case PaymentFlowState.NEXT_PAYMENT_PROCESSING:
      case PaymentFlowState.NEXT_PAYMENT_VERIFYING:
        return (
          <PaymentProcessing
            state={
              currentState === PaymentFlowState.NEXT_PAYMENT_VERIFYING
                ? "verifying"
                : "processing"
            }
            isDark={isDark}
            currentMessage={
              currentState === PaymentFlowState.NEXT_PAYMENT_VERIFYING
                ? "En attente de validation. Confirmez avec votre code PIN Mobile Money..."
                : undefined
            }
            onCancel={handleBack}
          />
        );

      case PaymentFlowState.NEXT_PAYMENT_SUCCESS:
        return (
          <View style={styles.centerContainer}>
            <MaterialCommunityIcons
              name="check-circle"
              size={80}
              color={theme.color.primary[500]}
            />
            <ThemedText style={styles.successTitle}>Paiement réussi !</ThemedText>
            <ThemedText style={[styles.successMessage, isDark && styles.successMessageDark]}>
              Votre paiement a été effectué avec succès.
            </ThemedText>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handlePaymentSuccess}
            >
              <ThemedText style={styles.continueButtonText}>
                Continuer
              </ThemedText>
            </TouchableOpacity>
          </View>
        );

      case PaymentFlowState.NEXT_PAYMENT_FAILED:
        return (
          <View style={styles.centerContainer}>
            <MaterialCommunityIcons
              name="close-circle"
              size={80}
              color={theme.color.error}
            />
            <ThemedText style={styles.errorTitle}>Paiement échoué</ThemedText>
            <ThemedText style={[styles.errorMessage, isDark && styles.errorMessageDark]}>
              {errorMessage || "Le paiement a échoué. Veuillez réessayer."}
            </ThemedText>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetryPayment}
            >
              <ThemedText style={styles.retryButtonText}>Réessayer</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
            >
              <ThemedText style={[styles.backButtonText, isDark && styles.backButtonTextDark]}>
                Retour
              </ThemedText>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderBottomColor: theme.color.dark.border,
  },
  backIconButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  headerTitleDark: {
    color: "#FFFFFF",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: "#6B7280",
  },
  errorText: {
    marginTop: 12,
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  errorTextDark: {
    color: "#CCCCCC",
  },
  successTitle: {
    marginTop: 24,
    fontFamily: theme.typography.fontFamily,
    fontSize: 24,
    fontWeight: "700",
    color: theme.color.primary[500],
  },
  successMessage: {
    marginTop: 12,
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  successMessageDark: {
    color: "#CCCCCC",
  },
  errorTitle: {
    marginTop: 24,
    fontFamily: theme.typography.fontFamily,
    fontSize: 24,
    fontWeight: "700",
    color: theme.color.error,
  },
  errorMessage: {
    marginTop: 12,
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  errorMessageDark: {
    color: "#CCCCCC",
  },
  continueButton: {
    marginTop: 24,
    backgroundColor: theme.color.primary[500],
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: theme.color.primary[500],
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  backButtonText: {
    color: theme.color.gray[600],
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
  },
  backButtonTextDark: {
    color: "#CCCCCC",
  },
});

export default InstallmentPaymentPage;
