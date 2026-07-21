
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'admin@pamitra.co.id'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'management'::app_role FROM auth.users WHERE email = 'director@pamitra.co.id'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'team'::app_role FROM auth.users WHERE email = 'proyek1@pamitra.co.id'
ON CONFLICT (user_id, role) DO NOTHING;
