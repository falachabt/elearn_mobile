export interface NotchPayCustomer {
    email: string;
    name?: string;
    phone?: string;
  }
  
  export interface NotchPayMetadataCustomField {
    display_name: string;
    variable_name: string;
    value: string | number;
  }
  
  export interface NotchPayMetadata {
    [key: string]: any;
    custom_fields?: NotchPayMetadataCustomField[];
  }
  
  export interface NotchPayInitializeParams {
    amount: number;
    currency: string;
    description?: string;
    reference?: string;
    callback?: string;
    customer: NotchPayCustomer;
    metadata?: NotchPayMetadata;
  }
  
  export interface NotchPayTransaction {
    amount: number;
    amount_total: number;
    sandbox: boolean;
    fee: number;
    converted_amount: number;
    customer: string;
    reference: string;
    status: NotchPayTransactionStatus;
    currency: string;
    callback?: string;
    geo: string;
    created_at: string;
    updated_at: string;
  }
  
  export type NotchPayTransactionStatus = 
    | 'pending' 
    | 'processing'
    | 'incomplete'
    | 'canceled'
    | 'failed'
    | 'rejected'
    | 'abandoned'
    | 'expired'
    | 'complete'
    | 'refunded'
    | 'partialy-refunded';

    export interface NotchPayResponse {
        status: string;
        message: string;
        code: number;
        transaction: NotchPayTransaction;
        authorization_url?: string;
      }
      
      export interface NotchPayChargeResponse {
        message: string;
        code: number;
        status: string;
        action: string;
      }
      
      export type NotchPayChannel = 'cm.mtn' | 'cm.orange' | 'cm.mobile' | 'paypal';
      
      export interface NotchPayDirectChargeParams extends NotchPayInitializeParams {
        channel: NotchPayChannel;
        phone?: string;
      }