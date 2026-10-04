-- Rollback for 20261001140100_9b7e3c5a-4d28-4f1b-8c6a-2e0d9f4b7a13.sql
-- (and the data side of 20261001140000: super_admin rows are removed; the enum
-- label itself cannot be dropped and is harmless when unused).
DO $$
DECLARE
  _t text;
BEGIN
  FOREACH _t IN ARRAY ARRAY['forum_threads', 'forum_replies', 'club_posts', 'user_reports', 'community_events',
                            'student_clubs', 'mentor_applications', 'thread_votes', 'reply_votes'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS throttle_insert ON public.%I', _t);
  END LOOP;
  FOREACH _t IN ARRAY ARRAY['forum_threads', 'forum_replies', 'club_posts'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_moderation_delete ON public.%I', _t);
  END LOOP;
END $$;
DROP TRIGGER IF EXISTS audit_report_status ON public.user_reports;
DROP TRIGGER IF EXISTS audit_attempt_reviews ON public.attempt_reviews;
DROP TRIGGER IF EXISTS audit_score_change ON public.test_attempts;
DROP TRIGGER IF EXISTS audit_test_questions ON public.test_questions;
DROP TRIGGER IF EXISTS audit_blog_delete ON public.blog_posts;
DROP TRIGGER IF EXISTS audit_blog_status ON public.blog_posts;
DROP TRIGGER IF EXISTS audit_test_delete ON public.tests;
DROP TRIGGER IF EXISTS audit_test_status ON public.tests;
DROP TRIGGER IF EXISTS audit_lesson_delete ON public.lessons;
DROP TRIGGER IF EXISTS audit_lesson_status ON public.lessons;
DROP TRIGGER IF EXISTS audit_mentor_application_status ON public.mentor_applications;
DROP TRIGGER IF EXISTS audit_profile_role ON public.profiles;

DROP TRIGGER IF EXISTS guard_role_removal ON public.user_roles;
DROP TRIGGER IF EXISTS super_admin_implies_admin ON public.user_roles;
DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
DELETE FROM public.user_roles WHERE role = 'super_admin';

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

DROP FUNCTION IF EXISTS public.set_platform_role(uuid, public.app_role, boolean);
DROP FUNCTION IF EXISTS private.throttle_insert();
DROP FUNCTION IF EXISTS private.guard_role_removal();
DROP FUNCTION IF EXISTS private.super_admin_implies_admin();
DROP FUNCTION IF EXISTS private.audit_moderation_delete();
DROP FUNCTION IF EXISTS private.audit_row();
DROP FUNCTION IF EXISTS private.audit_redact(jsonb);
DROP FUNCTION IF EXISTS private.actor_role(uuid);
DROP TABLE IF EXISTS public.audit_logs;
