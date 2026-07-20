
-- WBS: EPCC category on areas & items
ALTER TABLE public.work_areas ADD COLUMN IF NOT EXISTS epcc_category text NOT NULL DEFAULT 'construction';
ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS epcc_category text NOT NULL DEFAULT 'construction';

-- Risk enhancements
ALTER TABLE public.project_alerts
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS pic text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS current_status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS completion_percentage integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- Photo metadata
ALTER TABLE public.project_photos
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS photo_date date,
  ADD COLUMN IF NOT EXISTS activity_category text NOT NULL DEFAULT 'construction',
  ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '';

-- Weekly Progress Reports
CREATE TABLE IF NOT EXISTS public.weekly_progress_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  week_end_date date NOT NULL,
  achievements jsonb NOT NULL DEFAULT '[]'::jsonb,        -- [{category, description}]
  outstanding_items jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{item, note}]
  next_week_targets jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{target, owner}]
  escalations jsonb NOT NULL DEFAULT '[]'::jsonb,         -- [{issue, decision_needed}]
  summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_progress_reports TO anon, authenticated;
GRANT ALL ON public.weekly_progress_reports TO service_role;

ALTER TABLE public.weekly_progress_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view weekly reports" ON public.weekly_progress_reports FOR SELECT USING (true);
CREATE POLICY "Anyone can insert weekly reports" ON public.weekly_progress_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update weekly reports" ON public.weekly_progress_reports FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete weekly reports" ON public.weekly_progress_reports FOR DELETE USING (true);

CREATE TRIGGER update_weekly_reports_updated_at BEFORE UPDATE ON public.weekly_progress_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_weekly_reports_project ON public.weekly_progress_reports(project_id, week_start_date DESC);
