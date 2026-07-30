import type { ReactNode } from "react";

/**
 * A plain illustrated phone shell — no real app screenshots exist anywhere in the codebase yet,
 * so every screen inside is a static recreation of real UI patterns (balance card, verdict badge,
 * category icons...), not a photograph or a fabricated screenshot.
 */
export function PhoneFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex w-[240px] shrink-0 snap-center flex-col items-center gap-4">
      <div className="relative w-full rounded-[2.25rem] border-[6px] border-foreground/90 bg-foreground/90 p-1.5 shadow-xl">
        <div className="absolute top-2 left-1/2 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-foreground/90" />
        <div role="img" aria-label={label} className="aspect-[9/19.5] overflow-hidden rounded-[1.75rem] bg-background">
          {children}
        </div>
      </div>
      <span className="text-sm font-semibold text-muted-foreground">{label}</span>
    </div>
  );
}
