-- Phase 1: public read models, registration capacity, feedback integrity,
-- derived counters and moderation.
BEGIN;
\ir ../helpers.psql
SELECT plan(30);

SELECT tests.create_user('mentor@test.local', '{"full_name":"Mentor M"}') AS mentor \gset
SELECT tests.create_user('unverified@test.local', '{"full_name":"Pending P"}') AS pending \gset
SELECT tests.create_user('s1@test.local', '{"full_name":"Student One"}') AS s1 \gset
SELECT tests.create_user('s2@test.local', '{"full_name":"Student Two"}') AS s2 \gset
SELECT tests.create_user('s3@test.local', '{"full_name":"Student Three"}') AS s3 \gset
SELECT tests.create_user('mod@test.local') AS moderator \gset
SELECT tests.make_mentor(:'mentor');
INSERT INTO public.user_roles (user_id, role) VALUES (:'moderator', 'moderator');
INSERT INTO public.mentors (id, full_name, email, is_verified) VALUES (:'pending', 'Pending P', 'unverified@test.local', false);

\set upcoming '00000000-0000-0000-0000-00000000e001'
\set past '00000000-0000-0000-0000-00000000e002'
INSERT INTO public.mentorship_sessions (id, mentor_id, title, session_type, scheduled_at, max_participants)
VALUES (:'upcoming', :'mentor', 'Upcoming', 'group', now() + interval '1 day', 2),
       (:'past', :'mentor', 'Past', 'group', now() - interval '1 day', 5);
INSERT INTO public.session_participants (session_id, student_id, status) VALUES (:'past', :'s1', 'attended');

-- ---- public read models (anon) ----------------------------------------------
SELECT tests.become_anon();
SELECT is((SELECT count(*)::int FROM public.mentors_public WHERE id = :'mentor'), 1,
  'anon sees verified mentors in mentors_public');
SELECT is((SELECT count(*)::int FROM public.mentors_public WHERE id = :'pending'), 0,
  'unverified mentors are not listed');
SELECT throws_ok('SELECT email FROM public.mentors_public', '42703', NULL,
  'mentors_public does not expose email');
SELECT is((SELECT full_name FROM public.public_profiles WHERE id = :'s1'), 'Student One',
  'display names are readable through public_profiles');
SELECT throws_ok('SELECT email FROM public.public_profiles', '42703', NULL,
  'public_profiles does not expose email');
SELECT is_empty(format('SELECT 1 FROM public.profiles WHERE id = %L', :'s1'),
  'the base profiles table stays private');

-- ---- registration capacity --------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'s1');
SELECT is(public.register_for_session(:'upcoming'), 'registered', 'first student registers');
SELECT is(public.register_for_session(:'upcoming'), 'registered', 'registering twice is idempotent');
RESET ROLE;
SELECT tests.authenticate_as(:'s2');
SELECT is(public.register_for_session(:'upcoming'), 'registered', 'second student fills the session');
RESET ROLE;
SELECT tests.authenticate_as(:'s3');
SELECT throws_ok(format('SELECT public.register_for_session(%L)', :'upcoming'), '22023', 'This session is full',
  'a full session rejects further registrations');
SELECT throws_ok(format('SELECT public.register_for_session(%L)', :'past'), '22023', NULL,
  'past sessions cannot be registered for');
RESET ROLE;
SELECT tests.authenticate_as(:'s2');
SELECT lives_ok(format('SELECT public.cancel_session_registration(%L)', :'upcoming'), 'student can cancel');
RESET ROLE;
SELECT tests.authenticate_as(:'s3');
SELECT is(public.register_for_session(:'upcoming'), 'registered', 'a cancelled seat becomes available again');
SELECT throws_ok(
  format($$SELECT public.set_participant_attendance(%L, %L, 'attended')$$, :'upcoming', :'s3'),
  '42501', NULL, 'students cannot mark their own attendance');
SELECT is((SELECT participant_count FROM public.session_participant_counts(ARRAY[:'upcoming'::uuid])), 2,
  'public participant count excludes cancelled registrations');

RESET ROLE;
SELECT tests.authenticate_as(:'mentor');
SELECT throws_ok(format('SELECT public.register_for_session(%L)', :'upcoming'), '22023', NULL,
  'mentors cannot register for their own session');
