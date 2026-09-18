ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS primary_curve_type text NOT NULL DEFAULT 'baseline';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allowed_menus text[];