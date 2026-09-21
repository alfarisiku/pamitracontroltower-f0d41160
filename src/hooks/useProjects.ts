import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, DbProject, DbAlert, DbMonthlyBudget, DbWorkArea, DbWorkItem, DbSubTask, DbMilestone, DbNotification, DbAddendum, DbSCurveData, DbProcurementItem, DbActivityLog, DbPurchaseOrder, DbProjectCashflow, DbManpowerLog, DbFinanceEntry } from "@/lib/supabase";
import { useAccess } from "@/contexts/AccessContext";

/** Ambil SEMUA baris (PostgREST membatasi 1000 baris per request). */
async function fetchAllRows(build: () => any): Promise<any[]> {
  const PAGE = 1000;
  let from = 0;
  const out: any[] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

export function useFinanceEntries(projectId?: string) {
  return useQuery<DbFinanceEntry[]>({
    queryKey: ["finance_entries", projectId],
    enabled: !!projectId,
    queryFn: async () =>
      (await fetchAllRows(() =>
        (supabase as any).from("finance_entries").select("*").eq("project_id", projectId!).order("period_date", { ascending: true }),
      )) as DbFinanceEntry[],
  });
}

export function useAllFinanceEntries() {
  return useQuery<DbFinanceEntry[]>({
    queryKey: ["finance_entries_all"],
    queryFn: async () =>
      (await fetchAllRows(() =>
        (supabase as any).from("finance_entries").select("*").order("period_date", { ascending: true }),
      )) as DbFinanceEntry[],
  });
}

/** Kurva acuan progres per proyek (projects.primary_curve_type, default "baseline"). */
export function usePrimaryCurveMap() {
  const { data = [] } = useQuery<any[]>({
    queryKey: ["projects_primary_curve"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("projects").select("id, primary_curve_type");
      if (error) throw error;
      return data ?? [];
    },
  });
  const map = new Map<string, string>();
  for (const r of data as any[]) map.set(r.id, r.primary_curve_type || "baseline");
  return map;
}

/**
 * Progress resmi proyek = actual terakhir pada kurva acuan (default Baseline).
 * Dipakai sebagai single source of truth agar Project Summary, Overview,
 * dan Project Detail selalu menampilkan angka yang sama.
 */
export function useBaselineProgressMap() {
  const { data = [] } = useAllSCurveData();
  const curveMap = usePrimaryCurveMap();
  const map = new Map<string, number>();
  const best = new Map<string, number>();
  for (const r of data as any[]) {
    const primary = curveMap.get(r.project_id) || "baseline";
    // Abaikan baris actual kosong / 0 (placeholder) agar tidak menurunkan progres resmi
    if (r.curve_type !== primary || r.actual_progress == null || Number(r.actual_progress) <= 0) continue;
    const order = Number(r.period_order) || 0;
    if (!best.has(r.project_id) || order >= (best.get(r.project_id) as number)) {
      best.set(r.project_id, order);
      map.set(r.project_id, Number(r.actual_progress));
    }
  }
  return map;
}

export function useProjects() {
  const { scope } = useAccess();
  const progressMap = useBaselineProgressMap();
  const q = useQuery<DbProject[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("project_code");
      if (error) throw error;
      return (data ?? []) as unknown as DbProject[];
    },
  });
  const rows = (q.data ?? []).map(p =>
    progressMap.has(p.id) ? ({ ...p, progress: progressMap.get(p.id) as number }) : p
  );
  const scoped = scope === null ? rows : rows.filter(p => scope.includes(p.id));
  return { ...q, data: scoped } as typeof q;
}

export function useProject(id: string | undefined) {
  const { canView } = useAccess();
  const progressMap = useBaselineProgressMap();
  const allowed = !!id && canView(id);
  const q = useQuery<DbProject | null>({
    queryKey: ["project", id],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id!).single();
      if (error) throw error;
      return (data ?? null) as unknown as DbProject | null;
    },
  });
  const row = q.data && id && progressMap.has(id)
    ? ({ ...q.data, progress: progressMap.get(id) as number })
    : q.data;
  return { ...q, data: row } as typeof q;
}

