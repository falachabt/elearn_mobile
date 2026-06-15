import React, { useState, useEffect, useRef } from "react";
import { View, TouchableOpacity, ActivityIndicator, useColorScheme, ScrollView, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Crypto from "expo-crypto";

import { theme } from "@/constants/theme";
import { useProgramPayment } from "@/hooks/useProgramPayment";
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import { usePricing } from "@/utils/pricing";
import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/useUserInfo";
import { logger } from "@/utils/logger";
import { ProgramPaymentService } from "@/services/program-payment.service";
import { PawaPayService, pawapayFailureMessage } from "@/lib/pawapay";
import {
  PaymentInstructions,
  PaymentOptions,
  NextPaymentOptions,
  PaymentProcessing,
  InstallmentDetails,
} from "@/components/payment";
import WhatsAppContact from "@/components/WhatsappSupport";
import { PaymentFlowState, ProgramPayment, PromoCodeDetails, PaymentContextData } from "@/types/payment.types";
import { MESSAGE_ROTATION_INTERVAL } from "@/constants/payment.constants";

// Phone numbers accepted (Cameroon MTN/Orange, 9 digits starting 64-69).
const CM_PHONE_REGEX = /^(6[4-9][0-9])[0-9]{6}$/;
// In dev builds we charge a tiny test amount instead of the real price so test
// PawaPay deposits don't cost the full price. PawaPay MTN_MOMO_CMR min = 1 XAF.
const DEV_TEST_AMOUNT = 100;
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_S = 300; // 5 min

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

  // The hook gives us the latest payment (for resume) + cancel + program id.
  const {
    loading,
    latestPayment,
    latestPaymentLoading,
    programId,
    cancelPayment,
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
  const [paymentRowId, setPaymentRowId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shouldIgnoreOldStatus, setShouldIgnoreOldStatus] = useState(latestPayment?.has_seen_result === true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [verificationMessages] = useState([
    "En attente de validation sur votre téléphone...",
    "Confirmez le paiement avec votre code PIN Mobile Money...",
    "Une fois validé, la vérification peut prendre jusqu'à 5 minutes...",
  ]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // Navigate to the result screen (success | failed | canceled).
  const goToResult = (
    result: "success" | "failed" | "canceled",
    reference: string,
    message?: string
  ) => {
    router.replace({
      pathname: "/learn/[pdId]/payment-result",
      params: {
        pdId: pdId || "",
        result,
        programName: programContext.programName,
        programId: programContext.programId || "",
        paymentReference: reference,
        ...(message ? { errorMessage: message } : {}),
      },
    });
  };

  // Poll the backoffice for the PawaPay deposit status. On a final status the
  // server has already synced our DB row (and the DB trigger creates/extends the
  // program enrollment on "completed"), so we just navigate.
  const startPawaPayPolling = (depositId: string) => {
    stopPolling();
    let elapsed = 0;
    pollRef.current = setInterval(async () => {
      elapsed += POLL_INTERVAL_MS / 1000;
      const res = await PawaPayService.checkStatus(depositId);

      if (res.status === "completed") {
        stopPolling();
        await mutateUserPrograms().catch(() => {});
        await mutateProgramAccessMap().catch(() => {});
        goToResult("success", depositId);
      } else if (res.status === "failed") {
        stopPolling();
        goToResult("failed", depositId, pawapayFailureMessage(res.failureCode));
      } else if (elapsed >= POLL_TIMEOUT_S) {
        stopPolling();
        goToResult(
          "failed",
          depositId,
          "Le délai de vérification a expiré. Si le montant a été débité, contactez le support."
        );
      }
    }, POLL_INTERVAL_MS);
  };

  // Determine initial state based on payment history
  const determineInitialState = (latest: ProgramPayment | null, hasCompletedFirstInstallment: boolean) => {
    const isRetry = local.retry !== undefined;

    if (isRetry || !latest || latest.has_seen_result === true) {
      setCurrentState(PaymentFlowState.INSTRUCTIONS);
      return;
    }

    // Payment still in progress (not final, not seen) → resume verification.
    if (!ProgramPaymentService.isFinalStatus(latest.payment_status)) {
      setCurrentState(
        hasCompletedFirstInstallment && latest.is_installment
          ? PaymentFlowState.NEXT_PAYMENT_VERIFYING
          : PaymentFlowState.VERIFYING
      );
      if (latest.payment_reference) {
        setCurrentTrxReference(latest.payment_reference);
        setPaymentRowId(latest.id ?? null);
        startPawaPayPolling(latest.payment_reference);
      }
      return;
    }

    // Final + not seen → show the result page.
    if (latest.id) {
      ProgramPaymentService.markAsSeen(latest.id).catch((err) =>
        logger.error("[Payment] Error marking payment as seen:", err)
      );
    }
    goToResult(
      latest.payment_status === "completed"
        ? "success"
        : latest.payment_status === "failed"
          ? "failed"
          : "canceled",
      latest.payment_reference || ""
    );
  };

  // Initialize program context
  useEffect(() => {
    if (!pdId || !programId || latestPaymentLoading) return;
    if (isInitialized && currentState !== PaymentFlowState.LOADING) return;

    const initializeProgramContext = async () => {
      try {
        const { data: programData, error } = await supabase
          .from("concours_learningpaths")
          .select("id, price, learningPathId, learning_paths(title)")
          .eq("learningPathId", pdId)
          .single();

        const hasCompletedFirst = !!(
          latestPayment?.is_installment &&
          latestPayment?.current_installment &&
          latestPayment.current_installment >= 1 &&
          (latestPayment.current_installment ?? 0) < (latestPayment.total_installments ?? 0)
        );

        if (error || !programData) {
          logger.error("[Payment] Error fetching program data:", error);
          setProgramContext((prev) => ({
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

        const lpData = programData.learning_paths as { title?: string } | { title?: string }[] | null;
        const programName = (Array.isArray(lpData) ? lpData[0]?.title : lpData?.title) || "Programme";

        setProgramContext({
          programId: String(programData.id),
          programName,
          programPrice: pricing.FIXED_PRICE || 0,
          user,
          hasCompletedFirstInstallment: hasCompletedFirst,
          latestPayment: latestPayment as ProgramPayment | null,
          installmentPayment: latestPayment?.is_installment ? (latestPayment as ProgramPayment) : null,
        });
        determineInitialState(latestPayment as ProgramPayment | null, hasCompletedFirst);
        setIsInitialized(true);
      } catch (e) {
        logger.error("[Payment] Error initializing program context:", e);
        setCurrentState(PaymentFlowState.INSTRUCTIONS);
        setIsInitialized(true);
      }
    };

    initializeProgramContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdId, programId, latestPaymentLoading, pricing.FIXED_PRICE]);

  // Message rotation while verifying
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((current) => (current + 1) % verificationMessages.length);
    }, MESSAGE_ROTATION_INTERVAL);
    return () => clearInterval(interval);
  }, [verificationMessages.length]);

  // Cleanup polling on unmount
  useEffect(() => () => stopPolling(), []);

  // --- Event handlers -------------------------------------------------------

  const handleContinueFromInstructions = () => {
    setCurrentState(PaymentFlowState.PAYMENT_OPTIONS);
  };

  // First payment — full price OR first of 2 installments.
  const handlePayment = async (paymentData: {
    phoneNumber: string;
    promoCode: string;
    promoCodeDetails: PromoCodeDetails | null;
    isInstallment: boolean;
    totalInstallments: number;
  }) => {
    const { phoneNumber, promoCodeDetails, isInstallment, totalInstallments } = paymentData;

    if (!CM_PHONE_REGEX.test(phoneNumber)) {
      setErrorMessage("Numéro invalide. Utilisez un numéro MTN ou Orange (ex: 650123456).");
      setCurrentState(PaymentFlowState.FAILED);
      return;
    }
    if (!programContext.programId) {
      setErrorMessage("Programme introuvable. Réessayez.");
      setCurrentState(PaymentFlowState.FAILED);
      return;
    }

    trigger(HapticType.MEDIUM);
    setErrorMessage(null);
    setCurrentState(PaymentFlowState.PROCESSING);

    try {
      const depositId = Crypto.randomUUID();
      const fullPrice = programContext.programPrice;
      const baseAmount = isInstallment ? Math.ceil(fullPrice / totalInstallments) : fullPrice;
      const amount = __DEV__ ? DEV_TEST_AMOUNT : baseAmount;
      const totalAmount = isInstallment ? (__DEV__ ? DEV_TEST_AMOUNT * totalInstallments : fullPrice) : undefined;

      // 1. Create the pending payment row (server requires it before charging;
      //    the DB trigger turns a completed program payment into an enrollment).
      const payment = await ProgramPaymentService.createPayment(
        programContext.programId,
        phoneNumber,
        amount,
        depositId,
        promoCodeDetails?.id ?? null,
        isInstallment,
        isInstallment ? totalInstallments : 1,
        1,
        totalAmount
      );
      setPaymentRowId(payment.id);

      // 2. Initiate the PawaPay deposit (PIN prompt on the customer's phone).
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
        setCurrentState(PaymentFlowState.FAILED);
        if (payment.id) ProgramPaymentService.setStatus(payment.id, "failed").catch(() => {});
        return;
      }

      // 3. Accepted → poll for the final status.
      setCurrentTrxReference(depositId);
      setShouldIgnoreOldStatus(false);
      setCurrentState(PaymentFlowState.VERIFYING);
      startPawaPayPolling(depositId);
    } catch (error) {
      logger.error("[Payment] initiation error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Une erreur est survenue lors du paiement.");
      setCurrentState(PaymentFlowState.FAILED);
    }
  };

  // Subsequent installment payment.
  const handleNextPayment = async (phoneNumber: string) => {
    const parent = programContext.installmentPayment;

    if (!CM_PHONE_REGEX.test(phoneNumber)) {
      setErrorMessage("Numéro invalide. Utilisez un numéro MTN ou Orange (ex: 650123456).");
      setCurrentState(PaymentFlowState.NEXT_PAYMENT_FAILED);
      return;
    }
    if (!parent || !programContext.programId) {
      setErrorMessage("Impossible de retrouver le plan de paiement. Contactez le support.");
      setCurrentState(PaymentFlowState.NEXT_PAYMENT_FAILED);
      return;
    }

    trigger(HapticType.MEDIUM);
    setErrorMessage(null);
    setCurrentState(PaymentFlowState.NEXT_PAYMENT_PROCESSING);

    try {
      const depositId = Crypto.randomUUID();
      const total = parent.total_installments ?? 2;
      const nextNum = (parent.current_installment ?? 1) + 1;
      const fullTotal = parent.total_amount ?? programContext.programPrice;
      const baseAmount = Math.ceil(fullTotal / total);
      const amount = __DEV__ ? DEV_TEST_AMOUNT : baseAmount;
      const trueParentId = parent.parent_payment_id || parent.id;

      const payment = await ProgramPaymentService.createPayment(
        programContext.programId,
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
      setPaymentRowId(payment.id);

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

      setCurrentTrxReference(depositId);
      setShouldIgnoreOldStatus(false);
      setCurrentState(PaymentFlowState.NEXT_PAYMENT_VERIFYING);
      startPawaPayPolling(depositId);
    } catch (error) {
      logger.error("[Payment] next installment error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Une erreur est survenue lors du paiement.");
      setCurrentState(PaymentFlowState.NEXT_PAYMENT_FAILED);
    }
  };

  const handleCancelPayment = async () => {
    setShouldIgnoreOldStatus(true);
    stopPolling();
    try {
      if (paymentRowId) {
        await ProgramPaymentService.setStatus(paymentRowId, "canceled").catch(() => {});
      } else {
        await cancelPayment().catch(() => {});
      }
    } catch (error) {
      logger.error("Error canceling payment:", error);
    }
    setCurrentTrxReference(null);
    setCurrentState(
      programContext.hasCompletedFirstInstallment
        ? PaymentFlowState.INSTALLMENT_DETAILS
        : PaymentFlowState.CANCELED
    );
  };

  const handlePayNextInstallment = () => setCurrentState(PaymentFlowState.NEXT_PAYMENT_OPTIONS);
  const handleBack = () => router.back();

  // --- Render ---------------------------------------------------------------

  const renderContent = () => {
    switch (currentState) {
      case PaymentFlowState.LOADING:
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={isDark ? "#6EE7B7" : "#4CAF50"} />
            <ThemedText style={styles.loadingText}>Chargement des informations de paiement...</ThemedText>
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
      case PaymentFlowState.NEXT_PAYMENT_VERIFYING:
        return (
          <PaymentProcessing
            state="verifying"
            isDark={isDark}
            currentMessage={verificationMessages[currentMessageIndex]}
            onCancel={handleCancelPayment}
          />
        );

      case PaymentFlowState.FAILED:
      case PaymentFlowState.NEXT_PAYMENT_FAILED:
      case PaymentFlowState.CANCELED:
        return (
          <View style={styles.failedContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={64} color={isDark ? "#F87171" : "#EF4444"} />
            <ThemedText style={styles.failedTitle}>Paiement échoué</ThemedText>
            <ThemedText style={styles.failedDescription}>
              {errorMessage || "Le paiement a échoué ou a été annulé. Veuillez réessayer."}
            </ThemedText>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: isDark ? theme.color.primary[600] : theme.color.primary[500] }]}
              onPress={() => {
                setErrorMessage(null);
                setCurrentState(
                  currentState === PaymentFlowState.NEXT_PAYMENT_FAILED
                    ? PaymentFlowState.NEXT_PAYMENT_OPTIONS
                    : PaymentFlowState.PAYMENT_OPTIONS
                );
              }}
            >
              <ThemedText style={styles.retryButtonText}>Réessayer</ThemedText>
            </TouchableOpacity>
            <WhatsAppContact
              message={`Bonjour, j'ai un souci de paiement pour le programme ${programContext.programName}. Pouvez-vous m'aider ?`}
              style={{ marginTop: 16, width: "100%" }}
            />
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <ThemedText style={[styles.backButtonText, isDark && styles.backButtonTextDark]}>Retour</ThemedText>
            </TouchableOpacity>
          </View>
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

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.header, isDark && styles.headerDark]}>
        <TouchableOpacity style={styles.backButtonHeader} onPress={handleBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={isDark ? "#FFFFFF" : "#111827"} />
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
  failedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    minHeight: 400,
  },
  failedTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  failedDescription: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  retryButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  backButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  backButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: "#6B7280",
  },
  backButtonTextDark: {
    color: "#9CA3AF",
  },
});

export default ProgramPaymentPage;
