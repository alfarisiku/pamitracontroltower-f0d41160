export { supabase } from "@/integrations/supabase/client";

export type DbProject = {
  id: string;
  project_code: string;
  name: string;
  client: string;
  status: "on-track" | "at-risk" | "delayed" | "completed";
  phase: "Engineering" | "Procurement" | "Construction" | "Commissioning";
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

export type DbSCurveData = {
  id: string;
  project_id: string;
  period_label: string;
  period_order: number;
  planned_progress: number;
  actual_progress: number | null;
  curve_type: string;
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

export function formatRupiah(jutaRupiah: number): string {
  if (jutaRupiah >= 1000000) return `Rp ${(jutaRupiah / 1000000).toFixed(1)}T`;
  if (jutaRupiah >= 1000) return `Rp ${(jutaRupiah / 1000).toFixed(1)}M`;
  return `Rp ${jutaRupiah}Jt`;
}

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
