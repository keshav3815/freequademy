-- SEC-008 / BUG-008: blog author ownership and draft visibility.
BEGIN;
\ir ../helpers.psql
SELECT plan(15);

SELECT tests.create_user('author-a@test.local', '{"full_name":"Author A"}') AS author_a \gset
SELECT tests.create_user('author-b@test.local', '{"full_name":"Author B"}') AS author_b \gset
SELECT tests.create_user('student@test.local', '{"full_name":"Student"}') AS student \gset
SELECT tests.create_user('admin@test.local') AS admin \gset
SELECT tests.make_mentor(:'author_a');
SELECT tests.make_mentor(:'author_b');
SELECT tests.make_admin(:'admin');

CREATE FUNCTION pg_temp.post_sql(_id uuid, _author uuid, _status text, _slug text)
RETURNS text LANGUAGE sql AS $$
  SELECT format($f$INSERT INTO public.blog_posts
    (id, title, slug, subject, class_level, chapter, introduction, concept_explanation,
     real_life_example, motivational_line, author_id, author_name, status)
    VALUES (%L, 'T', %L, 'Maths', '10', 'C', 'i', 'c', 'r', 'm', %L, 'Spoofed Name', %L)$f$,
    _id, _slug, _author, _status)
$$;
GRANT EXECUTE ON FUNCTION pg_temp.post_sql(uuid, uuid, text, text) TO anon, authenticated;

-- ---- author A ---------------------------------------------------------------
SELECT tests.authenticate_as(:'author_a');
SELECT lives_ok(pg_temp.post_sql('00000000-0000-0000-0000-00000000b001', :'author_a', 'published', 'pub-a'),
  'mentor can create a post as themselves');
SELECT lives_ok(pg_temp.post_sql('00000000-0000-0000-0000-00000000b002', :'author_a', 'draft', 'draft-a'),
  'mentor can create a draft as themselves');
SELECT throws_ok(pg_temp.post_sql(gen_random_uuid(), :'author_b', 'published', 'spoof'),
  '42501', NULL, 'mentor cannot create a post as another author');
SELECT is((SELECT author_name FROM public.blog_posts WHERE id = '00000000-0000-0000-0000-00000000b001'),
  'Author A', 'author_name is derived from the profile, not the client');
SELECT isnt_empty($$SELECT 1 FROM public.blog_posts WHERE id = '00000000-0000-0000-0000-00000000b002'$$,
  'author can read their own draft');
SELECT throws_ok(
  format($$UPDATE public.blog_posts SET author_id = %L WHERE id = '00000000-0000-0000-0000-00000000b001'$$, :'author_b'),
  '42501', NULL, 'author cannot transfer a post to another author');

-- ---- student ----------------------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'student');
SELECT throws_ok(pg_temp.post_sql(gen_random_uuid(), :'student', 'published', 'student-post'),
  '42501', NULL, 'student cannot create blog posts');

-- ---- author B ---------------------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'author_b');
SELECT is_empty($$SELECT 1 FROM public.blog_posts WHERE id = '00000000-0000-0000-0000-00000000b002'$$,
  'another author cannot read someone else''s draft');
UPDATE public.blog_posts SET title = 'defaced' WHERE id = '00000000-0000-0000-0000-00000000b001';
DELETE FROM public.blog_posts WHERE id = '00000000-0000-0000-0000-00000000b001';

-- ---- anon -------------------------------------------------------------------
RESET ROLE;
SELECT tests.become_anon();
SELECT is_empty($$SELECT 1 FROM public.blog_posts WHERE id = '00000000-0000-0000-0000-00000000b002'$$,
  'anonymous cannot read drafts');
SELECT isnt_empty($$SELECT 1 FROM public.blog_posts WHERE id = '00000000-0000-0000-0000-00000000b001'$$,
  'anonymous can read published posts');
SELECT throws_ok(pg_temp.post_sql(gen_random_uuid(), :'author_a', 'published', 'anon-post'),
  '42501', NULL, 'anonymous cannot create posts');

-- ---- admin ------------------------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'admin');
SELECT isnt_empty($$SELECT 1 FROM public.blog_posts WHERE id = '00000000-0000-0000-0000-00000000b002'$$,
  'admin can read drafts for moderation');

RESET ROLE;
SELECT is((SELECT title FROM public.blog_posts WHERE id = '00000000-0000-0000-0000-00000000b001'), 'T',
  'another author could not edit the post');
SELECT isnt_empty($$SELECT 1 FROM public.blog_posts WHERE id = '00000000-0000-0000-0000-00000000b001'$$,
  'another author could not delete the post');
SELECT is((SELECT author_id FROM public.blog_posts WHERE id = '00000000-0000-0000-0000-00000000b001'), :'author_a'::uuid,
  'post still belongs to author A');

SELECT * FROM finish();
ROLLBACK;
