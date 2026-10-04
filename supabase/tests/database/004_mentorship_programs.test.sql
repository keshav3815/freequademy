-- SEC-006: mentorship programs are platform-managed (admin only).
BEGIN;
\ir ../helpers.psql
SELECT plan(11);

SELECT tests.create_user('student@test.local') AS student \gset
SELECT tests.create_user('mentor@test.local') AS mentor \gset
SELECT tests.create_user('admin@test.local') AS admin \gset
SELECT tests.make_mentor(:'mentor');
SELECT tests.make_admin(:'admin');

INSERT INTO public.mentorship_programs (id, title, type, category)
VALUES ('00000000-0000-0000-0000-00000000a001', 'Original', 'group', 'academic');

\set ins 'INSERT INTO public.mentorship_programs (title, type, category) VALUES (''New'', ''group'', ''academic'')'

-- anon
SELECT tests.become_anon();
SELECT throws_ok(:'ins', '42501', NULL, 'anonymous cannot create programs');
SELECT isnt_empty('SELECT 1 FROM public.mentorship_programs', 'anonymous can list programs');
UPDATE public.mentorship_programs SET title = 'anon' WHERE id = '00000000-0000-0000-0000-00000000a001';

-- student
RESET ROLE;
SELECT tests.authenticate_as(:'student');
SELECT throws_ok(:'ins', '42501', NULL, 'student cannot create programs');
UPDATE public.mentorship_programs SET title = 'student' WHERE id = '00000000-0000-0000-0000-00000000a001';
DELETE FROM public.mentorship_programs WHERE id = '00000000-0000-0000-0000-00000000a001';

-- mentor
RESET ROLE;
SELECT tests.authenticate_as(:'mentor');
SELECT throws_ok(:'ins', '42501', NULL, 'mentor cannot create programs');
UPDATE public.mentorship_programs SET title = 'mentor' WHERE id = '00000000-0000-0000-0000-00000000a001';
DELETE FROM public.mentorship_programs WHERE id = '00000000-0000-0000-0000-00000000a001';

RESET ROLE;
SELECT is((SELECT title FROM public.mentorship_programs WHERE id = '00000000-0000-0000-0000-00000000a001'),
  'Original', 'anon/student/mentor updates had no effect');
SELECT isnt_empty($$SELECT 1 FROM public.mentorship_programs WHERE id = '00000000-0000-0000-0000-00000000a001'$$,
  'student/mentor deletes had no effect');

-- admin
SELECT tests.authenticate_as(:'admin');
SELECT lives_ok(:'ins', 'admin can create programs');
SELECT lives_ok($$UPDATE public.mentorship_programs SET title = 'Admin edit' WHERE id = '00000000-0000-0000-0000-00000000a001'$$,
  'admin can update programs');
SELECT is((SELECT title FROM public.mentorship_programs WHERE id = '00000000-0000-0000-0000-00000000a001'),
  'Admin edit', 'admin update persisted');
SELECT lives_ok($$DELETE FROM public.mentorship_programs WHERE id = '00000000-0000-0000-0000-00000000a001'$$,
  'admin can delete programs');
SELECT is_empty($$SELECT 1 FROM public.mentorship_programs WHERE id = '00000000-0000-0000-0000-00000000a001'$$,
  'admin delete persisted');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
