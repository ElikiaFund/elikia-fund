import { SITE_NAME, SITE_URL, SUPPORT_EMAIL } from "@/lib/constants";

/**
 * Organization schema only — not SoftwareApplication, which conventionally expects an
 * aggregateRating/offers/store URL that don't honestly exist yet (the app isn't published).
 * Add SoftwareApplication once it actually is.
 */
export function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
    contactPoint: {
      "@type": "ContactPoint",
      email: SUPPORT_EMAIL,
      contactType: "customer support",
      areaServed: "CG",
      availableLanguage: "French",
    },
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
