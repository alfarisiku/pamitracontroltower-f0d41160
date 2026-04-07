-- Create project_photos table for weekly progress photos
CREATE TABLE public.project_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text DEFAULT '',
  week_label text DEFAULT '',
  uploaded_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.project_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view project photos" ON public.project_photos FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert project photos" ON public.project_photos FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update project photos" ON public.project_photos FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete project photos" ON public.project_photos FOR DELETE TO public USING (true);

-- Create storage bucket for project photos
INSERT INTO storage.buckets (id, name, public) VALUES ('project-photos', 'project-photos', true);

-- Storage policies
CREATE POLICY "Anyone can upload project photos" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'project-photos');
CREATE POLICY "Anyone can view project photos storage" ON storage.objects FOR SELECT TO public USING (bucket_id = 'project-photos');
CREATE POLICY "Anyone can delete project photos storage" ON storage.objects FOR DELETE TO public USING (bucket_id = 'project-photos');