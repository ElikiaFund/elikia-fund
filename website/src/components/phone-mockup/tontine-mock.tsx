import { Users } from "lucide-react";

const MEMBERS = [
  { name: "Aïcha M.", status: "À jour", paid: true },
  { name: "Bruno K.", status: "À jour", paid: true },
  { name: "Chantal L.", status: "En attente", paid: false },
];

export function TontineMock() {
  return (
    <div className="flex h-full flex-col gap-4 bg-background p-4 pt-8">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users className="size-4" />
        </div>
        <div>
          <p className="text-xs font-bold">Tontine du marché</p>
          <p className="text-[10px] text-muted-foreground">Cycle de juillet · mensuel</p>
        </div>
      </div>

      <div className="rounded-xl bg-card p-3">
        <p className="text-[10px] text-muted-foreground">Cagnotte du cycle</p>
        <p className="text-lg font-extrabold tabular-nums">97 000 FCFA</p>
        <p className="text-[9px] text-muted-foreground">Frais de gestion inclus : 3 %</p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-semibold text-muted-foreground">Membres</span>
        {MEMBERS.map((member) => (
          <div key={member.name} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
            <span className="text-xs font-medium">{member.name}</span>
            <span className={`text-[10px] font-semibold ${member.paid ? "text-income" : "text-muted-foreground"}`}>
              {member.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
