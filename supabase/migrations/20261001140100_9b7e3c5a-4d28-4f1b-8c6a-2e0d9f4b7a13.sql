-- Architecture V1 Phase 5 (part 2): audit log, explicit RBAC, write throttling.
--
-- 1. public.audit_logs — append-only record of sensitive actions, written only
--    by triggers (SECURITY DEFINER), readable only by admins. Captures actor,
--    actor role, action, resource, redacted before/after, the list of changed
--    fields, and the gateway request id (x-request-id) when present. Large or
--    personal free-text fields (lesson bodies, applicant phone/email, feedback,
--    meeting links) are replaced by their names in changed_fields only.
--
-- 2. RBAC: super_admin ⊃ admin ⊃ moderator. Previously any admin could grant
--    admin. Now: admins grant/revoke moderator; only a super_admin grants or
--    revokes admin/super_admin. Every super_admin also holds admin (so every
--    existing is_admin()/has_role(admin) check keeps working), the last
--    super_admin cannot be removed, and every change is audited.
--    Bootstrap: no super_admin exists until the owner inserts one with SQL.
--
-- 3. Write throttling on user-generated content (forum, clubs, events,
--    reports, mentor applications, votes) via private.enforce_rate_limit();
--    over-limit writes fail with HTTP 429. Inserts without a signed-in user
--    (service role, migrations, seeds) are not throttled.
--
-- Rollback: supabase/rollbacks/20261001140100_governance.sql

-- ---------------------------------------------------------------------------
-- 1. Audit log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  actor_role text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  changed_fields text[],
  before jsonb,
  after jsonb,
  request_id text
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs (resource_type, resource_id);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
DROP POLICY IF EXISTS "Admins read audit logs" ON public.audit_logs;
CREATE POLICY "Admins read audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION private.actor_role(_uid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _uid IS NULL THEN 'system'
    WHEN public.has_role(_uid, 'super_admin') THEN 'super_admin'
    WHEN public.has_role(_uid, 'admin') THEN 'admin'
    WHEN public.has_role(_uid, 'moderator') THEN 'moderator'
    WHEN public.is_mentor(_uid) THEN 'mentor'
    ELSE 'student'
  END;
$$;

