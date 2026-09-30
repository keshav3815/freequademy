-- ARCH-V1 Phase 0: anon-callable SECURITY DEFINER hardening.
BEGIN;
\ir ../helpers.psql
SELECT plan(7);

SELECT tests.create_user('student@test.local') AS student \gset

-- get_user_counts: platform totals are no longer public or visible to users.
SELECT tests.become_anon();
SELECT throws_ok('SELECT * FROM public.get_user_counts()', '42501', NULL,
  'anonymous caller cannot read platform user counts');
RESET ROLE;

SELECT tests.authenticate_as(:'student');
SELECT throws_ok('SELECT * FROM public.get_user_counts()', '42501', NULL,
  'a signed-in student cannot read platform user counts');
RESET ROLE;

SELECT ok(has_function_privilege('service_role', 'public.get_user_counts()', 'EXECUTE'),
  'service role keeps access for admin tooling');

-- Kept on purpose: public pages depend on these for anonymous visitors.
SELECT ok(has_function_privilege('anon', 'public.has_role(uuid, public.app_role)', 'EXECUTE'),
  'has_role stays callable by anon: RLS on public lessons/tests evaluates it');
SELECT ok(has_function_privilege('anon', 'public.is_mentor(uuid)', 'EXECUTE'),
  'is_mentor stays callable by anon: RLS on public lessons/tests evaluates it');

SELECT tests.become_anon();
SELECT lives_ok('SELECT count(*) FROM public.lessons',
  'anonymous course browsing still works after the hardening');
SELECT lives_ok($$SELECT * FROM public.session_participant_counts(ARRAY[]::uuid[])$$,
  'public mentorship page can still read session counts');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
