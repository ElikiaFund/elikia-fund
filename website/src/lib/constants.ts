// SITE_URL is inferred from mobile/src/lib/pdf.ts's own document-footer reference to
// "elikiafund.com" — the only place a domain is mentioned anywhere in the monorepo. Confirm this
// is the real production domain before relying on it (canonical URLs, sitemap, OG metadata).
export const SITE_URL = "https://elikiafund.com";
export const SITE_NAME = "Elikia Fund";
export const SUPPORT_EMAIL = "support@elikiafund.com";

export const TAGLINE = "Épargnez, suivez vos dépenses et cotisez en tontine, simplement.";

export const META_DESCRIPTION =
  "Elikia Fund est l'application qui aide les entrepreneurs informels du Congo-Brazzaville à suivre leur trésorerie, épargner et cotiser en tontine, et à construire, avec le temps, une véritable identité financière.";

export const COUNTRY_NOTE = "Conçu pour les entrepreneurs du Congo-Brazzaville.";

export const TONTINE_FEE_PERCENT = "4,5";

export const VAULT_DEPOSIT_FEE_PERCENT = "4";
export const VAULT_DEPOSIT_FEE_FIXED_FCFA = 100;
export const VAULT_WITHDRAWAL_FEE_PERCENT = "2";

// Verified accounts (Yabetoo Connect): Yabetoo bills its collection fee plus a Connect surcharge
// and a fixed fee directly to the merchant, on top of Elikia's unchanged share — mirrors the
// API's FeeService defaults (deposit 3,5 % + 1 % + 25 FCFA Yabetoo + 0,5 % + 75 FCFA Elikia;
// contribution 3,5 % + 1 % + 25 FCFA Yabetoo + 1 % Elikia). Withdrawals are free.
export const VERIFIED_DEPOSIT_FEE_PERCENT = "5";
export const VERIFIED_DEPOSIT_FEE_FIXED_FCFA = 100;
export const VERIFIED_TONTINE_FEE_PERCENT = "5,5";
export const VERIFIED_TONTINE_FEE_FIXED_FCFA = 25;
// Yabetoo's default maturation delay before newly received funds can be withdrawn.
export const FUNDS_MATURATION_DAYS = 7;

// Reviewed and approved by legal counsel. Update LEGAL_LAST_UPDATED whenever the copy changes.
export const LEGAL_LAST_UPDATED = "21 novembre 2026";

