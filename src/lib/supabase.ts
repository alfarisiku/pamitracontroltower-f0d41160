export { supabase } from "@/integrations/supabase/client";

/**
 * Resolve an image URL, converting Google Drive share links into
 * direct-view URLs that can be rendered inside <img> tags.
 * Accepts formats:
 *   https://drive.google.com/file/d/{ID}/view
 *   https://drive.google.com/open?id={ID}
 *   https://drive.google.com/uc?id={ID}
 * Falls back to returning the input unchanged.
 */
export function resolveImageUrl(url?: string | null): string {
  if (!url) return "";
  const u = url.trim();
  if (u.includes("drive.google.com")) {
    const m =
      u.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      u.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1600`;
  }
  return u;
}

export type DbProject = {
  id: string;
  project_code: string;
  name: string;
  client: string;
  status: string; // planning | execution | on-hold | completed | closed (+ legacy on-track/at-risk/delayed)
  phase: string;  // Production I | II | III | IV (+ legacy Engineering/Procurement/Construction/Commissioning)
  progress: number;
  budget: number;
  spent: number;
  rap: number;
  contract_value: number;
  profit_margin_target: number;
  margin_locked: boolean;
  tkdn_percentage: number;
  start_date: string;
  end_date: string;
  manager: string;
  location: string;
  map_x: number;
  map_y: number;
  image_url: string | null;
  video_url: string | null;
  cctv_url: string | null;
  description: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
};

/** Centralized status/phase metadata (supports both new & legacy strings for backward compat) */
export const STATUS_META: Record<string, { label: string; className: string; color: string }> = {
  // NEW canonical
  "planning":  { label: "Planning",  className: "bg-info/15 text-info border-info/30",                        color: "#6366f1" },
  "execution": { label: "Execution", className: "bg-success/15 text-success border-success/30",               color: "#22c55e" },
  "on-hold":   { label: "On Hold",   className: "bg-warning/15 text-warning border-warning/30",               color: "#f59e0b" },
  "completed": { label: "Completed", className: "bg-primary/15 text-primary border-primary/30",               color: "#3b82f6" },
  "closed":    { label: "Closed",    className: "bg-muted text-muted-foreground border-border",               color: "#6b7280" },
  // LEGACY (still handled)
  "on-track":  { label: "On Track",  className: "bg-success/15 text-success border-success/30",               color: "#22c55e" },
  "at-risk":   { label: "At Risk",   className: "bg-warning/15 text-warning border-warning/30",               color: "#eab308" },
  "delayed":   { label: "Delayed",   className: "bg-destructive/15 text-destructive border-destructive/30",   color: "#ef4444" },
};
export const getStatusMeta = (s: string) => STATUS_META[s] ?? { label: s || "—", className: "bg-muted text-muted-foreground border-border", color: "#6b7280" };

export const PROJECT_STATUS_OPTIONS = [
  { value: "planning",  label: "Planning" },
  { value: "execution", label: "Execution" },
  { value: "on-hold",   label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "closed",    label: "Closed" },
];
export const PROJECT_PHASE_OPTIONS = [
  { value: "Production I",   label: "Production I" },
  { value: "Production II",  label: "Production II" },
  { value: "Production III", label: "Production III" },
  { value: "Production IV",  label: "Production IV" },
];

export type DbSCurveData = {
  id: string;
  project_id: string;
  period_label: string;
  period_order: number;
  planned_progress: number;
  actual_progress: number | null;
  curve_type: string;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
};

export type DbAlert = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  severity: "critical" | "high" | "medium" | "low";
  is_resolved: boolean;
  probability: string | null;
  impact: string | null;
  risk_owner: string | null;
  mitigation_plan: string | null;
  category: string;
  due_date: string | null;
  created_at: string;
  resolved_at: string | null;
  priority: string;
  pic: string;
  current_status: string;
  completion_percentage: number;
  closed_at: string | null;
};

export type DbWeeklyReport = {
  id: string;
  project_id: string;
  week_start_date: string;
  week_end_date: string;
  achievements: { category: string; description: string }[];
  outstanding_items: { item: string; note?: string }[];
  next_week_targets: { target: string; owner?: string }[];
  escalations: { issue: string; decision_needed?: string }[];
  summary: string;
  created_at: string;
  updated_at: string;
};

export const EPCC_CATEGORIES = [
  { value: "engineering", label: "Engineering" },
  { value: "procurement", label: "Procurement" },
  { value: "construction", label: "Construction" },
  { value: "commissioning", label: "Commissioning" },
  { value: "hsse", label: "HSSE" },
  { value: "management", label: "Management" },
] as const;

export const RISK_PRIORITIES = ["low","medium","high","critical"] as const;
export const RISK_STATUSES = ["open","in-progress","mitigating","monitoring","closed"] as const;
export const ACHIEVEMENT_CATEGORIES = ["administration","contract","engineering","procurement","hsse","construction","commissioning"] as const;

export type DbMonthlyBudget = {
  id: string;
  month: string;
  year: number;
  planned: number;
  actual: number;
};

export type DbWorkArea = {
  id: string;
  project_id: string;
  name: string;
  code: string;
  weight: number;
  progress: number;
  sort_order: number;
  epcc_category: string;
  created_at: string;
};

export type DbWorkItem = {
  id: string;
  work_area_id: string;
  name: string;
  code: string;
  unit: string;
  qty_total: number;
  qty_completed: number;
  weight: number;
  progress: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
  epcc_category: string;
  created_at: string;
};

export type DbSubTask = {
  id: string;
  work_item_id: string;
  name: string;
  unit: string;
  qty_total: number;
  qty_completed: number;
  progress: number;
  status: string;
  sort_order: number;
  created_at: string;
};

export type DbMilestone = {
  id: string;
  project_id: string;
  name: string;
  phase: string;
  target_date: string;
  actual_date: string | null;
  status: string;
  weight: number;
  sort_order: number;
  created_at: string;
};

export type DbNotification = {
  id: string;
  title: string;
  message: string | null;
  type: string;
  project_id: string | null;
  is_read: boolean;
  created_at: string;
};

export type DbAddendum = {
  id: string;
  project_id: string;
  addendum_code: string;
  description: string;
  scope_change: string;
  cost_impact: number;
  schedule_impact_days: number;
  approval_status: string;
  approved_by: string;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DbProcurementItem = {
  id: string;
  project_id: string;
  item_name: string;
  description: string;
  amount: number;
  unit: string;
  qty: number;
  rfq_date: string | null;
  approval_date: string | null;
  po_date: string | null;
  fabrication_date: string | null;
  delivery_date: string | null;
  install_date: string | null;
  status: string;
  vendor: string;
  created_at: string;
  updated_at: string;
};

export type DbActivityLog = {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  details: string | null;
  project_id: string | null;
  created_at: string;
};

export type DbPurchaseOrder = {
  id: string;
  project_id: string;
  description: string;
  amount: number;
  po_date: string | null;
  vendor: string;
  related_activity: string;
  category: string;
  status: string;
  penalty_amount: number;
  penalty_note: string;
  created_at: string;
  updated_at: string;
};

export type DbManpowerLog = {
  id: string;
  project_id: string;
  log_date: string;
  category: string;
  workers: number;
  hours_per_worker: number;
  description: string;
  created_at: string;
  updated_at: string;
};

export type DbProjectCashflow = {
  id: string;
  project_id: string;
  period_label: string;
  period_order: number;
  cash_in: number;
  cash_out: number;
  planned_progress: number;
  actual_progress: number;
  created_at: string;
};

export type FinanceCategory =
  | "project_management" | "material" | "services" | "mob_demob"
  | "tools_consumables" | "equipment" | "testing_commissioning"
  | "special_approval" | "bank_guarantee" | "overhead" | "other";

export type FinanceEntryKind = "rap" | "po" | "actual" | "forecast";
export type FinanceDirection = "in" | "out";
export type FinanceFrequency = "weekly" | "monthly";

export const FINANCE_CATEGORIES: { value: FinanceCategory; label: string }[] = [
  { value: "project_management", label: "Project Management" },
  { value: "material", label: "Material" },
  { value: "services", label: "Services" },
  { value: "mob_demob", label: "Mobilisation / Demob" },
  { value: "tools_consumables", label: "Tools & Consumables" },
  { value: "equipment", label: "Equipment" },
  { value: "testing_commissioning", label: "Testing & Commissioning" },
  { value: "special_approval", label: "Special Approval" },
  { value: "bank_guarantee", label: "Bank Guarantee" },
  { value: "overhead", label: "Overhead" },
  { value: "other", label: "Other" },
];

export const FINANCE_KIND_LABELS: Record<FinanceEntryKind, string> = {
  rap: "RAP (Plan)",
  po: "PO (Committed)",
  actual: "Actual",
  forecast: "Forecast",
};

export type DbFinanceEntry = {
  id: string;
  project_id: string;
  direction: FinanceDirection;
  category: FinanceCategory | null;
  entry_kind: FinanceEntryKind;
  frequency: FinanceFrequency;
  period_date: string;
  period_label: string;
  amount: number;
  description: string | null;
  related_activity: string | null;
  po_id: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * SATUAN NILAI FINANCE (STANDAR DASHBOARD)
 * ----------------------------------------
 * Semua field finance di tabel `projects`, `finance_entries`, `purchase_orders`
 * disimpan dalam satuan **Juta Rupiah (Jt)**.
 *   - Contoh input 500       → Rp 500 Jt   (Rp 500.000.000)
 *   - Contoh input 5.000     → Rp 5,00 M   (Rp 5.000.000.000  = 5 Miliar)
 *   - Contoh input 1.500.000 → Rp 1,50 T   (Rp 1,5 Triliun)
 *
 * Kecuali tabel `procurement_items.amount` yang disimpan dalam **Rupiah mentah (IDR)**
 *   - Gunakan formatIDR() untuk menampilkan.
 *
 * Notasi tampil (pakai koma sebagai desimal, standar Indonesia):
 *   Jt = Juta Rupiah
 *   M  = Miliar Rupiah  (1 M = 1.000 Jt)
 *   T  = Triliun Rupiah (1 T = 1.000 M = 1.000.000 Jt)
 */
const fmtID = (n: number, d = 2) =>
  n.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });

export function formatRupiah(jutaRupiah: number): string {
  const v = Number(jutaRupiah) || 0;
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${sign}Rp ${fmtID(abs / 1_000_000, 2)} T`;
  if (abs >= 1_000) return `${sign}Rp ${fmtID(abs / 1_000, 2)} M`;
  if (abs >= 1) return `${sign}Rp ${fmtID(abs, 0)} Jt`;
  return `Rp 0`;
}

/** Format nilai Rupiah MENTAH (IDR utuh, bukan juta) — dipakai untuk procurement_items.amount */
export function formatIDR(rupiah: number): string {
  const v = Number(rupiah) || 0;
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000_000) return `${sign}Rp ${fmtID(abs / 1_000_000_000_000, 2)} T`;
  if (abs >= 1_000_000_000) return `${sign}Rp ${fmtID(abs / 1_000_000_000, 2)} M`;
  if (abs >= 1_000_000) return `${sign}Rp ${fmtID(abs / 1_000_000, 1)} Jt`;
  if (abs >= 1_000) return `${sign}Rp ${fmtID(abs / 1_000, 0)} Rb`;
  return `${sign}Rp ${fmtID(abs, 0)}`;
}

/** Konversi Rupiah mentah → Juta (untuk preview inline saat user mengetik) */
export function rupiahToJuta(rupiah: number): number { return (Number(rupiah) || 0) / 1_000_000; }
export function jutaToRupiah(juta: number): number { return (Number(juta) || 0) * 1_000_000; }

/** Legend/hint singkat untuk ditampilkan dekat angka finance */
export const MONEY_UNIT_HINT = "Notasi: Jt = Juta • M = Miliar (1.000 Jt) • T = Triliun (1.000 M). Desimal pakai koma.";

export async function logActivity(
  supabase: any,
  entityType: string,
  action: string,
  details: string,
  projectId?: string,
  entityId?: string
) {
  await supabase.from("activity_logs").insert({
    entity_type: entityType,
    entity_id: entityId || null,
    action,
    details,
    project_id: projectId || null,
  });
}
