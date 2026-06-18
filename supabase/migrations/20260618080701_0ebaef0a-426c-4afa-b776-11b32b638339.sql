DO $$
BEGIN
  PERFORM cron.unschedule('reset-daily-task-completions');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'reset-daily-task-completions',
  '0 6 * * *',
  $$DELETE FROM public.daily_task_completions
    WHERE completed_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date;$$
);