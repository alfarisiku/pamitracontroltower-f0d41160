ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS bod_region text;
ALTER TABLE public.project_tanks ADD COLUMN IF NOT EXISTS plan_percent numeric;
ALTER TABLE public.project_tanks ADD COLUMN IF NOT EXISTS duration_months integer;
ALTER TABLE public.project_tanks ADD COLUMN IF NOT EXISTS progress_source text NOT NULL DEFAULT 'manual';
UPDATE public.projects SET bod_region = 'MOR V'
 WHERE project_code IN ('MOR V- SPK 1','MOR V- SPK 2','MOR V- SPK 3','MOR V- SPK 4','Tanjung Wangi & Camplong','OH Tangki Kasim');