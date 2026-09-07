ALTER TABLE public.projects ALTER COLUMN progress TYPE numeric USING progress::numeric;

WITH latest AS (
  SELECT DISTINCT ON (project_id) project_id, actual_progress
  FROM public.s_curve_data
  WHERE actual_progress IS NOT NULL
  ORDER BY project_id, period_order DESC, actual_progress DESC
)
UPDATE public.projects p
SET progress = ROUND(l.actual_progress::numeric, 2)
FROM latest l
WHERE l.project_id = p.id AND l.actual_progress > 0;