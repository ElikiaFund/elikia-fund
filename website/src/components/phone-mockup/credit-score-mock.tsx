import { CreditScoreGauge } from "@/components/credit-score-gauge";
import { VerdictBadge } from "@/components/verdict-badge";

export function CreditScoreMock() {
  return (
    <div className="flex h-full flex-col items-center gap-4 bg-background p-4 pt-10 text-center">
      <p className="text-xs font-bold">Score de crédit</p>
      <CreditScoreGauge score={78} />
      <VerdictBadge verdict="eligible" />
      <p className="px-2 text-[9px] text-muted-foreground">
        Basé sur votre ancienneté, votre épargne et votre participation aux tontines.
      </p>
    </div>
  );
}
