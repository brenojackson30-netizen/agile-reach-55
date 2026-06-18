CREATE TABLE IF NOT EXISTS public.daily_task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('post','video')),
  task_index INTEGER NOT NULL CHECK (task_index >= 0),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, employee_id, completed_date, kind, task_index)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_task_completions TO authenticated;
GRANT ALL ON public.daily_task_completions TO service_role;

ALTER TABLE public.daily_task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employee manages own completions"
  ON public.daily_task_completions
  FOR ALL
  TO authenticated
  USING (
    public.is_global_admin()
    OR employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.is_global_admin()
    OR employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_dtc_employee_date ON public.daily_task_completions (employee_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_dtc_client_date ON public.daily_task_completions (client_id, completed_date);