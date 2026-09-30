-- Student 360° analytics dashboard: authorization + calculation correctness.
BEGIN;
\ir ../helpers.psql
SELECT plan(37);

SELECT tests.create_user('alice@test.local', '{"full_name":"Alice Kumar"}') AS alice \gset
SELECT tests.create_user('bob@test.local', '{"full_name":"Bob Rao"}') AS bob \gset
SELECT tests.create_user('mentor@test.local', '{"full_name":"Mentor M"}') AS mentor \gset
SELECT tests.make_mentor(:'mentor');

SELECT id AS maths FROM public.subjects WHERE class_level = 10 AND slug = 'mathematics' \gset
SELECT id AS science FROM public.subjects WHERE class_level = 10 AND slug = 'science' \gset

INSERT INTO public.chapters (id, subject_id, title, sort_order) VALUES
  ('00000000-0000-0000-0000-00000c0a0001', :'maths', 'Algebra', 1),
  ('00000000-0000-0000-0000-00000c0a0002', :'science', 'Motion', 1);
INSERT INTO public.lessons (id, chapter_id, title, status, sort_order) VALUES
  ('00000000-0000-0000-0000-00000d0a0001', '00000000-0000-0000-0000-00000c0a0001', 'L1', 'published', 1),
  ('00000000-0000-0000-0000-00000d0a0002', '00000000-0000-0000-0000-00000c0a0001', 'L2', 'published', 2),
  ('00000000-0000-0000-0000-00000d0a0003', '00000000-0000-0000-0000-00000c0a0001', 'L3', 'published', 3),
  ('00000000-0000-0000-0000-00000d0a0004', '00000000-0000-0000-0000-00000c0a0001', 'L4', 'published', 4),
  ('00000000-0000-0000-0000-00000d0a0005', '00000000-0000-0000-0000-00000c0a0001', 'L5', 'published', 5),
  ('00000000-0000-0000-0000-00000d0a0006', '00000000-0000-0000-0000-00000c0a0001', 'L6', 'published', 6),
  ('00000000-0000-0000-0000-00000d0a0007', '00000000-0000-0000-0000-00000c0a0001', 'L7', 'published', 7),
  ('00000000-0000-0000-0000-00000d0a0008', '00000000-0000-0000-0000-00000c0a0001', 'L8', 'published', 8),
  ('00000000-0000-0000-0000-00000d0a0009', '00000000-0000-0000-0000-00000c0a0001', 'L9', 'published', 9),
  ('00000000-0000-0000-0000-00000d0a0010', '00000000-0000-0000-0000-00000c0a0001', 'L10', 'published', 10);
INSERT INTO public.tests (id, subject_id, chapter_id, title, status, duration_minutes) VALUES
  ('00000000-0000-0000-0000-00000e0a0001', :'maths', '00000000-0000-0000-0000-00000c0a0001', 'Algebra test', 'published', 10);
INSERT INTO public.test_questions (id, test_id, sort_order, prompt, options, correct_option, marks) VALUES
  ('00000000-0000-0000-0000-00000f0a0001', '00000000-0000-0000-0000-00000e0a0001', 1, 'Q1', '["a","b"]', 0, 1),
  ('00000000-0000-0000-0000-00000f0a0002', '00000000-0000-0000-0000-00000e0a0001', 2, 'Q2', '["a","b"]', 0, 1);

-- ---- brand-new student: every metric is real zeros, not fabricated -----------
SELECT tests.authenticate_as(:'bob');
SELECT results_eq(
  'SELECT total_xp, level, streak_days, best_streak_days, lessons_completed, tests_submitted, average_score FROM public.get_learning_summary()',
  $$VALUES (0, 1, 0, 0, 0, 0, NULL::numeric)$$,
  'a brand-new student has real zeros, not fabricated progress');
SELECT is_empty('SELECT 1 FROM public.get_xp_breakdown()', 'no XP breakdown rows exist yet (not zeroed-out fake categories)');
SELECT is_empty('SELECT 1 FROM public.get_weak_areas()', 'no weak areas without any test data (per spec: do not invent weak areas)');
SELECT is_empty('SELECT 1 FROM public.get_recent_test_results()', 'no recent results without any attempts');
SELECT results_eq(
  'SELECT upcoming_count, completed_count, attendance_pct FROM public.get_mentorship_summary()',
  $$VALUES (0, 0, NULL::numeric)$$,
  'mentorship summary returns one real row of zeros for a student with no sessions (not zero rows)');
SELECT results_eq(
  format('SELECT lesson_count, lessons_completed, status FROM public.get_subject_progress(10::smallint) WHERE subject_id = %L', :'maths'),
  $$VALUES (10, 0, 'not_started'::text)$$,
  'a subject with lessons but no progress is not_started, 0/10 = 0%%');

-- ---- Alice does real work ------------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'alice');

