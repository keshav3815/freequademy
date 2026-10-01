-- ARCH-V1: self-owned error log + Web Vitals (D7 replacement) and the shared rate limiter.
BEGIN;
\ir ../helpers.psql
SELECT plan(16);

SELECT tests.create_user('student@test.local') AS student \gset
SELECT tests.create_user('admin@test.local') AS admin \gset
SELECT tests.make_admin(:'admin');

-- ---- error reports: write-only, scrubbed, capped ---------------------------------
SELECT tests.become_anon();
SELECT lives_ok($$SELECT public.report_client_error(jsonb_build_object(
    'environment', 'staging', 'release', 'abc123', 'route', '/tests/:id?token=secret-token',
    'source', 'window.onerror', 'error_type', 'TypeError',
    -- jwt.io example token, concatenated so secret scanners do not flag the fixture
    'message', 'failed for asha@example.com with ' || concat_ws('.', 'eyJhbGciOiJIUzI1NiJ9', 'eyJzdWIiOiIxMjM0NTY3ODkwIn0', 'dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U') || ' and +91 98765 43210',
    'stack', repeat('x', 10000)))$$,
  'anonymous visitors can report an error');
SELECT throws_ok('SELECT count(*) FROM public.client_errors', '42501', NULL,
  'anonymous visitors cannot read error reports');
RESET ROLE;

SELECT tests.authenticate_as(:'student');
SELECT is((SELECT count(*)::int FROM public.client_errors), 0, 'a student cannot read error reports');
SELECT throws_ok('SELECT * FROM public.get_client_error_summary()', '42501', NULL,
  'a student cannot read the error summary');
SELECT throws_ok($$INSERT INTO public.client_errors (environment) VALUES ('x')$$, '42501', NULL,
  'no direct inserts: reports only go through the scrubbing function');
RESET ROLE;

SELECT is((SELECT message FROM public.client_errors LIMIT 1),
  'failed for [redacted] with [redacted] and [redacted]',
  'email, JWT and phone number are scrubbed server-side as well');
SELECT is((SELECT route FROM public.client_errors LIMIT 1), '/tests/:id', 'query strings are dropped from routes');
SELECT is((SELECT length(stack) FROM public.client_errors LIMIT 1), 4000, 'stack traces are capped at 4000 characters');

SELECT tests.authenticate_as(:'admin');
SELECT is((SELECT occurrences::int FROM public.get_client_error_summary() WHERE error_type = 'TypeError'), 1,
  'admins see grouped error reports');
RESET ROLE;

-- ---- per-user cap: the 31st report in an hour is silently dropped -----------------
SELECT tests.authenticate_as(:'student');
SELECT public.report_client_error(jsonb_build_object('environment', 'staging', 'error_type', 'LoopError', 'message', 'loop'))
  FROM generate_series(1, 35);
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.client_errors WHERE error_type = 'LoopError'), 30,
  'an error loop stores at most 30 reports per user per hour, without raising');

-- ---- web vitals ------------------------------------------------------------------
SELECT tests.authenticate_as(:'student');
SELECT public.report_web_vital('LCP', 1800, 'good', '/dashboard', 'production', 'abc123', '4g');
SELECT public.report_web_vital('LCP', 3200, 'needs-improvement', '/dashboard', 'production', 'abc123', '4g');
SELECT public.report_web_vital('BOGUS', 1, 'good', '/dashboard', 'production');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.client_vitals), 2, 'valid vitals are stored, unknown metrics ignored');
SELECT tests.authenticate_as(:'admin');
SELECT is((SELECT p50 FROM public.get_web_vitals_summary(7, 'production') WHERE metric = 'LCP' AND route = '/dashboard'),
  2500::double precision, 'admins get percentile summaries per route');
RESET ROLE;

-- ---- write throttling surfaces as HTTP 429 (SQLSTATE PT429) ------------------------
SELECT ok(private.hit_rate_limit('test:bucket', 2, interval '1 hour'), 'first hit allowed');
SELECT ok(private.hit_rate_limit('test:bucket', 2, interval '1 hour'), 'second hit allowed');
SELECT ok(NOT private.hit_rate_limit('test:bucket', 2, interval '1 hour'), 'third hit over a limit of 2 is refused');
SELECT tests.authenticate_as(:'student');
SELECT throws_ok($$SELECT private.enforce_rate_limit('x', 1, interval '1 hour')$$, '42501', NULL,
  'rate-limit internals are not callable by API users');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
