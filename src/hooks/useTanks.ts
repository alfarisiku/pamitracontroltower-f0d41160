import { useQuery } from "@tanstack/react-query";
import { supabase, DbProject } from "@/lib/supabase";
import { useBaselineProgressMap } from "./useProjects";

/** Enam proyek tangki yang ditampilkan pada halaman khusus BoD (urutan sesuai lampiran). */
export const BOD_PROJECT_CODES = [
  "MOR V- SPK 1",
  "MOR V- SPK 2",
  "MOR V- SPK 3",
  "MOR V- SPK 4",
  "Tanjung Wangi & Camplong",
  "OH Tangki Kasim",
];

export const BOD_SHORT_LABEL: Record<string, string> = {
  "MOR V- SPK 1": "SPK 1 (T-43, T-47, T-53 — IT Surabaya)",
  "MOR V- SPK 2": "SPK 2 (T-63 — IT Surabaya)",
  "MOR V- SPK 3": "SPK 3 (T-51, T-46, FS-01, T-56, T-67 — IT Surabaya)",
  "MOR V- SPK 4": "SPK 4 (Manifold Barat — IT Surabaya)",
  "Tanjung Wangi & Camplong": "SPK 6 (T-01, T-09 IT Tj. Wangi & T-03 FT Camplong)",
  "OH Tangki Kasim": "Overhaul 3 Tanki 5-T-18, 5-T-24 & 5-T-01 — KPI Kasim",
};

export type DbTankSite = {
  id: string;
  project_id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
};

export type DbTank = {
  id: string;
  project_id: string;
  site_id: string | null;
  work_area_id: string | null;
  tank_code: string;
  product: string | null;
  capacity_kl: number | null;
  status: string;
  finish_date: string | null;
  description: string | null;
  photo_url: string | null;
  map_x: number;
  map_y: number;
  sort_order: number;
  manual_progress: number | null;
};

export const TANK_STATUS_META: Record<string, { label: string; className: string; ring: string }> = {
  completed: { label: "Completed", className: "bg-success/10 text-success border-success/30", ring: "border-success" },
  in_progress: { label: "In Progress", className: "bg-warning/10 text-warning border-warning/30", ring: "border-warning" },
  on_preparation: { label: "On Preparation", className: "bg-muted text-muted-foreground border-border", ring: "border-border" },
};
export const tankStatusMeta = (s: string) => TANK_STATUS_META[s] ?? TANK_STATUS_META.on_preparation;
export const TANK_STATUS_OPTIONS = [
  { value: "completed", label: "Completed" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_preparation", label: "On Preparation" },
];

/** Slug URL untuk region BoD: "MOR V" -> "mor5", "MOR III" -> "mor3". */
const ROMAN: Record<string, string> = { i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9", x: "10" };
export const regionSlug = (region: string) =>
  region.toLowerCase().trim().split(/\s+/).map(w => ROMAN[w] ?? w).join("").replace(/[^a-z0-9]/g, "");

/** Daftar region BoD (mis. MOR V, MOR III) beserta jumlah proyeknya. */
export function useBodRegions() {
  return useQuery<{ region: string; slug: string; count: number }[]>({
    queryKey: ["bod_regions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("projects").select("bod_region").not("bod_region", "is", null);
      if (error) throw error;
      const map = new Map<string, number>();
      for (const r of (data ?? []) as { bod_region: string }[]) {
        const key = (r.bod_region ?? "").trim();
        if (key) map.set(key, (map.get(key) ?? 0) + 1);
      }
      return [...map.entries()]
        .map(([region, count]) => ({ region, slug: regionSlug(region), count }))
        .sort((a, b) => a.region.localeCompare(b.region));
    },
  });
}

/** Proyek BoD dengan progres resmi (aktual terakhir kurva acuan) — sinkron dengan dashboard. */
export function useBodProjects(regionSlugParam?: string) {
  const progressMap = useBaselineProgressMap();
  const q = useQuery<DbProject[]>({
    queryKey: ["bod_projects"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("projects").select("*").not("bod_region", "is", null);
      if (error) throw error;
      return (data ?? []) as unknown as DbProject[];
    },
  });
  const rows = (q.data ?? [])
    .filter(p => !regionSlugParam || regionSlug(((p as any).bod_region ?? "") as string) === regionSlugParam)
    .map(p => (progressMap.has(p.id) ? ({ ...p, progress: progressMap.get(p.id) as number }) : p))
    .sort((a, b) => {
      const ia = BOD_PROJECT_CODES.indexOf(a.project_code), ib = BOD_PROJECT_CODES.indexOf(b.project_code);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.project_code.localeCompare(b.project_code);
    });
  return { ...q, data: rows } as typeof q;
}

export function useTankSites(projectId?: string) {
  return useQuery<DbTankSite[]>({
    queryKey: ["project_tank_sites", projectId ?? "all"],
    queryFn: async () => {
      let qb = (supabase as any).from("project_tank_sites").select("*").order("sort_order");
      if (projectId) qb = qb.eq("project_id", projectId);
      const { data, error } = await qb;
      if (error) throw error;
      return (data ?? []) as DbTankSite[];
    },
  });
}

export function useTanks(projectId?: string) {
  return useQuery<DbTank[]>({
    queryKey: ["project_tanks", projectId ?? "all"],
    queryFn: async () => {
      let qb = (supabase as any).from("project_tanks").select("*").order("sort_order");
      if (projectId) qb = qb.eq("project_id", projectId);
      const { data, error } = await qb;
      if (error) throw error;
      return (data ?? []) as DbTank[];
    },
  });
}

/**
 * Progres per Work Area (WBS) proyek: rata-rata tertimbang progres work items,
 * fallback ke progres work area itu sendiri. Dipakai sebagai progres tiap tangki.
 */
export function useWbsProgressMap(projectId?: string) {
  const { data = new Map<string, number>() } = useQuery<Map<string, number>>({
    queryKey: ["wbs_progress_map", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data: areas, error: aErr } = await supabase
        .from("work_areas").select("id, progress").eq("project_id", projectId!);
      if (aErr) throw aErr;
      const ids = (areas ?? []).map((a: any) => a.id);
      const map = new Map<string, number>();
      for (const a of areas ?? []) map.set((a as any).id, Number((a as any).progress) || 0);
      if (ids.length) {
        const { data: items, error: iErr } = await supabase
          .from("work_items").select("work_area_id, weight, progress").in("work_area_id", ids);
        if (iErr) throw iErr;
        const acc = new Map<string, { w: number; wp: number }>();
        for (const it of items ?? []) {
          const k = (it as any).work_area_id as string;
          const w = Number((it as any).weight) || 0;
          const p = Number((it as any).progress) || 0;
          const cur = acc.get(k) ?? { w: 0, wp: 0 };
          acc.set(k, { w: cur.w + w, wp: cur.wp + w * p });
        }
        for (const [k, v] of acc) if (v.w > 0) map.set(k, v.wp / v.w);
      }
      return map;
    },
  });
  return data;
}

export function tankProgress(tank: DbTank, wbsMap: Map<string, number>): number {
  if (tank.manual_progress != null) return Number(tank.manual_progress);
  if (tank.work_area_id && wbsMap.has(tank.work_area_id)) return wbsMap.get(tank.work_area_id) as number;
  return 0;
}
