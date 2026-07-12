import { useState } from "react";

import { logger } from '@/utils/logger';
import { PaymentService } from "@/services/payment.service";
import { Payments } from "@/types/type";
import { PawaPayService, pawapayCheckoutUrl, pawapayFailureMessage } from "@/lib/pawapay";


export const usePayment = () => {
  const [paymentStatus, setPaymentStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<Payments>();
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);
  const [chargeError, setChargeError] = useState<string | null>(null);

  const initiatePayment = async (
      cartId: string,
      phoneNumber: string,
      amount: number,
      trx_reference: string,
      promoCodeId?: string
  ) => {
    setLoading(true);
    try {
      return
      const payment = await PaymentService.createPayment(
          cartId,
          phoneNumber,
          amount,
          trx_reference,
          promoCodeId
      );

      setPayment(payment as unknown as Payments);
      PaymentService.subscribeToPaymentStatus(payment.id, (status, payment) => {
        setPayment(payment as unknown as Payments);
        if (status === "initialized" || status === "completed") {
          setPaymentStatus(status);
        } else {
          setPaymentStatus(status);
        }
      });

      setTimeout(async () => {
        await PaymentService.setStatus(payment.id, "initialized");
      }, 500);

      return payment;
    } catch (error) {
    logger.error("Error in payment initiation:", error);
    setChargeError(
        error instanceof Error ? error.message : "Payment initiation failed"
    );
    throw error;
    } finally {
      setLoading(false);
    }
  };

  const initiateDirectPayment = async (
      cartId: string,
      phoneNumber: string,
      amount: number,
      network: 'mtn' | 'orange',
      promoCodeId?: string
  ) => {
    setLoading(true);
    setChargeError(null);
    setAuthorizationUrl(null);

    try {
      const trx_reference = "trx_" + Date.now();
      const payment = await PaymentService.createPayment(
          cartId,
          phoneNumber,
          amount,
          trx_reference,
          promoCodeId
      );

      PaymentService.subscribeToPaymentStatus(payment.id, (status, updatedPayment) => {
        setPayment(updatedPayment as unknown as Payments);
        setPaymentStatus(status);
      });
      setPayment(payment as unknown as Payments);
      await PaymentService.setStatus(payment.id, "pending");
      setPaymentStatus("pending");

      const result = await PawaPayService.initiateDeposit({
        depositId: payment.id,
        phoneNumber,
        amount,
      });

      if (!result.ok || result.error) {
        const errMessage = result.failureReason?.failureCode 
            ? pawapayFailureMessage(result.failureReason.failureCode)
            : result.error || "Le paiement n'a pas pu être initié. Réessayez.";
        setChargeError(errMessage);
        
        await PaymentService.setStatus(payment.id, "failed");
        setPaymentStatus("failed");
        
        return {
          payment,
          needsFallback: true,
          authorizationUrl: null,
          trxReference: trx_reference
        };
      }

      const nextCheckoutUrl = pawapayCheckoutUrl(result);
      if (nextCheckoutUrl) {
        setAuthorizationUrl(nextCheckoutUrl);
      }

      return {
        payment,
        needsFallback: !!nextCheckoutUrl,
        authorizationUrl: nextCheckoutUrl,
        trxReference: trx_reference
      };

    } catch (error) {
      logger.error("Error in direct payment:", error);
      setChargeError(error instanceof Error ? error.message : "Payment failed");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const cancelPayment = async () => {
    if (payment) {
      try {
        // Mark as canceled in our system
        await PaymentService.setStatus(payment.id, "canceled");
        setAuthorizationUrl(null);
        setChargeError(null);
      } catch (error) {
        logger.error("Error cancelling payment:", error);
      }
    }
  };

  const verifyPromoCode = async (code: string) => {
    if (!code) return null;
    try {
      return await PaymentService.verifyPromoCode(code);
    } catch (error) {
      logger.error("Error verifying promo code:", error);
      return null;
    }
  };

  const openAuthorizationUrl = async (url: string) => {
    setAuthorizationUrl(url);
    // The actual opening of the URL will be handled in the component
  };

  const verifyPaymentStatus = async (reference: string) => {
    if (!reference) return;

    try {
      const result = { transaction: { status: 'complete' } } as any;

      if (payment && result?.transaction?.status === "complete") {
        await PaymentService.setStatus(payment.id, "completed");
      }

      return result;
    } catch (error) {
      logger.error("Error verifying payment status:", error);
    }
  };

  return {
    paymentStatus,
    loading,
    authorizationUrl,
    chargeError,
    initiatePayment,
    initiateDirectPayment,
    cancelPayment,
    verifyPromoCode,
    openAuthorizationUrl,
    verifyPaymentStatus
  };
};