export function useAlerts() {
  return useQuery<(DbAlert & { projects: { name: string; project_code: string } | null })[]>({
    queryKey: ["alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_alerts")
        .select("*, projects(name, project_code)")
        .eq("is_resolved", false)
        .order("severity")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAllAlerts(projectId?: string) {
  return useQuery<DbAlert[]>({
    queryKey: ["all_alerts", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_alerts")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMonthlyBudgets() {
  return useQuery<DbMonthlyBudget[]>({
    queryKey: ["monthly_budgets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("monthly_budgets").select("*").order("year").order("month");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWorkAreas(projectId: string | undefined) {
  return useQuery<DbWorkArea[]>({
    queryKey: ["work_areas", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase.from("work_areas").select("*").eq("project_id", projectId!).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWorkItems(workAreaIds: string[]) {
  return useQuery<DbWorkItem[]>({
    queryKey: ["work_items", workAreaIds],
    enabled: workAreaIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("work_items").select("*").in("work_area_id", workAreaIds).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSubTasks(workItemIds: string[]) {
  return useQuery<DbSubTask[]>({
    queryKey: ["sub_tasks", workItemIds],
    enabled: workItemIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("sub_tasks").select("*").in("work_item_id", workItemIds).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMilestones(projectId: string | undefined) {
  return useQuery<DbMilestone[]>({
    queryKey: ["milestones", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase.from("milestones").select("*").eq("project_id", projectId!).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useNotifications() {
  return useQuery<(DbNotification & { projects?: { name: string; project_code: string } | null })[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*, projects(name, project_code)").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddendums(projectId?: string) {
  return useQuery<(DbAddendum & { projects?: { name: string; project_code: string } | null })[]>({
    queryKey: ["addendums", projectId],
    queryFn: async () => {
      let q = supabase.from("addendums").select("*, projects(name, project_code)").order("created_at", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSCurveData(projectId: string | undefined) {
  return useQuery<DbSCurveData[]>({
    queryKey: ["s_curve_data", projectId],
    enabled: !!projectId,
    queryFn: async () =>
      (await fetchAllRows(() =>
        supabase
          .from("s_curve_data")
          .select("*")
          .eq("project_id", projectId!)
          .order("curve_type")
          .order("period_order"),
      )) as DbSCurveData[],
  });
}

export function useProcurementItems(projectId?: string) {
  return useQuery<DbProcurementItem[]>({
    queryKey: ["procurement_items", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procurement_items")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePurchaseOrders(projectId?: string) {
  return useQuery<DbPurchaseOrder[]>({
    queryKey: ["purchase_orders", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAllPurchaseOrders() {
  return useQuery<DbPurchaseOrder[]>({
    queryKey: ["purchase_orders_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProjectCashflow(projectId?: string) {
  return useQuery<DbProjectCashflow[]>({
    queryKey: ["project_cashflow", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_cashflow")
        .select("*")
        .eq("project_id", projectId!)
        .order("period_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useActivityLogs(limit = 50) {
  const { scope } = useAccess();
  return useQuery<(DbActivityLog & { projects?: { name: string; project_code: string } | null })[]>({
    queryKey: ["activity_logs", limit, scope?.join(",") ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("activity_logs")
        .select("*, projects(name, project_code)")
        .order("created_at", { ascending: false })
        .limit(limit);
      // Level 2: hanya log proyek yang di-assign ke user
      if (scope !== null) q = q.in("project_id", scope.length ? scope : ["00000000-0000-0000-0000-000000000000"]);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProjectActivityLogs(projectId: string | undefined, limit = 30) {
  return useQuery<DbActivityLog[]>({
    queryKey: ["activity_logs_project", projectId, limit],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as DbActivityLog[];
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useManpowerLogs(projectId?: string) {
  return useQuery<DbManpowerLog[]>({
    queryKey: ["manpower_logs", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manpower_logs" as any)
        .select("*")
        .eq("project_id", projectId!)
        .order("log_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DbManpowerLog[];
    },
  });
}

/* ---------- Portfolio-wide aggregate hooks (Executive Overview) ---------- */

export function useAllSCurveData() {
  return useQuery<DbSCurveData[]>({
    queryKey: ["s_curve_data_all"],
    queryFn: async () =>
      (await fetchAllRows(() =>
        (supabase as any).from("s_curve_data").select("*").order("period_order"),
      )) as DbSCurveData[],
  });
}

export function useAllBillings() {
  return useQuery<any[]>({
    queryKey: ["project_billings_all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("project_billings").select("*").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAllHrPersonnel() {
  return useQuery<any[]>({
    queryKey: ["hr_personnel_all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_personnel").select("*").order("category");
      if (error) throw error;
      return data ?? [];
    },
  });
}
