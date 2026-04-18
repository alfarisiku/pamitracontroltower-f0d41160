
-- Add penalty/claim columns to purchase_orders
ALTER TABLE public.purchase_orders 
  ADD COLUMN IF NOT EXISTS penalty_amount bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS penalty_note text DEFAULT '';

-- Create manpower_logs table
CREATE TABLE IF NOT EXISTS public.manpower_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'Construction',
  workers integer NOT NULL DEFAULT 0,
  hours_per_worker numeric NOT NULL DEFAULT 8,
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.manpower_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view manpower_logs" ON public.manpower_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert manpower_logs" ON public.manpower_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update manpower_logs" ON public.manpower_logs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete manpower_logs" ON public.manpower_logs FOR DELETE USING (true);

CREATE TRIGGER update_manpower_logs_updated_at BEFORE UPDATE ON public.manpower_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_manpower_logs_project ON public.manpower_logs(project_id, log_date);
