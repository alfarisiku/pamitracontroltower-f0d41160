
DO $$ BEGIN
  CREATE TYPE public.finance_category AS ENUM (
    'project_management','material','services','mob_demob','tools_consumables',
    'equipment','testing_commissioning','special_approval','bank_guarantee','overhead','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.finance_entry_kind AS ENUM ('rap','po','actual','forecast');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.finance_direction AS ENUM ('in','out');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.finance_frequency AS ENUM ('weekly','monthly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.finance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  direction public.finance_direction NOT NULL,
  category public.finance_category,
  entry_kind public.finance_entry_kind NOT NULL,
  frequency public.finance_frequency NOT NULL DEFAULT 'monthly',
  period_date DATE NOT NULL,
  period_label TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  related_activity TEXT,
  po_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_entries_project ON public.finance_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_finance_entries_period ON public.finance_entries(project_id, period_date);
CREATE INDEX IF NOT EXISTS idx_finance_entries_kind ON public.finance_entries(entry_kind);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_entries TO anon, authenticated;
GRANT ALL ON public.finance_entries TO service_role;

ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view finance_entries" ON public.finance_entries FOR SELECT USING (true);
CREATE POLICY "Anyone can insert finance_entries" ON public.finance_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update finance_entries" ON public.finance_entries FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete finance_entries" ON public.finance_entries FOR DELETE USING (true);

CREATE TRIGGER update_finance_entries_updated_at
  BEFORE UPDATE ON public.finance_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TABLE IF EXISTS public.project_cashflow CASCADE;

CREATE VIEW public.project_cashflow AS
SELECT
  (md5(project_id::text || '-' || date_trunc('month', period_date)::text))::uuid AS id,
  project_id,
  to_char(date_trunc('month', period_date), 'Mon YYYY') AS period_label,
  ((EXTRACT(YEAR FROM date_trunc('month', period_date))::int - 2020) * 12
     + EXTRACT(MONTH FROM date_trunc('month', period_date))::int) AS period_order,
  COALESCE(SUM(CASE WHEN direction='in'  AND entry_kind='actual' THEN amount END), 0)::bigint AS cash_in,
  COALESCE(SUM(CASE WHEN direction='out' AND entry_kind='actual' THEN amount END), 0)::bigint AS cash_out,
  0::numeric AS planned_progress,
  0::numeric AS actual_progress,
  MIN(created_at) AS created_at
FROM public.finance_entries
GROUP BY project_id, date_trunc('month', period_date);

GRANT SELECT ON public.project_cashflow TO anon, authenticated, service_role;