SELECT lives_ok(
  format($$SELECT public.set_participant_attendance(%L, %L, 'attended')$$, :'upcoming', :'s3'),
  'session mentor can record attendance');

-- ---- feedback -----------------------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'s2');
SELECT throws_ok(
  format($$INSERT INTO public.mentorship_feedback (session_id, student_id, mentor_id, rating) VALUES (%L, %L, %L, 1)$$, :'past', :'s2', :'mentor'),
  '42501', NULL, 'students who did not attend cannot leave feedback');
RESET ROLE;
SELECT tests.authenticate_as(:'s1');
SELECT throws_ok(
  format($$INSERT INTO public.mentorship_feedback (session_id, student_id, mentor_id, rating) VALUES (%L, %L, %L, 5)$$, :'upcoming', :'s1', :'mentor'),
  '42501', NULL, 'feedback cannot be left before the session happens');
SELECT lives_ok(
  format($$INSERT INTO public.mentorship_feedback (session_id, student_id, mentor_id, rating) VALUES (%L, %L, %L, 4)$$, :'past', :'s1', :'mentor'),
  'a participant can rate a past session');
RESET ROLE;
SELECT is((SELECT rating FROM public.mentors WHERE id = :'mentor'), 4.00::numeric,
  'mentor rating is derived from feedback');

-- ---- forum counters -------------------------------------------------------------
SELECT tests.authenticate_as(:'s1');
INSERT INTO public.forum_threads (id, author_id, title, content, upvotes, reply_count, is_pinned)
VALUES ('00000000-0000-0000-0000-00000000f001', :'s1', 'How do I factorise?', 'Question body', 999, 999, true);
SELECT results_eq($$SELECT upvotes, reply_count, is_pinned FROM public.forum_threads WHERE id = '00000000-0000-0000-0000-00000000f001'$$,
  $$VALUES (0, 0, false)$$, 'client-supplied counters and pin are ignored on insert');
SELECT throws_ok($$UPDATE public.forum_threads SET upvotes = 50 WHERE id = '00000000-0000-0000-0000-00000000f001'$$,
  '42501', NULL, 'authors cannot edit upvotes');
SELECT throws_ok($$UPDATE public.forum_threads SET is_pinned = true WHERE id = '00000000-0000-0000-0000-00000000f001'$$,
  '42501', NULL, 'authors cannot pin their own threads');
RESET ROLE;
SELECT tests.authenticate_as(:'s2');
INSERT INTO public.forum_replies (id, thread_id, author_id, content)
VALUES ('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-00000000f001', :'s2', 'Use the middle term split');
INSERT INTO public.thread_votes (thread_id, user_id) VALUES ('00000000-0000-0000-0000-00000000f001', :'s2');
SELECT results_eq($$SELECT upvotes, reply_count FROM public.forum_threads WHERE id = '00000000-0000-0000-0000-00000000f001'$$,
  $$VALUES (1, 1)$$, 'reply and vote counters are maintained by triggers');
SELECT throws_ok($$SELECT public.mark_reply_solution('00000000-0000-0000-0000-00000000f002')$$,
  '42501', NULL, 'only the thread author can choose the solution');
RESET ROLE;
SELECT tests.authenticate_as(:'s1');
SELECT lives_ok($$SELECT public.mark_reply_solution('00000000-0000-0000-0000-00000000f002')$$,
  'thread author can mark a solution');

-- ---- moderation ------------------------------------------------------------------
SELECT throws_ok($$SELECT public.set_thread_pinned('00000000-0000-0000-0000-00000000f001', true)$$,
  '42501', NULL, 'students cannot pin threads');
RESET ROLE;
SELECT tests.authenticate_as(:'moderator');
SELECT lives_ok($$SELECT public.set_thread_pinned('00000000-0000-0000-0000-00000000f001', true)$$,
  'moderators can pin threads');
DELETE FROM public.forum_threads WHERE id = '00000000-0000-0000-0000-00000000f001';
RESET ROLE;
SELECT is_empty($$SELECT 1 FROM public.forum_threads WHERE id = '00000000-0000-0000-0000-00000000f001'$$,
  'moderators can delete threads');

SELECT * FROM finish();
ROLLBACK;
