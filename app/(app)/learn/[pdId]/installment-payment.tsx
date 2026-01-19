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
import { ProgramPaymentService } from "@/services/program-payment.service";
import { ProgramPayment, PaymentFlowState } from "@/types/payment.types";
import { InstallmentDetails, NextPaymentOptions, PaymentProcessing } from "@/components/payment";
import { useUser } from "@/contexts/useUserInfo";
import { HapticType, useHaptics } from "@/hooks/useHaptics";

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
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const MAX_STATUS_CHECK_ATTEMPTS = 60; // 60 attempts * 10 seconds = 10 minutes max

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

  // Handle payment submission
  const handlePaymentSubmit = async (phoneNumber: string) => {
    if (!installmentPayment?.id) {
      setErrorMessage("Paiement non trouvé");
      return;
    }

    setCurrentState(PaymentFlowState.NEXT_PAYMENT_PROCESSING);
    setErrorMessage(null);

    try {
      const result = await ProgramPaymentService.processNextInstallment(
        installmentPayment.id,
        phoneNumber
      );

      if (result.authorizationUrl) {
        setAuthorizationUrl(result.authorizationUrl);
      }

      // Start checking payment status
      setCurrentState(PaymentFlowState.NEXT_PAYMENT_VERIFYING);
      startStatusCheck(result.trxReference || result.payment_reference);
    } catch (error: any) {
      logger.error("Error processing next installment:", error);
      setErrorMessage(error.message || "Erreur lors du traitement du paiement");
      setCurrentState(PaymentFlowState.NEXT_PAYMENT_FAILED);
    }
  };

  // Start checking payment status
  const startStatusCheck = (trxReference: string) => {
    if (!trxReference) return;

    let attempts = 0;

    // Check status every 10 seconds
    const interval = setInterval(() => {
      attempts++;
      
      // Stop checking after max attempts
      if (attempts >= MAX_STATUS_CHECK_ATTEMPTS) {
        clearInterval(interval);
        setStatusCheckInterval(null);
        setCurrentState(PaymentFlowState.NEXT_PAYMENT_FAILED);
        setErrorMessage("Le délai de vérification du paiement a expiré. Veuillez vérifier votre compte ou contacter le support.");
        return;
      }

      // Async function to check payment status
      (async () => {
        try {
          // Get the payment by reference to check status
          const payment = await ProgramPaymentService.getPaymentByReference(trxReference);
          
          if (payment && payment.payment_status === "completed") {
            clearInterval(interval);
            setStatusCheckInterval(null);
            setCurrentState(PaymentFlowState.NEXT_PAYMENT_SUCCESS);
            
            // Revalidate data
            await mutateUserPrograms();
            await mutateProgramAccessMap();
            
            // Reload installment data
            if (programId) {
              const updatedPayment = await ProgramPaymentService.getLatestPayment(programId);
              setInstallmentPayment(updatedPayment);
            }
          } else if (payment && (payment.payment_status === "failed" || payment.payment_status === "canceled")) {
            clearInterval(interval);
            setStatusCheckInterval(null);
            setCurrentState(PaymentFlowState.NEXT_PAYMENT_FAILED);
            setErrorMessage("Le paiement a échoué. Veuillez réessayer.");
          }
        } catch (error) {
          logger.error("Error checking payment status:", error);
          // Don't stop checking on individual errors, only on timeout
        }
      })();
    }, 10000);

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
            router.replace(`/(app)/learn/${pdId}/index?fromPayment=success`);
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
            isDark={isDark}
            authorizationUrl={authorizationUrl}
            isVerifying={currentState === PaymentFlowState.NEXT_PAYMENT_VERIFYING}
          />
        );

      case PaymentFlowState.NEXT_PAYMENT_SUCCESS:
        return (
          <View style={styles.centerContainer}>
            <MaterialCommunityIcons
              name="check-circle"
              size={80}
              color={theme.color.success[500]}
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
              color={theme.color.error[500]}
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
    color: theme.color.success[500],
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
    color: theme.color.error[500],
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
    backgroundColor: theme.color.success[500],
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
