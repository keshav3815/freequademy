-- SEC-005: meeting links are visible only to the session mentor, registered
-- participants and admins. Session creation requires an approved mentor.
BEGIN;
\ir ../helpers.psql
SELECT plan(22);

SELECT tests.create_user('mentor-1@test.local') AS mentor_1 \gset
SELECT tests.create_user('mentor-2@test.local') AS mentor_2 \gset
SELECT tests.create_user('student-1@test.local') AS student_1 \gset
SELECT tests.create_user('student-2@test.local') AS student_2 \gset
SELECT tests.create_user('admin@test.local') AS admin \gset
SELECT tests.make_mentor(:'mentor_1');
SELECT tests.make_mentor(:'mentor_2');
SELECT tests.make_admin(:'admin');

\set sid '00000000-0000-0000-0000-00000000c001'
INSERT INTO public.mentorship_sessions (id, mentor_id, title, session_type, scheduled_at, meeting_link, max_participants)
VALUES (:'sid', :'mentor_1', 'Algebra', 'group', now() + interval '1 day', 'https://meet.example.com/secret', 5);

-- ---- anon -------------------------------------------------------------------
SELECT tests.become_anon();
SELECT isnt_empty(format('SELECT id, title, scheduled_at FROM public.mentorship_sessions WHERE id = %L', :'sid'),
  'anonymous can list public session details');
SELECT throws_ok(format('SELECT meeting_link FROM public.mentorship_sessions WHERE id = %L', :'sid'),
  '42501', NULL, 'anonymous cannot select meeting_link');
SELECT throws_ok('SELECT * FROM public.mentorship_sessions',
  '42501', NULL, 'anonymous cannot select * (which would include meeting_link)');
SELECT is(public.get_session_meeting_link(:'sid'), NULL,
  'anonymous callers get no meeting link from the RPC');

-- ---- unrelated student --------------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'student_2');
SELECT throws_ok(format('SELECT meeting_link FROM public.mentorship_sessions WHERE id = %L', :'sid'),
  '42501', NULL, 'unrelated student cannot select meeting_link');
SELECT is(public.get_session_meeting_link(:'sid'), NULL,
  'unrelated student gets no meeting link from the RPC');
SELECT throws_ok(
  format($$INSERT INTO public.mentorship_sessions (mentor_id, title, session_type, scheduled_at) VALUES (%L, 'x', 'group', now())$$, :'student_2'),
  '42501', NULL, 'student cannot create sessions');

-- ---- registered student ------------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'student_1');
SELECT throws_ok(
  format($$INSERT INTO public.session_participants (session_id, student_id) VALUES (%L, %L)$$, :'sid', :'student_1'),
  '42501', NULL, 'direct inserts into session_participants are not allowed (RPC only)');
SELECT is(public.register_for_session(:'sid'), 'registered', 'student can register through the RPC');
SELECT is(public.get_session_meeting_link(:'sid'), 'https://meet.example.com/secret',
  'registered student receives the meeting link');
SELECT lives_ok(format('SELECT public.cancel_session_registration(%L)', :'sid'), 'student can cancel their registration');
SELECT is(public.get_session_meeting_link(:'sid'), NULL,
  'student who cancelled no longer receives the meeting link');

RESET ROLE;
SELECT tests.authenticate_as(:'student_2');
SELECT is_empty(format('SELECT 1 FROM public.session_participants WHERE student_id = %L', :'student_1'),
  'students cannot see each other''s registrations');

-- ---- mentors ------------------------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'mentor_1');
SELECT is(public.get_session_meeting_link(:'sid'), 'https://meet.example.com/secret',
  'session mentor receives the meeting link');
SELECT lives_ok(
  format($$INSERT INTO public.mentorship_sessions (mentor_id, title, session_type, scheduled_at, meeting_link) VALUES (%L, 'Geometry', 'one-on-one', now() + interval '2 days', 'https://meet.example.com/g')$$, :'mentor_1'),
  'approved mentor can create own session with an https link');
SELECT throws_ok(
  format($$INSERT INTO public.mentorship_sessions (mentor_id, title, session_type, scheduled_at, meeting_link) VALUES (%L, 'Bad', 'group', now(), 'javascript:alert(1)')$$, :'mentor_1'),
  '23514', NULL, 'non-https meeting links are rejected');

RESET ROLE;
SELECT tests.authenticate_as(:'mentor_2');
SELECT is(public.get_session_meeting_link(:'sid'), NULL,
  'another mentor cannot obtain the meeting link');
SELECT throws_ok(
  format($$INSERT INTO public.mentorship_sessions (mentor_id, title, session_type, scheduled_at) VALUES (%L, 'x', 'group', now())$$, :'mentor_1'),
  '42501', NULL, 'mentor cannot create a session for another mentor');
UPDATE public.mentorship_sessions SET title = 'hijacked', meeting_link = 'https://evil.example.com' WHERE id = :'sid';
SELECT is_empty(format('SELECT 1 FROM public.session_participants WHERE session_id = %L', :'sid'),
  'another mentor cannot see participants of a session they do not run');

-- ---- admin ------------------------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'admin');
SELECT is(public.get_session_meeting_link(:'sid'), 'https://meet.example.com/secret',
  'admin can obtain meeting links');

-- ---- revoked mentor ----------------------------------------------------------
RESET ROLE;
UPDATE public.profiles SET role = 'student' WHERE id = :'mentor_2';
SELECT tests.authenticate_as(:'mentor_2');
SELECT throws_ok(
  format($$INSERT INTO public.mentorship_sessions (mentor_id, title, session_type, scheduled_at) VALUES (%L, 'x', 'group', now())$$, :'mentor_2'),
  '42501', NULL, 'a user whose mentor role was revoked cannot create sessions');

RESET ROLE;
SELECT is((SELECT title || ' ' || meeting_link FROM public.mentorship_sessions WHERE id = :'sid'),
  'Algebra https://meet.example.com/secret', 'another mentor could not modify the session');

SELECT * FROM finish();
ROLLBACK;