CREATE OR REPLACE FUNCTION private.audit_redact(_row jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT _row - ARRAY['content_md', 'content', 'motivation', 'phone', 'email', 'full_name',
                      'introduction', 'concept_explanation', 'real_life_example', 'practice_questions',
                      'summary_points', 'quick_tips', 'motivational_line', 'meeting_link',
                      'feedback', 'description', 'explanation', 'prompt', 'reporter_name'];
$$;

-- Generic row audit. TG_ARGV[0] = action name.
CREATE OR REPLACE FUNCTION private.audit_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _old jsonb := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END;
  _new jsonb := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END;
  _uid uuid := auth.uid();
BEGIN
  INSERT INTO public.audit_logs (actor_id, actor_role, action, resource_type, resource_id, changed_fields, before, after, request_id)
  VALUES (
    _uid,
    private.actor_role(_uid),
    TG_ARGV[0],
    TG_TABLE_NAME,
    coalesce(_new->>'id', _old->>'id', _new->>'attempt_id', _old->>'attempt_id'),
    CASE WHEN TG_OP = 'UPDATE' THEN
      (SELECT array_agg(n.key ORDER BY n.key) FROM jsonb_each(_new) n
        WHERE n.value IS DISTINCT FROM _old->n.key AND n.key NOT IN ('updated_at'))
    END,
    private.audit_redact(_old),
    private.audit_redact(_new),
    left(current_setting('request.headers', true)::jsonb->>'x-request-id', 64)
  );
  RETURN coalesce(NEW, OLD);
END;
$$;

-- Deletes of someone else's post = moderation; authors deleting their own
-- posts are not audited.
CREATE OR REPLACE FUNCTION private.audit_moderation_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NOT NULL AND _uid IS DISTINCT FROM OLD.author_id THEN
    INSERT INTO public.audit_logs (actor_id, actor_role, action, resource_type, resource_id, before, request_id)
    VALUES (_uid, private.actor_role(_uid), 'moderation.delete', TG_TABLE_NAME, OLD.id::text,
            private.audit_redact(to_jsonb(OLD)),
            left(current_setting('request.headers', true)::jsonb->>'x-request-id', 64));
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION private.audit_row('role.change');

DROP TRIGGER IF EXISTS audit_profile_role ON public.profiles;
CREATE TRIGGER audit_profile_role AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW WHEN (OLD.role IS DISTINCT FROM NEW.role) EXECUTE FUNCTION private.audit_row('role.change');

DROP TRIGGER IF EXISTS audit_mentor_application_status ON public.mentor_applications;
CREATE TRIGGER audit_mentor_application_status AFTER UPDATE OF status ON public.mentor_applications
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION private.audit_row('mentor_application.review');

DROP TRIGGER IF EXISTS audit_lesson_status ON public.lessons;
CREATE TRIGGER audit_lesson_status AFTER UPDATE OF status ON public.lessons
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION private.audit_row('content.publish_state');
DROP TRIGGER IF EXISTS audit_lesson_delete ON public.lessons;
CREATE TRIGGER audit_lesson_delete AFTER DELETE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION private.audit_row('content.delete');

DROP TRIGGER IF EXISTS audit_test_status ON public.tests;
CREATE TRIGGER audit_test_status AFTER UPDATE OF status ON public.tests
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION private.audit_row('content.publish_state');
DROP TRIGGER IF EXISTS audit_test_delete ON public.tests;
CREATE TRIGGER audit_test_delete AFTER DELETE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION private.audit_row('content.delete');

DROP TRIGGER IF EXISTS audit_blog_status ON public.blog_posts;
CREATE TRIGGER audit_blog_status AFTER UPDATE OF status ON public.blog_posts
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION private.audit_row('content.publish_state');
DROP TRIGGER IF EXISTS audit_blog_delete ON public.blog_posts;
CREATE TRIGGER audit_blog_delete AFTER DELETE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION private.audit_row('content.delete');

DROP TRIGGER IF EXISTS audit_test_questions ON public.test_questions;
CREATE TRIGGER audit_test_questions AFTER INSERT OR UPDATE OR DELETE ON public.test_questions
  FOR EACH ROW EXECUTE FUNCTION private.audit_row('assessment.modify');

DROP TRIGGER IF EXISTS audit_score_change ON public.test_attempts;
CREATE TRIGGER audit_score_change AFTER UPDATE OF score, percentage ON public.test_attempts
  FOR EACH ROW WHEN (OLD.status = 'submitted' AND (OLD.score IS DISTINCT FROM NEW.score OR OLD.percentage IS DISTINCT FROM NEW.percentage))
  EXECUTE FUNCTION private.audit_row('score.change');

DROP TRIGGER IF EXISTS audit_attempt_reviews ON public.attempt_reviews;
CREATE TRIGGER audit_attempt_reviews AFTER INSERT OR UPDATE ON public.attempt_reviews
  FOR EACH ROW EXECUTE FUNCTION private.audit_row('assessment.review');

DROP TRIGGER IF EXISTS audit_report_status ON public.user_reports;
CREATE TRIGGER audit_report_status AFTER UPDATE OF status ON public.user_reports
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION private.audit_row('report.review');

DROP TRIGGER IF EXISTS audit_moderation_delete ON public.forum_threads;
CREATE TRIGGER audit_moderation_delete AFTER DELETE ON public.forum_threads
  FOR EACH ROW EXECUTE FUNCTION private.audit_moderation_delete();
DROP TRIGGER IF EXISTS audit_moderation_delete ON public.forum_replies;
CREATE TRIGGER audit_moderation_delete AFTER DELETE ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION private.audit_moderation_delete();
DROP TRIGGER IF EXISTS audit_moderation_delete ON public.club_posts;
CREATE TRIGGER audit_moderation_delete AFTER DELETE ON public.club_posts
  FOR EACH ROW EXECUTE FUNCTION private.audit_moderation_delete();

-- ---------------------------------------------------------------------------
-- 2. RBAC
-- ---------------------------------------------------------------------------
-- Every super_admin also holds admin.
CREATE OR REPLACE FUNCTION private.super_admin_implies_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'super_admin' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Admin cannot be removed from a super_admin; the last super_admin cannot be
-- removed. Account deletion (cascade from auth.users) is always allowed.
CREATE OR REPLACE FUNCTION private.guard_role_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = OLD.user_id) THEN
    RETURN OLD;
  END IF;
  IF OLD.role = 'admin' AND public.has_role(OLD.user_id, 'super_admin') THEN
    RAISE EXCEPTION 'remove super_admin before admin' USING ERRCODE = '42501';
  END IF;
  IF OLD.role = 'super_admin'
     AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin' AND user_id <> OLD.user_id) THEN
    RAISE EXCEPTION 'cannot remove the last super_admin' USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS super_admin_implies_admin ON public.user_roles;
