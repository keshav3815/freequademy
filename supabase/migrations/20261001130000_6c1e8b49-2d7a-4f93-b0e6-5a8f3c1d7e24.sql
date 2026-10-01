-- Architecture V1 Phase 4: background jobs (queue, retries, dead letter, cron).
--
-- A Postgres-table queue claimed with FOR UPDATE SKIP LOCKED. Chosen over pgmq
-- because job state (status, attempts, last error, timings) must be queryable
-- and testable as ordinary rows, and it needs no extension beyond pg_cron for
-- scheduling. Everything is free and runs inside the existing project.
--
--   private.jobs                 one row per job; unique (type, idempotency_key)
--   private.enqueue_job()        idempotent: a duplicate key returns the existing job
--   private.claim_jobs()         locks due jobs, marks running, counts the attempt
--   private.complete_job()       succeeded
--   private.fail_job()           retrying with exponential backoff, or dead after
--                                max_attempts (the dead-letter state)
--   private.run_sql_jobs()       executes the built-in SQL job types
--   private.enqueue_daily_maintenance()  one set of maintenance jobs per day
--   public.jobs_claim/complete/fail      service_role-only wrappers for the
--                                        `worker` Edge Function (external jobs)
--   public.get_job_health()      admins: queue depth, retries, dead letters
--
-- pg_cron (free extension on every Supabase plan) runs the SQL jobs every five
-- minutes and enqueues maintenance daily at 02:00 IST. The block is skipped on
-- a Postgres without pg_cron, so local tests still apply this migration.
--
-- Rollback: supabase/rollbacks/20261001130000_jobs.sql

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.jobs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type text NOT NULL CHECK (type ~ '^[a-z][a-z0-9_]{2,63}$'),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'retrying', 'dead')),
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 20),
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  last_error text,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (type, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_jobs_due ON private.jobs (scheduled_at) WHERE status IN ('queued', 'retrying');
CREATE INDEX IF NOT EXISTS idx_jobs_status ON private.jobs (status, created_at);

CREATE OR REPLACE FUNCTION private.enqueue_job(
  _type text, _payload jsonb, _idempotency_key text, _run_at timestamptz DEFAULT now(), _max_attempts integer DEFAULT 5)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
DECLARE
  _id bigint;
BEGIN
  INSERT INTO private.jobs (type, payload, idempotency_key, scheduled_at, max_attempts, request_id)
  VALUES (_type, coalesce(_payload, '{}'::jsonb), _idempotency_key, coalesce(_run_at, now()), _max_attempts,
          left(current_setting('request.headers', true)::jsonb->>'x-request-id', 64))
  ON CONFLICT (type, idempotency_key) DO NOTHING
  RETURNING id INTO _id;
  IF _id IS NULL THEN
    SELECT id INTO _id FROM private.jobs WHERE type = _type AND idempotency_key = _idempotency_key;
  END IF;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION private.claim_jobs(_limit integer, _types text[] DEFAULT NULL)
RETURNS SETOF private.jobs
LANGUAGE sql
SECURITY DEFINER
SET search_path = private, public
AS $$
  UPDATE private.jobs j
     SET status = 'running', attempt_count = j.attempt_count + 1, started_at = clock_timestamp()
   WHERE j.id IN (
     SELECT id FROM private.jobs
      WHERE status IN ('queued', 'retrying') AND scheduled_at <= clock_timestamp()
        AND (_types IS NULL OR type = ANY (_types))
      ORDER BY scheduled_at, id
      LIMIT greatest(least(_limit, 100), 1)
      FOR UPDATE SKIP LOCKED)
  RETURNING j.*;
$$;

CREATE OR REPLACE FUNCTION private.complete_job(_id bigint)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = private, public
AS $$
  UPDATE private.jobs SET status = 'succeeded', completed_at = clock_timestamp(), last_error = NULL
   WHERE id = _id AND status = 'running';
$$;

-- Backoff: 30 s, 60 s, 120 s, ... capped at 1 hour.
CREATE OR REPLACE FUNCTION private.fail_job(_id bigint, _error text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
DECLARE
  _status text;
BEGIN
  UPDATE private.jobs
     SET status = CASE WHEN attempt_count >= max_attempts THEN 'dead' ELSE 'retrying' END,
         scheduled_at = CASE WHEN attempt_count >= max_attempts THEN scheduled_at
                             ELSE clock_timestamp() + least(interval '30 seconds' * power(2, attempt_count - 1), interval '1 hour') END,
         completed_at = CASE WHEN attempt_count >= max_attempts THEN clock_timestamp() END,
         last_error = left(_error, 1000)
   WHERE id = _id AND status = 'running'
  RETURNING status INTO _status;
  RETURN _status;
END;
$$;

-- Built-in SQL jobs. Each runs in its own subtransaction: a failing job is
-- rolled back and retried without affecting the others.
CREATE OR REPLACE FUNCTION private.run_sql_jobs(_limit integer DEFAULT 50)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
DECLARE
  _job private.jobs;
  _done integer := 0;
BEGIN
  FOR _job IN SELECT * FROM private.claim_jobs(_limit, ARRAY[
      'purge_client_telemetry', 'purge_ai_usage', 'purge_rate_limit_counters', 'purge_finished_jobs', 'test_job'])
  LOOP
    BEGIN
      CASE _job.type
        WHEN 'purge_client_telemetry' THEN
          DELETE FROM public.client_errors WHERE created_at < now() - interval '30 days';
          DELETE FROM public.client_vitals WHERE created_at < now() - interval '30 days';
        WHEN 'purge_ai_usage' THEN
          DELETE FROM public.ai_usage_daily WHERE usage_date < current_date - 90;
        WHEN 'purge_rate_limit_counters' THEN
          DELETE FROM private.rate_limit_counters WHERE window_start < now() - interval '2 days';
        WHEN 'purge_finished_jobs' THEN
          DELETE FROM private.jobs WHERE status = 'succeeded' AND completed_at < now() - interval '14 days';
        WHEN 'test_job' THEN
          -- Used by pgTAP to exercise retry and dead-letter handling.
          IF (_job.payload->>'fail')::boolean THEN
            RAISE EXCEPTION 'test_job failed on purpose (attempt %)', _job.attempt_count;
          END IF;
      END CASE;
      PERFORM private.complete_job(_job.id);
      _done := _done + 1;
    EXCEPTION WHEN OTHERS THEN
      PERFORM private.fail_job(_job.id, SQLERRM);
    END;
  END LOOP;
  RETURN _done;
END;
$$;

CREATE OR REPLACE FUNCTION private.enqueue_daily_maintenance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
DECLARE
  _day text := to_char((now() AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD');
BEGIN
  PERFORM private.enqueue_job('purge_client_telemetry', '{}', _day);
  PERFORM private.enqueue_job('purge_ai_usage', '{}', _day);
  PERFORM private.enqueue_job('purge_rate_limit_counters', '{}', _day);
  PERFORM private.enqueue_job('purge_finished_jobs', '{}', _day);
END;
$$;

REVOKE ALL ON ALL TABLES IN SCHEMA private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Service-role wrappers for the `worker` Edge Function (external jobs: email,
-- AI retries, reports). Never callable by anon or signed-in users.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.jobs_claim(_types text[], _limit integer DEFAULT 10)
RETURNS TABLE (id bigint, type text, payload jsonb, attempt_count integer, request_id text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = private, public
AS $$
  SELECT c.id, c.type, c.payload, c.attempt_count, c.request_id FROM private.claim_jobs(_limit, _types) c;
$$;

CREATE OR REPLACE FUNCTION public.jobs_complete(_id bigint)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = private, public
AS $$ SELECT private.complete_job(_id); $$;

CREATE OR REPLACE FUNCTION public.jobs_fail(_id bigint, _error text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = private, public
AS $$ SELECT private.fail_job(_id, _error); $$;

CREATE OR REPLACE FUNCTION public.jobs_enqueue(_type text, _payload jsonb, _idempotency_key text)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = private, public
AS $$ SELECT private.enqueue_job(_type, _payload, _idempotency_key); $$;

REVOKE ALL ON FUNCTION public.jobs_claim(text[], integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.jobs_complete(bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.jobs_fail(bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.jobs_enqueue(text, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.jobs_claim(text[], integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.jobs_complete(bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.jobs_fail(bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.jobs_enqueue(text, jsonb, text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_job_health()
RETURNS TABLE (status text, type text, jobs bigint, oldest_scheduled_at timestamptz, last_error text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = private, public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT j.status, j.type, count(*), min(j.scheduled_at), (array_agg(j.last_error ORDER BY j.id DESC))[1]
      FROM private.jobs j
     WHERE j.status <> 'succeeded'
     GROUP BY 1, 2
     ORDER BY 1, 2;
END;
$$;
REVOKE ALL ON FUNCTION public.get_job_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_job_health() TO authenticated;

-- ---------------------------------------------------------------------------
-- Scheduling (skipped where pg_cron is unavailable)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS pg_cron;
      PERFORM cron.schedule('freequademy-run-sql-jobs', '*/5 * * * *', 'SELECT private.run_sql_jobs(50)');
      PERFORM cron.schedule('freequademy-daily-maintenance', '30 20 * * *', 'SELECT private.enqueue_daily_maintenance()');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
    END;
  END IF;
END $$;
