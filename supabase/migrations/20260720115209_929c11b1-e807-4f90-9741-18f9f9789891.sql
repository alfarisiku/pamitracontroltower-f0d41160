
-- 1. Convert status & phase columns from enum → text with CHECK constraints
ALTER TABLE public.projects ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.projects ALTER COLUMN phase DROP DEFAULT;
ALTER TABLE public.projects ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE public.projects ALTER COLUMN phase TYPE text USING phase::text;

-- 2. Migrate old values → new values (randomize existing dummy rows for demo variety)
-- Status: planning / execution / on-hold / completed / closed
-- Phase:  Production I / II / III / IV
UPDATE public.projects
SET
  status = (ARRAY['planning','execution','execution','on-hold','completed','closed','execution','planning','execution','on-hold','completed','closed','execution','completed','execution'])[(floor(random()*15)::int)+1],
  phase  = (ARRAY['Production I','Production II','Production III','Production IV'])[(floor(random()*4)::int)+1];

-- 3. Apply CHECK constraints
ALTER TABLE public.projects
  ADD CONSTRAINT projects_status_check CHECK (status IN ('planning','execution','on-hold','completed','closed')),
  ADD CONSTRAINT projects_phase_check  CHECK (phase  IN ('Production I','Production II','Production III','Production IV'));

ALTER TABLE public.projects ALTER COLUMN status SET DEFAULT 'planning';
ALTER TABLE public.projects ALTER COLUMN phase  SET DEFAULT 'Production I';

-- 4. Drop old postgres enum types (no longer referenced)
DROP TYPE IF EXISTS project_status;
DROP TYPE IF EXISTS project_phase;

-- 5. Randomize work_items.epcc_category so the WBS phase filter actually shows variety
--    Map to the same 4 Production phases used at project level.
UPDATE public.work_items
SET epcc_category = (ARRAY['Production I','Production II','Production III','Production IV'])[(floor(random()*4)::int)+1];

UPDATE public.work_areas
SET epcc_category = (ARRAY['Production I','Production II','Production III','Production IV'])[(floor(random()*4)::int)+1];

-- 6. Seed finance_entries: give every project 6 months × 10 categories (plan + actual)
--    for realistic cashflow bipolar chart & cost breakdown.
--    Only insert if a project has fewer than 40 existing entries.
DO $$
DECLARE
  p RECORD;
  m INT;
  cat TEXT;
  cats TEXT[] := ARRAY['project_management','material','services','mob_demob','tools_consumables','equipment','testing_commissioning','special_approval','bank_guarantee','overhead'];
  period_dt DATE;
  plan_amt NUMERIC;
  act_amt NUMERIC;
  cash_in_plan NUMERIC;
  cash_in_act NUMERIC;
BEGIN
  FOR p IN SELECT id, contract_value, rap, start_date FROM public.projects LOOP
    IF (SELECT COUNT(*) FROM public.finance_entries WHERE project_id = p.id) < 40 THEN
      FOR m IN 0..5 LOOP
        period_dt := (COALESCE(p.start_date, CURRENT_DATE) + (m || ' month')::interval)::date;
        -- Cash IN (plan + actual) — 15-25% of contract per invoice cycle
        cash_in_plan := COALESCE(p.contract_value,1000) * (0.10 + random()*0.10);
        cash_in_act  := cash_in_plan * (0.85 + random()*0.30);
        INSERT INTO public.finance_entries (project_id, direction, category, entry_kind, frequency, period_date, period_label, amount, description)
        VALUES
          (p.id,'in',NULL,'rap','monthly',period_dt, to_char(period_dt,'Mon YYYY'), cash_in_plan, 'Termin invoice plan'),
          (p.id,'in',NULL,'actual','monthly',period_dt, to_char(period_dt,'Mon YYYY'), cash_in_act, 'Termin invoice actual');
        -- Cash OUT per category
        FOREACH cat IN ARRAY cats LOOP
          plan_amt := COALESCE(p.rap,800) * 0.10 * (0.5 + random());
          act_amt  := plan_amt * (0.7 + random()*0.6);
          INSERT INTO public.finance_entries (project_id, direction, category, entry_kind, frequency, period_date, period_label, amount, description)
          VALUES
            (p.id,'out',cat::text,'rap','monthly',period_dt, to_char(period_dt,'Mon YYYY'), plan_amt, 'Plan '||cat),
            (p.id,'out',cat::text,'actual','monthly',period_dt, to_char(period_dt,'Mon YYYY'), act_amt, 'Actual '||cat);
        END LOOP;
      END LOOP;
    END IF;
  END LOOP;
END $$;
