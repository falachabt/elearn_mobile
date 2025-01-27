import { useState } from "react";
import { PaymentService } from "@/services/payment.service";
import { Payments } from "@/types/type";
import axios from "axios";
import { NotchPayService } from "@/lib/notchpay";

export const usePayment = () => {
  const [paymentStatus, setPaymentStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<Payments>();

  const initiatePayment = async (
    cartId: string,
    phoneNumber: string,
    amount: number,
    trx_reference: string
  ) => {
    setLoading(true);
    try {
      const payment = await PaymentService.createPayment(
        cartId,
        phoneNumber,
        amount,
        trx_reference
      );

      setPayment(payment);
      PaymentService.subscribeToPaymentStatus(payment.id, (status, payment) => {
        setPayment(payment);
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
      setTimeout(async () => {
        await PaymentService.setStatus(payment.id, "initialized");
      }, 1500);

      return payment;
    } finally {
      setLoading(false);
    }
  };

  const cancelPayment = async () => {
    if (payment) {
      // const options = {
      //   method: "DELETE",
      //   url: "https://api.notchpay.co/payments/" + payment.trx_reference,
      // };

      const notchpay = new NotchPayService();
      try {
        // await notchpay.cancelPayment(payment.trx_reference);
        await PaymentService.setStatus(payment.id, "canceled");

      } catch (error) {
        console.error("error : ",error);
      }
    }
  };

  return { paymentStatus, loading, initiatePayment, cancelPayment };
};
