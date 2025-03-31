import axios, { AxiosInstance } from 'axios';
import { 
  NotchPayInitializeParams,
  NotchPayTransaction,
  NotchPayResponse,
  NotchPayChargeResponse,
  NotchPayDirectChargeParams,
  NotchPayChannel 
} from '@/types/notchpay.types';

export class NotchPayService {
  private client: AxiosInstance;
  
  constructor(publicKey: string = "pk.qoIGxn6D2TV5WNAXk0kfeIe8aT8Jo99I7em5QD9axKbjshtLBJ2nsXJ6Y79mYJtCxjC6fJ3qi4AHQzNwkAGHrToq7LHoctOf9na5v0cKAJA8WUyUK4YvcHmqBoyZg" , private secretKey?: string) {
    this.client = axios.create({
      baseURL: 'https://api.notchpay.co',
      headers: {
        Authorization: publicKey,
        'Content-Type': 'application/json'
      }
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
  chargeResponse: NotchPayChargeResponse;
}> {
  try {
    const startInit = performance.now();
    // 1. Initialize payment
    const initResponse = await this.initializePayment(params);
    const endInit = performance.now();
    console.log(`Initialization time: ${(endInit - startInit) / 1000}s`);

    // 2. Process direct charge if transaction reference exists
    if (initResponse.transaction?.reference) {
      const startCharge = performance.now();
      const chargeResponse = await this.chargeMobileMoney(
        initResponse.transaction.reference,
        params.phone || '',
        // params.channel
          "cm.mobile"
      );
      const endCharge = performance.now();
      console.log(`Charge time: ${(endCharge - startCharge) / 1000}s`);

      return {
        initResponse,
        chargeResponse
      };
    }

    throw new Error('Failed to get transaction reference');

  } catch (error) {
    this.handleError(error);
  }
}

  /**
   * Initialize payment only
   */
  async initializePayment(params: NotchPayInitializeParams): Promise<NotchPayResponse> {
    try {
      const response = await this.client.post<NotchPayResponse>('/payments', params);
      console.log(response.data);
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
      const response = await this.client.put(`/payments/${reference}`, {
        channel,
        data: { phone }
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
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
      throw new Error('Secret key required for refunds');
    }

    try {
      const response = await this.client.post('/refunds', {
        payment: transactionRef,
        amount
      }, {
        headers: {
          'X-Auth': this.secretKey
        }
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: any): never {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'NotchPay API error');
    }
    throw error;
  }
}