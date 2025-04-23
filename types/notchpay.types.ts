export type NotchPayChannel = 'cm.mobile' | 'cm.orange' | 'cm.mtn' | string;

export interface NotchPayCustomer {
  email: string;
  name?: string;
  phone?: string;
}

export interface NotchPayInitializeParams {
  amount: number;
  currency: string;
  customer: NotchPayCustomer;
  reference?: string;
  description?: string;
  callback?: string;
  locked_currency?: string;
  locked_country?: string;
}

export interface NotchPayDirectChargeParams extends NotchPayInitializeParams {
  phone?: string;
  channel?: NotchPayChannel;
}

export interface NotchPayTransaction {
  amount: number;
  amounts: {
    converted: number;
    currency: string;
    rate: number;
    total: number;
  };
  callback: string | null;
  charge: string;
  created_at: string;
  currency: string;
  customer: string;
  description: string | null;
  fees: any[];
  geo: string;
  reference: string;
  sandbox: boolean;
  status: string;
}

export interface NotchPayResponse {
  authorization_url: string;
  code: number;
  message: string;
  status: string;
  transaction: NotchPayTransaction;
}

export interface NotchPayChargeResponse {
  code: number;
  message: string;
  status: string;
  transaction?: {
    reference: string;
    status: string;
  };
}

export interface NotchPayVerifyResponse {
  code: number;
  message: string;
  status: string;
  transaction: NotchPayTransaction & {
    status: 'pending' | 'completed' | 'canceled' | 'failed';
  };
}