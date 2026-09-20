CREATE TABLE public.project_tank_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.project_tank_sites TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_tank_sites TO authenticated;
GRANT ALL ON public.project_tank_sites TO service_role;
ALTER TABLE public.project_tank_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tank_sites_public_read" ON public.project_tank_sites FOR SELECT USING (true);
CREATE POLICY "tank_sites_auth_write" ON public.project_tank_sites FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_project_tank_sites_updated_at BEFORE UPDATE ON public.project_tank_sites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.project_tanks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  site_id uuid REFERENCES public.project_tank_sites(id) ON DELETE SET NULL,
  work_area_id uuid REFERENCES public.work_areas(id) ON DELETE SET NULL,
  tank_code text NOT NULL,
  product text,
  capacity_kl numeric,
  status text NOT NULL DEFAULT 'on_preparation',
  finish_date date,
  description text,
  photo_url text,
  map_x numeric NOT NULL DEFAULT 50,
  map_y numeric NOT NULL DEFAULT 50,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.project_tanks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_tanks TO authenticated;
GRANT ALL ON public.project_tanks TO service_role;
ALTER TABLE public.project_tanks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tanks_public_read" ON public.project_tanks FOR SELECT USING (true);
CREATE POLICY "tanks_auth_write" ON public.project_tanks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_project_tanks_updated_at BEFORE UPDATE ON public.project_tanks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_project_tanks_project ON public.project_tanks(project_id);
CREATE INDEX idx_project_tank_sites_project ON public.project_tank_sites(project_id);