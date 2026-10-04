-- Study Notes chapter stats: real counts, own completion only, notes definition.
BEGIN;
\ir ../helpers.psql
SELECT plan(6);

SELECT tests.create_user('alice@test.local', '{"full_name":"Alice Kumar"}') AS alice \gset
SELECT tests.create_user('bob@test.local', '{"full_name":"Bob Rao"}') AS bob \gset

SELECT id AS maths FROM public.subjects WHERE class_level = 10 AND slug = 'mathematics' \gset

INSERT INTO public.chapters (id, subject_id, title, sort_order) VALUES
  ('00000000-0000-0000-0000-00000c0c0001', :'maths', 'Algebra', 1),
  ('00000000-0000-0000-0000-00000c0c0002', :'maths', 'Empty chapter', 2);
INSERT INTO public.lessons (id, chapter_id, title, content_md, status, content_format, sort_order) VALUES
  ('00000000-0000-0000-0000-00000d0c0001', '00000000-0000-0000-0000-00000c0c0001', 'Note 1', '# One', 'published', 'standard', 1),
  ('00000000-0000-0000-0000-00000d0c0002', '00000000-0000-0000-0000-00000c0c0001', 'Note 2', '# Two', 'published', 'standard', 2),
  ('00000000-0000-0000-0000-00000d0c0003', '00000000-0000-0000-0000-00000c0c0001', 'Draft', '# Draft', 'draft', 'standard', 3),
  ('00000000-0000-0000-0000-00000d0c0004', '00000000-0000-0000-0000-00000c0c0001', 'Animation', '# Anim', 'published', 'animated', 4),
  ('00000000-0000-0000-0000-00000d0c0005', '00000000-0000-0000-0000-00000c0c0001', 'Video only', '', 'published', 'standard', 5);

SELECT tests.authenticate_as(:'alice');
SELECT public.record_lesson_progress('00000000-0000-0000-0000-00000d0c0001', true);

SELECT results_eq(
  $$SELECT note_count, completed_count FROM public.get_study_note_stats(10::smallint)
    WHERE chapter_id = '00000000-0000-0000-0000-00000c0c0001'$$,
  $$VALUES (2, 1)$$,
  'counts only published, standard lessons with written notes; completion is the student''s own');
SELECT is_empty(
  $$SELECT 1 FROM public.get_study_note_stats(10::smallint) WHERE chapter_id = '00000000-0000-0000-0000-00000c0c0002'$$,
  'a chapter without notes returns no row (the UI shows a real 0, not an estimate)');
SELECT is_empty(
  $$SELECT 1 FROM public.get_study_note_stats(11::smallint) WHERE chapter_id = '00000000-0000-0000-0000-00000c0c0001'$$,
  'stats are scoped to the requested class');

RESET ROLE;
SELECT tests.authenticate_as(:'bob');
SELECT results_eq(
  $$SELECT note_count, completed_count FROM public.get_study_note_stats(10::smallint)
    WHERE chapter_id = '00000000-0000-0000-0000-00000c0c0001'$$,
  $$VALUES (2, 0)$$,
  'another student sees the same note count but none of Alice''s completion');

RESET ROLE;
SELECT tests.become_anon();
SELECT results_eq(
  $$SELECT note_count, completed_count FROM public.get_study_note_stats(10::smallint)
    WHERE chapter_id = '00000000-0000-0000-0000-00000c0c0001'$$,
  $$VALUES (2, 0)$$,
  'anonymous callers get counts with zero completion');

RESET ROLE;
SELECT is(
  (SELECT prosecdef FROM pg_proc WHERE proname = 'get_study_note_stats'),
  false,
  'runs as the caller (SECURITY INVOKER), so RLS applies');

SELECT * FROM finish();
ROLLBACK;
