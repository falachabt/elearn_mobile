import { useState } from "react";
import { PaymentService } from "@/services/payment.service";
import { Payments } from "@/types/type";
import { NotchPayService } from "@/lib/notchpay";

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
      console.log("we are debugging")

      return
      const payment = await PaymentService.createPayment(
          cartId,
          phoneNumber,
          amount,
          trx_reference,
          promoCodeId
      );

      setPayment(payment);
      console.log(payment);
      PaymentService.subscribeToPaymentStatus(payment.id, (status, payment) => {
        setPayment(payment);
        console.log("status  realtime", status)
        if (status === "initialized" || status === "completed") {
          setPaymentStatus(status);
        } else {
          console.log("Payment status", status);
          setPaymentStatus(status);
        }
      });

      setTimeout(async () => {
        await PaymentService.setStatus(payment.id, "initialized");
      }, 500);

      return payment;
    } catch (error) {
    console.error("Error in payment initiation:", error);
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
      const notchpay = new NotchPayService();
      const result = await notchpay.initiateDirectCharge({
        phone: phoneNumber,
        channel: network === 'orange' ? 'cm.orange' : 'cm.mtn',
        currency: 'XAF',
        amount: amount,
        customer: {
          email: 'default@gmail.com', // This should be user's email if available
        },
      });

      console.log("debug 1")

      // Store the authorization URL for fallback
      if (result.initResponse.authorization_url) {
        setAuthorizationUrl(result.initResponse.authorization_url);
      }
      console.log("debug 2")

      // If we got an error during charge but initialization was successful
      if (result.error && result.initResponse.transaction?.reference) {
        setChargeError(result.error);

      console.log("debug 3")

        // Still create payment record, just with different initial status
        const payment = await PaymentService.createPayment(
            cartId,
            phoneNumber,
            amount,
            result.initResponse.transaction.reference,
            promoCodeId
        );

      // listen to realtime of that payment

        PaymentService.subscribeToPaymentStatus(payment.id, (status, payment) => {
          setPayment(payment);
          setPaymentStatus(status);
        });

        setPayment(payment);
        await PaymentService.setStatus(payment.id, "pending");
        setPaymentStatus("pending");

        return {
          payment,
          needsFallback: true,
          authorizationUrl: result.initResponse.authorization_url,
          trxReference: result.initResponse.transaction.reference
        };
      }

      // If charge was successful
      if (result.chargeResponse && result.initResponse.transaction?.reference) {
        const payment = await PaymentService.createPayment(
            cartId,
            phoneNumber,
            amount,
            result.initResponse.transaction.reference,
            promoCodeId
        );

        setPayment(payment);
        PaymentService.subscribeToPaymentStatus(payment.id, (status, payment) => {
          setPayment(payment);
          setPaymentStatus(status);
        });

        setTimeout(async () => {
          await PaymentService.setStatus(payment.id, "initialized");
        }, 500);

        return {
          payment,
          needsFallback: false,
          trxReference: result.initResponse.transaction.reference
        };
      }

      throw new Error("Payment initialization failed");

    }  catch (error) {
    console.error("Error in direct payment:", error);
    setChargeError(
        error instanceof Error ? error.message : "Payment failed"
    );
    throw error;
    } finally {
      setLoading(false);
    }
  };

  const cancelPayment = async () => {
    if (payment) {
      const notchpay = new NotchPayService();
      try {
        // Try to cancel with NotchPay (this might fail silently if payment already processed)
        try {
          // do not cancel in notch pay for dispute management
          // await notchpay.cancelPayment(payment.trx_reference);
        } catch (e) {
          console.log("Error cancelling payment with NotchPay:", e);
        }

        // Mark as canceled in our system
        await PaymentService.setStatus(payment.id, "canceled");
        setAuthorizationUrl(null);
        setChargeError(null);
      } catch (error) {
        console.error("Error cancelling payment:", error);
      }
    }
  };

  const verifyPromoCode = async (code: string) => {
    if (!code) return null;
    try {
      return await PaymentService.verifyPromoCode(code);
    } catch (error) {
      console.error("Error verifying promo code:", error);
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
      const notchpay = new NotchPayService();
      const result = await notchpay.verifyTransaction(reference);

      console.log("result : ", result)

      if (payment && result?.transaction?.status === "complete") {
        await PaymentService.setStatus(payment.id, "completed");
      }

      return result;
    } catch (error) {
      console.error("Error verifying payment status:", error);
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