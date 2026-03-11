import { useState, useRef, useEffect } from "react";

import { CompetitionPaymentService, CompetitionPayment } from "@/services/competition-payment.service";
import { NotchPayService } from "@/lib/notchpay";
import { logger } from "@/utils/logger";

export const useCompetitionPayment = () => {
  const [paymentStatus, setPaymentStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<CompetitionPayment | null>(null);
  const [latestPayment, setLatestPayment] = useState<CompetitionPayment | null>(null);
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);
  const [chargeError, setChargeError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [latestPaymentLoading, setLatestPaymentLoading] = useState(false);

  // Cache for access check results to prevent unnecessary API calls
  const accessCache = useRef<Record<string, {result: boolean, timestamp: number}>>({});

  /**
   * Check if the user has access to a competition
   */
  const checkAccess = async (competitionId: string, forceRefresh = false) => {
    // Don't set loading state if we have a recent cached result
    const cachedAccess = accessCache.current[competitionId];
    const now = Date.now();
    const cacheValidityPeriod = 60000; // 1 minute cache validity

    if (!forceRefresh && cachedAccess && (now - cachedAccess.timestamp < cacheValidityPeriod)) {
      // Use cached result if it's recent and not forcing refresh
      setHasAccess(cachedAccess.result);
      return cachedAccess.result;
    }

    setAccessLoading(true);
    try {
      const hasAccess = await CompetitionPaymentService.checkCompetitionAccess(competitionId);

      // Cache the result
      accessCache.current[competitionId] = {
        result: hasAccess,
        timestamp: now
      };

      setHasAccess(hasAccess);
      return hasAccess;
    } catch (error) {
      logger.error("Error checking competition access:", error);
      setHasAccess(false);
      return false;
    } finally {
      setAccessLoading(false);
    }
  };

  /**
   * Invalidate the access cache for a competition
   */
  const invalidateAccessCache = (competitionId: string) => {
    delete accessCache.current[competitionId];
  };

  /**
   * Get the active payment for a competition
   */
  const getActivePayment = async (competitionId: number) => {
    try {
      const payment = await CompetitionPaymentService.getActivePayment(competitionId);
      setPayment(payment);
      return payment;
    } catch (error) {
      logger.error("Error getting active competition payment:", error);
      return null;
    }
  };

  /**
   * Get the latest payment for a competition regardless of status
   */
  const getLatestPayment = async (competitionId: string) => {

    setLatestPaymentLoading(true);
    try {
      const payment = await CompetitionPaymentService.getLatestPayment(competitionId);
      setLatestPayment(payment);
      setPayment(payment);
      if (payment) {
        setPaymentStatus(payment.payment_status);
      }
      return payment;
    } catch (error) {
      logger.error("Error getting latest competition payment:", error);
      return null;
    } finally {
      setLatestPaymentLoading(false);
    }
  };

  /**
   * Check if a payment status is final
   */
  const isFinalStatus = (status: string) => {
    return CompetitionPaymentService.isFinalStatus(status);
  };

  /**
   * Initiate a direct payment for a competition
   */
  const initiateDirectPayment = async (
    competitionId: string,
    phoneNumber: string,
    amount: number = 2500,
    promoCodeId?: string
  ) => {
    setLoading(true);
    setChargeError(null);
    setAuthorizationUrl(null);


    try {
      const result = await CompetitionPaymentService.initiateDirectPayment(
        competitionId,
        phoneNumber,
        amount,
        promoCodeId
      );

      // Store the payment
      setPayment(result.payment);

      // Set up subscription to payment status changes
      CompetitionPaymentService.subscribeToPaymentStatus(
        result.payment.id,
        (status, payment) => {
          setPayment(payment);
          setPaymentStatus(status);
        }
      );

      // Store the authorization URL for fallback
      if (result.authorizationUrl) {
        setAuthorizationUrl(result.authorizationUrl);
      }

      return result;
    } catch (error) {
      logger.error("Error in direct competition payment:", error);
      setChargeError(
        error instanceof Error ? error.message : "Payment failed"
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancel a payment
   */
  const cancelPayment = async () => {
    if (payment) {
      try {
        if (!payment.payment_reference) {
          return;
        }

        await CompetitionPaymentService.cancelPayment(
          payment.id,
          payment.payment_reference
        );
        setAuthorizationUrl(null);
        setChargeError(null);
        setPaymentStatus("canceled");
      } catch (error) {
        logger.error("Error cancelling competition payment:", error);
      }
    }
  };

  /**
   * Verify the status of a payment
   */
  const verifyPaymentStatus = async (reference: string) => {
    if (!reference) return;

    try {
      const result = await CompetitionPaymentService.verifyPaymentStatus(
        reference,
        payment?.id
      );

      logger.log("Verified competition payment status:", result);

      const transactionStatus = result?.transaction?.status;

      if (transactionStatus === "complete") {
        setPaymentStatus("completed");
        // Refresh access status
        if (payment?.competition_id) {
          await checkAccess(payment.competition_id);
        }
      } else if (transactionStatus === "failed") {
        setPaymentStatus("failed");
        // Invalidate cache for failed payments
        if (payment?.competition_id) {
          invalidateAccessCache(payment.competition_id);
        }
      } else if (transactionStatus === "cancelled" || transactionStatus === "canceled") {
        setPaymentStatus("canceled");
        // Invalidate cache for canceled payments
        if (payment?.competition_id) {
          invalidateAccessCache(payment.competition_id);
        }
      }

      return result;
    } catch (error) {
      logger.error("Error verifying competition payment status:", error);
    }
  };

  /**
   * Open the authorization URL for payment
   */
  const openAuthorizationUrl = async (url: string) => {
    setAuthorizationUrl(url);
    // The actual opening of the URL will be handled in the component
  };

  return {
    paymentStatus,
    loading,
    payment,
    latestPayment,
    latestPaymentLoading,
    authorizationUrl,
    chargeError,
    hasAccess,
    accessLoading,
    checkAccess,
    invalidateAccessCache,
    getActivePayment,
    getLatestPayment,
    isFinalStatus,
    initiateDirectPayment,
    cancelPayment,
    verifyPaymentStatus,
    openAuthorizationUrl
  };
};
