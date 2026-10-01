-- Rollback for 20261001130000_6c1e8b49-2d7a-4f93-b0e6-5a8f3c1d7e24.sql
DO $$
BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    PERFORM cron.unschedule(jobname) FROM cron.job
     WHERE jobname IN ('freequademy-run-sql-jobs', 'freequademy-daily-maintenance');
  END IF;
END $$;
DROP FUNCTION IF EXISTS public.get_job_health();
DROP FUNCTION IF EXISTS public.jobs_enqueue(text, jsonb, text);
DROP FUNCTION IF EXISTS public.jobs_fail(bigint, text);
DROP FUNCTION IF EXISTS public.jobs_complete(bigint);
DROP FUNCTION IF EXISTS public.jobs_claim(text[], integer);
DROP FUNCTION IF EXISTS private.enqueue_daily_maintenance();
DROP FUNCTION IF EXISTS private.run_sql_jobs(integer);
DROP FUNCTION IF EXISTS private.fail_job(bigint, text);
DROP FUNCTION IF EXISTS private.complete_job(bigint);
DROP FUNCTION IF EXISTS private.claim_jobs(integer, text[]);
DROP FUNCTION IF EXISTS private.enqueue_job(text, jsonb, text, timestamptz, integer);
DROP TABLE IF EXISTS private.jobs;
