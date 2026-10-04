-- ARCH-V1 Phase 5: audit log, RBAC (super_admin ⊃ admin ⊃ moderator), write throttling.
BEGIN;
\ir ../helpers.psql
SELECT plan(21);

SELECT tests.create_user('root@test.local') AS root \gset
SELECT tests.create_user('admin@test.local') AS admin \gset
SELECT tests.create_user('alice@test.local') AS alice \gset
SELECT tests.create_user('bob@test.local') AS bob \gset
SELECT tests.make_admin(:'admin');
-- Bootstrap: the owner creates the first super_admin with SQL.
INSERT INTO public.user_roles (user_id, role) VALUES (:'root', 'super_admin');
SELECT ok(public.has_role(:'root', 'admin'), 'a super_admin automatically holds admin, so existing admin checks apply');

-- ---- RBAC ------------------------------------------------------------------------------
SELECT tests.authenticate_as(:'admin');
SELECT lives_ok(format($$SELECT public.set_platform_role(%L, 'moderator', true)$$, :'alice'),
  'an admin can grant moderator');
SELECT throws_ok(format($$SELECT public.set_platform_role(%L, 'admin', true)$$, :'bob'), '42501', NULL,
  'an admin can no longer create other admins');
SELECT throws_ok(format($$INSERT INTO public.user_roles (user_id, role) VALUES (%L, 'admin')$$, :'bob'), '42501', NULL,
  'the direct table write is refused too, not only the RPC');
SELECT throws_ok(format($$SELECT public.set_platform_role(%L, 'super_admin', true)$$, :'admin'), '42501', NULL,
  'an admin cannot make themselves super_admin');
SELECT throws_ok(format($$SELECT public.set_platform_role(%L, 'admin', false)$$, :'root'), '42501', NULL,
  'an admin cannot demote a super_admin');
RESET ROLE;

SELECT tests.authenticate_as(:'alice');
SELECT throws_ok(format($$SELECT public.set_platform_role(%L, 'moderator', true)$$, :'bob'), '42501', NULL,
  'a moderator cannot grant roles');
SELECT throws_ok(format($$UPDATE public.user_roles SET role = 'admin' WHERE user_id = %L$$, :'alice'), '42501', NULL,
  'roles cannot be rewritten in place');
RESET ROLE;

SELECT tests.authenticate_as(:'root');
SELECT lives_ok(format($$SELECT public.set_platform_role(%L, 'admin', true)$$, :'bob'), 'a super_admin can grant admin');
SELECT lives_ok(format($$SELECT public.set_platform_role(%L, 'admin', false)$$, :'bob'), 'a super_admin can revoke admin');
SELECT throws_ok(format($$SELECT public.set_platform_role(%L, 'super_admin', false)$$, :'root'), '42501', NULL,
  'the last super_admin cannot be removed');
SELECT throws_ok(format($$SELECT public.set_platform_role(%L, 'admin', false)$$, :'root'), '42501', NULL,
  'admin cannot be removed while the user is still super_admin');
RESET ROLE;

-- ---- audit log --------------------------------------------------------------------------
SELECT results_eq(
  format($$SELECT actor_id, actor_role, after->>'role' FROM public.audit_logs
           WHERE action = 'role.change' AND resource_type = 'user_roles' AND after->>'user_id' = %L$$, :'alice'),
  format($$VALUES (%L::uuid, 'admin'::text, 'moderator'::text)$$, :'admin'),
  'granting a role records who did it, with their role');
SELECT is((SELECT count(*)::int FROM public.audit_logs WHERE action = 'role.change' AND before->>'user_id' = :'bob' AND after IS NULL), 1,
  'revoking a role is audited with the before state');

SELECT id AS maths FROM public.subjects WHERE class_level = 10 AND slug = 'mathematics' \gset
INSERT INTO public.chapters (id, subject_id, title, sort_order) VALUES ('00000000-0000-0000-0000-0000020c0001', :'maths', 'Audit', 1);
INSERT INTO public.lessons (id, chapter_id, title, status, sort_order, content_md)
VALUES ('00000000-0000-0000-0000-0000020d0001', '00000000-0000-0000-0000-0000020c0001', 'Audit lesson', 'draft', 1, 'secret body');
UPDATE public.lessons SET status = 'published' WHERE id = '00000000-0000-0000-0000-0000020d0001';
SELECT results_eq($$SELECT before->>'status', after->>'status', 'status' = ANY (changed_fields), after ? 'content_md'
                     FROM public.audit_logs WHERE action = 'content.publish_state' AND resource_id = '00000000-0000-0000-0000-0000020d0001'$$,
  $$VALUES ('draft'::text, 'published'::text, true, false)$$,
  'publishing is audited with before/after state; lesson bodies are not copied into the log');

SELECT tests.authenticate_as(:'alice');
SELECT is((SELECT count(*)::int FROM public.audit_logs), 0, 'a moderator cannot read the audit log');
SELECT throws_ok($$INSERT INTO public.audit_logs (actor_role, action, resource_type) VALUES ('x', 'forged', 'x')$$, '42501', NULL,
  'nobody can forge audit entries');
RESET ROLE;
SELECT tests.authenticate_as(:'admin');
SELECT ok((SELECT count(*) FROM public.audit_logs) >= 3, 'admins can read the audit log');
SELECT throws_ok('DELETE FROM public.audit_logs', '42501', NULL, 'even admins cannot erase audit history');
RESET ROLE;

-- ---- moderation deletes are audited, own deletes are not ------------------------------------
INSERT INTO public.forum_categories (name) VALUES ('Governance test') RETURNING id AS category \gset
INSERT INTO public.forum_threads (id, category_id, author_id, title, content)
VALUES ('00000000-0000-0000-0000-0000020e0001', :'category', :'bob', 'Spam', 'spam'),
       ('00000000-0000-0000-0000-0000020e0002', :'category', :'bob', 'Mine', 'mine');
SELECT tests.authenticate_as(:'bob');
DELETE FROM public.forum_threads WHERE id = '00000000-0000-0000-0000-0000020e0002';
RESET ROLE;
SELECT tests.authenticate_as(:'alice');
DELETE FROM public.forum_threads WHERE id = '00000000-0000-0000-0000-0000020e0001';
RESET ROLE;
SELECT results_eq($$SELECT resource_id, actor_role FROM public.audit_logs WHERE action = 'moderation.delete'$$,
  $$VALUES ('00000000-0000-0000-0000-0000020e0001'::text, 'moderator'::text)$$,
  'a moderator deleting someone else''s thread is audited; an author deleting their own is not');

-- ---- write throttling -------------------------------------------------------------------------
SELECT tests.authenticate_as(:'bob');
INSERT INTO public.forum_threads (category_id, author_id, title, content)
  SELECT :'category', :'bob', 'Thread ' || g, 'c' FROM generate_series(1, 10) g;
SELECT throws_ok(format($$INSERT INTO public.forum_threads (category_id, author_id, title, content) VALUES (%L, %L, 'eleventh', 'c')$$,
  :'category', :'bob'), 'PT429', NULL, 'the 11th thread in 10 minutes is refused with HTTP 429');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
