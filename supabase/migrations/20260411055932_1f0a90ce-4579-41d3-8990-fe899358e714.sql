-- S-Curve editable data table
CREATE TABLE public.s_curve_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  period_label TEXT NOT NULL,
  period_order INTEGER NOT NULL DEFAULT 0,
  planned_progress NUMERIC NOT NULL DEFAULT 0,
  actual_progress NUMERIC DEFAULT NULL,
  curve_type TEXT NOT NULL DEFAULT 'baseline',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.s_curve_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view s_curve_data" ON public.s_curve_data FOR SELECT USING (true);
CREATE POLICY "Anyone can insert s_curve_data" ON public.s_curve_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update s_curve_data" ON public.s_curve_data FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete s_curve_data" ON public.s_curve_data FOR DELETE USING (true);

CREATE INDEX idx_s_curve_project ON public.s_curve_data(project_id, curve_type, period_order);

-- Add RAP and margin target to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS rap BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS profit_margin_target NUMERIC NOT NULL DEFAULT 10;