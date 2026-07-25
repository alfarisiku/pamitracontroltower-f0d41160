import { useMemo } from "react";
import { useSCurveData } from "./useProjects";

export type ProjectPeriod = {
  id: string;
  period_order: number;
  period_label: string;
  period_start: string;
  period_end: string;
  planned_progress: number;
  actual_progress: number | null;
};

/**
 * Single source of truth for every "weekly period" pickable across the app.
 * Reads baseline S-Curve rows (weekly) and exposes them ordered.
 * Used by: Quick Weekly Update, Weekly Report editor, Weekly Photos uploader.
 */
export function useProjectPeriods(projectId?: string) {
  const { data = [], isLoading } = useSCurveData(projectId);
  const periods = useMemo<ProjectPeriod[]>(() => {
    return data
      .filter(
        (d) =>
          d.curve_type === "baseline" &&
          d.period_start &&
          d.period_end
      )
      .sort((a, b) => a.period_order - b.period_order)
      .map((d) => ({
        id: d.id,
        period_order: d.period_order,
        period_label: d.period_label,
        period_start: d.period_start!,
        period_end: d.period_end!,
        planned_progress: Number(d.planned_progress) || 0,
        actual_progress: d.actual_progress != null ? Number(d.actual_progress) : null,
      }));
  }, [data]);

  const nextUnfilled = periods.find((p) => p.actual_progress == null) ?? periods[periods.length - 1];

  return { periods, nextUnfilled, isLoading };
}
