import axios, { AxiosInstance } from "axios";

import { logger } from '@/utils/logger';

import {
  NotchPayInitializeParams,
  NotchPayResponse,
  NotchPayChargeResponse,
  NotchPayDirectChargeParams,
  NotchPayChannel,
} from "@/types/notchpay.types";

export class NotchPayService {
  private client: AxiosInstance;

  constructor( publicKey: string = "pk.qoIGxn6D2TV5WNAXk0kfeIe8aT8Jo99I7em5QD9axKbjshtLBJ2nsXJ6Y79mYJtCxjC6fJ3qi4AHQzNwkAGHrToq7LHoctOf9na5v0cKAJA8WUyUK4YvcHmqBoyZg",private secretKey?: string ) {
    // constructor(publicKey: string = "pk_test.3ZRJxkqwFn1TOsrsK2kQP5qvEvsajLI6Amxxbd96oplZ1QGRZfNKAM7uGVNUiH4WGtOg7FX6jXtXicqSWKpluXYmxLIlsnpfpha9WwfBUpA1KKa8WfmmUZeTX6567" , private secretKey?: string) {
    this.client = axios.create({
      baseURL: "https://api.notchpay.co",
      headers: {
        Authorization: publicKey,
        "Content-Type": "application/json",
      },
    });
  }

  get publicKey() {
    return this.client.defaults.headers.Authorization;
  }

  /**
   * Initialize and charge payment in one step
   */
  async initiateDirectCharge(params: NotchPayDirectChargeParams): Promise<{
    initResponse: NotchPayResponse;
    chargeResponse?: NotchPayChargeResponse;
    error?: string;
    needsFallback?: boolean;
  }> {
    try {
      // 1. Initialize payment
      const initResponse = await this.initializePayment(params);

      // 2. Process direct charge if transaction reference exists
      if (initResponse.transaction?.reference) {
        try {
          const chargeResponse = await this.chargeMobileMoney(
            initResponse.transaction.reference,
            params.phone || "",
            params.channel || "cm.mobile"
          );

          return {
            initResponse,
            chargeResponse,
            needsFallback: false
          };
        } catch (chargeError: Error | unknown) {
          // If charging fails, return initialization response with error
          return {
            initResponse,
            error: (chargeError as Error).message || "Failed to charge mobile money",
            needsFallback: true
          };
        }
      }

      throw new Error("Failed to get transaction reference");
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Initialize payment only
   */
  async initializePayment(
    params: NotchPayInitializeParams
  ): Promise<NotchPayResponse> {
    try {
      // Add callback URL if not provided - this should match your app's scheme in app.json
      // const callbackUrl = 'http://192.168.1.168:3000/paiement_webhook/callback';
      const callbackUrl =
        "https://staff.elearnprepa.com/api/paiement_webhook/callback";

      const updatedParams = {
        ...params,
        callback: params.callback || callbackUrl,
      };

      const response = await this.client.post<NotchPayResponse>(
        "/payments",
        updatedParams
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(reference: string) {
    try {
      const response = await this.client.delete(`/payments/${reference}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Process direct charge
   */
  private async chargeMobileMoney(
    reference: string,
    phone: string,
    channel: NotchPayChannel
  ): Promise<NotchPayChargeResponse> {
    try {
      // throw "try to use for now only the webpage"

      const response = await this.client.put(`/payments/${reference}`, {
        channel: channel || "cm.mobile",
        data: {
          phone: "237" + phone,
        },
      });

      return response.data;
    } catch (error) {
      throw error; // Throw error to be caught by initiateDirectCharge
    }
  }

  /**
   * Verify transaction status
   */
  async verifyTransaction(reference: string) {
    try {
      const response = await this.client.get(`/payments/${reference}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Create refund
   */
  async createRefund(transactionRef: string, amount?: number) {
    if (!this.secretKey) {
      throw new Error("Secret key required for refunds");
    }

    try {
      const response = await this.client.post(
        "/refunds",
        {
          payment: transactionRef,
          amount,
        },
        {
          headers: {
            "X-Auth": this.secretKey,
          },
        }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      logger.error(error, error.message);
      throw new Error(error.response?.data?.message || "NotchPay API error");
    }
    throw error;
  }
}