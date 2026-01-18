import { supabase } from '@/lib/supabase';
import { NotchPayService } from '@/lib/notchpay';
import { PURCHASE_VALIDITY_DAYS } from '@/utils/pricing';
import { logger } from '@/utils/logger';

export interface ProgramPayment {
  id: string;
  user_id: string;
  program_id: string;
  amount: number;
  payment_date: string;
  expiry_date: string;
  payment_reference: string;
  payment_status: string;
  payment_provider: string;
  phone_number: string;
  promo_code_id?: string;
  created_at: string;
  updated_at: string;
  is_installment?: boolean;
  total_installments?: number;
  current_installment?: number;
  next_payment_due_date?: string;
  authorizationUrl?: string;
  total_amount?: number;
  parent_payment_id?: string;
  has_seen_result?: boolean;
}

export const ProgramPaymentService = {
  // Mark the payment result as seen by the user
  async markAsSeen(paymentId: string): Promise<void> {
    const { error } = await supabase
      .from('user_program_payments')
      .update({
        has_seen_result: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (error) {
      logger.error('Error marking payment as seen:', error);
    }
  },

  // Calculate installment amount based on total price and number of installments
  calculateInstallmentAmount(totalAmount: number, totalInstallments: number): number {
    // Ensure we have valid numbers to avoid NaN
    if (!totalAmount || isNaN(totalAmount) || !totalInstallments || isNaN(totalInstallments) || totalInstallments <= 0) {
      return 0;
    }

    if (totalInstallments <= 1) return totalAmount;

    // For the first installment, we might want to charge a different amount
    // For simplicity, we'll divide equally for now
    return Math.ceil(totalAmount / totalInstallments);
  },

  // Create an installment payment plan
  async createInstallmentPlan(
    programId: string,
    phoneNumber: string,
    totalAmount: number,
    totalInstallments: number,
    promoCodeId?: string,
    currentInstallment: number = 1,
    nextInstallmentDate?: Date
  ): Promise<ProgramPayment> {
    // Calculate first installment amount
    const firstInstallmentAmount = this.calculateInstallmentAmount(totalAmount, totalInstallments);

    try {
      // Create the parent payment record (first installment)
      const notchpay = new NotchPayService();

      const result = await notchpay.initiateDirectCharge({
        phone: phoneNumber,
        channel: 'cm.mobile',
        currency: 'XAF',
        amount: firstInstallmentAmount,
        customer: {
          email: 'default@gmail.com', // This should be user's email if available
        },
      });

      if (!result.initResponse.transaction?.reference) {
        logger.error("Payment initialization failed: No transaction reference");
        throw new Error("Payment initialization failed");
      }

      // Create the first installment payment record
      const payment = await this.createPayment(
        programId,
        phoneNumber,
        firstInstallmentAmount,
        result.initResponse.transaction.reference,
        promoCodeId,
        true, // isInstallment
        totalInstallments,
        currentInstallment, // currentInstallment
        totalAmount,
        null,
        nextInstallmentDate
      );

      // If direct charge was successful or needs fallback
      if (result.chargeResponse || result.needsFallback) {
        if(payment.id){
          await this.setStatus(payment.id, 'initialized');
        }

        return {
          ...payment,
          needsFallback: result.needsFallback,
          authorizationUrl: result.initResponse.authorization_url,
          trxReference: result.initResponse.transaction.reference
        } as ProgramPayment & { needsFallback?: boolean; authorizationUrl?: string; trxReference?: string };
      }

      logger.error("Installment plan creation failed: No chargeResponse or needsFallback");
      throw new Error("Installment plan creation failed");
    } catch (error) {
      logger.error("Error in createInstallmentPlan:", error);
      throw error;
    }
  },

  // Get pending installments for a program
  async getPendingInstallments(programId: string): Promise<ProgramPayment[]> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return [];

    const numericProgramId = parseInt(programId, 10);
    if (isNaN(numericProgramId)) {
      logger.error(`Invalid program ID: ${programId}. Expected a numeric ID.`);
      return [];
    }

    const { data, error } = await supabase
      .from('user_program_payments')
      .select('*')
      .eq('user_id', user.id)
      .eq('program_id', numericProgramId)
      .eq('is_installment', true)
      .lt('current_installment', 'total_installments')
      .eq('payment_status', 'completed')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error getting pending installments:', error);
      return [];
    }

    return data || [];
  },

  // Process the next installment payment
  async processNextInstallment(
    parentPaymentId: string,
    phoneNumber: string
  ): Promise<ProgramPayment> {
    // Get the parent payment
    const { data: parentPayment, error: parentError } = await supabase
      .from('user_program_payments')
      .select('*')
      .eq('id', parentPaymentId)
      .single();

    if (parentError || !parentPayment) {
      logger.error('Error getting parent payment:', parentError);
      throw new Error('Parent payment not found');
    }

    // Check if all installments are already paid
    if (parentPayment.current_installment >= parentPayment.total_installments) {
      throw new Error('All installments are already paid');
    }

    // Calculate next installment amount
    const nextInstallmentNumber = parentPayment.current_installment + 1;
    const nextInstallmentAmount = this.calculateInstallmentAmount(
      parentPayment.total_amount,
      parentPayment.total_installments,
      nextInstallmentNumber
    );

    // Create the next installment payment
    const notchpay = new NotchPayService();
    const result = await notchpay.initiateDirectCharge({
      phone: phoneNumber,
      channel: phoneNumber.startsWith('655') ? 'cm.orange' : 'cm.mtn',
      currency: 'XAF',
      amount: nextInstallmentAmount,
      customer: {
        email: 'default@gmail.com', // This should be user's email if available
      },
    });

    if (!result.initResponse.transaction?.reference) {
      throw new Error("Payment initialization failed");
    }

    // Create the next installment payment record
    const payment = await this.createPayment(
      parentPayment.program_id.toString(),
      phoneNumber,
      nextInstallmentAmount,
      result.initResponse.transaction.reference,
      parentPayment.promo_code_id,
      true, // isInstallment
      parentPayment.total_installments,
      nextInstallmentNumber,
      parentPayment.total_amount,
      parentPayment.id
    );

    // If direct charge was successful or needs fallback
    if (result.chargeResponse || result.needsFallback) {
      await this.setStatus(payment.id, 'initialized');

      return {
        ...payment,
        needsFallback: result.needsFallback,
        authorizationUrl: result.initResponse.authorization_url,
        trxReference: result.initResponse.transaction.reference
      } as ProgramPayment & { needsFallback?: boolean; authorizationUrl?: string; trxReference?: string };
    }

    throw new Error("Next installment payment failed");
  },

  // Update parent payment after successful installment payment
  async updateParentPaymentAfterInstallment(paymentId: string): Promise<void> {
    // Get the current payment
    const { data: payment, error } = await supabase
      .from('user_program_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error || !payment || !payment.parent_payment_id) {
      logger.error('Error getting payment:', error);
      return;
    }

    // Update the parent payment with the new current installment number
    const { error: updateError } = await supabase
      .from('user_program_payments')
      .update({
        current_installment: payment.current_installment,
        next_payment_due_date: payment.next_payment_due_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.parent_payment_id);

    if (updateError) {
      logger.error('Error updating parent payment:', updateError);
    }
  },


  async createPayment(
    programId: string,
    phoneNumber: string,
    amount: number = 2500,
    trx_reference: string,
    promoCodeId?: string,
    isInstallment: boolean = false,
    totalInstallments?: number,
    currentInstallment?: number,
    totalAmount?: number,
    parentPaymentId?: string,
    nextInstallmentDate?: Date
  ): Promise<ProgramPayment> {
    // Convert programId to a number if it's a string
    const numericProgramId = parseInt(programId, 10);

    if (isNaN(numericProgramId)) {
      throw new Error(`Invalid program ID: ${programId}. Expected a numeric ID.`);
    }

    // Calcul de la date de paiement
    const paymentDate = new Date();

    // Correction du calcul de la date d'expiration et de la prochaine échéance
    let expiryDate: Date;
    let nextPaymentDueDate: string | null = null;

    if (isInstallment && currentInstallment && totalInstallments) {
      if (currentInstallment < totalInstallments) {
        // Paiement intermédiaire : expiry = date du prochain paiement, next_payment_due_date = date du prochain paiement
        if (nextInstallmentDate) {
          expiryDate = new Date(nextInstallmentDate);
          nextPaymentDueDate = nextInstallmentDate.toISOString();
        } else {
          // Si la date n'est pas fournie, fallback sur aujourd'hui + 7 jours
          expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 7);
          nextPaymentDueDate = expiryDate.toISOString();
        }
      } else {
        // Dernier versement : expiry = aujourd'hui + durée de validité, next_payment_due_date = null
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + PURCHASE_VALIDITY_DAYS);
        nextPaymentDueDate = null;
      }
    } else {
      // Paiement direct : expiry = aujourd'hui + durée de validité, next_payment_due_date = null
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + PURCHASE_VALIDITY_DAYS);
      nextPaymentDueDate = null;
    }

    const { data: payment, error } = await supabase
      .from('user_program_payments')
      .insert({
        program_id: numericProgramId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        amount,
        payment_status: 'pending',
        phone_number: phoneNumber,
        payment_provider: phoneNumber.startsWith('655') ? 'orange' : 'mtn',
        payment_reference: trx_reference,
        promo_code_id: promoCodeId,
        payment_date: paymentDate.toISOString(),
        expiry_date: expiryDate.toISOString(),
        is_installment: isInstallment,
        total_installments: totalInstallments,
        current_installment: currentInstallment,
        next_payment_due_date: nextPaymentDueDate,
        total_amount: totalAmount,
        parent_payment_id: parentPaymentId
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating program payment:', error);
      throw new Error(error.message);
    }

    return payment;
  },

  async setStatus(paymentId: string, status: string) {
    const { error } = await supabase
      .from('user_program_payments')
      .update({
        payment_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (error) {
      logger.error('Error updating program payment status:', error);
      throw new Error(error.message);
    }
  },

  subscribeToPaymentStatus(paymentId: string, callback: (status: string, payment: ProgramPayment) => void) {
    return supabase
      .channel('program_payments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_program_payments',
          filter: `id=eq.${paymentId}`
        },
        (payload: { new: { payment_status: string } }) => callback(payload.new.payment_status, payload.new as ProgramPayment)
      )
      .subscribe();
  },

  async checkProgramAccess(programId: string): Promise<boolean> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      logger.warn('[checkProgramAccess] No authenticated user');
      return false;
    }

    // Convert programId to a number if it's a string
    const numericProgramId = parseInt(programId, 10);

    if (isNaN(numericProgramId)) {
      logger.error(`[checkProgramAccess] Invalid program ID: ${programId}. Expected a numeric ID.`);
      return false;
    }

    // Check if user is enrolled in the program
    const { data: enrollmentData, error: enrollmentError } = await supabase
      .from('user_program_enrollments')
      .select('id, expiry_date')
      .eq('user_id', user.id)
      .eq('program_id', numericProgramId)
      .limit(1);

    if (enrollmentError) {
      logger.error('[checkProgramAccess] Error checking program enrollment:', enrollmentError);
      return false;
    }

    // If user is not enrolled, no access
    if (!enrollmentData || enrollmentData.length === 0) {
      logger.info(`[checkProgramAccess] User not enrolled in program ${programId}`);
      return false;
    }

    // User is enrolled - check if enrollment is expired
    const enrollment = enrollmentData[0];
    if (enrollment.expiry_date) {
      const now = new Date();
      const expiryDate = new Date(enrollment.expiry_date);
      if (now > expiryDate) {
        logger.info(`[checkProgramAccess] Enrollment expired for program ${programId}`);
        return false;
      }
    }

    // Get the latest payment for this program to check for installment status
    const { data: paymentData, error: paymentError } = await supabase
      .from('user_program_payments')
      .select('*')
      .eq('user_id', user.id)
      .eq('program_id', numericProgramId)
      .eq('payment_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1);

    if (paymentError) {
      logger.error('[checkProgramAccess] Error checking program payment:', paymentError);
      return false;
    }

    // If no payment found but user is enrolled, still give access
    // This handles the case where enrollment was created by trigger
    if (!paymentData || paymentData.length === 0) {
      logger.info(`[checkProgramAccess] No payment found but user is enrolled in program ${programId}, granting access`);
      return true;
    }

    const payment = paymentData[0];

    // For installment payments, check if next payment is overdue
    if (payment.is_installment && payment.next_payment_due_date) {
      const nextPaymentDueDate = new Date(payment.next_payment_due_date);
      const now = new Date();

      // If next payment is overdue by more than 2 days, restrict access
      const gracePeriod = 2; // 2 days grace period
      const gracePeriodDate = new Date(nextPaymentDueDate);
      gracePeriodDate.setDate(gracePeriodDate.getDate() + gracePeriod);

      if (now > gracePeriodDate && payment.current_installment < payment.total_installments) {
        logger.info(`[checkProgramAccess] Installment payment overdue for program ${programId}`);
        return false;
      }
    }

    // If we got here, user has valid access
    logger.info(`[checkProgramAccess] Access granted for program ${programId}`);
    return true;
  },

  async getActivePayment(programId: string): Promise<ProgramPayment | null> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    // Convert programId to a number if it's a string
    const numericProgramId = parseInt(programId, 10);

    if (isNaN(numericProgramId)) {
      logger.error(`Invalid program ID: ${programId}. Expected a numeric ID.`);
      return null;
    }

    const { data, error } = await supabase
      .from('user_program_payments')
      .select('*')
      .eq('user_id', user.id)
      .eq('program_id', numericProgramId)
      .eq('payment_status', 'completed')
      .gt('expiry_date', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No active payment found
        return null;
      }
      logger.error('Error getting active program payment:', error);
      throw new Error(error.message);
    }

    return data;
  },

  async getLatestPayment(programId: string): Promise<ProgramPayment | null> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;
    if (!programId) {
      return null;
    }

    // Convert programId to a number if it's a string
    const numericProgramId = parseInt(programId, 10);

    if (isNaN(numericProgramId)) {
      logger.error(`Invalid program ID: ${programId}. Expected a numeric ID.`);
      return null;
    }

    const { data, error } = await supabase
      .from('user_program_payments')
      .select('*')
      .eq('user_id', user.id)
      .eq('program_id', numericProgramId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No payment found
        return null;
      }
      logger.error('Error getting latest program payment:', error);
      throw new Error(error.message);
    }

    return data;
  },

  async getPaymentByReference(paymentReference: string): Promise<ProgramPayment | null> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;
    if (!paymentReference) return null;

    const { data, error } = await supabase
      .from('user_program_payments')
      .select('*')
      .eq('user_id', user.id)
      .eq('payment_reference', paymentReference)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        logger.info('No payment found for reference:', paymentReference);
        return null;
      }
      logger.error('Error getting payment by reference:', error);
      return null;
    }

    return data;
  },


  async getAllPayments(programId: string): Promise<ProgramPayment[]> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return [];

    // Convert programId to a number if it's a string
    const numericProgramId = parseInt(programId, 10);

    if (isNaN(numericProgramId)) {
      logger.error(`Invalid program ID: ${programId}. Expected a numeric ID.`);
      return [];
    }

    const { data, error } = await supabase
      .from('user_program_payments')
      .select('*')
      .eq('user_id', user.id)
      .eq('program_id', numericProgramId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error getting all program payments:', error);
      return [];
    }

    return data || [];
  },

  async getPaymentHistory(programId: string | number): Promise<ProgramPayment[]> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return [];

    const numericProgramId = typeof programId === "string" ? parseInt(programId, 10) : programId;

    if (isNaN(numericProgramId)) {
      logger.error(`Invalid program ID: ${programId}. Expected a numeric ID.`);
      return [];
    }

    const { data, error } = await supabase
      .from('user_program_payments')
      .select('*')
      .eq('user_id', user.id)
      .eq('program_id', numericProgramId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error getting payment history:', error);
      return [];
    }

    return data || [];
  },

  async getAllInstallmentsForPlan(paymentId: string): Promise<ProgramPayment[]> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user || !paymentId) return [];

    try {
      // Récupérer le paiement pour trouver le parent_id
      const { data: payment, error: paymentError } = await supabase
        .from('user_program_payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (paymentError || !payment) {
        logger.error('Error fetching payment:', paymentError);
        return [];
      }

      // Déterminer le parentId
      const parentId = payment.parent_payment_id || payment.id;

      // Récupérer tous les paiements liés (parent + enfants)
      const { data, error } = await supabase
        .from('user_program_payments')
        .select('*')
        .or(`id.eq.${parentId},parent_payment_id.eq.${parentId}`)
        .order('current_installment', { ascending: true });

      if (error) {
        logger.error('Error fetching all installments:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getAllInstallmentsForPlan:', error);
      return [];
    }
  },

  // Check if a payment status is final (completed or canceled)
  isFinalStatus(status: string): boolean {
    return ['completed', 'canceled', 'failed'].includes(status);
  },

  async initiateDirectPayment(
    programId: string,
    phoneNumber: string,
    amount: number = 2500,
    promoCodeId?: string,
    isInstallment: boolean = false,
    totalInstallments: number = 1,
    currentInstallment: number = 1,
    nextInstallmentDate?: Date
  ) {
    try {
      // Convert programId to a number if it's a string
      const numericProgramId = parseInt(programId, 10);

      if (isNaN(numericProgramId)) {
        logger.error(`Invalid program ID: ${programId}. Expected a numeric ID.`);
        throw new Error(`Invalid program ID: ${programId}. Expected a numeric ID.`);
      }

      // If this is an installment payment, use the installment plan method
      if (isInstallment && totalInstallments > 1) {
        // For installment plans, we need to pass the total amount, not the first installment amount
        return await this.createInstallmentPlan(
          programId,
          phoneNumber,
          amount * totalInstallments, // Pass the total amount, not just the first installment
          totalInstallments,
          promoCodeId,
          currentInstallment,
          nextInstallmentDate
        );
      }

      // Otherwise, proceed with a regular one-time payment
      const notchpay = new NotchPayService();

      const result = await notchpay.initiateDirectCharge({
        phone: phoneNumber,
        channel:"cm.mobile",
        currency: 'XAF',
        amount: amount,
        customer: {
          email: 'default@gmail.com', // This should be user's email if available
        },
      });

      // If we got an error during charge but initialization was successful
      if (result.error && result.initResponse.transaction?.reference) {
        // Create payment record with pending status
        const payment = await this.createPayment(
          numericProgramId.toString(), // Use the numeric ID we've already validated
          phoneNumber,
          amount,
          result.initResponse.transaction.reference,
          promoCodeId,
          false // Not an installment payment
        );

        await this.setStatus(payment.id, 'pending');

        return {
          payment,
          needsFallback: true,
          authorizationUrl: result.initResponse.authorization_url,
          trxReference: result.initResponse.transaction.reference
        };
      }

      // If charge was successful
      if (result.chargeResponse && result.initResponse.transaction?.reference) {
        const payment = await this.createPayment(
          numericProgramId.toString(), // Use the numeric ID we've already validated
          phoneNumber,
          amount,
          result.initResponse.transaction.reference,
          promoCodeId,
          false // Not an installment payment
        );

        await this.setStatus(payment.id, 'initialized');

        return {
          payment,
          needsFallback: false,
          trxReference: result.initResponse.transaction.reference
        };
      }

      throw new Error("Payment initialization failed");
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error("Error in direct program payment:", error.message);
      } else {
        logger.error("Error in direct program payment:", error);
      }
      throw error;
    }
  },

  async verifyPaymentStatus(reference: string, paymentId?: string) {
    if (!reference) return;

    try {
      const notchpay = new NotchPayService();
      const result = await notchpay.verifyTransaction(reference);

      // If we have a transaction status from NotchPay and a payment ID, update our database
      if (result?.transaction?.status && paymentId) {
        // Map NotchPay status to our status format if needed
        let ourStatus = result.transaction.status;
        if (ourStatus === "complete") {
          ourStatus = "completed";
        }

        // Update the payment status in our database
        await this.setStatus(paymentId, ourStatus);

        // If the status is complete/completed, handle additional logic
        if (result.transaction.status === "complete") {
          // Get the payment to get the program_id, user_id, and installment details
          const { data: payment, error } = await supabase
            .from('user_program_payments')
            .select('*')
            .eq('id', paymentId)
            .single();

          if (error) {
            logger.error("Error fetching payment details:", error);
          } else {
            // If this is an installment payment, update the parent payment
            if (payment.is_installment) {
              // Calculate next payment due date (1 week from now)
              let nextPaymentDueDate = null;
              if (payment.current_installment < payment.total_installments) {
                nextPaymentDueDate = new Date();
                nextPaymentDueDate.setDate(nextPaymentDueDate.getDate() + 7); // Next payment due in 1 week

                // Update the payment with next payment due date
                await supabase
                  .from('user_program_payments')
                  .update({
                    next_payment_due_date: nextPaymentDueDate.toISOString()
                  })
                  .eq('id', paymentId);
              }

              // If this payment has a parent, update the parent payment
              if (payment.parent_payment_id) {
                await this.updateParentPaymentAfterInstallment(paymentId);
              }

              // Only create enrollment for the first installment
              if (payment.current_installment === 1) {
                // Create enrollment record with expiry_date
                const { error: enrollmentError } = await supabase
                  .from('user_program_enrollments')
                  .insert({
                    user_id: payment.user_id,
                    program_id: payment.program_id,
                    expiry_date: payment.expiry_date
                  });

                if (enrollmentError) {
                  logger.error("Error creating enrollment:", enrollmentError);
                }
              }
            } else {
              // For one-time payments, create enrollment record with expiry_date
              const { error: enrollmentError } = await supabase
                .from('user_program_enrollments')
                .insert({
                  user_id: payment.user_id,
                  program_id: payment.program_id,
                  expiry_date: payment.expiry_date
                });

              if (enrollmentError) {
                logger.error("Error creating enrollment:", enrollmentError);
              }
            }
          }
        }
      }

      return result;
    } catch (error) {
      logger.error("Error verifying program payment status:", error);
    }
  },

  async cancelPayment(paymentId: string) {
    try {
      // First, check the current status of the payment
      const { data: payment, error: fetchError } = await supabase
        .from('user_program_payments')
        .select('payment_status')
        .eq('id', paymentId)
        .single();

      if (fetchError) {
        logger.error("Error fetching payment status:", fetchError);
        throw fetchError;
      }

      // If payment is already canceled, don't try to update it again
      if (payment.payment_status === "canceled") {
        return;
      }

      // Mark as canceled in our system
      await this.setStatus(paymentId, "canceled");

      // Try to cancel with NotchPay (this might fail silently if payment already processed)
      try {
        // Uncomment if you want to cancel in NotchPay
        // const notchpay = new NotchPayService();
        // await notchpay.cancelPayment(reference);
      } catch {
        // Silently ignore NotchPay cancellation errors
      }
    } catch (error) {
      logger.error("Error cancelling program payment:", error);
      throw error;
    }
  }
};
