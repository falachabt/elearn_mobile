/**
 * usePaymentFlow Hook
 * Manages payment flow state machine and transitions
 */

import { useState, useCallback, useEffect } from 'react';
import { PaymentFlowState, ProgramPayment } from '@/types/payment.types';
import { isFinalPaymentStatus } from '@/constants/payment.constants';
import { ProgramUtilsService } from '@/services/program-utils.service';
import { logger } from '@/utils/logger';

interface UsePaymentFlowProps {
  latestPayment: ProgramPayment | null;
  hasCompletedFirstInstallment: boolean;
}

export const usePaymentFlow = ({ latestPayment, hasCompletedFirstInstallment }: UsePaymentFlowProps) => {
  const [currentState, setCurrentState] = useState<PaymentFlowState>(PaymentFlowState.LOADING);
  const [currentTrxReference, setCurrentTrxReference] = useState<string | null>(null);

  // Determine initial state based on payment history
  const determineInitialState = useCallback(() => {
    if (!latestPayment) {
      logger.info('[PaymentFlow] No payment found, showing instructions');
      setCurrentState(PaymentFlowState.INSTRUCTIONS);
      return;
    }

    // Check if access is expired
    const isAccessExpired = ProgramUtilsService.isAccessExpired(latestPayment.expiry_date);

    // If payment already seen, start fresh
    if (latestPayment.has_seen_result === true) {
      logger.info('[PaymentFlow] Payment already seen, starting fresh');
      setCurrentState(PaymentFlowState.INSTRUCTIONS);
      return;
    }

    // If payment is not in final status, continue verification
    if (!isFinalPaymentStatus(latestPayment.payment_status)) {
      logger.info('[PaymentFlow] Non-final payment status, setting up verification');
      
      if (hasCompletedFirstInstallment && latestPayment.is_installment) {
        setCurrentState(PaymentFlowState.NEXT_PAYMENT_VERIFYING);
      } else {
        setCurrentState(PaymentFlowState.VERIFYING);
      }
      
      setCurrentTrxReference(latestPayment.payment_reference);
      return;
    }

    // Payment is in final status but not marked as seen - show result
    const timestamp = ProgramUtilsService.getLatestPaymentTimestamp(latestPayment);
    const isOld = ProgramUtilsService.isOlderThanMinutes(timestamp, 5);

    if (!isOld) {
      logger.info('[PaymentFlow] Recent payment with final status, showing result');
      
      if (latestPayment.payment_status === 'completed') {
        if (hasCompletedFirstInstallment && latestPayment.is_installment) {
          setCurrentState(PaymentFlowState.NEXT_PAYMENT_SUCCESS);
        } else {
          setCurrentState(PaymentFlowState.SUCCESS);
        }
      } else if (latestPayment.payment_status === 'failed') {
        if (hasCompletedFirstInstallment && latestPayment.is_installment) {
          setCurrentState(PaymentFlowState.NEXT_PAYMENT_FAILED);
        } else {
          setCurrentState(PaymentFlowState.FAILED);
        }
      } else if (latestPayment.payment_status === 'canceled') {
        if (hasCompletedFirstInstallment && latestPayment.is_installment) {
          setCurrentState(PaymentFlowState.NEXT_PAYMENT_CANCELED);
        } else {
          setCurrentState(PaymentFlowState.CANCELED);
        }
      }
    } else {
      // Old payment with final status - show instructions
      logger.info('[PaymentFlow] Old payment, showing instructions');
      setCurrentState(PaymentFlowState.INSTRUCTIONS);
    }
  }, [latestPayment, hasCompletedFirstInstallment]);

  // Initialize state on mount and when dependencies change
  useEffect(() => {
    determineInitialState();
  }, [determineInitialState]);

  // Transition to a new state
  const transitionTo = useCallback((newState: PaymentFlowState) => {
    logger.info(`[PaymentFlow] Transitioning from ${currentState} to ${newState}`);
    setCurrentState(newState);
  }, [currentState]);

  // Start payment process
  const startPayment = useCallback((trxReference: string) => {
    logger.info('[PaymentFlow] Starting payment with reference:', trxReference);
    setCurrentTrxReference(trxReference);
    setCurrentState(PaymentFlowState.PROCESSING);
  }, []);

  // Start next installment payment
  const startNextInstallment = useCallback((trxReference: string) => {
    logger.info('[PaymentFlow] Starting next installment with reference:', trxReference);
    setCurrentTrxReference(trxReference);
    setCurrentState(PaymentFlowState.NEXT_PAYMENT_PROCESSING);
  }, []);

  // Reset flow
  const reset = useCallback(() => {
    logger.info('[PaymentFlow] Resetting flow');
    setCurrentState(PaymentFlowState.INSTRUCTIONS);
    setCurrentTrxReference(null);
  }, []);

  // Check if current state is a success state
  const isSuccessState = useCallback(() => {
    return currentState === PaymentFlowState.SUCCESS || 
           currentState === PaymentFlowState.NEXT_PAYMENT_SUCCESS;
  }, [currentState]);

  // Check if current state is a failure state
  const isFailureState = useCallback(() => {
    return currentState === PaymentFlowState.FAILED || 
           currentState === PaymentFlowState.NEXT_PAYMENT_FAILED ||
           currentState === PaymentFlowState.CANCELED ||
           currentState === PaymentFlowState.NEXT_PAYMENT_CANCELED;
  }, [currentState]);

  // Check if currently verifying
  const isVerifying = useCallback(() => {
    return currentState === PaymentFlowState.VERIFYING || 
           currentState === PaymentFlowState.NEXT_PAYMENT_VERIFYING;
  }, [currentState]);

  // Check if currently processing
  const isProcessing = useCallback(() => {
    return currentState === PaymentFlowState.PROCESSING || 
           currentState === PaymentFlowState.NEXT_PAYMENT_PROCESSING;
  }, [currentState]);

  return {
    currentState,
    currentTrxReference,
    transitionTo,
    startPayment,
    startNextInstallment,
    reset,
    isSuccessState,
    isFailureState,
    isVerifying,
    isProcessing,
  };
};
