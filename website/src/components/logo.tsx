import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Text-only wordmark ("Elikia" in accent color, " Fund" in the default ink) — the split-color
 * treatment already established in mobile/src/components/wordmark.tsx. No icon mark alongside it
 * (the lightning-bolt logomark is used only as the browser favicon, not in visible page content).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("text-lg font-extrabold tracking-tight", className)}>
      <span className="text-primary">Elikia</span> Fund
    </Link>
  );
}
