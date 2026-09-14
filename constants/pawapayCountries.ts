/**
 * Countries PawaPay actually supports for mobile-money deposits (Central +
 * West + East + Southern Africa), with their ISO 4217 currency. Curated from
 * https://docs.pawapay.io/v2/docs/providers -- used as an offline-safe
 * default/fallback, refined at runtime by the live /v2/active-conf list
 * (see services/pawapaySupportedCountries.service.ts) so the picker tracks
 * whatever PawaPay actually has enabled without an app update.
 *
 * `name` must match a `Country.name` in components/ui/CountryPickerBottomSheet.tsx
 * exactly -- that's how the two lists are joined.
 */
export interface PawaPaySupportedCountry {
  name: string;
  /** ISO 3166-1 alpha-3, matches PawaPay's active-conf `country` field. */
  alpha3: string;
  /** ISO 4217 currency code. */
  currency: string;
}

export const PAWAPAY_SUPPORTED_COUNTRIES: PawaPaySupportedCountry[] = [
  { name: 'Bénin', alpha3: 'BEN', currency: 'XOF' },
  { name: 'Burkina Faso', alpha3: 'BFA', currency: 'XOF' },
  { name: 'Cameroun', alpha3: 'CMR', currency: 'XAF' },
  { name: "Côte d'Ivoire", alpha3: 'CIV', currency: 'XOF' },
  { name: 'Congo (RDC)', alpha3: 'COD', currency: 'CDF' },
  { name: 'Éthiopie', alpha3: 'ETH', currency: 'ETB' },
  { name: 'Gabon', alpha3: 'GAB', currency: 'XAF' },
  { name: 'Ghana', alpha3: 'GHA', currency: 'GHS' },
  { name: 'Kenya', alpha3: 'KEN', currency: 'KES' },
  { name: 'Lesotho', alpha3: 'LSO', currency: 'LSL' },
  { name: 'Malawi', alpha3: 'MWI', currency: 'MWK' },
  { name: 'Mozambique', alpha3: 'MOZ', currency: 'MZN' },
  { name: 'Nigéria', alpha3: 'NGA', currency: 'NGN' },
  { name: 'Congo (Brazzaville)', alpha3: 'COG', currency: 'XAF' },
  { name: 'Rwanda', alpha3: 'RWA', currency: 'RWF' },
  { name: 'Sénégal', alpha3: 'SEN', currency: 'XOF' },
  { name: 'Sierra Leone', alpha3: 'SLE', currency: 'SLE' },
  { name: 'Tanzanie', alpha3: 'TZA', currency: 'TZS' },
  { name: 'Ouganda', alpha3: 'UGA', currency: 'UGX' },
  { name: 'Zambie', alpha3: 'ZMB', currency: 'ZMW' },
];

export function isPawaPaySupportedCountryName(name?: string | null): boolean {
  if (!name) return false;
  const q = name.trim().toLowerCase();
  return PAWAPAY_SUPPORTED_COUNTRIES.some((c) => c.name.toLowerCase() === q);
}

/** Currency for a country name, defaulting to XAF (the price base currency) when unknown. */
export function currencyForCountryName(name?: string | null): string {
  if (!name) return 'XAF';
  const q = name.trim().toLowerCase();
  return PAWAPAY_SUPPORTED_COUNTRIES.find((c) => c.name.toLowerCase() === q)?.currency ?? 'XAF';
}
