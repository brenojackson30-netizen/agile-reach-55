-- Adiciona o status 'pending': funcionário convidado que ainda não definiu a senha.
-- O funcionário passa para 'active' automaticamente no primeiro acesso (ver definir-senha.tsx).
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_status_check;
ALTER TABLE public.employees ADD CONSTRAINT employees_status_check CHECK (status IN ('pending', 'active', 'inactive'));
ALTER TABLE public.employees ALTER COLUMN status SET DEFAULT 'pending';
