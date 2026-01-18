/**
 * Payment Types for Program Payments
 * Uses database schema from user_program_payments table
 */

import { Database } from '@/types/supabase';

// Base types from database
export type ProgramPaymentRow = Database['public']['Tables']['user_program_payments']['Row'];
export type ProgramPaymentInsert = Database['public']['Tables']['user_program_payments']['Insert'];

// Payment flow states
export enum PaymentFlowState {
  LOADING = 'loading',
  INSTRUCTIONS = 'instructions',
  PAYMENT_OPTIONS = 'payment_options',
  PROCESSING = 'processing',
  VERIFYING = 'verifying',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELED = 'canceled',
  INSTALLMENT_DETAILS = 'installment_details',
  // Installment payment states
  NEXT_PAYMENT_OPTIONS = 'next_payment_options',
  NEXT_PAYMENT_PROCESSING = 'next_payment_processing',
  NEXT_PAYMENT_VERIFYING = 'next_payment_verifying',
  NEXT_PAYMENT_SUCCESS = 'next_payment_success',
  NEXT_PAYMENT_FAILED = 'next_payment_failed',
  NEXT_PAYMENT_CANCELED = 'next_payment_canceled',
}

// Payment status types
export type PaymentStatus = 
  | 'pending'
  | 'initialized'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'expired';

// Extended payment interface with computed properties
export interface ProgramPayment extends ProgramPaymentRow {
  // Optional computed fields
  needsFallback?: boolean;
  authorizationUrl?: string;
  trxReference?: string;
}

// Promo code details
export interface PromoCode {
  id: string;
  code: string;
  discount_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

// Payment context data for UI
export interface PaymentContextData {
  programId: string | null;
  programName: string;
  programPrice: number;
  user: { id: string; email?: string } | null;
  hasCompletedFirstInstallment: boolean;
  latestPayment: ProgramPayment | null;
  installmentPayment: ProgramPayment | null;
}

// Payment initialization result
export interface PaymentInitResult {
  payment: ProgramPayment;
  needsFallback: boolean;
  authorizationUrl?: string;
  trxReference: string;
}

// Installment plan options
export interface InstallmentOption {
  value: number;
  label: string;
  description: string;
}

// Payment verification result
export interface PaymentVerificationResult {
  status: PaymentStatus;
  payment?: ProgramPayment;
  error?: string;
}
