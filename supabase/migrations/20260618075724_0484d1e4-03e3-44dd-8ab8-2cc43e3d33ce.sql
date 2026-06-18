CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Remove job antigo se existir (idempotente)
DO $$
BEGIN
  PERFORM cron.unschedule('reset-post-completions-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Agenda limpeza diária às 03:00 America/Sao_Paulo (= 06:00 UTC)
SELECT cron.schedule(
  'reset-post-completions-daily',
  '0 6 * * *',
  $$DELETE FROM public.post_completions
    WHERE completed_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date;$$
);