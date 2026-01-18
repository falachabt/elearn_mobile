import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, ActivityIndicator, useColorScheme, ScrollView, Linking, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { theme } from "@/constants/theme";
import { useProgramPayment } from "@/hooks/useProgramPayment";
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import { usePricing } from "@/utils/pricing";
import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/useUserInfo";
import { logger } from "@/utils/logger";

import {
  PaymentInstructions,
  PaymentOptions,
  NextPaymentOptions,
  PaymentProcessing,
  InstallmentDetails,
} from "@/components/payment";

import { PaymentFlowState, ProgramPayment, PromoCodeDetails, PaymentContextData } from "@/types/payment.types";
import { MESSAGE_ROTATION_INTERVAL } from "@/constants/payment.constants";
import { ProgramUtilsService } from "@/services/program-utils.service";
import { NotificationService } from "@/services/notification.service";

const ProgramPaymentPage = () => {
  const local = useLocalSearchParams();
  const pdId = local.pdId as string | undefined;
  const router = useRouter();
  const { user } = useAuth();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const { trigger } = useHaptics();
  const { mutateUserPrograms, mutateProgramAccessMap } = useUser();
  const pricing = usePricing();

  // Use the program payment hook
  const {
    paymentStatus,
    loading,
    latestPayment,
    latestPaymentLoading,
    authorizationUrl,
    errorMessage: hookErrorMessage,
    programId,
    initiateDirectPayment,
    cancelPayment,
    verifyPaymentStatus,
    isFinalStatus,
    mutateLatestPayment,
  } = useProgramPayment(pdId);

  // State management
  const [currentState, setCurrentState] = useState<PaymentFlowState>(PaymentFlowState.LOADING);
  const [isInitialized, setIsInitialized] = useState(false);
  const [programContext, setProgramContext] = useState<PaymentContextData>({
    programId: null,
    programName: "",
    programPrice: pricing.FIXED_PRICE || 0,
    user: null,
    hasCompletedFirstInstallment: false,
    latestPayment: null,
    installmentPayment: null,
  });

  const [currentTrxReference, setCurrentTrxReference] = useState<string | null>(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shouldIgnoreOldStatus, setShouldIgnoreOldStatus] = useState(latestPayment?.has_seen_result === true);
  
  const [verificationMessages] = useState([
    "En attente de validation sur votre téléphone...",
    "Une fois validé, la vérification peut prendre jusqu'à 5 minutes...",
  ]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // Determine initial state based on payment history
  const determineInitialState = (latestPayment: ProgramPayment | null, hasCompletedFirstInstallment: boolean) => {
    if (!latestPayment) {
      setCurrentState(PaymentFlowState.INSTRUCTIONS);
      return;
    }

    // If payment already seen, start fresh
    if (latestPayment.has_seen_result === true) {
      logger.log('[Payment] Payment already seen, starting fresh');
      setCurrentState(PaymentFlowState.INSTRUCTIONS);
      return;
    }

    // If payment not in final status, continue verification
    if (!isFinalStatus(latestPayment.payment_status)) {
      logger.log('[Payment] Non-final payment status, setting up verification');
      
      if (hasCompletedFirstInstallment && latestPayment.is_installment) {
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

    // If payment is final AND not seen, show result
    logger.log('[Payment] Final payment status not seen, redirecting to result page');
    
    router.replace({
      pathname: "/learn/[pdId]/payment-result",
      params: {
        pdId: pdId || "",
        result: latestPayment.payment_status === 'completed' ? 'success' : 
                latestPayment.payment_status === 'failed' ? 'failed' : 'canceled',
        programName: programContext.programName,
        programId: programContext.programId || "",
        paymentReference: latestPayment.payment_reference || '',
      },
    });
  };

  // Initialize program context
  useEffect(() => {
    if (!pdId || !programId || latestPaymentLoading) return;
    
    if (isInitialized && currentState !== PaymentFlowState.LOADING) {
      return;
    }

    const initializeProgramContext = async () => {
      try {
        const { data: programData, error } = await supabase
          .from("concours_learningpaths")
          .select("id, price, learningPathId, learning_paths(title)")
          .eq("learningPathId", pdId)
          .single();

        if (error || !programData) {
          logger.error("[Payment] Error fetching program data:", error);
          setProgramContext(prev => ({
            ...prev,
            programId: programId || null,
            programName: "Programme",
            programPrice: pricing.FIXED_PRICE || 0,
            user,
            latestPayment: latestPayment as ProgramPayment | null,
          }));
          setCurrentState(PaymentFlowState.INSTRUCTIONS);
          setIsInitialized(true);
          return;
        }

        const hasCompletedFirst = latestPayment?.is_installment && 
                                   latestPayment?.current_installment && 
                                   latestPayment?.current_installment > 1;

        const lpData = programData.learning_paths as { title?: string } | { title?: string }[] | null;
        const programName = (Array.isArray(lpData) ? lpData[0]?.title : lpData?.title) || "Programme";

        const updatedContext = {
          programId: String(programData.id),
          programName,
          programPrice: pricing.FIXED_PRICE || 0,
          user,
          hasCompletedFirstInstallment: hasCompletedFirst || false,
          latestPayment: latestPayment as ProgramPayment | null,
          installmentPayment: latestPayment?.is_installment ? latestPayment as ProgramPayment : null,
        };

        setProgramContext(updatedContext);
        determineInitialState(latestPayment as ProgramPayment | null, hasCompletedFirst || false);
        setIsInitialized(true);
      } catch (error) {
        logger.error("[Payment] Error initializing program context:", error);
        setCurrentState(PaymentFlowState.INSTRUCTIONS);
        setIsInitialized(true);
      }
    };

    initializeProgramContext();
  }, [pdId, programId, latestPaymentLoading, pricing.FIXED_PRICE]);

  // Handle payment status changes
  useEffect(() => {
    logger.log('[Payment] Status:', paymentStatus, 'State:', currentState, 'TrxRef:', currentTrxReference);
    
    const isVerifying = currentState === PaymentFlowState.VERIFYING || 
                        currentState === PaymentFlowState.NEXT_PAYMENT_VERIFYING;
    
    if (!isVerifying || !programContext.programId || !programContext.programName) return;
    if (shouldIgnoreOldStatus || !currentTrxReference) return;
    if (!latestPayment?.payment_reference || latestPayment.payment_reference !== currentTrxReference) return;
    if (latestPayment?.has_seen_result === true) return;
    
    logger.log('[Payment] Processing status:', paymentStatus);

    if (paymentStatus === "successful" || paymentStatus === "completed") {
      stopStatusCheck();
      router.replace({
        pathname: "/learn/[pdId]/payment-result",
        params: {
          pdId: pdId || "",
          result: "success",
          programName: programContext.programName,
          programId: programContext.programId || "",
          paymentReference: currentTrxReference,
        },
      });
    } else if (paymentStatus === "failed") {
      stopStatusCheck();
      router.replace({
        pathname: "/learn/[pdId]/payment-result",
        params: {
          pdId: pdId || "",
          result: "failed",
          programName: programContext.programName,
          programId: programContext.programId || "",
          paymentReference: currentTrxReference,
          errorMessage: errorMessage || "Le paiement a échoué. Veuillez réessayer.",
          authorizationUrl: authorizationUrl || undefined,
        },
      });
    } else if (paymentStatus === "canceled") {
      stopStatusCheck();
      router.replace({
        pathname: "/learn/[pdId]/payment-result",
        params: {
          pdId: pdId || "",
          result: "canceled",
          programName: programContext.programName,
          programId: programContext.programId || "",
          paymentReference: currentTrxReference,
        },
      });
    }
  }, [paymentStatus, programContext, errorMessage, authorizationUrl, currentTrxReference, currentState, shouldIgnoreOldStatus]);

  // Handle authorization URL
  useEffect(() => {
    if (authorizationUrl) {
      Linking.openURL(authorizationUrl);
    }
  }, [authorizationUrl]);

  // Message rotation for verification
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((current) => (current + 1) % verificationMessages.length);
    }, MESSAGE_ROTATION_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Status check functions
  const startStatusCheck = (reference: string) => {
    if (statusCheckInterval) return;

    const interval = setInterval(async () => {
      const result = await verifyPaymentStatus(reference);

      if (result?.transaction?.status) {
        const status = result.transaction.status === "complete" ? "completed" : result.transaction.status;
        if (isFinalStatus(status)) {
          stopStatusCheck();
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
      let amount = paymentData.isInstallment
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

      const payment = "payment" in result ? result.payment : result;
      if (payment && payment.payment_reference) {
        setShouldIgnoreOldStatus(false);
        setCurrentTrxReference(payment.payment_reference);
        setCurrentState(PaymentFlowState.VERIFYING);
        startStatusCheck(payment.payment_reference);
      } else {
        setCurrentState(PaymentFlowState.FAILED);
        setErrorMessage("Impossible d'initier le paiement. Veuillez réessayer.");
      }
    } catch (error) {
      logger.error("Payment initiation error:", error);
      setCurrentState(PaymentFlowState.FAILED);
      setErrorMessage(error instanceof Error ? error.message : "Une erreur est survenue lors du paiement");
    }
  };

  const handleNextPayment = async (phoneNumber: string) => {
    trigger(HapticType.MEDIUM);
    setCurrentState(PaymentFlowState.NEXT_PAYMENT_PROCESSING);
    setErrorMessage(null);

    try {
      const amount = programContext.installmentPayment?.amount || programContext.programPrice;

      let nextInstallationStartDate = new Date();
      if (programContext.installmentPayment?.next_payment_due_date) {
        const nextDueDate = new Date(programContext.installmentPayment.next_payment_due_date);
        if (nextDueDate > new Date()) {
          nextInstallationStartDate = nextDueDate;
        }
      }

      const result = await initiateDirectPayment(
        programContext.programId!,
        phoneNumber.trim(),
        amount,
        undefined,
        true,
        programContext.installmentPayment?.total_installments || 1,
        (programContext.installmentPayment?.current_installment || 1) + 1,
        nextInstallationStartDate
      );

      const paymentRef = "payment_reference" in result ? result.payment_reference : 
                         "trxReference" in result ? (result as unknown as { trxReference: string }).trxReference : undefined;
      
      if (paymentRef) {
        setShouldIgnoreOldStatus(false);
        setCurrentTrxReference(paymentRef);
        setCurrentState(PaymentFlowState.NEXT_PAYMENT_VERIFYING);
        startStatusCheck(paymentRef);
      } else {
        setCurrentState(PaymentFlowState.NEXT_PAYMENT_FAILED);
        setErrorMessage("Impossible d'initier le paiement. Veuillez réessayer.");
      }
    } catch (error) {
      logger.error("Next payment initiation error:", error);
      setCurrentState(PaymentFlowState.NEXT_PAYMENT_FAILED);
      setErrorMessage(error instanceof Error ? error.message : "Une erreur est survenue lors du paiement");
    }
  };

  const handleCancelPayment = async () => {
    if (currentTrxReference) {
      try {
        setShouldIgnoreOldStatus(true);
        await cancelPayment();
        stopStatusCheck();
        setCurrentTrxReference(null);

        if (programContext.hasCompletedFirstInstallment) {
          setCurrentState(PaymentFlowState.INSTALLMENT_DETAILS);
        } else {
          setCurrentState(PaymentFlowState.CANCELED);
        }
      } catch (error) {
        logger.error("Error canceling payment:", error);
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
            <ActivityIndicator size="large" color={isDark ? "#6EE7B7" : "#4CAF50"} />
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
            currentInstallment={programContext.installmentPayment?.current_installment || 1}
            totalInstallments={programContext.installmentPayment?.total_installments || 1}
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
            onCancel={() => setCurrentState(PaymentFlowState.INSTALLMENT_DETAILS)}
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
        <ThemedText style={styles.headerTitle}>Paiement du programme</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>{renderContent()}</ScrollView>
    </View>
  );
};

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
});

export default ProgramPaymentPage;
