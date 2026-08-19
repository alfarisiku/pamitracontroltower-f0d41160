CREATE TABLE public.hr_personnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'manpower',
  position text NOT NULL,
  headcount integer NOT NULL DEFAULT 0,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_personnel TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_personnel TO authenticated;
GRANT ALL ON public.hr_personnel TO service_role;

ALTER TABLE public.hr_personnel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read hr_personnel" ON public.hr_personnel FOR SELECT USING (true);
CREATE POLICY "Public insert hr_personnel" ON public.hr_personnel FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update hr_personnel" ON public.hr_personnel FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete hr_personnel" ON public.hr_personnel FOR DELETE USING (true);

CREATE TRIGGER update_hr_personnel_updated_at BEFORE UPDATE ON public.hr_personnel
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();