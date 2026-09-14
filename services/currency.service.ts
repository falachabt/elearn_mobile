// services/currency.service.ts
// Affichage des prix (FCFA -> devise du pays de l'utilisateur) ET conversion
// du montant réellement débité via PawaPay (voir getPawaPayCharge ci-dessous).
// PawaPay n'accepte QUE la devise locale de chaque pays (XOF pour le Bénin,
// GHS pour le Ghana, etc.) -- jamais XAF en dehors de la zone CEMAC -- donc
// forcer XAF partout fait échouer tous les dépôts hors Cameroun/Congo-Brazzaville.

import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

export type ExchangeRate = {
  currency_code: string;
  units_per_xaf: number;
};

export async function getExchangeRates(): Promise<ExchangeRate[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('exchange_rates')
      .select('currency_code, units_per_xaf, updated_at');

    if (error) throw error;

    const rows = (data ?? []) as (ExchangeRate & { updated_at: string })[];

    // Refresh is lazy/on-demand, fire-and-forget -- never block the current
    // price display on it. The edge function does its own per-currency
    // staleness/missing check server-side and returns fast (DB-only, no
    // external API call) when there's nothing to do, so it's cheap to call
    // every time rather than duplicating that check here against only the
    // currencies that happen to already have a row (which used to miss any
    // currency that was never fetched at all, e.g. a newly added one).
    supabase.functions.invoke('refresh-exchange-rates', { method: 'POST' }).catch((err) => {
      logger.warn('[currency] refresh-exchange-rates invoke failed (non-blocking):', err);
    });

    return rows.map(({ currency_code, units_per_xaf }) => ({ currency_code, units_per_xaf }));
  } catch (err) {
    logger.error('[currency] getExchangeRates error:', err);
    return [];
  }
}

export async function getCountryCurrency(countryId: string | null | undefined): Promise<string> {
  if (!countryId) return 'XAF';
  try {
    const { data, error } = await (supabase as any)
      .from('countries')
      .select('currency_code')
      .eq('id', countryId)
      .single();

    if (error) throw error;
    return data?.currency_code || 'XAF';
  } catch (err) {
    logger.error('[currency] getCountryCurrency error:', err);
    return 'XAF';
  }
}

/** priceXaf converti dans currencyCode via la table exchange_rates. */
export function convertXafToLocal(
  priceXaf: number,
  currencyCode: string,
  rates: ExchangeRate[]
): number {
  if (currencyCode === 'XAF') return priceXaf;
  const rate = rates.find((r) => r.currency_code === currencyCode);
  if (!rate) return priceXaf; // pas de taux connu -> on retombe sur XAF
  return Math.round(priceXaf * rate.units_per_xaf);
}

const CURRENCY_LOCALE: Record<string, string> = {
  XAF: 'fr-CM',
  XOF: 'fr-SN',
  EUR: 'fr-FR',
  USD: 'en-US',
  GBP: 'en-GB',
  CDF: 'fr-CD',
  ETB: 'en-ET',
  GHS: 'en-GH',
  KES: 'en-KE',
  LSL: 'en-LS',
  MWK: 'en-MW',
  MZN: 'pt-MZ',
  NGN: 'en-NG',
  RWF: 'fr-RW',
  SLE: 'en-SL',
  TZS: 'en-TZ',
  UGX: 'en-UG',
  ZMW: 'en-ZM',
};

export function formatLocalPrice(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE[currencyCode] || 'en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currencyCode}`;
  }
}

/**
 * Single source of truth for "price to show on a payment screen" -- used by
 * every payment form so a country change always shows a price, not a silent
 * fallback. Shows only the converted price in the customer's own currency,
 * never an "(N FCFA)" reference alongside it -- falls back to the plain FCFA
 * amount only when there's truly no rate yet for that currency.
 */
export function formatPriceWithConversion(
  amountXaf: number,
  currencyCode: string,
  rates: ExchangeRate[]
): string {
  const hasRate = currencyCode === 'XAF' || rates.some((r) => r.currency_code === currencyCode);
  if (!hasRate) return `${amountXaf} FCFA`;

  const local = convertXafToLocal(amountXaf, currencyCode, rates);
  return formatLocalPrice(local, currencyCode);
}

/**
 * The actual amount+currency to send to PawaPay for a deposit, given the
 * program price in XAF and the country the customer picked. PawaPay only
 * accepts a provider's own local currency (never XAF outside Cameroon/Congo-
 * Brazzaville) -- sending XAF for e.g. a Bénin/Ghana/Kenya deposit gets
 * rejected by PawaPay every time. Returns null when a non-XAF currency has
 * no known rate yet, rather than guessing a wrong amount from a stale/absent
 * conversion -- callers should show a "réessayez" error in that case.
 */
export function getPawaPayCharge(
  amountXaf: number,
  currencyCode: string,
  rates: ExchangeRate[]
): { amount: number; currency: string } | null {
  if (currencyCode === 'XAF') return { amount: amountXaf, currency: 'XAF' };
  const rate = rates.find((r) => r.currency_code === currencyCode);
  if (!rate) return null;
  return { amount: Math.round(amountXaf * rate.units_per_xaf), currency: currencyCode };
}
