import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, DbProject, DbAlert, DbMonthlyBudget, DbWorkArea, DbWorkItem, DbSubTask, DbMilestone, DbNotification, DbAddendum, DbSCurveData } from "@/lib/supabase";

export function useProjects() {
  return useQuery<DbProject[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("project_code");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery<DbProject | null>({
    queryKey: ["project", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("s_curve_data")
        .select("*")
        .eq("project_id", projectId!)
        .order("curve_type")
        .order("period_order");
      if (error) throw error;
      return data ?? [];
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
