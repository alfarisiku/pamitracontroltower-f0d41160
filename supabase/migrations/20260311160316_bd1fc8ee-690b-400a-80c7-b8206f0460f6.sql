
-- Work Areas (Level 1 WBS) - e.g., "Area Tangki", "Area Piping"
CREATE TABLE public.work_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 0,
  progress NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Work Items (Level 2 WBS) - e.g., "Tangki A", "Tangki B"
CREATE TABLE public.work_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_area_id UUID NOT NULL REFERENCES public.work_areas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'unit',
  qty_total NUMERIC NOT NULL DEFAULT 0,
  qty_completed NUMERIC NOT NULL DEFAULT 0,
  weight NUMERIC NOT NULL DEFAULT 0,
  progress NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in-progress',
  start_date DATE,
  end_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sub Tasks (Level 3 WBS) - e.g., "Erection", "Welding", "NDT"
CREATE TABLE public.sub_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_item_id UUID NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'unit',
  qty_total NUMERIC NOT NULL DEFAULT 0,
  qty_completed NUMERIC NOT NULL DEFAULT 0,
  progress NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'not-started',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Milestones
CREATE TABLE public.milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'Construction',
  target_date DATE NOT NULL,
  actual_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  weight NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.work_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view work_areas" ON public.work_areas FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can insert work_areas" ON public.work_areas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update work_areas" ON public.work_areas FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Anyone can view work_items" ON public.work_items FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can insert work_items" ON public.work_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update work_items" ON public.work_items FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Anyone can view sub_tasks" ON public.sub_tasks FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can insert sub_tasks" ON public.sub_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update sub_tasks" ON public.sub_tasks FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Anyone can view milestones" ON public.milestones FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can insert milestones" ON public.milestones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update milestones" ON public.milestones FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Anyone can view notifications" ON public.notifications FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update notifications" ON public.notifications FOR UPDATE TO authenticated USING (true);
