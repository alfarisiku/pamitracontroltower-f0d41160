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
  start_date: string;
  end_date: string;
  manager: string;
  location: string;
  map_x: number;
  map_y: number;
  image_url: string | null;
  video_url: string | null;
  description: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
};

export type DbAlert = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  severity: "critical" | "high" | "medium" | "low";
  is_resolved: boolean;
  created_at: string;
};

export type DbMonthlyBudget = {
  id: string;
  month: string;
  year: number;
  planned: number;
  actual: number;
};

export function formatRupiah(jutaRupiah: number): string {
  if (jutaRupiah >= 1000000) return `Rp ${(jutaRupiah / 1000000).toFixed(1)}T`;
  if (jutaRupiah >= 1000) return `Rp ${(jutaRupiah / 1000).toFixed(1)}M`;
  return `Rp ${jutaRupiah}Jt`;
}
