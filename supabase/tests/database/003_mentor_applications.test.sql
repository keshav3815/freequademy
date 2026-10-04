-- Mentor application flow + SEC-007 (mentor trust fields) + role grants.
BEGIN;
\ir ../helpers.psql
SELECT plan(26);

SELECT tests.create_user('applicant@test.local', '{"full_name":"Applicant"}') AS applicant \gset
SELECT tests.create_user('other@test.local', '{"full_name":"Other"}') AS other \gset
SELECT tests.create_user('mentor-b@test.local', '{"full_name":"Mentor B"}') AS mentor_b \gset
SELECT tests.create_user('admin@test.local', '{"full_name":"Admin"}') AS admin \gset
SELECT tests.make_mentor(:'mentor_b');
SELECT tests.make_admin(:'admin');

-- ---- applicant (student) -----------------------------------------------------
SELECT tests.authenticate_as(:'applicant');

SELECT throws_ok(
  format($$INSERT INTO public.mentors (id, full_name, email, is_verified) VALUES (%L, 'Me', 'a@test.local', true)$$, :'applicant'),
  '42501', NULL, 'student cannot create their own mentors row');

SELECT throws_ok(
  format($$INSERT INTO public.user_roles (user_id, role) VALUES (%L, 'admin')$$, :'applicant'),
  '42501', NULL, 'student cannot grant themselves admin');

SELECT throws_ok(
  format($$INSERT INTO public.mentor_applications (user_id, full_name, email, status) VALUES (%L, 'Applicant', 'a@test.local', 'approved')$$, :'applicant'),
  '42501', NULL, 'student cannot submit a pre-approved application');

SELECT throws_ok(
  format($$INSERT INTO public.mentor_applications (user_id, full_name, email) VALUES (%L, 'Spoof', 's@test.local')$$, :'other'),
  '42501', NULL, 'student cannot submit an application on behalf of someone else');

SELECT lives_ok(
  format($$INSERT INTO public.mentor_applications (user_id, full_name, email, expertise, experience_years) VALUES (%L, 'Applicant', 'applicant@test.local', ARRAY['Maths'], 3)$$, :'applicant'),
  'student can submit a pending application');

SELECT throws_ok(
  format($$INSERT INTO public.mentor_applications (user_id, full_name, email) VALUES (%L, 'Applicant', 'applicant@test.local')$$, :'applicant'),
  '42501', NULL, 'student cannot open a second pending application');

SELECT is((SELECT role::text FROM public.profiles WHERE id = :'applicant'), 'student',
  'submitting an application does not grant mentor');

SELECT id AS app_id FROM public.mentor_applications WHERE user_id = :'applicant' \gset

UPDATE public.mentor_applications SET status = 'approved' WHERE id = :'app_id';
SELECT is((SELECT status FROM public.mentor_applications WHERE id = :'app_id'), 'pending',
  'applicant cannot approve their own application by UPDATE');

SELECT throws_ok(
  format('SELECT public.approve_mentor_application(%L)', :'app_id'),
  '42501', NULL, 'applicant cannot approve their own application via RPC');

-- ---- another mentor ----------------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'mentor_b');
SELECT throws_ok(
  format('SELECT public.approve_mentor_application(%L)', :'app_id'),
  '42501', NULL, 'mentor cannot approve applications / promote another user');
SELECT throws_ok(
  format($$INSERT INTO public.user_roles (user_id, role) VALUES (%L, 'moderator')$$, :'other'),
  '42501', NULL, 'mentor cannot grant roles to another user');
SELECT is_empty(
  format('SELECT 1 FROM public.mentor_applications WHERE id = %L', :'app_id'),
  'mentor cannot read other users'' applications');

-- ---- anon -------------------------------------------------------------------
RESET ROLE;
SELECT tests.become_anon();
SELECT throws_ok(
  format('SELECT public.approve_mentor_application(%L)', :'app_id'),
  '42501', NULL, 'anonymous caller is rejected by the approval RPC');

-- ---- admin ------------------------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'admin');
SELECT lives_ok(
  format('SELECT public.approve_mentor_application(%L)', :'app_id'),
  'admin can approve a pending application');
SELECT throws_ok(
  format('SELECT public.approve_mentor_application(%L)', :'app_id'),
  '22023', NULL, 'an application cannot be approved twice');

RESET ROLE;
SELECT is((SELECT role::text FROM public.profiles WHERE id = :'applicant'), 'mentor',
  'approval grants the mentor role');
SELECT is((SELECT is_verified FROM public.mentors WHERE id = :'applicant'), true,
  'approval creates a verified mentors row');
SELECT is((SELECT reviewed_by FROM public.mentor_applications WHERE id = :'app_id'), :'admin'::uuid,
  'approval records the reviewing admin');

-- ---- approved mentor: trust fields -----------------------------------------
SELECT tests.authenticate_as(:'applicant');
SELECT lives_ok(
  format($$UPDATE public.mentors SET bio = 'I teach maths' WHERE id = %L$$, :'applicant'),
  'mentor can edit their own bio');
SELECT throws_ok(
  format($$UPDATE public.mentors SET is_verified = false WHERE id = %L$$, :'applicant'),
  '42501', NULL, 'mentor cannot change is_verified');
SELECT throws_ok(
  format($$UPDATE public.mentors SET rating = 5 WHERE id = %L$$, :'applicant'),
  '42501', NULL, 'mentor cannot change rating');
SELECT throws_ok(
  format($$UPDATE public.mentors SET total_sessions = 999 WHERE id = %L$$, :'applicant'),
  '42501', NULL, 'mentor cannot change total_sessions');

-- cross-mentor: RLS filters, verified as postgres below
UPDATE public.mentors SET bio = 'defaced' WHERE id = :'mentor_b';

RESET ROLE;
SELECT is((SELECT bio FROM public.mentors WHERE id = :'applicant'), 'I teach maths',
  'own bio update persisted');
SELECT is((SELECT bio FROM public.mentors WHERE id = :'mentor_b'), NULL,
  'mentor cannot edit another mentor''s profile');

-- ---- admin revoke --------------------------------------------------------------
SELECT tests.authenticate_as(:'admin');
SELECT lives_ok(format('SELECT public.revoke_mentor_role(%L)', :'applicant'),
  'admin can revoke a mentor role');
RESET ROLE;
SELECT is((SELECT role::text FROM public.profiles WHERE id = :'applicant'), 'student',
  'revocation returns the user to student');

SELECT * FROM finish();
ROLLBACK;
