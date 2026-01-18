/**
 * usePaymentVerification Hook
 * Handles payment status polling and verification
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ProgramPaymentService } from '@/services/program-payment.service';
import { ProgramPayment, PaymentStatus } from '@/types/payment.types';
import { 
  PAYMENT_VERIFICATION_INTERVAL, 
  isFinalPaymentStatus 
} from '@/constants/payment.constants';
import { programPaymentKeys } from '@/constants/swr-path';
import { logger } from '@/utils/logger';

interface UsePaymentVerificationProps {
  trxReference: string | null;
  paymentId?: string | null;
  enabled: boolean;
  onStatusChange?: (status: PaymentStatus, payment?: ProgramPayment) => void;
  onComplete?: (payment: ProgramPayment) => void;
  onFailed?: (payment: ProgramPayment) => void;
}

export const usePaymentVerification = ({
  trxReference,
  paymentId,
  enabled,
  onStatusChange,
  onComplete,
  onFailed,
}: UsePaymentVerificationProps) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<PaymentStatus | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const verificationCountRef = useRef(0);
  const maxVerificationAttempts = 60; // 5 minutes max (60 * 5 seconds)

  // Clear interval
  const clearVerificationInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      logger.info('[PaymentVerification] Interval cleared');
    }
  }, []);

  // Verify payment status
  const verifyPaymentStatus = useCallback(async () => {
    if (!trxReference) {
      logger.warn('[PaymentVerification] No transaction reference provided');
      return;
    }

    try {
      logger.info('[PaymentVerification] Verifying payment:', trxReference);
      
      const result = await ProgramPaymentService.verifyPaymentStatus(trxReference, paymentId || undefined);
      
      if (result?.transaction?.status) {
        const status = result.transaction.status === 'complete' ? 'completed' : result.transaction.status as PaymentStatus;
        
        logger.info('[PaymentVerification] Payment status:', status);
        setLastStatus(status);
        
        // Call status change callback
        onStatusChange?.(status);

        // Check if status is final
        if (isFinalPaymentStatus(status)) {
          clearVerificationInterval();
          setIsVerifying(false);

          // Get the updated payment data
          const payment = await ProgramPaymentService.getPaymentByReference(trxReference);
          
          if (payment) {
            if (status === 'completed') {
              onComplete?.(payment);
            } else if (status === 'failed' || status === 'canceled') {
              onFailed?.(payment);
            }
            
            // Mutate SWR cache to refresh data
            if (payment.program_id) {
              programPaymentKeys.mutateAllForProgram(payment.program_id.toString());
            }
          }
        }
      }
      
      verificationCountRef.current += 1;
      
      // Stop after max attempts
      if (verificationCountRef.current >= maxVerificationAttempts) {
        logger.warn('[PaymentVerification] Max verification attempts reached');
        clearVerificationInterval();
        setIsVerifying(false);
        setVerificationError('Timeout de vérification. Veuillez actualiser la page.');
      }
    } catch (error) {
      logger.error('[PaymentVerification] Error verifying payment:', error);
      setVerificationError('Erreur lors de la vérification du paiement');
      
      // Continue trying unless we hit max attempts
      if (verificationCountRef.current >= maxVerificationAttempts) {
        clearVerificationInterval();
        setIsVerifying(false);
      }
    }
  }, [trxReference, paymentId, onStatusChange, onComplete, onFailed, clearVerificationInterval]);

  // Start verification
  const startVerification = useCallback(() => {
    if (!trxReference || !enabled) {
      logger.warn('[PaymentVerification] Cannot start verification - missing reference or disabled');
      return;
    }

    logger.info('[PaymentVerification] Starting verification for:', trxReference);
    setIsVerifying(true);
    setVerificationError(null);
    verificationCountRef.current = 0;
    
    // Verify immediately
    verifyPaymentStatus();
    
    // Then set up interval
    clearVerificationInterval();
    intervalRef.current = setInterval(() => {
      verifyPaymentStatus();
    }, PAYMENT_VERIFICATION_INTERVAL);
  }, [trxReference, enabled, verifyPaymentStatus, clearVerificationInterval]);

  // Stop verification
  const stopVerification = useCallback(() => {
    logger.info('[PaymentVerification] Stopping verification');
    clearVerificationInterval();
    setIsVerifying(false);
  }, [clearVerificationInterval]);

  // Auto-start verification when enabled and reference is available
  useEffect(() => {
    if (enabled && trxReference) {
      startVerification();
    } else {
      stopVerification();
    }
    
    // Cleanup on unmount
    return () => {
      clearVerificationInterval();
    };
  }, [enabled, trxReference]); // Intentionally excluding startVerification/stopVerification to avoid infinite loops

  return {
    isVerifying,
    verificationError,
    lastStatus,
    startVerification,
    stopVerification,
    verifyNow: verifyPaymentStatus,
  };
};
