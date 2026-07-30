import { SECTORS } from "@/lib/sectors";

export function SectorGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {SECTORS.map((sector) => (
        <div
          key={sector.value}
          className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-3 py-5 text-center"
        >
          <sector.icon className="size-5 text-primary" />
          <span className="text-sm font-medium">{sector.label}</span>
        </div>
      ))}
    </div>
  );
}
