-- ARCH-V1 Phase 2: get_student_dashboard() read model — authorization, parity
-- with the per-section RPCs it replaces, and per-user isolation.
BEGIN;
\ir ../helpers.psql
SELECT plan(14);

SELECT tests.create_user('alice@test.local', '{"full_name":"Alice Kumar"}') AS alice \gset
SELECT tests.create_user('bob@test.local', '{"full_name":"Bob Rao"}') AS bob \gset

SELECT id AS maths FROM public.subjects WHERE class_level = 10 AND slug = 'mathematics' \gset

INSERT INTO public.chapters (id, subject_id, title, sort_order) VALUES
  ('00000000-0000-0000-0000-0000017c0001', :'maths', 'Algebra', 1);
INSERT INTO public.lessons (id, chapter_id, title, status, sort_order) VALUES
  ('00000000-0000-0000-0000-0000017d0001', '00000000-0000-0000-0000-0000017c0001', 'L1', 'published', 1),
  ('00000000-0000-0000-0000-0000017d0002', '00000000-0000-0000-0000-0000017c0001', 'L2', 'published', 2),
  ('00000000-0000-0000-0000-0000017d0003', '00000000-0000-0000-0000-0000017c0001', 'L3', 'published', 3),
  ('00000000-0000-0000-0000-0000017d0004', '00000000-0000-0000-0000-0000017c0001', 'Draft', 'draft', 4);

-- Alice completes L1, views L2 without finishing, completes L3 last.
SELECT tests.authenticate_as(:'alice');
SELECT public.record_lesson_progress('00000000-0000-0000-0000-0000017d0001', true);
SELECT public.record_lesson_progress('00000000-0000-0000-0000-0000017d0002', false);
SELECT public.record_lesson_progress('00000000-0000-0000-0000-0000017d0003', true);
RESET ROLE;
-- now() is constant inside a transaction; make the viewing order explicit.
UPDATE public.lesson_progress SET last_viewed_at = now() - interval '3 hours' WHERE user_id = :'alice' AND lesson_id = '00000000-0000-0000-0000-0000017d0001';
UPDATE public.lesson_progress SET last_viewed_at = now() - interval '2 hours' WHERE user_id = :'alice' AND lesson_id = '00000000-0000-0000-0000-0000017d0002';
UPDATE public.lesson_progress SET last_viewed_at = now() - interval '1 hour'  WHERE user_id = :'alice' AND lesson_id = '00000000-0000-0000-0000-0000017d0003';

INSERT INTO public.doubts (user_id, question, subject, status, created_at) VALUES
  (:'alice', 'Q maths 1', 'Mathematics', 'answered',        now() - interval '3 days'),
  (:'alice', 'Q maths 2', 'Mathematics', 'escalated',       now() - interval '2 days'),
  (:'alice', 'Q science', 'Science',     'mentor_answered', now() - interval '1 day'),
  (:'alice', 'Q old',     'English',     'answered',        now() - interval '9 days'),
  (:'bob',   'Bob only',  'Science',     'answered',        now());

-- ---- authorization --------------------------------------------------------
SELECT tests.become_anon();
SELECT throws_ok($$SELECT public.get_student_dashboard(10::smallint, current_date - 7, current_date)$$,
  '42501', NULL, 'anonymous callers cannot read any dashboard');
RESET ROLE;

SELECT tests.authenticate_as(:'alice');
SELECT throws_ok($$SELECT public.get_student_dashboard(10::smallint, current_date, current_date - 1)$$,
  '22023', NULL, 'an inverted activity range is rejected');
SELECT throws_ok($$SELECT public.get_student_dashboard(10::smallint, current_date - 400, current_date)$$,
  '22023', NULL, 'an activity range over a year is rejected (bounded payload)');

CREATE TEMP TABLE dash AS SELECT public.get_student_dashboard(10::smallint, current_date - 83, current_date) AS j;

-- ---- shape and error isolation ---------------------------------------------
SELECT is((SELECT array_agg(k ORDER BY k) FROM dash, jsonb_object_keys(j) k),
  ARRAY['activity_days','continue_lesson','doubt_stats','mentorship','recent_doubts','recent_tests',
        'subjects','summary','weak_areas','weekly_summary','xp_breakdown'],
  'one call returns all 11 dashboard sections');
SELECT is((SELECT count(*)::int FROM dash, jsonb_each(j) e WHERE e.value ? 'error'), 0,
  'no section reports an error for a normal student');

-- ---- parity with the RPCs it replaces ----------------------------------------
SELECT is((SELECT j->'summary'->'data' FROM dash), (SELECT to_jsonb(s) FROM public.get_learning_summary() s),
  'summary section equals get_learning_summary()');
SELECT is((SELECT j->'subjects'->'data' FROM dash),
  (SELECT jsonb_agg(to_jsonb(s)) FROM public.get_subject_progress(10::smallint) s),
  'subjects section equals get_subject_progress()');
SELECT is((SELECT j->'weekly_summary'->'data' FROM dash),
  (SELECT jsonb_agg(to_jsonb(s)) FROM public.get_weekly_summary() s),
  'weekly section equals get_weekly_summary()');

-- ---- continue learning --------------------------------------------------------
SELECT is((SELECT j->'continue_lesson'->'data'->>'lesson_id' FROM dash), '00000000-0000-0000-0000-0000017d0002',
  'continue learning picks the most recent unfinished lesson, not the most recent completed one');
SELECT is((SELECT (j->'continue_lesson'->'data'->>'chapter_lesson_count')::int FROM dash), 3,
  'chapter lesson count respects RLS: the draft lesson is not counted for a student');

-- ---- doubt analytics ------------------------------------------------------------
SELECT is((SELECT (j->'doubt_stats'->'data') - 'topSubjects' FROM dash),
  '{"total": 4, "resolved": 3, "unresolved": 1, "escalated": 1}'::jsonb,
  'doubt stats come from one scan with the same meanings as before');
SELECT is((SELECT j->'doubt_stats'->'data'->'topSubjects'->0 FROM dash), '{"subject": "Mathematics", "count": 2}'::jsonb,
  'top doubt subject is ranked by count');
SELECT is((SELECT array_agg(d->>'question' ORDER BY ord) FROM dash, jsonb_array_elements(j->'recent_doubts'->'data') WITH ORDINALITY AS t(d, ord)),
  ARRAY['Q science', 'Q maths 2', 'Q maths 1'], 'recent doubts: newest three of my own only');
RESET ROLE;

-- ---- isolation ----------------------------------------------------------------
SELECT tests.authenticate_as(:'bob');
SELECT is((SELECT (public.get_student_dashboard(10::smallint, current_date - 7, current_date)->'doubt_stats'->'data'->>'total')::int),
  1, 'Bob only ever sees his own doubts, never Alice''s');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
