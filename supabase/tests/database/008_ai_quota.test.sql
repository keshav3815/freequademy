-- AI-001: per-user daily AI quota enforced in the database.
BEGIN;
\ir ../helpers.psql
SELECT plan(11);

SELECT tests.create_user('student-a@test.local') AS student_a \gset
SELECT tests.create_user('student-b@test.local') AS student_b \gset

SELECT tests.become_anon();
SELECT throws_ok('SELECT * FROM public.consume_ai_quota()', '42501', NULL,
  'anonymous caller cannot consume AI quota');
SELECT ok(NOT has_schema_privilege('anon', 'private', 'USAGE') AND NOT has_schema_privilege('authenticated', 'private', 'USAGE'),
  'internal helpers in the private schema are unreachable for API roles');
RESET ROLE;

SELECT tests.authenticate_as(:'student_a');
SELECT results_eq('SELECT allowed, remaining, daily_limit FROM public.consume_ai_quota()',
  $$VALUES (true, 29, 30)$$, 'first request of the day is allowed');

-- use up the remaining 29 requests
CREATE TEMP TABLE quota_results (allowed boolean);
GRANT INSERT, SELECT ON quota_results TO authenticated;
DO $$
BEGIN
  FOR i IN 1..29 LOOP
    INSERT INTO quota_results SELECT q.allowed FROM public.consume_ai_quota() q;
  END LOOP;
END $$;
SELECT is((SELECT count(*)::int FROM quota_results WHERE allowed), 29,
  'requests up to the daily limit are allowed');
SELECT results_eq('SELECT allowed, remaining FROM public.consume_ai_quota()',
  $$VALUES (false, 0)$$, 'request beyond the daily limit is refused');
SELECT is((SELECT request_count FROM public.ai_usage_daily WHERE user_id = :'student_a'), 30,
  'refused requests do not increase the counter past the limit');

SELECT throws_ok(
  format($$UPDATE public.ai_usage_daily SET request_count = 0 WHERE user_id = %L$$, :'student_a'),
  '42501', NULL, 'student cannot reset their own usage counter');
SELECT throws_ok(
  format($$DELETE FROM public.ai_usage_daily WHERE user_id = %L$$, :'student_a'),
  '42501', NULL, 'student cannot delete their usage row');
SELECT throws_ok(
  format($$INSERT INTO public.ai_usage_daily (user_id, usage_date, request_count) VALUES (%L, current_date + 1, 0)$$, :'student_a'),
  '42501', NULL, 'student cannot insert usage rows');

RESET ROLE;
SELECT tests.authenticate_as(:'student_b');
SELECT is_empty(format('SELECT 1 FROM public.ai_usage_daily WHERE user_id = %L', :'student_a'),
  'student cannot read another student''s usage');
SELECT results_eq('SELECT allowed FROM public.consume_ai_quota()', $$VALUES (true)$$,
  'quotas are tracked per user');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
