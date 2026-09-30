-- Teacher portal: every read is scoped to the caller's own content, every
-- write to the caller's own rows / roster.
BEGIN;
\ir ../helpers.psql
SELECT plan(49);

SELECT tests.create_user('t1@test.local', '{"full_name":"Teacher One"}') AS t1 \gset
SELECT tests.create_user('t2@test.local', '{"full_name":"Teacher Two"}') AS t2 \gset
SELECT tests.create_user('asha@test.local', '{"full_name":"Asha Verma"}') AS asha \gset
SELECT tests.create_user('ravi@test.local', '{"full_name":"Ravi Das"}') AS ravi \gset
SELECT tests.create_user('outsider@test.local', '{"full_name":"Out Sider"}') AS outsider \gset
SELECT tests.make_mentor(:'t1');
SELECT tests.make_mentor(:'t2');

SELECT id AS maths FROM public.subjects WHERE class_level = 10 AND slug = 'mathematics' \gset

INSERT INTO public.chapters (id, subject_id, title, sort_order) VALUES
  ('00000000-0000-0000-0000-0000000c1001', :'maths', 'Algebra', 1);
INSERT INTO public.lessons (id, chapter_id, title, status, sort_order, author_id) VALUES
  ('00000000-0000-0000-0000-0000000d1001', '00000000-0000-0000-0000-0000000c1001', 'T1 L1', 'published', 1, :'t1'),
  ('00000000-0000-0000-0000-0000000d1002', '00000000-0000-0000-0000-0000000c1001', 'T1 L2', 'published', 2, :'t1'),
  ('00000000-0000-0000-0000-0000000d1003', '00000000-0000-0000-0000-0000000c1001', 'T2 L1', 'published', 3, :'t2');
INSERT INTO public.tests (id, subject_id, chapter_id, title, status, duration_minutes, author_id) VALUES
  ('00000000-0000-0000-0000-0000000e1001', :'maths', '00000000-0000-0000-0000-0000000c1001', 'T1 quiz', 'published', 10, :'t1'),
  ('00000000-0000-0000-0000-0000000e1002', :'maths', '00000000-0000-0000-0000-0000000c1001', 'T2 quiz', 'published', 10, :'t2');
INSERT INTO public.test_questions (id, test_id, sort_order, prompt, options, correct_option, marks) VALUES
  ('00000000-0000-0000-0000-0000000f1001', '00000000-0000-0000-0000-0000000e1001', 1, 'Q1', '["a","b"]', 0, 1),
  ('00000000-0000-0000-0000-0000000f1002', '00000000-0000-0000-0000-0000000e1001', 2, 'Q2', '["a","b"]', 0, 1),
  ('00000000-0000-0000-0000-0000000f1003', '00000000-0000-0000-0000-0000000e1002', 1, 'Q1', '["a","b"]', 0, 1);

-- Asha: completes one of T1's lessons and takes T1's quiz (50%).
SELECT tests.authenticate_as(:'asha');
SELECT public.record_lesson_progress('00000000-0000-0000-0000-0000000d1001', true);
SELECT public.start_test_attempt('00000000-0000-0000-0000-0000000e1001') AS asha_attempt \gset
SELECT public.save_test_answer(:'asha_attempt', '00000000-0000-0000-0000-0000000f1001', 0::smallint);
SELECT public.save_test_answer(:'asha_attempt', '00000000-0000-0000-0000-0000000f1002', 1::smallint);
SELECT public.submit_test_attempt(:'asha_attempt');
RESET ROLE;

-- Ravi: only uses T2's content.
SELECT tests.authenticate_as(:'ravi');
SELECT public.record_lesson_progress('00000000-0000-0000-0000-0000000d1003', true);
SELECT public.start_test_attempt('00000000-0000-0000-0000-0000000e1002') AS ravi_attempt \gset
SELECT public.save_test_answer(:'ravi_attempt', '00000000-0000-0000-0000-0000000f1003', 0::smallint);
SELECT public.submit_test_attempt(:'ravi_attempt');
RESET ROLE;

