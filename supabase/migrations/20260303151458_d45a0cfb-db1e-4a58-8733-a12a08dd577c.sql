
-- Create enum types
CREATE TYPE public.project_status AS ENUM ('on-track', 'at-risk', 'delayed', 'completed');
CREATE TYPE public.project_phase AS ENUM ('Engineering', 'Procurement', 'Construction', 'Commissioning');
CREATE TYPE public.alert_severity AS ENUM ('critical', 'high', 'medium', 'low');

-- Projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  client TEXT NOT NULL,
  status project_status NOT NULL DEFAULT 'on-track',
  phase project_phase NOT NULL DEFAULT 'Engineering',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  budget BIGINT NOT NULL DEFAULT 0,
  spent BIGINT NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  manager TEXT NOT NULL,
  location TEXT NOT NULL,
  map_x NUMERIC(5,2) NOT NULL DEFAULT 0,
  map_y NUMERIC(5,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  video_url TEXT,
  description TEXT,
  category TEXT DEFAULT 'Energy',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project alerts table
CREATE TABLE public.project_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity alert_severity NOT NULL DEFAULT 'medium',
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Monthly budget data
CREATE TABLE public.monthly_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  planned BIGINT NOT NULL DEFAULT 0,
  actual BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;

-- Public read policies (PMO dashboard is read-only for now)
CREATE POLICY "Anyone can view projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Anyone can view alerts" ON public.project_alerts FOR SELECT USING (true);
CREATE POLICY "Anyone can view budgets" ON public.monthly_budgets FOR SELECT USING (true);

-- Authenticated users can insert/update
CREATE POLICY "Authenticated users can insert projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update projects" ON public.projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert alerts" ON public.project_alerts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update alerts" ON public.project_alerts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert budgets" ON public.monthly_budgets FOR INSERT TO authenticated WITH CHECK (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
