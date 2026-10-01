-- Phase 2/3: curriculum, lessons, tests, server-side scoring, progress, XP.
BEGIN;
\ir ../helpers.psql
SELECT plan(35);

SELECT tests.create_user('author@test.local', '{"full_name":"Author"}') AS author \gset
SELECT tests.create_user('other-mentor@test.local') AS other_mentor \gset
SELECT tests.create_user('student@test.local') AS student \gset
SELECT tests.create_user('student-b@test.local') AS student_b \gset
SELECT tests.create_user('admin@test.local') AS admin \gset
SELECT tests.make_mentor(:'author');
SELECT tests.make_mentor(:'other_mentor');
SELECT tests.make_admin(:'admin');

SELECT id AS maths FROM public.subjects WHERE class_level = 10 AND slug = 'mathematics' \gset

-- ---- curriculum structure -------------------------------------------------
SELECT tests.become_anon();
SELECT is((SELECT count(*)::int FROM public.subjects WHERE class_level = 10), 5, 'anon can read class 10 subjects');
RESET ROLE;
SELECT tests.authenticate_as(:'author');
SELECT throws_ok(format($$INSERT INTO public.chapters (subject_id, title) VALUES (%L, 'Mentor chapter')$$, :'maths'),
  '42501', NULL, 'mentors cannot change the curriculum structure');
RESET ROLE;
SELECT tests.authenticate_as(:'admin');
SELECT lives_ok(format($$INSERT INTO public.chapters (id, subject_id, title) VALUES ('00000000-0000-0000-0000-0000000c0001', %L, 'Quadratic Equations')$$, :'maths'),
  'admins manage chapters');

-- ---- lessons ------------------------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'student');
SELECT throws_ok($$INSERT INTO public.lessons (chapter_id, title) VALUES ('00000000-0000-0000-0000-0000000c0001', 'Student lesson')$$,
  '42501', NULL, 'students cannot author lessons');

RESET ROLE;
SELECT tests.authenticate_as(:'author');
SELECT lives_ok(format($$INSERT INTO public.lessons (id, chapter_id, title, content_md, status, author_id)
  VALUES ('00000000-0000-0000-0000-0000000d0001', '00000000-0000-0000-0000-0000000c0001', 'Intro', '# Hello', 'published', %L)$$, :'other_mentor'),
  'mentor can publish a lesson');
SELECT is((SELECT author_id FROM public.lessons WHERE id = '00000000-0000-0000-0000-0000000d0001'), :'author'::uuid,
  'lesson author is forced to the caller');
SELECT isnt((SELECT published_at FROM public.lessons WHERE id = '00000000-0000-0000-0000-0000000d0001'), NULL,
  'published_at is stamped');
INSERT INTO public.lessons (id, chapter_id, title, status)
VALUES ('00000000-0000-0000-0000-0000000d0002', '00000000-0000-0000-0000-0000000c0001', 'Draft lesson', 'draft');

RESET ROLE;
SELECT tests.authenticate_as(:'other_mentor');
UPDATE public.lessons SET title = 'defaced' WHERE id = '00000000-0000-0000-0000-0000000d0001';
SELECT is_empty($$SELECT 1 FROM public.lessons WHERE id = '00000000-0000-0000-0000-0000000d0002'$$,
  'other mentors cannot see someone else''s draft lesson');

RESET ROLE;
SELECT tests.become_anon();
SELECT is((SELECT title FROM public.lessons WHERE id = '00000000-0000-0000-0000-0000000d0001'), 'Intro',
  'published lesson is public and another mentor could not edit it');
SELECT is_empty($$SELECT 1 FROM public.lessons WHERE id = '00000000-0000-0000-0000-0000000d0002'$$,
  'draft lessons are hidden from anon');

-- ---- lesson progress --------------------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'student');
SELECT throws_ok(format($$INSERT INTO public.lesson_progress (user_id, lesson_id, status) VALUES (%L, '00000000-0000-0000-0000-0000000d0001', 'completed')$$, :'student'),
  '42501', NULL, 'progress cannot be written directly');
SELECT is(public.record_lesson_progress('00000000-0000-0000-0000-0000000d0001'), 'in_progress', 'viewing a lesson records progress');
SELECT is(public.record_lesson_progress('00000000-0000-0000-0000-0000000d0001', true), 'completed', 'completing a lesson');
SELECT is(public.record_lesson_progress('00000000-0000-0000-0000-0000000d0001', true), 'completed', 'completing twice is idempotent');
SELECT throws_ok($$SELECT public.record_lesson_progress('00000000-0000-0000-0000-0000000d0002', true)$$,
  'P0002', NULL, 'draft lessons cannot be completed');
SELECT is((SELECT sum(points)::int FROM public.xp_events WHERE user_id = :'student'), 10,
  'completing a lesson awards XP exactly once');

