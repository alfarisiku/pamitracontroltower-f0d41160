ALTER TABLE public.project_alerts ADD COLUMN IF NOT EXISTS probability text DEFAULT 'medium';
ALTER TABLE public.project_alerts ADD COLUMN IF NOT EXISTS impact text DEFAULT 'medium';
ALTER TABLE public.project_alerts ADD COLUMN IF NOT EXISTS risk_owner text DEFAULT '';
ALTER TABLE public.project_alerts ADD COLUMN IF NOT EXISTS mitigation_plan text DEFAULT '';