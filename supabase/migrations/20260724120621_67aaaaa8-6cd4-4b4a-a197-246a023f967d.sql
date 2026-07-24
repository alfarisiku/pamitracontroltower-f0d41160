
ALTER TABLE public.procurement_items
  ADD COLUMN IF NOT EXISTS pr_plan_date date,
  ADD COLUMN IF NOT EXISTS pr_actual_date date,
  ADD COLUMN IF NOT EXISTS po_plan_date date,
  ADD COLUMN IF NOT EXISTS po_actual_date date,
  ADD COLUMN IF NOT EXISTS delivery_plan_date date,
  ADD COLUMN IF NOT EXISTS delivery_actual_date date,
  ADD COLUMN IF NOT EXISTS onsite_plan_date date,
  ADD COLUMN IF NOT EXISTS onsite_actual_date date;

-- Backfill actual dates from existing columns (rfq_date/po_date/delivery_date/install_date) for continuity.
UPDATE public.procurement_items SET pr_actual_date = rfq_date WHERE pr_actual_date IS NULL AND rfq_date IS NOT NULL;
UPDATE public.procurement_items SET po_actual_date = po_date WHERE po_actual_date IS NULL AND po_date IS NOT NULL;
UPDATE public.procurement_items SET delivery_actual_date = delivery_date WHERE delivery_actual_date IS NULL AND delivery_date IS NOT NULL;
UPDATE public.procurement_items SET onsite_actual_date = install_date WHERE onsite_actual_date IS NULL AND install_date IS NOT NULL;
