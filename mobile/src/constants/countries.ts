export type Country = {
  iso2: string;
  name: string;
  dialCode: string;
  flag: string;
  /** Expected digit count of the national number, dial code excluded. */
  localLength: number;
  /** Digit group sizes used to format the number as the user types (must sum to localLength). */
  groups: number[];
  placeholder: string;
};

// CEMAC (Central Africa) + France — the only markets Elikia Fund and its payment provider
// (Yabeto Pay, Congo-Brazzaville only for now — see yabeto.md §4) currently support.
export const COUNTRIES: Country[] = [
  { iso2: 'CG', name: 'Congo-Brazzaville', dialCode: '+242', flag: '🇨🇬', localLength: 9, groups: [2, 3, 2, 2], placeholder: '06 123 45 67' },
  { iso2: 'CM', name: 'Cameroun', dialCode: '+237', flag: '🇨🇲', localLength: 9, groups: [1, 2, 2, 2, 2], placeholder: '6 12 34 56 78' },
  { iso2: 'GA', name: 'Gabon', dialCode: '+241', flag: '🇬🇦', localLength: 8, groups: [2, 2, 2, 2], placeholder: '06 12 34 56' },
  { iso2: 'TD', name: 'Tchad', dialCode: '+235', flag: '🇹🇩', localLength: 8, groups: [2, 2, 2, 2], placeholder: '63 12 34 56' },
  { iso2: 'CF', name: 'République centrafricaine', dialCode: '+236', flag: '🇨🇫', localLength: 8, groups: [2, 2, 2, 2], placeholder: '70 12 34 56' },
  { iso2: 'GQ', name: 'Guinée équatoriale', dialCode: '+240', flag: '🇬🇶', localLength: 9, groups: [3, 3, 3], placeholder: '222 123 456' },
  { iso2: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', localLength: 9, groups: [1, 2, 2, 2, 2], placeholder: '6 12 34 56 78' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

/** Strips everything but digits, capped at the country's expected local number length. */
export function sanitizeLocalNumber(raw: string, country: Country): string {
  return raw.replace(/\D/g, '').slice(0, country.localLength);
}

/** Groups digits per the country's format (e.g. "066123456" → "06 612 34 56" for Congo). */
export function formatLocalNumber(raw: string, country: Country): string {
  const digits = sanitizeLocalNumber(raw, country);
  const parts: string[] = [];
  let cursor = 0;

  for (const size of country.groups) {
    if (cursor >= digits.length) {
      break;
    }
    parts.push(digits.slice(cursor, cursor + size));
    cursor += size;
  }

  return parts.join(' ');
}

/** E.164-ish number sent to the API: dial code + raw digits, no spaces. */
export function toE164(raw: string, country: Country): string {
  return `${country.dialCode}${sanitizeLocalNumber(raw, country)}`;
}
