import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SUPPORT_EMAIL } from "@/lib/constants";

/**
 * A mailto: link, not a submitted form — no backend or third-party capture service (Formspree,
 * Mailchimp, a new api/ endpoint...) has been chosen yet. Swap this for a real form once one is.
 */
export function WaitlistCta({ className }: { className?: string }) {
  return (
    <Button asChild size="lg" className={className}>
      <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Liste d'attente Elikia Fund")}`}>
        <Mail /> Être prévenu du lancement
      </a>
    </Button>
  );
}