-- ---- who may call the portal ------------------------------------------------
SELECT tests.become_anon();
SELECT throws_ok('SELECT * FROM public.get_teacher_overview()', '42501', NULL, 'anonymous callers cannot read teacher data');
RESET ROLE;
SELECT tests.authenticate_as(:'asha');
SELECT throws_ok('SELECT * FROM public.get_teacher_overview()', '42501', NULL, 'students cannot read teacher data');
SELECT throws_ok('SELECT * FROM public.get_teacher_students()', '42501', NULL, 'students cannot list a roster');
SELECT throws_ok(format('SELECT * FROM public.get_teacher_submissions(%L)', '00000000-0000-0000-0000-0000000e1001'),
  '42501', NULL, 'students cannot read submissions');
RESET ROLE;

-- ---- T1 sees exactly their own students and numbers --------------------------
SELECT tests.authenticate_as(:'t1');
SELECT results_eq('SELECT student_id FROM public.get_teacher_students()', format('VALUES (%L::uuid)', :'asha'),
  'T1''s roster is Asha only (Ravi used T2''s content)');
SELECT results_eq(
  'SELECT full_name, lessons_completed, tests_submitted, avg_score FROM public.get_teacher_students()',
  $$VALUES ('Asha Verma'::text, 1, 1, 50.0::numeric)$$,
  'roster aggregates are computed from T1''s content only');
SELECT results_eq(
  'SELECT course_count, lesson_count, published_lesson_count, assignment_count, student_count, completion_pct, avg_score_30d, awaiting_review FROM public.get_teacher_overview()',
  $$VALUES (1, 2, 2, 1, 1, 50::numeric, 50.0::numeric, 1)$$,
  'overview: 1 course, 2 lessons, 1 student at 1/2 lessons = 50%%, one submission awaiting review');
SELECT results_eq(
  'SELECT subject_name, lesson_count, student_count, completion_pct, avg_score FROM public.get_teacher_courses()',
  $$VALUES ('Mathematics'::text, 2, 1, 50::numeric, 50.0::numeric)$$,
  'courses are the subjects T1 authored in, with T1-only numbers');
SELECT results_eq(
  'SELECT submitted_count, student_count, reviewed_count, awaiting_review_count, question_count FROM public.get_teacher_assignments()',
  $$VALUES (1, 1, 0, 1, 2)$$,
  'assignments list only T1''s quiz with its submission counts');
SELECT is((SELECT count(*)::integer FROM public.get_teacher_submissions('00000000-0000-0000-0000-0000000e1001')), 1,
  'T1 sees the one submission on their quiz');
SELECT throws_ok(format('SELECT * FROM public.get_teacher_submissions(%L)', '00000000-0000-0000-0000-0000000e1002'),
  '42501', NULL, 'T1 cannot read submissions on T2''s quiz');
SELECT results_eq(format('SELECT selected_option, is_correct FROM public.get_teacher_attempt_answers(%L)', :'asha_attempt'),
  $$VALUES (0::smallint, true), (1::smallint, false)$$, 'T1 sees Asha''s answers question by question');
SELECT throws_ok(format('SELECT * FROM public.get_teacher_attempt_answers(%L)', :'ravi_attempt'),
  '42501', NULL, 'T1 cannot read answers on T2''s quiz');
SELECT is((SELECT count(*)::integer FROM public.get_teacher_student_courses(:'asha')), 1, 'T1 can open Asha''s course progress');
SELECT throws_ok(format('SELECT * FROM public.get_teacher_student_courses(%L)', :'ravi'),
  '42501', NULL, 'T1 cannot open a student who is not theirs');
SELECT throws_ok(format('SELECT * FROM public.get_teacher_student_attempts(%L)', :'ravi'),
  '42501', NULL, 'T1 cannot list attempts of a student who is not theirs');
