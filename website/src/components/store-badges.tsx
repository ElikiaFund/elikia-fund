import Image from "next/image";
import Link from "next/link";

/**
 * The real official badge artwork — public/badges/app-store.svg is Apple's own file from
 * developer.apple.com/app-store/marketing/guidelines/images/badge-download-on-the-app-store.svg;
 * public/badges/google-play.svg is Google's official badge (Wikimedia Commons mirror, sourced
 * from developer.android.com, marked public domain with a trademark notice). The app isn't
 * published on either store yet (eas.json's submit config is empty, no store URLs exist anywhere
 * in the codebase), so these still link to the on-page waitlist section rather than a dead/fake
 * store URL — swap the href for the real listing URLs once the app is actually published.
 */
export function StoreBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Link href="#disponibilite" aria-label="L'application arrive bientôt sur l'App Store">
        <Image src="/badges/app-store.svg" alt="" width={120} height={40} className="h-11 w-auto" />
      </Link>
      <Link href="#disponibilite" aria-label="L'application arrive bientôt sur Google Play">
        <Image src="/badges/google-play.svg" alt="" width={180} height={53} className="h-11 w-auto" />
      </Link>
    </div>
  );
}
