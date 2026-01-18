/**
 * useInstallmentPlan Hook
 * Handles installment plan calculations and management
 */

import { useMemo } from 'react';
import { ProgramPayment } from '@/types/payment.types';
import { InstallmentService } from '@/services/installment.service';
import { INSTALLMENT_OPTIONS } from '@/constants/payment.constants';

interface UseInstallmentPlanProps {
  totalAmount: number;
  selectedInstallments: number;
  currentPayment?: ProgramPayment | null;
}

export const useInstallmentPlan = ({
  totalAmount,
  selectedInstallments,
  currentPayment,
}: UseInstallmentPlanProps) => {
  // Calculate installment amount
  const installmentAmount = useMemo(() => {
    return InstallmentService.calculateInstallmentAmount(
      totalAmount,
      selectedInstallments,
      1
    );
  }, [totalAmount, selectedInstallments]);

  // Get installment option details
  const installmentOption = useMemo(() => {
    return INSTALLMENT_OPTIONS.find(opt => opt.value === selectedInstallments) || INSTALLMENT_OPTIONS[0];
  }, [selectedInstallments]);

  // Check if user selected installment payment
  const isInstallmentPayment = selectedInstallments > 1;

  // Calculate all due dates
  const dueDates = useMemo(() => {
    if (!isInstallmentPayment) return [];
    
    return InstallmentService.calculateAllDueDates(selectedInstallments);
  }, [isInstallmentPayment, selectedInstallments]);

  // Current payment analysis (if exists)
  const currentPaymentAnalysis = useMemo(() => {
    if (!currentPayment || !currentPayment.is_installment) {
      return null;
    }

    const current = currentPayment.current_installment || 0;
    const total = currentPayment.total_installments || 0;
    const totalAmt = currentPayment.total_amount || totalAmount;

    return {
      progress: InstallmentService.calculateInstallmentProgress(current, total),
      remaining: InstallmentService.getRemainingInstallments(current, total),
      totalPaid: InstallmentService.calculateTotalPaid(totalAmt, current, total),
      remainingAmount: InstallmentService.calculateRemainingAmount(totalAmt, current, total),
      isComplete: InstallmentService.isInstallmentPlanComplete(currentPayment),
      needsNextPayment: InstallmentService.needsNextInstallment(currentPayment),
      label: InstallmentService.formatInstallmentLabel(current, total),
      nextDueDate: currentPayment.next_payment_due_date,
      isOverdue: currentPayment.next_payment_due_date
        ? InstallmentService.isInstallmentOverdue(currentPayment.next_payment_due_date)
        : false,
      daysUntilDue: currentPayment.next_payment_due_date
        ? InstallmentService.getDaysUntilDue(currentPayment.next_payment_due_date)
        : null,
    };
  }, [currentPayment, totalAmount]);

  // Format due date for display
  const formatDueDate = (date: string | Date) => {
    return InstallmentService.formatDueDate(date);
  };

  // Calculate next payment details
  const nextPaymentDetails = useMemo(() => {
    if (!currentPayment || !currentPayment.is_installment) {
      return null;
    }

    const current = currentPayment.current_installment || 0;
    const total = currentPayment.total_installments || 0;
    const totalAmt = currentPayment.total_amount || totalAmount;

    if (current >= total) {
      return null; // All paid
    }

    const nextInstallment = current + 1;
    const nextAmount = InstallmentService.calculateInstallmentAmount(
      totalAmt,
      total,
      nextInstallment
    );

    return {
      installmentNumber: nextInstallment,
      amount: nextAmount,
      dueDate: currentPayment.next_payment_due_date,
      formattedDueDate: currentPayment.next_payment_due_date
        ? formatDueDate(currentPayment.next_payment_due_date)
        : null,
      isOverdue: currentPayment.next_payment_due_date
        ? InstallmentService.isInstallmentOverdue(currentPayment.next_payment_due_date)
        : false,
    };
  }, [currentPayment, totalAmount]);

  return {
    // Installment configuration
    installmentAmount,
    installmentOption,
    isInstallmentPayment,
    dueDates,
    
    // Current payment analysis
    currentPaymentAnalysis,
    nextPaymentDetails,
    
    // Utilities
    formatDueDate,
  };
};