SELECT throws_ok(format('SELECT * FROM public.get_teacher_student_sessions(%L)', :'outsider'),
  '42501', NULL, 'T1 cannot list sessions of a student who is not theirs');
SELECT is((SELECT count(*)::integer FROM public.get_teacher_student_attempts(:'asha')), 1, 'T1 lists Asha''s attempt');
SELECT ok((SELECT bool_and(kind IN ('submission', 'lesson_completed', 'published')) FROM public.get_teacher_activity(50)),
  'activity feed is built from T1''s content events');
SELECT is((SELECT count(*)::integer FROM public.get_teacher_activity(50) WHERE title LIKE 'T2%'), 0, 'activity feed never includes T2''s content');
SELECT is((SELECT count(*)::integer FROM public.get_teacher_trend(6)), 6, 'trend returns one row per requested week');
SELECT is((SELECT submissions FROM public.get_teacher_trend(6) ORDER BY week_start DESC LIMIT 1), 1, 'this week counts the real submission');
SELECT is((SELECT avg_score FROM public.get_teacher_trend(6) ORDER BY week_start LIMIT 1), NULL::numeric, 'an empty week has a NULL average, not 0');

-- ---- reviews -------------------------------------------------------------------
SELECT lives_ok(format($$SELECT public.review_attempt(%L, 'Revisit factorisation.')$$, :'asha_attempt'), 'T1 reviews Asha''s attempt');
SELECT is((SELECT awaiting_review FROM public.get_teacher_overview()), 0, 'reviewed submission no longer awaits review');
SELECT throws_ok(format($$SELECT public.review_attempt(%L, 'x')$$, :'ravi_attempt'), '42501', NULL, 'T1 cannot review T2''s attempt');
SELECT throws_ok(format($$INSERT INTO public.attempt_reviews (attempt_id, teacher_id) VALUES (%L, %L)$$, :'ravi_attempt', :'t1'),
  '42501', NULL, 'reviews cannot be written directly');
RESET ROLE;

SELECT tests.authenticate_as(:'asha');
SELECT is((SELECT feedback FROM public.attempt_reviews WHERE attempt_id = :'asha_attempt'), 'Revisit factorisation.',
  'Asha reads the feedback on her own attempt');
RESET ROLE;
SELECT tests.authenticate_as(:'ravi');
SELECT is_empty(format('SELECT 1 FROM public.attempt_reviews WHERE attempt_id = %L', :'asha_attempt'),
  'Ravi cannot read feedback on Asha''s attempt');
RESET ROLE;

-- ---- private notes -----------------------------------------------------------
SELECT tests.authenticate_as(:'t1');
SELECT lives_ok(format($$INSERT INTO public.teacher_student_notes (student_id, body) VALUES (%L, 'Needs help with signs')$$, :'asha'),
  'T1 writes a note about their student');
SELECT throws_ok(format($$INSERT INTO public.teacher_student_notes (student_id, body) VALUES (%L, 'x')$$, :'ravi'),
  '42501', NULL, 'T1 cannot write notes about a student who is not theirs');
SELECT throws_ok(format($$INSERT INTO public.teacher_student_notes (teacher_id, student_id, body) VALUES (%L, %L, 'x')$$, :'t2', :'asha'),
  '42501', NULL, 'T1 cannot write a note as another teacher');
RESET ROLE;
SELECT tests.authenticate_as(:'t2');
SELECT is_empty('SELECT 1 FROM public.teacher_student_notes', 'T2 cannot read T1''s notes');
RESET ROLE;
SELECT tests.authenticate_as(:'asha');
SELECT is_empty('SELECT 1 FROM public.teacher_student_notes', 'students cannot read notes about themselves');
RESET ROLE;

-- ---- announcements -----------------------------------------------------------
SELECT tests.authenticate_as(:'t1');
SELECT lives_ok(format($$INSERT INTO public.announcements (title, body, audience, student_ids, status) VALUES ('Quiz on Friday', 'Revise chapter 1', 'students', ARRAY[%L]::uuid[], 'published')$$, :'asha'),
  'T1 announces to their own student');
