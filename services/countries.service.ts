// services/countries.service.ts
// Liste des pays (table public.countries) pour le champ "pays de résidence".

import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

export type CountryOption = {
  id: string;
  name: string;
  code: string | null;
};

/**
 * Convertit un code ISO alpha-2 en emoji drapeau (indicateurs régionaux Unicode).
 * 'XX' (entrée générique "Autre") n'a pas de drapeau valide : on retourne un globe.
 */
export function countryFlagEmoji(code: string | null): string {
  if (!code || code.length !== 2 || code.toUpperCase() === 'XX') return '🌍';
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export async function getCountries(): Promise<CountryOption[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('countries')
      .select('id, name, code')
      .order('name');

    if (error) throw error;
    return data ?? [];
  } catch (err) {
    logger.error('getCountries error:', err);
    return [];
  }
}
