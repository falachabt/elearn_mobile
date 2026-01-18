/**
 * Payment Constants
 * Centralized constants for payment flow
 */

import { theme } from '@/constants/theme';
import { InstallmentOption, PaymentStatus } from '@/types/payment.types';

// Polling intervals (in milliseconds)
export const PAYMENT_VERIFICATION_INTERVAL = 5000; // 5 seconds
export const MESSAGE_ROTATION_INTERVAL = 3000; // 3 seconds
export const PAYMENT_TIMEOUT = 300000; // 5 minutes

// Installment options
export const INSTALLMENT_OPTIONS: InstallmentOption[] = [
  {
    value: 1,
    label: 'Paiement complet',
    description: 'Payez le montant total en une seule fois',
  },
  {
    value: 2,
    label: '2 versements',
    description: 'Payez en 2 fois espacées d\'une semaine',
  },
  {
    value: 4,
    label: '4 versements',
    description: 'Payez en 4 fois espacées d\'une semaine chacune',
  },
];

// Verification messages displayed during payment processing
export const VERIFICATION_MESSAGES = [
  'En attente de validation sur votre téléphone...',
  'Une fois validé, la vérification peut prendre jusqu\'à 5 minutes...',
];

// Payment status display configuration
export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  {
    color: string;
    icon: string;
    label: string;
  }
> = {
  completed: {
    color: theme.color.success[500] || '#4CAF50',
    icon: 'check-circle',
    label: 'Réussi',
  },
  failed: {
    color: theme.color.error[500] || '#EF4444',
    icon: 'close-circle',
    label: 'Échoué',
  },
  canceled: {
    color: theme.color.warning[500] || '#F59E0B',
    icon: 'cancel',
    label: 'Annulé',
  },
  pending: {
    color: theme.color.info[500] || '#60A5FA',
    icon: 'clock-outline',
    label: 'En attente',
  },
  initialized: {
    color: theme.color.info[400] || '#60A5FA',
    icon: 'clock-outline',
    label: 'Initialisé',
  },
  processing: {
    color: theme.color.info[500] || '#60A5FA',
    icon: 'sync',
    label: 'En cours',
  },
  expired: {
    color: theme.color.neutral[500] || '#6B7280',
    icon: 'time-outline',
    label: 'Expiré',
  },
};

// Final payment statuses (no further processing needed)
export const FINAL_PAYMENT_STATUSES: PaymentStatus[] = ['completed', 'canceled', 'failed'];

// Grace period for overdue installments (in days)
export const INSTALLMENT_GRACE_PERIOD_DAYS = 2;

// Session storage keys for payment notifications
export const STORAGE_KEYS = {
  PAYMENT_NOTIFICATION_PREFIX: 'payment_notification_',
} as const;

// Phone number validation
export const PHONE_NUMBER_REGEX = /^(6[5-9]\d{7})$/;
export const PHONE_NUMBER_PROVIDERS = {
  ORANGE_PREFIX: '655',
  MTN_PREFIX: '67',
} as const;

// Helper functions for constants
export const getStatusColor = (status: PaymentStatus): string => {
  return PAYMENT_STATUS_CONFIG[status]?.color || PAYMENT_STATUS_CONFIG.pending.color;
};

export const getStatusIcon = (status: PaymentStatus): string => {
  return PAYMENT_STATUS_CONFIG[status]?.icon || 'help-circle';
};

export const getStatusLabel = (status: PaymentStatus): string => {
  return PAYMENT_STATUS_CONFIG[status]?.label || 'Inconnu';
};

export const isFinalPaymentStatus = (status: string): boolean => {
  return FINAL_PAYMENT_STATUSES.includes(status as PaymentStatus);
};
