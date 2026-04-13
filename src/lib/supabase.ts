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
  profit_margin_target: number;
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
  created_at: string;
  resolved_at: string | null;
};

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
