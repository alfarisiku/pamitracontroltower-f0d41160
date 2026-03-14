
CREATE TABLE public.addendums (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  addendum_code text NOT NULL,
  description text NOT NULL DEFAULT '',
  scope_change text DEFAULT '',
  cost_impact bigint NOT NULL DEFAULT 0,
  schedule_impact_days integer NOT NULL DEFAULT 0,
  approval_status text NOT NULL DEFAULT 'pending',
  approved_by text DEFAULT '',
  approved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.addendums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view addendums" ON public.addendums FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can insert addendums" ON public.addendums FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update addendums" ON public.addendums FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete addendums" ON public.addendums FOR DELETE TO authenticated USING (true);

-- Also allow delete on projects for CRUD
CREATE POLICY "Authenticated can delete projects" ON public.projects FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete alerts" ON public.project_alerts FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete work_areas" ON public.work_areas FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete work_items" ON public.work_items FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete sub_tasks" ON public.sub_tasks FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete milestones" ON public.milestones FOR DELETE TO authenticated USING (true);
