/**
 * Installment Service
 * Handles installment calculations and date computations
 */

import { ProgramPayment } from '@/types/payment.types';
import { INSTALLMENT_GRACE_PERIOD_DAYS } from '@/constants/payment.constants';
import { logger } from '@/utils/logger';

export const InstallmentService = {
  /**
   * Calculate installment amount based on total price and number of installments
   */
  calculateInstallmentAmount(
    totalAmount: number,
    totalInstallments: number,
    currentInstallment: number = 1
  ): number {
    if (!totalAmount || isNaN(totalAmount) || !totalInstallments || isNaN(totalInstallments) || totalInstallments <= 0) {
      logger.warn('Invalid parameters for installment calculation', {
        totalAmount,
        totalInstallments,
        currentInstallment,
      });
      return 0;
    }

    if (totalInstallments <= 1) {
      return totalAmount;
    }

    // Calculate equal installments (rounded up to ensure total is covered)
    return Math.ceil(totalAmount / totalInstallments);
  },

  /**
   * Calculate next payment due date
   */
  calculateNextPaymentDueDate(weeksFromNow: number = 1): Date {
    const date = new Date();
    date.setDate(date.getDate() + (weeksFromNow * 7));
    return date;
  },

  /**
   * Calculate all installment due dates
   */
  calculateAllDueDates(totalInstallments: number, startDate: Date = new Date()): Date[] {
    const dates: Date[] = [];
    
    for (let i = 0; i < totalInstallments; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + (i * 7)); // Each installment is 1 week apart
      dates.push(date);
    }
    
    return dates;
  },

  /**
   * Check if an installment is overdue (considering grace period)
   */
  isInstallmentOverdue(dueDate: string | Date, gracePeriodDays: number = INSTALLMENT_GRACE_PERIOD_DAYS): boolean {
    const due = new Date(dueDate);
    const now = new Date();
    const gracePeriodDate = new Date(due);
    gracePeriodDate.setDate(gracePeriodDate.getDate() + gracePeriodDays);
    
    return now > gracePeriodDate;
  },

  /**
   * Calculate installment progress percentage
   */
  calculateInstallmentProgress(currentInstallment: number, totalInstallments: number): number {
    if (totalInstallments <= 0) {
      return 0;
    }
    
    return Math.round((currentInstallment / totalInstallments) * 100);
  },

  /**
   * Get remaining installments
   */
  getRemainingInstallments(currentInstallment: number, totalInstallments: number): number {
    return Math.max(0, totalInstallments - currentInstallment);
  },

  /**
   * Calculate total paid amount so far
   */
  calculateTotalPaid(totalAmount: number, currentInstallment: number, totalInstallments: number): number {
    const installmentAmount = this.calculateInstallmentAmount(totalAmount, totalInstallments);
    return installmentAmount * currentInstallment;
  },

  /**
   * Calculate remaining amount to pay
   */
  calculateRemainingAmount(totalAmount: number, currentInstallment: number, totalInstallments: number): number {
    const totalPaid = this.calculateTotalPaid(totalAmount, currentInstallment, totalInstallments);
    return Math.max(0, totalAmount - totalPaid);
  },

  /**
   * Format installment label
   */
  formatInstallmentLabel(currentInstallment: number, totalInstallments: number): string {
    return `${currentInstallment}/${totalInstallments}`;
  },

  /**
   * Check if payment needs next installment
   */
  needsNextInstallment(payment: ProgramPayment): boolean {
    if (!payment.is_installment) {
      return false;
    }
    
    const current = payment.current_installment || 0;
    const total = payment.total_installments || 0;
    
    return current < total && payment.payment_status === 'completed';
  },

  /**
   * Check if installment plan is complete
   */
  isInstallmentPlanComplete(payment: ProgramPayment): boolean {
    if (!payment.is_installment) {
      return true;
    }
    
    const current = payment.current_installment || 0;
    const total = payment.total_installments || 0;
    
    return current >= total;
  },

  /**
   * Format date for display
   */
  formatDueDate(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  },

  /**
   * Get days until due date
   */
  getDaysUntilDue(dueDate: string | Date): number {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  },
};
