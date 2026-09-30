ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS baseline_label text;
UPDATE public.s_curve_data SET curve_type='baseline' WHERE project_id='dfda9f5b-0297-459c-b4c4-16d2717c6eb6' AND curve_type='Kontrak';
UPDATE public.projects SET primary_curve_type='baseline', baseline_label='Kontrak' WHERE id='dfda9f5b-0297-459c-b4c4-16d2717c6eb6';