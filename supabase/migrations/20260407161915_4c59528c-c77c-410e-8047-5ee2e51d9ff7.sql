
-- Update projects: allow public INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated can delete projects" ON public.projects;
CREATE POLICY "Anyone can insert projects" ON public.projects FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update projects" ON public.projects FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete projects" ON public.projects FOR DELETE TO public USING (true);

-- Update work_areas
DROP POLICY IF EXISTS "Authenticated can insert work_areas" ON public.work_areas;
DROP POLICY IF EXISTS "Authenticated can update work_areas" ON public.work_areas;
DROP POLICY IF EXISTS "Authenticated can delete work_areas" ON public.work_areas;
CREATE POLICY "Anyone can insert work_areas" ON public.work_areas FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update work_areas" ON public.work_areas FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete work_areas" ON public.work_areas FOR DELETE TO public USING (true);

-- Update work_items
DROP POLICY IF EXISTS "Authenticated can insert work_items" ON public.work_items;
DROP POLICY IF EXISTS "Authenticated can update work_items" ON public.work_items;
DROP POLICY IF EXISTS "Authenticated can delete work_items" ON public.work_items;
CREATE POLICY "Anyone can insert work_items" ON public.work_items FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update work_items" ON public.work_items FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete work_items" ON public.work_items FOR DELETE TO public USING (true);

-- Update sub_tasks
DROP POLICY IF EXISTS "Authenticated can insert sub_tasks" ON public.sub_tasks;
DROP POLICY IF EXISTS "Authenticated can update sub_tasks" ON public.sub_tasks;
DROP POLICY IF EXISTS "Authenticated can delete sub_tasks" ON public.sub_tasks;
CREATE POLICY "Anyone can insert sub_tasks" ON public.sub_tasks FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update sub_tasks" ON public.sub_tasks FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete sub_tasks" ON public.sub_tasks FOR DELETE TO public USING (true);

-- Update milestones
DROP POLICY IF EXISTS "Authenticated can insert milestones" ON public.milestones;
DROP POLICY IF EXISTS "Authenticated can update milestones" ON public.milestones;
DROP POLICY IF EXISTS "Authenticated can delete milestones" ON public.milestones;
CREATE POLICY "Anyone can insert milestones" ON public.milestones FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update milestones" ON public.milestones FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete milestones" ON public.milestones FOR DELETE TO public USING (true);

-- Update addendums
DROP POLICY IF EXISTS "Authenticated can insert addendums" ON public.addendums;
DROP POLICY IF EXISTS "Authenticated can update addendums" ON public.addendums;
DROP POLICY IF EXISTS "Authenticated can delete addendums" ON public.addendums;
CREATE POLICY "Anyone can insert addendums" ON public.addendums FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update addendums" ON public.addendums FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete addendums" ON public.addendums FOR DELETE TO public USING (true);

-- Update project_alerts
DROP POLICY IF EXISTS "Authenticated users can insert alerts" ON public.project_alerts;
DROP POLICY IF EXISTS "Authenticated users can update alerts" ON public.project_alerts;
DROP POLICY IF EXISTS "Authenticated can delete alerts" ON public.project_alerts;
CREATE POLICY "Anyone can insert alerts" ON public.project_alerts FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update alerts" ON public.project_alerts FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete alerts" ON public.project_alerts FOR DELETE TO public USING (true);

-- Update notifications
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated can update notifications" ON public.notifications;
CREATE POLICY "Anyone can insert notifications" ON public.notifications FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update notifications" ON public.notifications FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete notifications" ON public.notifications FOR DELETE TO public USING (true);

-- Update monthly_budgets
DROP POLICY IF EXISTS "Authenticated users can insert budgets" ON public.monthly_budgets;
CREATE POLICY "Anyone can insert budgets" ON public.monthly_budgets FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update budgets" ON public.monthly_budgets FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete budgets" ON public.monthly_budgets FOR DELETE TO public USING (true);
