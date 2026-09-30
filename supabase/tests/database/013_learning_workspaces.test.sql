-- Learning workspaces: lessons.content_format and per-student saved_items.
BEGIN;
\ir ../helpers.psql
SELECT plan(15);

SELECT tests.create_user('alice@test.local', '{"full_name":"Alice Kumar"}') AS alice \gset
SELECT tests.create_user('bob@test.local', '{"full_name":"Bob Rao"}') AS bob \gset

SELECT id AS maths FROM public.subjects WHERE class_level = 10 AND slug = 'mathematics' \gset

INSERT INTO public.chapters (id, subject_id, title, sort_order) VALUES
  ('00000000-0000-0000-0000-00000c0b0001', :'maths', 'Algebra', 1);
INSERT INTO public.lessons (id, chapter_id, title, status, sort_order) VALUES
  ('00000000-0000-0000-0000-00000d0b0001', '00000000-0000-0000-0000-00000c0b0001', 'Published', 'published', 1),
  ('00000000-0000-0000-0000-00000d0b0002', '00000000-0000-0000-0000-00000c0b0001', 'Draft', 'draft', 2);
INSERT INTO public.tests (id, subject_id, title, status, test_type) VALUES
  ('00000000-0000-0000-0000-00000e0b0001', :'maths', 'Full syllabus', 'published', 'full');

-- ---- content_format ------------------------------------------------------------
SELECT is(
  (SELECT content_format FROM public.lessons WHERE id = '00000000-0000-0000-0000-00000d0b0001'),
  'standard',
  'existing and new lessons default to the standard format');
SELECT throws_ok(
  $$UPDATE public.lessons SET content_format = 'hologram' WHERE id = '00000000-0000-0000-0000-00000d0b0001'$$,
  '23514', NULL,
  'content_format only accepts known formats');
SELECT lives_ok(
  $$UPDATE public.lessons SET content_format = 'animated' WHERE id = '00000000-0000-0000-0000-00000d0b0001'$$,
  'a lesson can be marked as animated');

-- ---- saving ---------------------------------------------------------------------
SELECT tests.authenticate_as(:'alice');
SELECT lives_ok(
  $$INSERT INTO public.saved_items (lesson_id) VALUES ('00000000-0000-0000-0000-00000d0b0001')$$,
  'a student can save a published lesson (user_id defaults to themselves)');
SELECT lives_ok(
  $$INSERT INTO public.saved_items (test_id) VALUES ('00000000-0000-0000-0000-00000e0b0001')$$,
  'a student can save a published test');
SELECT throws_ok(
  $$INSERT INTO public.saved_items (lesson_id) VALUES ('00000000-0000-0000-0000-00000d0b0001')$$,
  '23505', NULL,
  'the same lesson cannot be saved twice');
SELECT throws_ok(
  $$INSERT INTO public.saved_items (lesson_id, test_id) VALUES ('00000000-0000-0000-0000-00000d0b0001', '00000000-0000-0000-0000-00000e0b0001')$$,
  '23514', NULL,
  'a saved item points at exactly one lesson or test');
SELECT throws_ok(
  $$INSERT INTO public.saved_items (lesson_id) VALUES ('00000000-0000-0000-0000-00000d0b0002')$$,
  '42501', NULL,
  'a draft lesson the student cannot see cannot be saved');
SELECT is((SELECT count(*)::int FROM public.saved_items), 2, 'the student sees their own two saved items');
SELECT throws_ok(
  $$UPDATE public.saved_items SET created_at = now()$$,
  '42501', NULL,
  'saved items cannot be updated directly');

-- ---- isolation ------------------------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'bob');
SELECT is_empty('SELECT 1 FROM public.saved_items', 'another student cannot see Alice''s saved items');
SELECT throws_ok(
  format($$INSERT INTO public.saved_items (user_id, lesson_id) VALUES (%L, '00000000-0000-0000-0000-00000d0b0001')$$, :'alice'),
  '42501', NULL,
  'a student cannot save items on someone else''s behalf');
DELETE FROM public.saved_items;
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.saved_items WHERE user_id = :'alice'), 2, 'another student cannot delete Alice''s saved items');

SELECT tests.become_anon();
SELECT throws_ok('SELECT 1 FROM public.saved_items', '42501', NULL, 'anonymous visitors cannot read saved items');

RESET ROLE;
SELECT tests.authenticate_as(:'alice');
DELETE FROM public.saved_items WHERE lesson_id = '00000000-0000-0000-0000-00000d0b0001';
SELECT is((SELECT count(*)::int FROM public.saved_items), 1, 'a student can remove their own saved item');

SELECT * FROM finish();
ROLLBACK;
