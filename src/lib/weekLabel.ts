/**
 * Standar penulisan periode mingguan untuk SELURUH aplikasi.
 * Format resmi: "W21 — (20 Jul 26 → 26 Jul 26)"
 * Format pendek (sumbu grafik / tabel sempit): "W21"
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function fmtWeekDate(iso?: string | null): string {
  if (!iso) return "—";
  const dt = new Date(String(iso).length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(dt.getTime())) return "—";
  return `${String(dt.getDate()).padStart(2, "0")} ${MONTHS[dt.getMonth()]} ${String(dt.getFullYear()).slice(-2)}`;
}

/** Normalisasi label mingguan apa pun ("w3", "Week 3", "W03") menjadi "W3". */
export function weekShort(label?: string | null, order?: number): string {
  const raw = (label ?? "").trim();
  const m = raw.match(/(\d+)/);
  if (m) return `W${parseInt(m[1], 10)}`;
  if (raw) return raw;
  return order != null ? `W${order + 1}` : "—";
}

/** Label lengkap standar: "W21 — (20 Jul 26 → 26 Jul 26)" */
export function weekFull(label?: string | null, start?: string | null, end?: string | null, order?: number): string {
  const short = weekShort(label, order);
  if (!start && !end) return short;
  return `${short} — (${fmtWeekDate(start)} → ${fmtWeekDate(end)})`;
}

type PeriodLike = {
  period_label?: string | null;
  period_order?: number | null;
  period_start?: string | null;
  period_end?: string | null;
  label?: string | null;
  order?: number | null;
  start?: string | null;
  end?: string | null;
};

export function weekFullOf(p?: PeriodLike | null): string {
  if (!p) return "—";
  return weekFull(
    p.period_label ?? p.label,
    p.period_start ?? p.start,
    p.period_end ?? p.end,
    (p.period_order ?? p.order) ?? undefined,
  );
}

export function weekShortOf(p?: PeriodLike | null): string {
  if (!p) return "—";
  return weekShort(p.period_label ?? p.label, (p.period_order ?? p.order) ?? undefined);
}
