
-- Activity logs for all dashboard activities
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  details TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view activity_logs" ON public.activity_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert activity_logs" ON public.activity_logs FOR INSERT WITH CHECK (true);
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_project ON public.activity_logs(project_id);

-- Procurement items tracking
CREATE TABLE public.procurement_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  amount BIGINT NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'unit',
  qty NUMERIC NOT NULL DEFAULT 1,
  rfq_date DATE,
  approval_date DATE,
  po_date DATE,
  fabrication_date DATE,
  delivery_date DATE,
  install_date DATE,
  status TEXT NOT NULL DEFAULT 'planned',
  vendor TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.procurement_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view procurement_items" ON public.procurement_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert procurement_items" ON public.procurement_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update procurement_items" ON public.procurement_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete procurement_items" ON public.procurement_items FOR DELETE USING (true);
CREATE INDEX idx_procurement_project ON public.procurement_items(project_id);

-- Add resolved_at and category to project_alerts
ALTER TABLE public.project_alerts ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.project_alerts ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'operational';

-- Add TKDN to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS tkdn_percentage NUMERIC NOT NULL DEFAULT 0;
