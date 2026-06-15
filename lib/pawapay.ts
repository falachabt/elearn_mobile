import axios from "axios";

import { logger } from "@/utils/logger";

/**
 * PawaPay client (mobile side).
 * The PawaPay secret token lives ONLY on the backoffice server — the app never
 * talks to PawaPay directly. We call our own backoffice endpoints instead.
 */
const API_BASE = "https://staff.elearnprepa.com/api/payments/pawapay";

export interface PawaPayDepositParams {
  depositId: string;
  phoneNumber: string;
  amount: number;
  customerMessage?: string;
}

export interface PawaPayDepositResult {
  ok: boolean;
  status?: "accepted" | "rejected";
  depositId?: string;
  provider?: string;
  failureReason?: { failureCode?: string; failureMessage?: string } | unknown;
  error?: string;
}

export interface PawaPayStatusResult {
  status: "completed" | "failed" | "pending";
  found: boolean;
  pawapayStatus: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
}

/**
 * Map a PawaPay deposit failureCode (or initiation rejection code) to a clear
 * French message shown to the user. Codes come from PawaPay v2 docs.
 * See https://docs.pawapay.io/v2/api-reference/deposits/check-deposit-status
 */
const PAWAPAY_FAILURE_MESSAGES: Record<string, string> = {
  // Deposit failures (async, via status/callback)
  INSUFFICIENT_BALANCE:
    "Solde insuffisant sur votre compte Mobile Money. Rechargez votre compte puis réessayez.",
  PAYMENT_NOT_APPROVED:
    "Paiement non validé. Réessayez et confirmez avec votre code PIN Mobile Money.",
  PAYER_NOT_FOUND:
    "Ce numéro n'a pas de compte Mobile Money actif chez cet opérateur. Vérifiez le numéro.",
  PAYER_LIMIT_REACHED:
    "Vous avez atteint votre limite de transactions Mobile Money. Réessayez plus tard.",
  WALLET_LIMIT_REACHED:
    "La limite de votre portefeuille Mobile Money est atteinte. Réessayez plus tard.",
  PAYMENT_IN_PROGRESS:
    "Un autre paiement est déjà en cours sur ce numéro. Patientez un instant puis réessayez.",
  UNSPECIFIED_FAILURE:
    "Le paiement a échoué côté opérateur. Veuillez réessayer.",
  UNKNOWN_ERROR:
    "Une erreur est survenue lors du paiement. Veuillez réessayer.",
  // Initiation rejections (validation / config)
  AMOUNT_OUT_OF_BOUNDS:
    "Le montant n'est pas autorisé pour ce paiement.",
  INVALID_PAYER_FORMAT:
    "Numéro de téléphone invalide. Vérifiez le format.",
  DEPOSITS_NOT_ALLOWED:
    "Le service de paiement est temporairement indisponible. Contactez le support.",
  AUTHENTICATION_ERROR:
    "Le service de paiement est temporairement indisponible. Contactez le support.",
  AUTHORISATION_ERROR:
    "Le service de paiement est temporairement indisponible. Contactez le support.",
};

const PAWAPAY_FAILURE_FALLBACK =
  "Le paiement a échoué ou a été refusé. Veuillez réessayer.";

/**
 * Returns a user-facing French message for a PawaPay failure/rejection code.
 * Falls back to a generic message for unknown codes.
 */
export function pawapayFailureMessage(code?: string | null): string {
  if (!code) return PAWAPAY_FAILURE_FALLBACK;
  return PAWAPAY_FAILURE_MESSAGES[code] ?? PAWAPAY_FAILURE_FALLBACK;
}

export const PawaPayService = {
  /**
   * Ask the backoffice to initiate a mobile-money deposit.
   * A pending payment row for this depositId must already exist (server enforces it).
   */
  async initiateDeposit(params: PawaPayDepositParams): Promise<PawaPayDepositResult> {
    try {
      const { data } = await axios.post(`${API_BASE}/deposit`, params, { timeout: 30000 });
      return data as PawaPayDepositResult;
    } catch (error) {
      const axErr = axios.isAxiosError(error) ? error.response?.data : null;
      logger.error("[PawaPay] initiateDeposit error:", axErr || (error as Error)?.message);
      return {
        ok: false,
        error: (axErr as { error?: string })?.error || "Erreur réseau lors du paiement",
      };
    }
  },

  /**
   * Poll the backoffice for the deposit status. The server syncs our DB on final statuses.
   */
  async checkStatus(depositId: string): Promise<PawaPayStatusResult> {
    try {
      const { data } = await axios.get(`${API_BASE}/status/${depositId}`, { timeout: 20000 });
      return data as PawaPayStatusResult;
    } catch (error) {
      const axErr = axios.isAxiosError(error) ? error.response?.data : null;
      logger.error("[PawaPay] checkStatus error:", axErr || (error as Error)?.message);
      return { status: "pending", found: false, pawapayStatus: null };
    }
  },
};
