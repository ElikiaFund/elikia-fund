import { VERDICT_CONTENT, type CreditVerdict } from "@/lib/credit-score-content";

/** Matches mobile's 3 verdict states (see (tabs)/index.tsx's VERDICT_LABELS) — a bordered
 * text pill, not a filled badge, mirroring the app's own restrained treatment. */
export function VerdictBadge({ verdict }: { verdict: CreditVerdict }) {
  const { label, colorVar } = VERDICT_CONTENT[verdict];

  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold"
      style={{ color: colorVar, borderColor: colorVar }}
    >
      {label}
    </span>
  );
}
