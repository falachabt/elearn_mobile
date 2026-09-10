// services/currency.service.ts
// Affichage des prix (FCFA -> devise du pays de l'utilisateur). Couche
// d'affichage uniquement : le montant réellement débité via PawaPay reste
// toujours en XAF, voir services/secondary/secondary-payment.service.ts.

import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

export type ExchangeRate = {
  currency_code: string;
  units_per_xaf: number;
};

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export async function getExchangeRates(): Promise<ExchangeRate[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('exchange_rates')
      .select('currency_code, units_per_xaf, updated_at');

    if (error) throw error;

    const rows = (data ?? []) as (ExchangeRate & { updated_at: string })[];

    // Refresh is lazy/on-demand: if the oldest rate is stale, kick off a
    // refresh in the background (fire-and-forget) for next time -- never
    // block the current price display on it.
    const oldest = rows.reduce<string | null>((min, row) => {
      if (!row.updated_at) return min;
      return !min || row.updated_at < min ? row.updated_at : min;
    }, null);

    if (!oldest || Date.now() - new Date(oldest).getTime() > STALE_AFTER_MS) {
      supabase.functions.invoke('refresh-exchange-rates', { method: 'POST' }).catch((err) => {
        logger.warn('[currency] refresh-exchange-rates invoke failed (non-blocking):', err);
      });
    }

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
