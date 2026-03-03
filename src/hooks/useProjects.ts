import { useQuery } from "@tanstack/react-query";
import { supabase, DbProject, DbAlert, DbMonthlyBudget } from "@/lib/supabase";

export function useProjects() {
  return useQuery<DbProject[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("project_code");
      if (error) throw error;
      return data ?? [];
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
      const { data, error } = await supabase
        .from("monthly_budgets")
        .select("*")
        .order("year")
        .order("month");
      if (error) throw error;
      return data ?? [];
    },
  });
}
