ALTER TABLE public.addendums
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.addendums
  ALTER COLUMN approval_status SET DEFAULT 'on_progress';

UPDATE public.addendums
SET approval_status = 'on_progress'
WHERE approval_status = 'pending';