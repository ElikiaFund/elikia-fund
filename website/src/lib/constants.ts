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

export const TONTINE_FEE_PERCENT = 3;

// No privacy policy or terms of service exists anywhere in the codebase before this website —
// these pages are a good-faith first draft grounded in the app's actual data practices, not legal
// advice. Update LEGAL_LAST_UPDATED whenever the copy changes.
export const LEGAL_LAST_UPDATED = "29 juillet 2026";
export const LEGAL_DISCLAIMER =
  "Ce document a été rédigé de bonne foi par l'équipe technique, à partir des données réellement traitées par l'application. Il ne constitue pas un avis juridique et gagnerait à être revu par un professionnel du droit avant sa mise en production définitive.";

