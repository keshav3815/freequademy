-- ARCH-V1 Phase 4: job queue — idempotency, retries with backoff, dead letter,
-- maintenance jobs, and access control.
BEGIN;
\ir ../helpers.psql
SELECT plan(15);

SELECT tests.create_user('student@test.local') AS student \gset
SELECT tests.create_user('admin@test.local') AS admin \gset
SELECT tests.make_admin(:'admin');

-- ---- idempotency --------------------------------------------------------------------
SELECT private.enqueue_job('test_job', '{"fail": false}', 'k1') AS first_id \gset
SELECT is(private.enqueue_job('test_job', '{"fail": false}', 'k1'), :'first_id'::bigint,
  'enqueueing the same idempotency key twice returns the same job');
SELECT is((SELECT count(*)::int FROM private.jobs WHERE type = 'test_job' AND idempotency_key = 'k1'), 1,
  'a duplicate enqueue does not create a second job');

-- ---- success path --------------------------------------------------------------------
SELECT is(private.run_sql_jobs(10), 1, 'the worker runs the due job');
SELECT results_eq($$SELECT status, attempt_count FROM private.jobs WHERE idempotency_key = 'k1'$$,
  $$VALUES ('succeeded'::text, 1)$$, 'a successful job is marked succeeded after one attempt');
SELECT is(private.run_sql_jobs(10), 0, 'a succeeded job is never run again');

-- ---- retry and dead letter -------------------------------------------------------------
SELECT private.enqueue_job('test_job', '{"fail": true}', 'k2', now(), 2) AS fail_id \gset
SELECT private.run_sql_jobs(10);
SELECT results_eq(format('SELECT status, attempt_count, last_error LIKE %L FROM private.jobs WHERE id = %s', 'test_job failed on purpose%', :'fail_id'),
  $$VALUES ('retrying'::text, 1, true)$$, 'a failing job is retried and keeps its last error');
SELECT ok((SELECT scheduled_at > clock_timestamp() FROM private.jobs WHERE id = :'fail_id'),
  'a retry is scheduled in the future (backoff)');
SELECT is(private.run_sql_jobs(10), 0, 'a job in backoff is not picked up early');
UPDATE private.jobs SET scheduled_at = now() - interval '1 second' WHERE id = :'fail_id';
SELECT private.run_sql_jobs(10);
SELECT results_eq(format('SELECT status, attempt_count FROM private.jobs WHERE id = %s', :'fail_id'),
  $$VALUES ('dead'::text, 2)$$, 'after max_attempts the job is dead-lettered, not retried forever');

-- ---- maintenance ------------------------------------------------------------------------
INSERT INTO public.client_errors (environment, created_at) VALUES ('production', now() - interval '31 days'), ('production', now());
SELECT private.enqueue_daily_maintenance();
SELECT private.enqueue_daily_maintenance();
SELECT is((SELECT count(*)::int FROM private.jobs WHERE type LIKE 'purge_%'), 4,
  'daily maintenance enqueues one set of jobs per day, however often cron fires');
SELECT private.run_sql_jobs(50);
SELECT is((SELECT count(*)::int FROM public.client_errors), 1, 'telemetry older than 30 days is purged');

-- ---- access control ------------------------------------------------------------------------
SELECT tests.authenticate_as(:'student');
SELECT throws_ok($$SELECT * FROM public.jobs_claim(ARRAY['email'], 1)$$, '42501', NULL,
  'students cannot claim jobs');
SELECT throws_ok($$SELECT public.jobs_enqueue('email', '{}', 'x')$$, '42501', NULL,
  'students cannot enqueue jobs');
SELECT throws_ok('SELECT * FROM public.get_job_health()', '42501', NULL, 'students cannot read queue health');
RESET ROLE;

SELECT tests.authenticate_as(:'admin');
SELECT is((SELECT jobs::int FROM public.get_job_health() WHERE status = 'dead' AND type = 'test_job'), 1,
  'admins see dead-lettered jobs in queue health');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
