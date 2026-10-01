-- SEC-001: signup metadata can never grant a privileged role.
BEGIN;
\ir ../helpers.psql
SELECT plan(10);

SELECT tests.create_user('plain@test.local') AS u_plain \gset
SELECT tests.create_user('mentor-claim@test.local', '{"role":"mentor","full_name":"Mallory"}') AS u_mentor \gset
SELECT tests.create_user('admin-claim@test.local', '{"role":"admin"}') AS u_admin \gset
SELECT tests.create_user('mod-claim@test.local', '{"role":"moderator"}') AS u_mod \gset
SELECT tests.create_user('junk-claim@test.local', '{"role":"superuser","grade":"99; drop table x"}') AS u_junk \gset
SELECT tests.create_user('grade@test.local', jsonb_build_object('grade','10','full_name', repeat('n', 500))) AS u_grade \gset

SELECT is((SELECT role::text FROM public.profiles WHERE id = :'u_plain'), 'student',
  'signup without role metadata becomes student');
SELECT is((SELECT role::text FROM public.profiles WHERE id = :'u_mentor'), 'student',
  'signup with role=mentor metadata still becomes student');
SELECT is((SELECT role::text FROM public.profiles WHERE id = :'u_admin'), 'student',
  'signup with role=admin metadata still becomes student');
SELECT is((SELECT role::text FROM public.profiles WHERE id = :'u_mod'), 'student',
  'signup with role=moderator metadata still becomes student');
SELECT is((SELECT role::text FROM public.profiles WHERE id = :'u_junk'), 'student',
  'signup with an arbitrary role value becomes student (and does not fail)');

SELECT is_empty(
  format('SELECT 1 FROM public.user_roles WHERE user_id IN (%L,%L,%L,%L,%L)',
         :'u_plain', :'u_mentor', :'u_admin', :'u_mod', :'u_junk'),
  'signup never creates admin/moderator rows in user_roles');

SELECT is_empty(
  format('SELECT 1 FROM public.mentors WHERE id IN (%L,%L)', :'u_mentor', :'u_plain'),
  'signup never creates a mentors row');

SELECT is((SELECT grade FROM public.profiles WHERE id = :'u_junk'), NULL,
  'unsupported grade metadata is discarded');
SELECT is((SELECT grade FROM public.profiles WHERE id = :'u_grade'), '10',
  'supported grade metadata is kept');
SELECT is((SELECT length(full_name) FROM public.profiles WHERE id = :'u_grade'), 120,
  'full_name metadata is bounded to 120 characters');

SELECT * FROM finish();
ROLLBACK;