-- 5 of 10 lessons completed → 50%, in_progress
SELECT public.record_lesson_progress('00000000-0000-0000-0000-00000d0a0001', true);
SELECT public.record_lesson_progress('00000000-0000-0000-0000-00000d0a0002', true);
SELECT public.record_lesson_progress('00000000-0000-0000-0000-00000d0a0003', true);
SELECT public.record_lesson_progress('00000000-0000-0000-0000-00000d0a0004', true);
SELECT public.record_lesson_progress('00000000-0000-0000-0000-00000d0a0005', true);
SELECT results_eq(
  format('SELECT lesson_count, lessons_completed, status FROM public.get_subject_progress(10::smallint) WHERE subject_id = %L', :'maths'),
  $$VALUES (10, 5, 'in_progress'::text)$$,
  '5/10 lessons completed = in_progress (50%%, computed client-side from these real counts)');

-- test: answer 1 of 2 correctly → 50%
SELECT public.start_test_attempt('00000000-0000-0000-0000-00000e0a0001') AS attempt \gset
SELECT public.save_test_answer(:'attempt', '00000000-0000-0000-0000-00000f0a0001', 0::smallint);
SELECT public.save_test_answer(:'attempt', '00000000-0000-0000-0000-00000f0a0002', 1::smallint);
SELECT percentage FROM public.submit_test_attempt(:'attempt') \gset
SELECT is(:'percentage'::numeric, 50.00::numeric, '1 correct of 2 questions = 50%% test score');

SELECT results_eq(
  'SELECT test_title, percentage FROM public.get_recent_test_results()',
  $$VALUES ('Algebra test'::text, 50.00::numeric)$$,
  'recent test results shows the real submitted attempt');
SELECT results_eq(
  'SELECT subject_name, average_score, attempts_count FROM public.get_weak_areas()',
  $$VALUES ('Mathematics'::text, 50.0::numeric, 1)$$,
  'weak areas surfaces the only subject with attempts, at its real average');

-- XP: 5 lessons x10 + 1 test (5 + round(50/5)=10 => 15) = 65
SELECT is((SELECT total_xp FROM public.get_learning_summary()), 65, 'XP is the real sum: 5x10 lesson + (5+10) test = 65');
SELECT results_eq(
  'SELECT source_type, total_points FROM public.get_xp_breakdown() ORDER BY source_type',
  $$VALUES ('lesson_completed'::text, 50), ('test_submitted'::text, 15)$$,
  'XP breakdown only lists categories that actually have events (no doubt_asked row yet)');

-- doubt: +3 XP, and it appears in doubt-derived analytics
INSERT INTO public.doubts (user_id, question, subject) VALUES (:'alice', 'Why is x^2 always positive?', 'Mathematics');
SELECT is((SELECT total_xp FROM public.get_learning_summary()), 68, 'asking a doubt awards +3 XP exactly once (schema-anticipated category, now real)');
SELECT results_eq(
  'SELECT total_points FROM public.get_xp_breakdown() WHERE source_type = ''doubt_asked''',
  $$VALUES (3)$$, 'doubt_asked now has a real XP breakdown row');

-- re-completing an already-completed lesson must not double-award XP
SELECT public.record_lesson_progress('00000000-0000-0000-0000-00000d0a0001', true);
SELECT is((SELECT total_xp FROM public.get_learning_summary()), 68, 'completing an already-completed lesson again does not double-award XP');

-- ---- streak: today counts, and a gap breaks it ------------------------------
SELECT is((SELECT streak_days FROM public.get_learning_summary()), 1, 'one active day today = streak of 1');
SELECT is((SELECT best_streak_days FROM public.get_learning_summary()), 1, 'best streak equals current streak so far');
SELECT is((SELECT active_days_this_week FROM public.get_learning_summary()) >= 1, true, 'today counts toward this week''s active days');

-- backdate one xp_event to simulate activity 5 days ago (a broken streak):
-- today is active, but there is a gap before the backdated day, so the
-- *current* streak is still 1 while the *best* streak recorded is also 1
-- (the backdated day is isolated, not adjacent to any other active day).
-- Backdating requires the postgres role: students have no UPDATE grant on
-- xp_events at all (by design — see Phase 2), so this step is test setup,
-- not something a real student session could ever do.
RESET ROLE;
UPDATE public.xp_events SET created_at = now() - interval '5 days'
WHERE user_id = :'alice' AND source_type = 'doubt_asked';
SELECT tests.authenticate_as(:'alice');
SELECT is((SELECT streak_days FROM public.get_learning_summary()), 1, 'a gap before an older active day does not extend the current streak');
SELECT is((SELECT best_streak_days FROM public.get_learning_summary()), 1, 'an isolated day 5 days ago does not count as a 2-day streak');

