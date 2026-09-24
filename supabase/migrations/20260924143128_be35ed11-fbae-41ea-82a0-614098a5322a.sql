ALTER TABLE public.addendums ADD COLUMN IF NOT EXISTS document_url text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS alias text;