CREATE TABLE public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    website_url TEXT,
    instagram_url TEXT,
    facebook_url TEXT,
    linkedin_url TEXT,
    twitter_url TEXT,
    brand_color TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.client_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(employee_id, client_id)
);

CREATE TABLE public.scheduled_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'cancelled')),
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'linkedin', 'twitter')),
    created_by UUID REFERENCES public.employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.post_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.scheduled_posts(id) ON DELETE CASCADE,
    completed_by UUID REFERENCES public.employees(id),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    notes TEXT
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_assignments TO authenticated;
GRANT ALL ON public.client_assignments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_posts TO authenticated;
GRANT ALL ON public.scheduled_posts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_completions TO authenticated;
GRANT ALL ON public.post_completions TO service_role;

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_completions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (SELECT 1 FROM public.employees WHERE user_id = auth.uid() AND role = 'admin')
$$;

CREATE OR REPLACE FUNCTION public.has_client_access(p_client_id UUID, p_required_role TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.client_assignments ca
        JOIN public.employees e ON ca.employee_id = e.id
        WHERE e.user_id = auth.uid()
          AND ca.client_id = p_client_id
          AND ca.role = ANY(p_required_role)
    )
$$;

CREATE POLICY "employees_select_all" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "employees_insert_admin" ON public.employees FOR INSERT TO authenticated WITH CHECK (public.is_global_admin());
CREATE POLICY "employees_update_self_or_admin" ON public.employees FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_global_admin());
CREATE POLICY "employees_delete_admin" ON public.employees FOR DELETE TO authenticated USING (public.is_global_admin());

CREATE POLICY "clients_select_with_access" ON public.clients FOR SELECT TO authenticated USING (
    public.is_global_admin() OR public.has_client_access(id, ARRAY['admin', 'editor', 'viewer'])
);
CREATE POLICY "clients_insert_admin" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.is_global_admin());
CREATE POLICY "clients_update_admin" ON public.clients FOR UPDATE TO authenticated USING (
    public.is_global_admin() OR public.has_client_access(id, ARRAY['admin'])
);
CREATE POLICY "clients_delete_admin" ON public.clients FOR DELETE TO authenticated USING (
    public.is_global_admin() OR public.has_client_access(id, ARRAY['admin'])
);

CREATE POLICY "assignments_select_with_access" ON public.client_assignments FOR SELECT TO authenticated USING (
    public.is_global_admin() OR public.has_client_access(client_id, ARRAY['admin', 'editor', 'viewer'])
);
CREATE POLICY "assignments_insert_admin" ON public.client_assignments FOR INSERT TO authenticated WITH CHECK (
    public.is_global_admin() OR public.has_client_access(client_id, ARRAY['admin'])
);
CREATE POLICY "assignments_update_admin" ON public.client_assignments FOR UPDATE TO authenticated USING (
    public.is_global_admin() OR public.has_client_access(client_id, ARRAY['admin'])
);
CREATE POLICY "assignments_delete_admin" ON public.client_assignments FOR DELETE TO authenticated USING (
    public.is_global_admin() OR public.has_client_access(client_id, ARRAY['admin'])
);

CREATE POLICY "posts_select_with_access" ON public.scheduled_posts FOR SELECT TO authenticated USING (
    public.is_global_admin() OR public.has_client_access(client_id, ARRAY['admin', 'editor', 'viewer'])
);
CREATE POLICY "posts_insert_with_access" ON public.scheduled_posts FOR INSERT TO authenticated WITH CHECK (
    public.is_global_admin() OR public.has_client_access(client_id, ARRAY['admin', 'editor'])
);
CREATE POLICY "posts_update_with_access" ON public.scheduled_posts FOR UPDATE TO authenticated USING (
    public.is_global_admin() OR public.has_client_access(client_id, ARRAY['admin', 'editor'])
);
CREATE POLICY "posts_delete_with_access" ON public.scheduled_posts FOR DELETE TO authenticated USING (
    public.is_global_admin() OR public.has_client_access(client_id, ARRAY['admin'])
);

CREATE POLICY "completions_select_with_access" ON public.post_completions FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.scheduled_posts sp
        WHERE sp.id = post_id AND (
            public.is_global_admin() OR public.has_client_access(sp.client_id, ARRAY['admin', 'editor', 'viewer'])
        )
    )
);
CREATE POLICY "completions_insert_with_access" ON public.post_completions FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.scheduled_posts sp
        WHERE sp.id = post_id AND (
            public.is_global_admin() OR public.has_client_access(sp.client_id, ARRAY['admin', 'editor'])
        )
    )
);

CREATE INDEX idx_employees_user_id ON public.employees(user_id);
CREATE INDEX idx_client_assignments_employee_id ON public.client_assignments(employee_id);
CREATE INDEX idx_client_assignments_client_id ON public.client_assignments(client_id);
CREATE INDEX idx_scheduled_posts_client_id ON public.scheduled_posts(client_id);
CREATE INDEX idx_scheduled_posts_status ON public.scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_scheduled_date ON public.scheduled_posts(scheduled_date);
CREATE INDEX idx_post_completions_post_id ON public.post_completions(post_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_completions;

INSERT INTO public.employees (user_id, name, email, role, is_active)
VALUES ('dda1bffe-742c-40c3-8fbb-49697e6d791d', 'Admin', 'admin@example.com', 'admin', true);