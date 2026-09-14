// services/pawapaySupportedCountries.service.ts
// Live-refines PAWAPAY_SUPPORTED_COUNTRIES (constants/pawapayCountries.ts)
// against PawaPay's actual active configuration, so the payment country
// picker tracks whatever PawaPay has enabled without an app update. The
// static list stays the source of truth for phone regex/flag/placeholder
// (PawaPay's API doesn't provide those) and the offline-safe fallback.

import axios from 'axios';
import { logger } from '@/utils/logger';
import { isSandboxPawaPay } from '@/lib/pawapay';
import { PAWAPAY_SUPPORTED_COUNTRIES } from '@/constants/pawapayCountries';

const API_BASE = 'https://staff.elearnprepa.com/api/payments/pawapay';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h, mirrors the backoffice's own cache

let cachedAlpha3: Set<string> | null = null;
let cachedAt = 0;

/**
 * Names (matching PAWAPAY_SUPPORTED_COUNTRIES[].name) that are both in our
 * curated static list AND currently live on PawaPay -- the intersection is
 * what the picker should actually show. Never throws: falls back to the
 * full static list on any network/parse failure.
 */
export async function getLiveSupportedCountryNames(): Promise<string[]> {
  const staticNames = PAWAPAY_SUPPORTED_COUNTRIES.map((c) => c.name);

  if (cachedAlpha3 && Date.now() - cachedAt < CACHE_TTL_MS) {
    return PAWAPAY_SUPPORTED_COUNTRIES.filter((c) => cachedAlpha3!.has(c.alpha3)).map((c) => c.name);
  }

  try {
    const { data } = await axios.get(`${API_BASE}/countries`, {
      params: { sandbox: isSandboxPawaPay() },
      timeout: 8000,
    });
    const alpha3s: string[] = (data?.countries || []).map((c: { alpha3: string }) => c.alpha3);
    if (!alpha3s.length) return staticNames;

    cachedAlpha3 = new Set(alpha3s);
    cachedAt = Date.now();
    return PAWAPAY_SUPPORTED_COUNTRIES.filter((c) => cachedAlpha3!.has(c.alpha3)).map((c) => c.name);
  } catch (err) {
    logger.warn('[PawaPay] live countries fetch failed, using static list:', err);
    return staticNames;
  }
}
