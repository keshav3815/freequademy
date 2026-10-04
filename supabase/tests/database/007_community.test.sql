-- SEC-011 / SEC-012 / SEC-005b: community creation boundaries.
--   forum categories → admin only
--   events (external links shown to minors) → approved mentors + admins, https only
--   clubs → any authenticated student, only as themselves
--   club membership → always plain 'member'
BEGIN;
\ir ../helpers.psql
SELECT plan(17);

SELECT tests.create_user('student@test.local') AS student \gset
SELECT tests.create_user('student-b@test.local') AS student_b \gset
SELECT tests.create_user('mentor@test.local') AS mentor \gset
SELECT tests.create_user('admin@test.local') AS admin \gset
SELECT tests.make_mentor(:'mentor');
SELECT tests.make_admin(:'admin');

\set cat 'INSERT INTO public.forum_categories (name) VALUES (''Spam'')'

CREATE FUNCTION pg_temp.event_sql(_by uuid, _link text) RETURNS text LANGUAGE sql AS $$
  SELECT format($f$INSERT INTO public.community_events (title, event_type, scheduled_at, created_by, meeting_link)
                   VALUES ('Event', 'workshop', now() + interval '1 day', %L, %L)$f$, _by, _link)
$$;
CREATE FUNCTION pg_temp.club_sql(_by uuid) RETURNS text LANGUAGE sql AS $$
  SELECT format($f$INSERT INTO public.student_clubs (name, category, created_by) VALUES ('Chess', 'games', %L)$f$, _by)
$$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pg_temp TO anon, authenticated;

INSERT INTO public.student_clubs (id, name, category, created_by)
VALUES ('00000000-0000-0000-0000-00000000d001', 'Robotics', 'tech', :'student_b');

-- ---- anon -------------------------------------------------------------------
SELECT tests.become_anon();
SELECT throws_ok(:'cat', '42501', NULL, 'anonymous cannot create forum categories');
SELECT throws_ok(pg_temp.event_sql(NULL, 'https://x.example.com'), '42501', NULL, 'anonymous cannot create events');
SELECT throws_ok(pg_temp.club_sql(NULL), '42501', NULL, 'anonymous cannot create clubs');

-- ---- student ----------------------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'student');
SELECT throws_ok(:'cat', '42501', NULL, 'student cannot create forum categories');
SELECT throws_ok(pg_temp.event_sql(:'student', 'https://x.example.com'), '42501', NULL,
  'student cannot publish events with external links');
SELECT lives_ok(pg_temp.club_sql(:'student'), 'student can create a club as themselves');
SELECT throws_ok(pg_temp.club_sql(:'student_b'), '42501', NULL, 'student cannot create a club as someone else');
SELECT throws_ok(
  format($$INSERT INTO public.club_members (club_id, user_id, role) VALUES ('00000000-0000-0000-0000-00000000d001', %L, 'admin')$$, :'student'),
  '42501', NULL, 'student cannot join a club with an elevated club role');
SELECT lives_ok(
  format($$INSERT INTO public.club_members (club_id, user_id) VALUES ('00000000-0000-0000-0000-00000000d001', %L)$$, :'student'),
  'student can join a club as a member');
UPDATE public.student_clubs SET name = 'Taken over' WHERE id = '00000000-0000-0000-0000-00000000d001';

-- ---- mentor -----------------------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'mentor');
SELECT throws_ok(:'cat', '42501', NULL, 'mentor cannot create forum categories');
SELECT lives_ok(pg_temp.event_sql(:'mentor', 'https://meet.example.com/e'), 'mentor can publish an event');
SELECT throws_ok(pg_temp.event_sql(:'mentor', 'http://insecure.example.com'), '23514', NULL,
  'event links must be https');
SELECT throws_ok(pg_temp.event_sql(:'admin', 'https://meet.example.com/e'), '42501', NULL,
  'mentor cannot publish an event as someone else');

-- ---- admin ------------------------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'admin');
SELECT lives_ok(:'cat', 'admin can create forum categories');
SELECT lives_ok(pg_temp.event_sql(:'admin', NULL), 'admin can publish events');

RESET ROLE;
SELECT is((SELECT name FROM public.student_clubs WHERE id = '00000000-0000-0000-0000-00000000d001'), 'Robotics',
  'a student cannot edit another student''s club');
SELECT is((SELECT role FROM public.club_members WHERE user_id = :'student' AND club_id = '00000000-0000-0000-0000-00000000d001'), 'member',
  'membership row has the plain member role');

SELECT * FROM finish();
ROLLBACK;