-- now make yesterday AND today active too, to prove consecutive days are counted
RESET ROLE;
INSERT INTO public.xp_events (user_id, source_type, source_id, points, created_at)
VALUES (:'alice', 'doubt_asked', gen_random_uuid(), 1, now() - interval '1 day');
SELECT tests.authenticate_as(:'alice');
SELECT is((SELECT streak_days FROM public.get_learning_summary()), 2, 'yesterday + today consecutive = streak of 2');
SELECT is((SELECT best_streak_days FROM public.get_learning_summary()), 2, 'best streak reflects the 2-day run, not just the current day');

-- ---- weekly summary: last week has zero denominator, not a fabricated %% ------
SELECT results_eq(
  $$SELECT period, lessons_completed, average_score FROM public.get_weekly_summary() WHERE period = 'last_week'$$,
  $$VALUES ('last_week'::text, 0, NULL::numeric)$$,
  'a week with no attempts has a NULL average, not a fake 0%% or fabricated score');
SELECT ok((SELECT lessons_completed FROM public.get_weekly_summary() WHERE period = 'this_week') >= 5,
  'this week reflects the real lesson completions just recorded');

-- ---- activity heatmap: only real activity sources are counted, unioned -------
-- get_activity_days buckets by IST, so "today" must be the IST date too: UTC
-- current_date is a day behind between 18:30 and 24:00 UTC.
SELECT results_eq(
  $$SELECT lesson_count, test_count, doubt_count
      FROM public.get_activity_days((now() AT TIME ZONE 'Asia/Kolkata')::date, (now() AT TIME ZONE 'Asia/Kolkata')::date)
     WHERE activity_date = (now() AT TIME ZONE 'Asia/Kolkata')::date$$,
  $$VALUES (5, 1, 1)$$,
  'today''s activity heatmap cell unions real lesson/test/doubt counts, nothing invented');

-- ---- authorization: Bob can never see Alice's analytics -----------------------
RESET ROLE;
SELECT tests.authenticate_as(:'bob');
SELECT is((SELECT total_xp FROM public.get_learning_summary()), 0,
  'Bob''s own summary is unaffected by Alice''s activity (each RPC is auth.uid()-scoped)');
SELECT is_empty('SELECT 1 FROM public.get_recent_test_results()', 'Bob cannot see Alice''s test results through this RPC');
SELECT is_empty('SELECT 1 FROM public.get_weak_areas()', 'Bob cannot see Alice''s weak areas through this RPC');
SELECT is_empty('SELECT 1 FROM public.get_xp_breakdown()', 'Bob cannot see Alice''s XP breakdown through this RPC');
SELECT is_empty(format('SELECT 1 FROM public.test_attempts WHERE user_id = %L', :'alice'),
  'RLS itself blocks Bob from reading Alice''s test_attempts row, independent of the RPC layer');
SELECT is_empty(format('SELECT 1 FROM public.doubts WHERE user_id = %L', :'alice'),
  'RLS blocks Bob from reading Alice''s doubts directly');

-- ---- anonymous: rejected outright, not given empty/zeroed data ---------------
RESET ROLE;
SELECT tests.become_anon();
SELECT throws_ok('SELECT * FROM public.get_learning_summary()', '42501', NULL, 'anonymous cannot call get_learning_summary');
SELECT throws_ok('SELECT * FROM public.get_weekly_summary()', '42501', NULL, 'anonymous cannot call get_weekly_summary');
SELECT throws_ok('SELECT * FROM public.get_mentorship_summary()', '42501', NULL, 'anonymous cannot call get_mentorship_summary');
-- get_activity_days has no internal auth.uid() IS NULL guard (it degrades
-- safely instead: every WHERE user_id = auth.uid() clause is WHERE ... = NULL
-- for an anonymous caller, which matches nothing) — proven here, not assumed.
SELECT is_empty('SELECT 1 FROM public.get_activity_days(current_date, current_date) WHERE total_count > 0',
  'anonymous callers get real zero activity (not an error, not another student''s data) from get_activity_days');
RESET ROLE;

-- ---- mentorship: session capacity + attendance feed the summary correctly ----
SELECT tests.authenticate_as(:'mentor');
INSERT INTO public.mentorship_sessions (id, mentor_id, title, session_type, scheduled_at, max_participants)
VALUES ('00000000-0000-0000-0000-000000110001', :'mentor', 'Doubt clinic', 'group', now() + interval '1 day', 5);
RESET ROLE;
SELECT tests.authenticate_as(:'bob');
SELECT public.register_for_session('00000000-0000-0000-0000-000000110001');
SELECT results_eq(
  'SELECT upcoming_count, next_session_title FROM public.get_mentorship_summary()',
  $$VALUES (1, 'Doubt clinic'::text)$$,
  'mentorship summary reflects Bob''s real registration and shows the next session');
RESET ROLE;
SELECT tests.authenticate_as(:'alice');
SELECT is((SELECT upcoming_count FROM public.get_mentorship_summary()), 0,
  'Alice, who did not register, sees zero upcoming sessions — Bob''s registration is not leaked to her');

SELECT * FROM finish();
ROLLBACK;
