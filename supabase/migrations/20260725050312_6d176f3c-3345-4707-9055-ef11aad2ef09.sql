
ALTER TABLE public.s_curve_data
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date;

CREATE INDEX IF NOT EXISTS idx_s_curve_project_end
  ON public.s_curve_data (project_id, curve_type, period_end);

-- Backfill: assume weekly cadence starting from project.start_date
UPDATE public.s_curve_data s
SET
  period_start = (p.start_date::date + (s.period_order * 7))::date,
  period_end   = (p.start_date::date + (s.period_order * 7) + 6)::date
FROM public.projects p
WHERE s.project_id = p.id
  AND s.period_start IS NULL
  AND p.start_date IS NOT NULL;