CREATE TRIGGER super_admin_implies_admin AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION private.super_admin_implies_admin();
DROP TRIGGER IF EXISTS guard_role_removal ON public.user_roles;
CREATE TRIGGER guard_role_removal BEFORE DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION private.guard_role_removal();
-- Role changes are grant + revoke, never an in-place rewrite.
REVOKE UPDATE ON public.user_roles FROM anon, authenticated;

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (
    (role = 'moderator' AND public.is_admin(auth.uid()))
    OR (role IN ('admin', 'super_admin') AND public.has_role(auth.uid(), 'super_admin')));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE USING (
    (role = 'moderator' AND public.is_admin(auth.uid()))
    OR (role IN ('admin', 'super_admin') AND public.has_role(auth.uid(), 'super_admin')));

-- Convenience RPC with the caller's rights: the policies above decide.
CREATE OR REPLACE FUNCTION public.set_platform_role(_user_id uuid, _role public.app_role, _grant boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _rows integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;
    GET DIAGNOSTICS _rows = ROW_COUNT;
    IF _rows = 0 AND public.has_role(_user_id, _role) THEN
      RAISE EXCEPTION 'not allowed to revoke %', _role USING ERRCODE = '42501';
    END IF;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.set_platform_role(uuid, public.app_role, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_platform_role(uuid, public.app_role, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Write throttling (limits per signed-in user)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.throttle_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    PERFORM private.enforce_rate_limit(TG_TABLE_NAME, TG_ARGV[0]::integer, TG_ARGV[1]::interval);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS throttle_insert ON public.forum_threads;
CREATE TRIGGER throttle_insert BEFORE INSERT ON public.forum_threads
  FOR EACH ROW EXECUTE FUNCTION private.throttle_insert('10', '10 minutes');
DROP TRIGGER IF EXISTS throttle_insert ON public.forum_replies;
CREATE TRIGGER throttle_insert BEFORE INSERT ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION private.throttle_insert('30', '10 minutes');
DROP TRIGGER IF EXISTS throttle_insert ON public.club_posts;
CREATE TRIGGER throttle_insert BEFORE INSERT ON public.club_posts
  FOR EACH ROW EXECUTE FUNCTION private.throttle_insert('30', '10 minutes');
DROP TRIGGER IF EXISTS throttle_insert ON public.user_reports;
CREATE TRIGGER throttle_insert BEFORE INSERT ON public.user_reports
  FOR EACH ROW EXECUTE FUNCTION private.throttle_insert('10', '1 hour');
DROP TRIGGER IF EXISTS throttle_insert ON public.community_events;
CREATE TRIGGER throttle_insert BEFORE INSERT ON public.community_events
  FOR EACH ROW EXECUTE FUNCTION private.throttle_insert('10', '1 hour');
DROP TRIGGER IF EXISTS throttle_insert ON public.student_clubs;
CREATE TRIGGER throttle_insert BEFORE INSERT ON public.student_clubs
  FOR EACH ROW EXECUTE FUNCTION private.throttle_insert('5', '1 day');
DROP TRIGGER IF EXISTS throttle_insert ON public.mentor_applications;
CREATE TRIGGER throttle_insert BEFORE INSERT ON public.mentor_applications
  FOR EACH ROW EXECUTE FUNCTION private.throttle_insert('5', '1 day');
DROP TRIGGER IF EXISTS throttle_insert ON public.thread_votes;
CREATE TRIGGER throttle_insert BEFORE INSERT ON public.thread_votes
  FOR EACH ROW EXECUTE FUNCTION private.throttle_insert('120', '10 minutes');
DROP TRIGGER IF EXISTS throttle_insert ON public.reply_votes;
CREATE TRIGGER throttle_insert BEFORE INSERT ON public.reply_votes
  FOR EACH ROW EXECUTE FUNCTION private.throttle_insert('120', '10 minutes');

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;
