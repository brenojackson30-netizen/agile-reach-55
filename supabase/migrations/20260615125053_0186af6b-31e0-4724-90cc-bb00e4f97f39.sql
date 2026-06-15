
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS avatar_initials text,
  ADD COLUMN IF NOT EXISTS color_hex text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS avatar_initials text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage all projects" ON public.projects;
CREATE POLICY "Admins manage all projects" ON public.projects FOR ALL TO authenticated
  USING (public.is_global_admin()) WITH CHECK (public.is_global_admin());
DROP POLICY IF EXISTS "Employees view assigned client projects" ON public.projects;
CREATE POLICY "Employees view assigned client projects" ON public.projects FOR SELECT TO authenticated
  USING (public.has_client_access(client_id, ARRAY['admin','editor','viewer']));

CREATE TABLE IF NOT EXISTS public.social_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform text NOT NULL,
  handle text NOT NULL,
  url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_profiles TO authenticated;
GRANT ALL ON public.social_profiles TO service_role;
ALTER TABLE public.social_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage all social profiles" ON public.social_profiles;
CREATE POLICY "Admins manage all social profiles" ON public.social_profiles FOR ALL TO authenticated
  USING (public.is_global_admin()) WITH CHECK (public.is_global_admin());
DROP POLICY IF EXISTS "Employees view profiles of assigned projects" ON public.social_profiles;
CREATE POLICY "Employees view profiles of assigned projects" ON public.social_profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = social_profiles.project_id
        AND public.has_client_access(p.client_id, ARRAY['admin','editor','viewer'])
    )
  );

ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.social_profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS post_time text,
  ADD COLUMN IF NOT EXISTS post_type text,
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS days integer[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6]::integer[];
ALTER TABLE public.scheduled_posts ALTER COLUMN content DROP NOT NULL;
ALTER TABLE public.scheduled_posts ALTER COLUMN platform DROP NOT NULL;
ALTER TABLE public.scheduled_posts ALTER COLUMN scheduled_date DROP NOT NULL;

ALTER TABLE public.post_completions
  ADD COLUMN IF NOT EXISTS scheduled_post_id uuid REFERENCES public.scheduled_posts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS completed_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date);
ALTER TABLE public.post_completions ALTER COLUMN post_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS post_completions_post_date_unique
  ON public.post_completions(scheduled_post_id, completed_date)
  WHERE scheduled_post_id IS NOT NULL;

ALTER TABLE public.client_assignments ALTER COLUMN role DROP NOT NULL;
ALTER TABLE public.client_assignments
  ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.post_completions;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.client_assignments;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
