import { useState, useRef } from "react";
import useSWR, { mutate } from "swr";

import { ProgramPaymentService, ProgramPayment } from "@/services/program-payment.service";
import { NotchPayService } from "@/lib/notchpay";
import { supabase } from "@/lib/supabase";
import { programPaymentKeys, programKeys } from "@/constants/swr-path";

interface PaymentContextData {
    programId: string | null;
    programName: string;
    programPrice: number;
    user: any;
    hasCompletedFirstInstallment: boolean;
    latestPayment: ProgramPayment | null;
    allPayments: ProgramPayment[];
    installmentPayment: any;
}

// Helper function to get program ID from pdId
async function getProgramIdFromPdId(pdId: string | undefined): Promise<string | null> {
    if (!pdId) return null;

    const { data, error } = await supabase.from("concours_learningpaths")
        .select("id")
        .eq('learningPathId', pdId)
        .single();
    if (error) {
        console.error("Error fetching program ID:", error);
        return null;
    }

    return data?.id || null;
}

export const useProgramPayment = (pdId: string | undefined) => {
    const [paymentStatus, setPaymentStatus] = useState("");
    const [loading, setLoading] = useState(false);
    const [payment, setPayment] = useState<ProgramPayment | null>(null);
    const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);
    const [chargeError, setChargeError] = useState<string | null>(null);

    // Use SWR to fetch and cache the program ID
    const { data: programId } = useSWR(
        pdId ? `program-id-${pdId}` : null,
        async () => await getProgramIdFromPdId(pdId),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 60000, // 1 minute
        }
    );

    // Use SWR to check program access
    const { data: hasAccess, isLoading: accessLoading, mutate: mutateAccess } = useSWR(
        programId ? programPaymentKeys.access(programId) : null,
        async () => await ProgramPaymentService.checkProgramAccess(programId!),
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 60000, // 1 minute
        }
    );

    // Use SWR to get the latest payment
    const { data: latestPayment, isLoading: latestPaymentLoading, mutate: mutateLatestPayment } = useSWR(
        programId ? programPaymentKeys.latest(programId) : null,
        async () => {
            const payment = await ProgramPaymentService.getLatestPayment(programId!);
            if (payment) {
                setPaymentStatus(payment.payment_status);
                setPayment(payment);
            }
            return payment;
        },
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 10000, // 10 seconds
        }
    );

    // Use SWR to get all payments
    const { data: allPayments, mutate: mutateAllPayments } = useSWR(
        programId ? programPaymentKeys.allPayments(programId) : null,
        async () => await ProgramPaymentService.getAllPayments(programId!),
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 30000, // 30 seconds
        }
    );

    // Use SWR to get active payment
    const { data: activePayment, mutate: mutateActivePayment } = useSWR(
        programId ? programPaymentKeys.active(programId) : null,
        async () => await ProgramPaymentService.getActivePayment(programId!),
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 30000, // 30 seconds
        }
    );

    /**
     * Check if the user has access to a program
     */
    const checkAccess = async (programId: string) => {
        return mutateAccess();
    };

    /**
     * Get the active payment for a program
     */
    const getActivePayment = async (programId: string) => {
        return mutateActivePayment();
    };

    /**
     * Get the latest payment for a program regardless of status
     */
    const getLatestPayment = async (programId: string | null) => {
        if (!programId) return null;
        return mutateLatestPayment();
    };

    /**
     * Get all the payments for a program
     */
    const getAllPayments = async (programId: string) => {
        return mutateAllPayments();
    };

    /**
     * Check if a payment status is final
     */
    const isFinalStatus = (status: string) => {
        return ProgramPaymentService.isFinalStatus(status);
    };

    /**
     * Initiate a direct payment for a program
     */
    const initiateDirectPayment = async (
        programId: string,
        phoneNumber: string,
        amount: number = 2500,
        promoCodeId?: string,
        isInstallment: boolean = false,
        totalInstallments: number = 1,
        currentInstallment: number = 1,
        nextInstallmentDate?: Date
    ) => {
        setLoading(true);
        setChargeError(null);
        setAuthorizationUrl(null);

        try {
            const result = await ProgramPaymentService.initiateDirectPayment(
                programId,
                phoneNumber,
                amount,
                promoCodeId,
                isInstallment,
                totalInstallments,
                currentInstallment,
                nextInstallmentDate
            );

            // @ts-ignore
            const pay = result.payment ? result.payment : result;
            // Store the payment
            setPayment(pay);

            // Set up subscription to payment status changes
            ProgramPaymentService.subscribeToPaymentStatus(
                pay.id,
                async (status, payment) => {
                    setPayment(payment);
                    setPaymentStatus(status);

                    // Mutate all relevant SWR caches when payment status changes
                    programPaymentKeys.mutateAllForProgram(programId);

                    // Mutate program context by refreshing all payment-related data
                    await mutateLatestPayment();
                    await mutateActivePayment();
                    await mutateAllPayments();
                    await mutateAccess();
                }
            );

            // Store the authorization URL for fallback
            // @ts-ignore
            if (result.needsFallback && result.authorizationUrl) {
                setAuthorizationUrl(pay.authorizationUrl);
            }

            // Mutate all relevant SWR caches after initiating payment
            programPaymentKeys.mutateAllForProgram(programId);

            return result;
        } catch (error) {
            console.error("Error in direct program payment:", error);
            setChargeError(
                error instanceof Error ? error.message : "Payment failed"
            );
            throw error;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Cancel a payment
     */
    const cancelPayment = async () => {
        if (payment) {
            try {
                await ProgramPaymentService.cancelPayment(
                    payment.id,
                    payment.payment_reference
                );
                setAuthorizationUrl(null);
                setChargeError(null);
                setPaymentStatus("canceled");

                // Mutate all relevant SWR caches after canceling payment
                if (programId) {
                    programPaymentKeys.mutateAllForProgram(programId);

                    // Mutate program context by refreshing all payment-related data
                    await mutateLatestPayment();
                    await mutateActivePayment();
                    await mutateAllPayments();
                    await mutateAccess();
                }
            } catch (error) {
                console.error("Error cancelling program payment:", error);
            }
        } else {
            console.warn("No active payment to cancel");
        }
    };

    /**
     * Verify the status of a payment
     */
    const verifyPaymentStatus = async (reference: string) => {
        if (!reference) return;

        try {
            const result = await ProgramPaymentService.verifyPaymentStatus(
                reference,
                payment?.id
            );

            // Update UI with the status from NotchPay
            if (result?.transaction?.status) {
                // Map NotchPay status to our status format if needed
                let displayStatus = result.transaction.status;
                if (displayStatus === "complete") {
                    displayStatus = "completed";

                    // mutate the program_data
                    programKeys.mutateProgram(String(pdId))
                }

                // Update the payment status in the UI
                setPaymentStatus(displayStatus);

                // If we have a payment and a program ID, update the program context
                if (payment && programId) {
                    // Always mutate the latest payment to get the most recent status
                    await mutateLatestPayment();

                    // If the status is terminal (complete/failed/canceled), do a full context update
                    if (ProgramPaymentService.isFinalStatus(displayStatus) ||
                        result.transaction.status === "complete") {

                        // For completed payments, also check access
                        if (displayStatus === "completed" || result.transaction.status === "complete") {
                            await checkAccess(payment.program_id);
                        }

                        // Mutate all relevant SWR caches
                        programPaymentKeys.mutateAllForProgram(payment.program_id);

                        // Mutate program context by refreshing all payment-related data
                        await mutateActivePayment();
                        await mutateAllPayments();
                        await mutateAccess();
                    }
                }
            }

            return result;
        } catch (error) {
            console.error("Error verifying program payment status:", error);
        }
    };

    /**
     * Open the authorization URL for payment
     */
    const openAuthorizationUrl = async (url: string) => {
        setAuthorizationUrl(url);
        // The actual opening of the URL will be handled in the component
    };

    return {
        paymentStatus,
        loading,
        payment,
        latestPayment,
        latestPaymentLoading,
        authorizationUrl,
        chargeError,
        hasAccess,
        accessLoading,
        allPayments,
        activePayment,
        programId,
        checkAccess,
        getActivePayment,
        getLatestPayment,
        getAllPayments,
        isFinalStatus,
        initiateDirectPayment,
        cancelPayment,
        verifyPaymentStatus,
        openAuthorizationUrl,
        // Expose mutation functions for direct use in components
        mutateLatestPayment,
        mutateActivePayment,
        mutateAllPayments,
        mutateAccess
    };
};