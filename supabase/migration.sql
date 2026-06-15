-- ============================================================
-- AGILE — Schema completo + RLS multi-tenant
-- Rode este SQL no Supabase SQL Editor (uma única execução).
-- ============================================================

-- ============== TABELAS ==============
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  avatar_initials VARCHAR(3),
  color_hex VARCHAR(7) DEFAULT '#6366F1',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')),
  category TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','youtube','tiktok','facebook','threads','kwai')),
  handle TEXT NOT NULL,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES social_profiles(id) ON DELETE CASCADE,
  post_time VARCHAR(5) NOT NULL,
  post_type TEXT NOT NULL CHECK (post_type IN ('post','reels','shorts','video','carrossel','story','live')),
  label TEXT,
  days INTEGER[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_post_id UUID NOT NULL REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scheduled_post_id, completed_date)
);

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_initials VARCHAR(3),
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','editor','viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, client_id)
);

-- ============== ÍNDICES ==============
CREATE INDEX IF NOT EXISTS idx_post_completions_date ON post_completions(completed_date);
CREATE INDEX IF NOT EXISTS idx_post_completions_post ON post_completions(scheduled_post_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_profile ON scheduled_posts(profile_id);
CREATE INDEX IF NOT EXISTS idx_social_profiles_project ON social_profiles(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_assignments_employee ON client_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_assignments_client ON client_assignments(client_id);

-- ============== GRANTS ==============
GRANT SELECT, INSERT, UPDATE, DELETE ON clients, projects, social_profiles, scheduled_posts, post_completions, employees, client_assignments TO authenticated;
GRANT ALL ON clients, projects, social_profiles, scheduled_posts, post_completions, employees, client_assignments TO service_role;

-- ============== RLS ==============
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_assignments ENABLE ROW LEVEL SECURITY;

-- ============== HELPERS (SECURITY DEFINER) ==============
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT role FROM public.employees WHERE user_id = auth.uid() AND status = 'active' LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_client_access(p_client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN (SELECT role FROM public.employees WHERE user_id = auth.uid() AND status='active') = 'admin' THEN TRUE
    ELSE EXISTS (
      SELECT 1 FROM public.client_assignments ca
      JOIN public.employees e ON e.id = ca.employee_id
      WHERE e.user_id = auth.uid()
        AND ca.client_id = p_client_id
    )
  END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_client_access(UUID) TO authenticated;

-- ============== POLÍTICAS ==============
-- CLIENTS
DROP POLICY IF EXISTS clients_select ON clients;
DROP POLICY IF EXISTS clients_insert ON clients;
DROP POLICY IF EXISTS clients_update ON clients;
DROP POLICY IF EXISTS clients_delete ON clients;
CREATE POLICY clients_select ON clients FOR SELECT TO authenticated USING (public.has_client_access(id));
CREATE POLICY clients_insert ON clients FOR INSERT TO authenticated WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY clients_update ON clients FOR UPDATE TO authenticated USING (public.get_my_role() = 'admin');
CREATE POLICY clients_delete ON clients FOR DELETE TO authenticated USING (public.get_my_role() = 'admin');

-- PROJECTS
DROP POLICY IF EXISTS projects_select ON projects;
DROP POLICY IF EXISTS projects_insert ON projects;
DROP POLICY IF EXISTS projects_update ON projects;
DROP POLICY IF EXISTS projects_delete ON projects;
CREATE POLICY projects_select ON projects FOR SELECT TO authenticated USING (public.has_client_access(client_id));
CREATE POLICY projects_insert ON projects FOR INSERT TO authenticated WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY projects_update ON projects FOR UPDATE TO authenticated USING (public.get_my_role() = 'admin');
CREATE POLICY projects_delete ON projects FOR DELETE TO authenticated USING (public.get_my_role() = 'admin');

-- SOCIAL_PROFILES
DROP POLICY IF EXISTS profiles_select ON social_profiles;
DROP POLICY IF EXISTS profiles_insert ON social_profiles;
DROP POLICY IF EXISTS profiles_update ON social_profiles;
DROP POLICY IF EXISTS profiles_delete ON social_profiles;
CREATE POLICY profiles_select ON social_profiles FOR SELECT TO authenticated USING (
  public.has_client_access((SELECT client_id FROM projects WHERE id = project_id))
);
CREATE POLICY profiles_insert ON social_profiles FOR INSERT TO authenticated WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY profiles_update ON social_profiles FOR UPDATE TO authenticated USING (public.get_my_role() = 'admin');
CREATE POLICY profiles_delete ON social_profiles FOR DELETE TO authenticated USING (public.get_my_role() = 'admin');

-- SCHEDULED_POSTS
DROP POLICY IF EXISTS scheduled_posts_select ON scheduled_posts;
DROP POLICY IF EXISTS scheduled_posts_insert ON scheduled_posts;
DROP POLICY IF EXISTS scheduled_posts_update ON scheduled_posts;
DROP POLICY IF EXISTS scheduled_posts_delete ON scheduled_posts;
CREATE POLICY scheduled_posts_select ON scheduled_posts FOR SELECT TO authenticated USING (
  public.has_client_access((
    SELECT p.client_id FROM projects p
    JOIN social_profiles sp ON sp.project_id = p.id
    WHERE sp.id = profile_id
  ))
);
CREATE POLICY scheduled_posts_insert ON scheduled_posts FOR INSERT TO authenticated WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY scheduled_posts_update ON scheduled_posts FOR UPDATE TO authenticated USING (public.get_my_role() = 'admin');
CREATE POLICY scheduled_posts_delete ON scheduled_posts FOR DELETE TO authenticated USING (public.get_my_role() = 'admin');

-- POST_COMPLETIONS
DROP POLICY IF EXISTS completions_select ON post_completions;
DROP POLICY IF EXISTS completions_insert ON post_completions;
DROP POLICY IF EXISTS completions_delete ON post_completions;
CREATE POLICY completions_select ON post_completions FOR SELECT TO authenticated USING (
  public.has_client_access((
    SELECT p.client_id FROM projects p
    JOIN social_profiles sp ON sp.project_id = p.id
    JOIN scheduled_posts spo ON spo.profile_id = sp.id
    WHERE spo.id = scheduled_post_id
  ))
);
CREATE POLICY completions_insert ON post_completions FOR INSERT TO authenticated WITH CHECK (
  public.get_my_role() IN ('admin','editor') AND
  public.has_client_access((
    SELECT p.client_id FROM projects p
    JOIN social_profiles sp ON sp.project_id = p.id
    JOIN scheduled_posts spo ON spo.profile_id = sp.id
    WHERE spo.id = scheduled_post_id
  ))
);
CREATE POLICY completions_delete ON post_completions FOR DELETE TO authenticated USING (
  public.get_my_role() IN ('admin','editor') AND
  public.has_client_access((
    SELECT p.client_id FROM projects p
    JOIN social_profiles sp ON sp.project_id = p.id
    JOIN scheduled_posts spo ON spo.profile_id = sp.id
    WHERE spo.id = scheduled_post_id
  ))
);

-- EMPLOYEES
DROP POLICY IF EXISTS employees_select ON employees;
DROP POLICY IF EXISTS employees_insert ON employees;
DROP POLICY IF EXISTS employees_update ON employees;
DROP POLICY IF EXISTS employees_delete ON employees;
CREATE POLICY employees_select ON employees FOR SELECT TO authenticated USING (
  public.get_my_role() = 'admin' OR user_id = auth.uid()
);
CREATE POLICY employees_insert ON employees FOR INSERT TO authenticated WITH CHECK (
  public.get_my_role() = 'admin' OR user_id = auth.uid()
);
CREATE POLICY employees_update ON employees FOR UPDATE TO authenticated USING (public.get_my_role() = 'admin');
CREATE POLICY employees_delete ON employees FOR DELETE TO authenticated USING (
  public.get_my_role() = 'admin' AND user_id != auth.uid()
);

-- CLIENT_ASSIGNMENTS
DROP POLICY IF EXISTS assignments_select ON client_assignments;
DROP POLICY IF EXISTS assignments_insert ON client_assignments;
DROP POLICY IF EXISTS assignments_delete ON client_assignments;
CREATE POLICY assignments_select ON client_assignments FOR SELECT TO authenticated USING (
  public.get_my_role() = 'admin' OR
  employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
);
CREATE POLICY assignments_insert ON client_assignments FOR INSERT TO authenticated WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY assignments_delete ON client_assignments FOR DELETE TO authenticated USING (public.get_my_role() = 'admin');

-- ============== REALTIME ==============
ALTER PUBLICATION supabase_realtime ADD TABLE post_completions;
ALTER PUBLICATION supabase_realtime ADD TABLE client_assignments;

-- ============== BOOTSTRAP DO PRIMEIRO ADMIN ==============
-- Após criar seu usuário no Supabase Auth (Dashboard → Authentication → Users → Add user),
-- pegue o user_id e rode:
--
-- INSERT INTO employees (user_id, name, role, status, avatar_initials)
-- VALUES ('SEU-USER-ID-AQUI', 'Seu Nome', 'admin', 'active', 'XX');
