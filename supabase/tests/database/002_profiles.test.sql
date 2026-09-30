-- SEC-001 / SEC-004: profiles.role and profiles.email are platform-managed.
BEGIN;
\ir ../helpers.psql
SELECT plan(13);

SELECT tests.create_user('student-a@test.local', '{"full_name":"Student A"}') AS student_a \gset
SELECT tests.create_user('student-b@test.local', '{"full_name":"Student B"}') AS student_b \gset
SELECT tests.create_user('mentor@test.local', '{"full_name":"Mentor"}') AS mentor \gset
SELECT tests.make_mentor(:'mentor');

-- ---- student A --------------------------------------------------------------
SELECT tests.authenticate_as(:'student_a');

SELECT lives_ok(
  format($$UPDATE public.profiles SET full_name = 'Renamed A', grade = '9' WHERE id = %L$$, :'student_a'),
  'student can update own display fields');
SELECT is((SELECT full_name FROM public.profiles WHERE id = :'student_a'), 'Renamed A',
  'own display field update is persisted');

SELECT throws_ok(
  format($$UPDATE public.profiles SET role = 'mentor' WHERE id = %L$$, :'student_a'),
  '42501', NULL, 'student cannot promote themselves by updating profiles.role');
SELECT throws_ok(
  format($$UPDATE public.profiles SET role = 'mentor', full_name = 'x' WHERE id = %L$$, :'student_a'),
  '42501', NULL, 'student cannot smuggle a role change alongside allowed columns');
SELECT throws_ok(
  format($$UPDATE public.profiles SET email = 'victim@test.local' WHERE id = %L$$, :'student_a'),
  '42501', NULL, 'student cannot change profiles.email directly (email squatting)');
SELECT throws_ok(
  format($$INSERT INTO public.profiles (id, email, role) VALUES (%L, 'x@test.local', 'mentor')$$, gen_random_uuid()),
  '42501', NULL, 'clients cannot insert profile rows');

SELECT is_empty(
  format('SELECT 1 FROM public.profiles WHERE id = %L', :'student_b'),
  'student cannot read another student''s profile');

-- Cross-user update is filtered by RLS (0 rows) — verified below as postgres.
UPDATE public.profiles SET full_name = 'Hacked' WHERE id = :'student_b';

-- ---- mentor -----------------------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'mentor');
SELECT throws_ok(
  format($$UPDATE public.profiles SET role = 'student' WHERE id = %L$$, :'student_b'),
  '42501', NULL, 'mentor cannot change another user''s role');

-- ---- verification as postgres ------------------------------------------------
RESET ROLE;
SELECT is((SELECT full_name FROM public.profiles WHERE id = :'student_b'), 'Student B',
  'cross-user profile update had no effect');
SELECT is((SELECT role::text FROM public.profiles WHERE id = :'student_a'), 'student',
  'student A is still a student after escalation attempts');
SELECT is((SELECT email FROM public.profiles WHERE id = :'student_a'), 'student-a@test.local',
  'student A email is unchanged');

-- Controlled email change: Supabase Auth updates auth.users; profile follows.
UPDATE auth.users SET email = 'student-a-new@test.local' WHERE id = :'student_a';
SELECT is((SELECT email FROM public.profiles WHERE id = :'student_a'), 'student-a-new@test.local',
  'auth.users email change is synced into profiles.email');

-- Guard trigger is defence in depth even if column privileges are re-granted.
GRANT UPDATE ON public.profiles TO authenticated;
SELECT tests.authenticate_as(:'student_a');
SELECT throws_ok(
  format($$UPDATE public.profiles SET role = 'mentor' WHERE id = %L$$, :'student_a'),
  '42501', NULL, 'guard trigger blocks role change even with a table-wide UPDATE grant');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
