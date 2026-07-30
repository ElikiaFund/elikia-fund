import { Lock } from "lucide-react";

const KEYPAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export function VaultMock() {
  return (
    <div className="flex h-full flex-col items-center gap-5 bg-background p-4 pt-10">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Lock className="size-5" />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold">Coffre</p>
        <p className="text-[10px] text-muted-foreground">Entrez votre code PIN</p>
      </div>

      <div className="flex gap-2">
        {[0, 1, 2, 3].map((dot) => (
          <span key={dot} className={`size-2.5 rounded-full ${dot < 2 ? "bg-primary" : "bg-border"}`} />
        ))}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2.5">
        {KEYPAD.map((key, index) => (
          <div
            key={index}
            className="flex size-8 items-center justify-center rounded-full bg-card text-xs font-semibold text-foreground"
          >
            {key}
          </div>
        ))}
      </div>
    </div>
  );
}
