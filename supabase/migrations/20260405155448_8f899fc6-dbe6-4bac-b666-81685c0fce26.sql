
-- Add status column to profiles for approval workflow
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Update existing profiles to active
UPDATE public.profiles SET status = 'active' WHERE status = 'pending';

-- Add approval fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_by uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Update handle_new_user to set status to pending by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), 'pending');
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