-- ---- tests: authoring --------------------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'author');
INSERT INTO public.tests (id, subject_id, title, duration_minutes, status)
VALUES ('00000000-0000-0000-0000-0000000e0001', :'maths', 'Quadratics quiz', 10, 'published');
INSERT INTO public.test_questions (id, test_id, sort_order, prompt, options, correct_option, explanation, marks) VALUES
  ('00000000-0000-0000-0000-0000000f0001', '00000000-0000-0000-0000-0000000e0001', 1, 'Roots of x^2-5x+6=0?', '["2 and 3","1 and 6","-2 and -3"]', 0, 'Factorise (x-2)(x-3)', 2),
  ('00000000-0000-0000-0000-0000000f0002', '00000000-0000-0000-0000-0000000e0001', 2, 'Discriminant of x^2+x+1?', '["-3","3","5"]', 0, 'b^2-4ac = 1-4', 1);
SELECT throws_ok($$INSERT INTO public.test_questions (test_id, prompt, options, correct_option) VALUES ('00000000-0000-0000-0000-0000000e0001', 'Bad', '["a","b"]', 5)$$,
  '23514', NULL, 'correct_option must point at an existing option');
SELECT is((SELECT count(*)::int FROM public.get_test_questions_for_author('00000000-0000-0000-0000-0000000e0001') WHERE correct_option IS NOT NULL), 2,
  'the author can review answers through the authoring RPC');

RESET ROLE;
SELECT tests.authenticate_as(:'other_mentor');
SELECT throws_ok($$INSERT INTO public.test_questions (test_id, prompt, options, correct_option) VALUES ('00000000-0000-0000-0000-0000000e0001', 'Hijack', '["a","b"]', 0)$$,
  '42501', NULL, 'mentors cannot add questions to someone else''s test');

-- ---- tests: taking ---------------------------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'student');
SELECT throws_ok($$SELECT correct_option FROM public.test_questions$$, '42501', NULL, 'students cannot read correct answers');
SELECT throws_ok($$SELECT explanation FROM public.test_questions$$, '42501', NULL, 'students cannot read explanations before submitting');
SELECT is((SELECT count(*)::int FROM public.test_questions WHERE test_id = '00000000-0000-0000-0000-0000000e0001'), 2,
  'students can read question prompts and options');
SELECT throws_ok($$SELECT public.get_test_questions_for_author('00000000-0000-0000-0000-0000000e0001')$$,
  '42501', NULL, 'students cannot use the authoring RPC');
SELECT throws_ok(format($$INSERT INTO public.test_attempts (user_id, test_id, deadline_at, status, score) VALUES (%L, '00000000-0000-0000-0000-0000000e0001', now(), 'submitted', 100)$$, :'student'),
  '42501', NULL, 'attempts cannot be forged by direct insert');

SELECT public.start_test_attempt('00000000-0000-0000-0000-0000000e0001') AS attempt \gset
SELECT is(public.start_test_attempt('00000000-0000-0000-0000-0000000e0001'), :'attempt'::uuid, 'starting again resumes the open attempt');
SELECT throws_ok(format('SELECT public.get_attempt_review(%L)', :'attempt'), '42501', NULL, 'no answer review before submitting');
SELECT lives_ok(format($$SELECT public.save_test_answer(%L, '00000000-0000-0000-0000-0000000f0001', 0::smallint)$$, :'attempt'),
  'student saves an answer');
SELECT throws_ok(format($$SELECT public.save_test_answer(%L, '00000000-0000-0000-0000-0000000f0002', 9::smallint)$$, :'attempt'),
  '22023', NULL, 'out-of-range options are rejected');

SELECT results_eq(format('SELECT score, max_score, percentage, correct_count, question_count FROM public.submit_test_attempt(%L)', :'attempt'),
  $$VALUES (2, 3, 66.67::numeric, 1, 2)$$, 'the server scores the attempt (unanswered = wrong)');
SELECT throws_ok(format($$SELECT public.save_test_answer(%L, '00000000-0000-0000-0000-0000000f0002', 0::smallint)$$, :'attempt'),
  '22023', NULL, 'answers cannot change after submission');
SELECT is((SELECT count(*)::int FROM public.get_attempt_review(:'attempt') WHERE correct_option IS NOT NULL AND explanation IS NOT NULL), 2,
  'review shows correct answers and explanations after submission');

RESET ROLE;
SELECT tests.authenticate_as(:'student_b');
SELECT throws_ok(format('SELECT public.get_attempt_review(%L)', :'attempt'), '42501', NULL, 'other students cannot review someone else''s attempt');
SELECT is_empty(format('SELECT 1 FROM public.test_attempts WHERE id = %L', :'attempt'), 'attempts are private');

-- ---- summaries ---------------------------------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'student');
SELECT results_eq('SELECT total_xp, level, streak_days, lessons_completed, tests_submitted FROM public.get_learning_summary()',
  $$VALUES (28, 1, 1, 1, 1)$$, 'learning summary is computed from real activity (10 lesson XP + 18 test XP)');
SELECT results_eq($$SELECT lesson_count, lessons_completed, test_count FROM public.get_subject_progress(10::smallint) WHERE slug = 'mathematics'$$,
  $$VALUES (1, 1, 1)$$, 'subject progress counts published lessons and completions');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
