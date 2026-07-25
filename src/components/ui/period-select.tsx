import { useProjectPeriods, type ProjectPeriod } from "@/hooks/useProjectPeriods";
import { cn } from "@/lib/utils";

interface Props {
  projectId: string;
  /** Selected period's period_order (as string) — undefined = none */
  value?: string;
  onChange: (period: ProjectPeriod | null) => void;
  className?: string;
  placeholder?: string;
  /** When true, only show periods that already have actual_progress filled (for editing). */
  filledOnly?: boolean;
}

const fmt = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" });

/**
 * Dropdown that only offers weekly periods defined in the project's S-Curve baseline.
 * This is the ONLY way to pick a week anywhere in Data Entry — no free calendar.
 */
export function PeriodSelect({ projectId, value, onChange, className, placeholder = "— Pilih Periode —", filledOnly }: Props) {
  const { periods, isLoading } = useProjectPeriods(projectId);
  const list = filledOnly ? periods.filter(p => p.actual_progress != null) : periods;

  if (isLoading) {
    return <div className={cn("text-[10px] text-muted-foreground italic", className)}>Loading periode…</div>;
  }
  if (periods.length === 0) {
    return (
      <div className={cn("text-[10px] text-warning italic", className)}>
        ⚠️ Belum ada periode di S-Curve. Buat dulu di tab <b>S-Curve</b>.
      </div>
    );
  }
  return (
    <select
      value={value ?? ""}
      onChange={(e) => {
        const p = list.find((pp) => String(pp.period_order) === e.target.value) ?? null;
        onChange(p);
      }}
      className={cn(
        "w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary",
        className
      )}
    >
      <option value="">{placeholder}</option>
      {list.map((p) => (
        <option key={p.id} value={p.period_order}>
          {p.period_label} · {fmt(p.period_start)} → {fmt(p.period_end)}
          {p.actual_progress != null ? `  ✓ actual ${p.actual_progress}%` : "  (belum diisi)"}
        </option>
      ))}
    </select>
  );
}
