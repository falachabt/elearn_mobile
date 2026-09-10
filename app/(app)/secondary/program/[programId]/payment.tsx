import React, { useState, useEffect, useRef } from "react";
import { View, TouchableOpacity, ActivityIndicator, useColorScheme, ScrollView, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Crypto from "expo-crypto";

import { theme } from "@/constants/theme";
import { HapticType, useHaptics } from "@/hooks/useHaptics";
import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/contexts/auth";
import { useUser } from "@/contexts/useUserInfo";
import { useSecondaryProgram } from "@/hooks/secondary/useSecondaryPrograms";
import { logger } from "@/utils/logger";
import { SecondaryPaymentService } from "@/services/secondary/secondary-payment.service";
import { getCountryCurrency } from "@/services/currency.service";
import { PawaPayService, pawapayFailureMessage } from "@/lib/pawapay";
import { PaymentProcessing } from "@/components/payment";
import { SecondaryPlanOptions } from "@/components/payment/SecondaryPlanOptions";
import WhatsAppContact from "@/components/WhatsappSupport";
import {
  SECONDARY_PLAN_PRICES_XAF,
  SecondaryPlan,
} from "@/types/secondaryPayment.types";

// Numéros MTN Cameroun (mêmes restrictions que le paiement concours -- voir
// app/(app)/learn/[pdId]/payment.tsx : seul MTN MoMo Cameroun est supporté
// aujourd'hui, la conversion de devise ici n'est qu'un affichage).
const CM_PHONE_REGEX = /^6(5[0-4]|7[0-9]|8[0-9])[0-9]{6}$/;
const DEV_TEST_AMOUNT = 100;
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_S = 300;

type FlowState = "loading" | "plan_selection" | "processing" | "verifying" | "success" | "failed" | "canceled";

const SecondaryPaymentPage = () => {
  const local = useLocalSearchParams();
  const programId = local.programId as string;
  const router = useRouter();
  const { user } = useAuth();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const { trigger } = useHaptics();
  const { mutateSecondaryProgramAccessMap } = useUser();
  const { program, isLoading: programLoading } = useSecondaryProgram(programId);

  const [state, setState] = useState<FlowState>("loading");
  const [currencyCode, setCurrencyCode] = useState("XAF");
  const [paymentRowId, setPaymentRowId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const verificationMessages = [
    "En attente de validation sur votre téléphone...",
    "Confirmez le paiement avec votre code PIN Mobile Money...",
    "Une fois validé, la vérification peut prendre jusqu'à 5 minutes...",
  ];

  const programName = program
    ? `${program.class?.name ?? ""} ${program.serie?.name ?? ""}`.trim() || "votre classe"
    : "votre classe";

  useEffect(() => {
    if (!programLoading) setState((prev) => (prev === "loading" ? "plan_selection" : prev));
  }, [programLoading]);

  useEffect(() => {
    getCountryCurrency(user?.country_id).then(setCurrencyCode);
  }, [user?.country_id]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((i) => (i + 1) % verificationMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [verificationMessages.length]);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };
  useEffect(() => () => stopPolling(), []);

  const startPolling = (depositId: string) => {
    stopPolling();
    let elapsed = 0;
    pollRef.current = setInterval(async () => {
      elapsed += POLL_INTERVAL_MS / 1000;
      const res = await PawaPayService.checkStatus(depositId);

      if (res.status === "completed") {
        stopPolling();
        await mutateSecondaryProgramAccessMap().catch(() => {});
        setState("success");
      } else if (res.status === "failed") {
        stopPolling();
        setErrorMessage(pawapayFailureMessage(res.failureCode));
        setState("failed");
      } else if (elapsed >= POLL_TIMEOUT_S) {
        stopPolling();
        setErrorMessage("Le délai de vérification a expiré. Si le montant a été débité, contactez le support.");
        setState("failed");
      }
    }, POLL_INTERVAL_MS);
  };

  const handlePayment = async ({ phoneNumber, plan }: { phoneNumber: string; plan: SecondaryPlan }) => {
    if (!CM_PHONE_REGEX.test(phoneNumber)) {
      setErrorMessage("Numéro invalide. Utilisez un numéro MTN (ex: 650123456).");
      setState("failed");
      return;
    }

    trigger(HapticType.MEDIUM);
    setErrorMessage(null);
    setState("processing");

    try {
      const depositId = Crypto.randomUUID();
      const amount = __DEV__ ? DEV_TEST_AMOUNT : SECONDARY_PLAN_PRICES_XAF[plan];

      const payment = await SecondaryPaymentService.createPayment(
        programId,
        plan,
        phoneNumber,
        amount,
        depositId
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
        setErrorMessage(code ? pawapayFailureMessage(code) : result.error || "Le paiement n'a pas pu être initié. Réessayez.");
        setState("failed");
        if (payment.id) SecondaryPaymentService.setStatus(payment.id, "failed").catch(() => {});
        return;
      }

      setState("verifying");
      startPolling(depositId);
    } catch (error) {
      logger.error("[SecondaryPayment] initiation error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Une erreur est survenue lors du paiement.");
      setState("failed");
    }
  };

  const handleCancel = async () => {
    stopPolling();
    if (paymentRowId) {
      await SecondaryPaymentService.setStatus(paymentRowId, "canceled").catch(() => {});
    }
    setState("canceled");
  };

  const handleBack = () => router.back();

  const renderContent = () => {
    switch (state) {
      case "loading":
        return (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={isDark ? "#6EE7B7" : "#4CAF50"} />
            <ThemedText style={styles.loadingText}>Chargement...</ThemedText>
          </View>
        );

      case "plan_selection":
        return (
          <SecondaryPlanOptions
            programName={programName}
            currencyCode={currencyCode}
            isDark={isDark}
            isLoading={false}
            onPayment={handlePayment}
          />
        );

      case "processing":
        return (
          <PaymentProcessing
            state="processing"
            isDark={isDark}
            onCancel={() => setState("plan_selection")}
          />
        );

      case "verifying":
        return (
          <PaymentProcessing
            state="verifying"
            isDark={isDark}
            currentMessage={verificationMessages[currentMessageIndex]}
            onCancel={handleCancel}
          />
        );

      case "success":
        return (
          <View style={styles.centerContainer}>
            <MaterialCommunityIcons name="check-circle" size={64} color={isDark ? "#6EE7B7" : "#4CAF50"} />
            <ThemedText style={styles.resultTitle}>Abonnement activé !</ThemedText>
            <ThemedText style={styles.resultDescription}>
              Votre accès à {programName} est maintenant actif.
            </ThemedText>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: isDark ? theme.color.primary[600] : theme.color.primary[500] }]}
              onPress={() => router.back()}
            >
              <ThemedText style={styles.actionButtonText}>Continuer</ThemedText>
            </TouchableOpacity>
          </View>
        );

      case "failed":
      case "canceled":
        return (
          <View style={styles.centerContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={64} color={isDark ? "#F87171" : "#EF4444"} />
            <ThemedText style={styles.resultTitle}>
              {state === "canceled" ? "Paiement annulé" : "Paiement échoué"}
            </ThemedText>
            <ThemedText style={styles.resultDescription}>
              {errorMessage || "Le paiement a échoué ou a été annulé. Veuillez réessayer."}
            </ThemedText>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: isDark ? theme.color.primary[600] : theme.color.primary[500] }]}
              onPress={() => {
                setErrorMessage(null);
                setState("plan_selection");
              }}
            >
              <ThemedText style={styles.actionButtonText}>Réessayer</ThemedText>
            </TouchableOpacity>
            <WhatsAppContact
              message={`Bonjour, j'ai un souci de paiement pour l'abonnement ${programName}. Pouvez-vous m'aider ?`}
              style={{ marginTop: 16, width: "100%" }}
            />
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <ThemedText style={[styles.backButtonText, isDark && styles.backButtonTextDark]}>Retour</ThemedText>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.header, isDark && styles.headerDark]}>
        <TouchableOpacity style={styles.backButtonHeader} onPress={handleBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={isDark ? "#FFFFFF" : "#111827"} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Abonnement secondaire</ThemedText>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={styles.content}>{renderContent()}</ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  containerDark: { backgroundColor: "#111827" },
  content: { flex: 1 },
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
  headerDark: { backgroundColor: theme.color.dark.background.secondary, borderBottomColor: "#374151" },
  backButtonHeader: { padding: 8 },
  headerTitle: { fontFamily: theme.typography.fontFamily, fontSize: 18, fontWeight: "600" },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, minHeight: 400 },
  loadingText: { fontFamily: theme.typography.fontFamily, fontSize: 16, marginTop: 16, color: "#6B7280" },
  resultTitle: { fontFamily: theme.typography.fontFamily, fontSize: 22, fontWeight: "700", marginTop: 20, marginBottom: 12, textAlign: "center" },
  resultDescription: { fontFamily: theme.typography.fontFamily, fontSize: 15, color: "#6B7280", textAlign: "center", lineHeight: 22 },
  actionButton: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 40, borderRadius: 8 },
  actionButtonText: { fontFamily: theme.typography.fontFamily, fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  backButton: { marginTop: 12, paddingVertical: 12, paddingHorizontal: 32 },
  backButtonText: { fontFamily: theme.typography.fontFamily, fontSize: 16, color: "#6B7280" },
  backButtonTextDark: { color: "#9CA3AF" },
});

export default SecondaryPaymentPage;
