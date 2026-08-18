CREATE TABLE public.project_billings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  termin_code text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'plan',
  sort_order integer NOT NULL DEFAULT 0,
  plan_progress_pct numeric NOT NULL DEFAULT 0,
  plan_amount bigint NOT NULL DEFAULT 0,
  plan_po_date date,
  plan_invoice_date date,
  plan_cash_in_date date,
  actual_progress_pct numeric NOT NULL DEFAULT 0,
  actual_amount bigint NOT NULL DEFAULT 0,
  paid_amount bigint NOT NULL DEFAULT 0,
  actual_po_date date,
  actual_invoice_date date,
  actual_cash_in_date date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_billings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_billings TO authenticated;
GRANT ALL ON public.project_billings TO service_role;

ALTER TABLE public.project_billings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view billings" ON public.project_billings FOR SELECT USING (true);
CREATE POLICY "Public can insert billings" ON public.project_billings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update billings" ON public.project_billings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete billings" ON public.project_billings FOR DELETE USING (true);

CREATE TRIGGER update_project_billings_updated_at
BEFORE UPDATE ON public.project_billings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_project_billings_project ON public.project_billings(project_id);