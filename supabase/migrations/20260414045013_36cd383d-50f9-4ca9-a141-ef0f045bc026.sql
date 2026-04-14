
-- Purchase Orders table
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  amount BIGINT NOT NULL DEFAULT 0,
  po_date DATE,
  vendor TEXT DEFAULT '',
  related_activity TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'material',
  status TEXT NOT NULL DEFAULT 'committed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view purchase_orders" ON public.purchase_orders FOR SELECT USING (true);
CREATE POLICY "Anyone can insert purchase_orders" ON public.purchase_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update purchase_orders" ON public.purchase_orders FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete purchase_orders" ON public.purchase_orders FOR DELETE USING (true);

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Project Cashflow table
CREATE TABLE public.project_cashflow (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  period_label TEXT NOT NULL,
  period_order INT NOT NULL DEFAULT 0,
  cash_in BIGINT NOT NULL DEFAULT 0,
  cash_out BIGINT NOT NULL DEFAULT 0,
  planned_progress NUMERIC NOT NULL DEFAULT 0,
  actual_progress NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_cashflow ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view project_cashflow" ON public.project_cashflow FOR SELECT USING (true);
CREATE POLICY "Anyone can insert project_cashflow" ON public.project_cashflow FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update project_cashflow" ON public.project_cashflow FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete project_cashflow" ON public.project_cashflow FOR DELETE USING (true);

-- Add columns to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_value BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS margin_locked BOOLEAN NOT NULL DEFAULT false;

-- Add due_date to project_alerts
ALTER TABLE public.project_alerts ADD COLUMN IF NOT EXISTS due_date DATE;
