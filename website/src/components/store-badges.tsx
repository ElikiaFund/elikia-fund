import Image from "next/image";
import Link from "next/link";

/**
 * The app isn't published on either store yet (eas.json's submit config is empty, no store URLs
 * exist anywhere in the codebase). These are bespoke visual approximations of the familiar badge
 * style — not Apple's/Google's actual trademarked artwork, which is only distributed via their own
 * brand-resource pages under acceptance of their guidelines and can't be legitimately sourced here.
 * They link to the on-page waitlist section rather than a dead/fake store URL. Swap the images in
 * public/badges/ for the real official assets later if/when the app is actually published.
 */
export function StoreBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Link href="#disponibilite" aria-label="L'application arrive bientôt sur l'App Store">
        <Image src="/badges/app-store.svg" alt="" width={180} height={54} />
      </Link>
      <Link href="#disponibilite" aria-label="L'application arrive bientôt sur Google Play">
        <Image src="/badges/google-play.svg" alt="" width={180} height={54} />
      </Link>
    </div>
  );
}