SELECT throws_ok(format($$INSERT INTO public.announcements (title, body, audience, student_ids, status) VALUES ('Hi', 'x', 'students', ARRAY[%L]::uuid[], 'published')$$, :'ravi'),
  '42501', NULL, 'T1 cannot address a student who is not theirs');
SELECT lives_ok(format($$INSERT INTO public.announcements (title, body, audience, subject_id, status) VALUES ('Maths update', 'New lesson', 'subject', %L, 'published')$$, :'maths'),
  'T1 announces to a course');
SELECT lives_ok(format($$INSERT INTO public.announcements (title, body, audience, subject_id, status, publish_at) VALUES ('Later', 'Scheduled', 'subject', %L, 'published', now() + interval '1 day')$$, :'maths'),
  'T1 schedules an announcement');
SELECT lives_ok(format($$INSERT INTO public.announcements (title, body, audience, subject_id) VALUES ('Draft', 'Not yet', 'subject', %L)$$, :'maths'),
  'T1 saves a draft');
RESET ROLE;
SELECT tests.authenticate_as(:'asha');
SELECT results_eq('SELECT title FROM public.get_my_announcements() ORDER BY title',
  $$VALUES ('Maths update'::text), ('Quiz on Friday'::text)$$,
  'Asha receives the published, due announcements addressed to her (not drafts or scheduled ones)');
SELECT throws_ok($$INSERT INTO public.announcements (title, body, audience, subject_id) VALUES ('Spoof', 'x', 'subject', (SELECT id FROM public.subjects LIMIT 1))$$,
  '42501', NULL, 'students cannot create announcements');
RESET ROLE;
SELECT tests.authenticate_as(:'ravi');
SELECT is_empty('SELECT 1 FROM public.get_my_announcements()', 'Ravi (T2''s student) receives none of T1''s announcements');
RESET ROLE;

-- ---- resources -----------------------------------------------------------------
SELECT tests.authenticate_as(:'t1');
SELECT lives_ok($$INSERT INTO public.teacher_resources (title, kind, external_url) VALUES ('Algebra notes', 'link', 'https://example.com/notes')$$,
  'T1 adds a link resource');
SELECT throws_ok(format($$INSERT INTO public.teacher_resources (title, kind, storage_path) VALUES ('x', 'pdf', '%s/file.pdf')$$, :'t2'),
  '42501', NULL, 'T1 cannot register a file in another teacher''s folder');
RESET ROLE;
SELECT tests.authenticate_as(:'t2');
SELECT is_empty('SELECT 1 FROM public.teacher_resources', 'T2 cannot see T1''s resources');
RESET ROLE;
SELECT tests.authenticate_as(:'asha');
SELECT throws_ok($$INSERT INTO public.teacher_resources (title, kind, external_url) VALUES ('x', 'link', 'https://example.com')$$,
  '42501', NULL, 'students cannot add resources');
RESET ROLE;

-- ---- lesson reordering -------------------------------------------------------
SELECT tests.authenticate_as(:'t1');
SELECT lives_ok($$SELECT public.reorder_teacher_lessons(ARRAY['00000000-0000-0000-0000-0000000d1002', '00000000-0000-0000-0000-0000000d1001']::uuid[])$$,
  'T1 reorders their own lessons');
SELECT results_eq($$SELECT title FROM public.lessons WHERE author_id = auth.uid() ORDER BY sort_order$$,
  $$VALUES ('T1 L2'::text), ('T1 L1'::text)$$, 'the new order is stored in the slots T1''s lessons already used');
SELECT throws_ok($$SELECT public.reorder_teacher_lessons(ARRAY['00000000-0000-0000-0000-0000000d1003', '00000000-0000-0000-0000-0000000d1001']::uuid[])$$,
  '42501', NULL, 'T1 cannot move T2''s lesson');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
