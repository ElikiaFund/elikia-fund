import { ArrowDownCircle, ArrowUpCircle, Car, Store, UtensilsCrossed } from "lucide-react";

const ENTRIES = [
  { icon: Store, label: "Vente", amount: "+ 12 000", positive: true },
  { icon: UtensilsCrossed, label: "Alimentation", amount: "− 3 500", positive: false },
  { icon: Car, label: "Transport", amount: "− 1 000", positive: false },
];

export function CashflowMock() {
  return (
    <div className="flex h-full flex-col gap-4 bg-background p-4 pt-8">
      <div>
        <p className="text-[10px] text-muted-foreground">Solde net</p>
        <p className="text-2xl font-extrabold tabular-nums">245 000 FCFA</p>
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-card p-3">
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <ArrowUpCircle className="size-3 text-income" /> Revenus
          </div>
          <span className="text-xs font-bold text-income">62 000 FCFA</span>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <ArrowDownCircle className="size-3 text-danger" /> Dépenses
          </div>
          <span className="text-xs font-bold text-danger">17 000 FCFA</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-semibold text-muted-foreground">Transactions récentes</span>
        {ENTRIES.map((entry) => (
          <div key={entry.label} className="flex items-center gap-2 border-b border-border pb-2 last:border-0">
            <div className="flex size-7 items-center justify-center rounded-lg bg-card">
              <entry.icon className="size-3.5 text-muted-foreground" />
            </div>
            <span className="flex-1 text-xs font-medium">{entry.label}</span>
            <span className={`text-xs font-bold ${entry.positive ? "text-income" : "text-danger"}`}>{entry.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
