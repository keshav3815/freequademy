-- =============================================================================
-- PHASE 0 — Security, authorization & abuse-control remediation
--
-- Addresses audit findings SEC-001, SEC-004, SEC-005, SEC-006, SEC-007,
-- SEC-008, SEC-011, SEC-012, BUG-008 (drafts) and AI-001 (daily quota).
--
-- Design rules:
--   * Authorization is enforced in the database (RLS + column privileges +
--     guard triggers), never only in the frontend.
--   * Privileged state changes (granting mentor, verifying mentors) happen only
--     inside SECURITY DEFINER functions that check has_role(auth.uid(),'admin').
--   * NO data is modified or deleted. Existing mentor roles are preserved and
--     must be reviewed manually (see supabase/sql/reports/phase0_mentor_review.sql).
--   * New CHECK constraints are NOT VALID so legacy rows never block the
--     migration; they are enforced for every new/updated row.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. Helper predicates used by policies
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.is_mentor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'mentor'::public.user_role
  )
$$;

-- True when the current statement comes straight from an API client
-- (PostgREST runs requests as the anon/authenticated roles). Inside
-- SECURITY DEFINER functions current_user is the function owner, so trusted
-- server-side workflows are not affected by the guards below.
CREATE OR REPLACE FUNCTION public.is_api_client()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT current_user IN ('anon', 'authenticated')
$$;


-- -----------------------------------------------------------------------------
-- 1. SEC-001 — signup can never grant a privileged role
-- -----------------------------------------------------------------------------
-- raw_user_meta_data is fully client controlled (supabase.auth.signUp options.data),
-- so the role is always 'student'. Grade is normalised to the supported set and
-- full_name is bounded.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _grade text := NEW.raw_user_meta_data->>'grade';
BEGIN
  INSERT INTO public.profiles (id, email, full_name, grade, role)
  VALUES (
    NEW.id,
    NEW.email,
    left(nullif(btrim(NEW.raw_user_meta_data->>'full_name'), ''), 120),
    CASE WHEN _grade IN ('6','7','8','9','10','11','12') THEN _grade END,
    'student'::public.user_role
  );
  RETURN NEW;
END;
$$;

-- Keep profiles.email in sync with the authoritative auth.users.email, so an
-- email change only ever happens through Supabase Auth's verified flow.
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_email();


-- -----------------------------------------------------------------------------
-- 2. SEC-001 / SEC-004 — profiles.role and profiles.email are not client-writable
-- -----------------------------------------------------------------------------
-- Profiles are created exclusively by handle_new_user(); a client-side INSERT
-- path is unnecessary and would allow choosing a role.
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Column privileges: API clients may only change their display fields.
REVOKE INSERT, UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (full_name, grade) ON public.profiles TO authenticated;

-- Defence in depth: even if a future migration re-grants UPDATE, protected
-- columns still cannot be changed by API clients.
CREATE OR REPLACE FUNCTION public.guard_profile_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.is_api_client() THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'profiles.id, role, email and created_at are managed by the platform'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_protected_columns ON public.profiles;
CREATE TRIGGER guard_profile_protected_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_protected_columns();


-- -----------------------------------------------------------------------------
-- 3. SEC-007 — mentor trust fields; mentor rows only created by admin approval
-- -----------------------------------------------------------------------------
-- Previously any authenticated user could INSERT a mentors row for themselves
-- (with is_verified = true) and then schedule sessions. Mentor rows are now
-- created only by approve_mentor_application().
DROP POLICY IF EXISTS "Mentors can insert their own profile" ON public.mentors;

DROP POLICY IF EXISTS "Mentors can update their own profile" ON public.mentors;
CREATE POLICY "Mentors can update their own profile"
ON public.mentors
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.mentors FROM anon, authenticated;
GRANT UPDATE (full_name, bio, expertise, qualification, experience_years,
              availability_hours, is_volunteer)
  ON public.mentors TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_mentor_trust_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.is_api_client() THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.rating IS DISTINCT FROM OLD.rating
       OR NEW.total_sessions IS DISTINCT FROM OLD.total_sessions
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'mentors.is_verified, rating, total_sessions, email and id are managed by the platform'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_mentor_trust_columns ON public.mentors;
CREATE TRIGGER guard_mentor_trust_columns
  BEFORE UPDATE ON public.mentors
  FOR EACH ROW EXECUTE FUNCTION public.guard_mentor_trust_columns();


-- -----------------------------------------------------------------------------
-- 4. Mentor application flow — applying never grants privileges
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can submit applications" ON public.mentor_applications;
CREATE POLICY "Users can submit applications"
ON public.mentor_applications
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND status = 'pending'
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
  -- at most one open application per user
  AND NOT EXISTS (
    SELECT 1 FROM public.mentor_applications existing
    WHERE existing.user_id = auth.uid() AND existing.status = 'pending'
  )
);

-- Admins decide applications through the RPCs below; direct UPDATE stays
-- admin-only (policy from 20260114173057) and now also has a WITH CHECK.
DROP POLICY IF EXISTS "Admins can update applications" ON public.mentor_applications;
CREATE POLICY "Admins can update applications"
ON public.mentor_applications
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.mentor_applications
  DROP CONSTRAINT IF EXISTS mentor_applications_experience_years_check;
ALTER TABLE public.mentor_applications
  ADD CONSTRAINT mentor_applications_experience_years_check
  CHECK (experience_years IS NULL OR experience_years BETWEEN 0 AND 80) NOT VALID;

CREATE OR REPLACE FUNCTION public.approve_mentor_application(_application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _app public.mentor_applications%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can approve mentor applications'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _app FROM public.mentor_applications
  WHERE id = _application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mentor application % not found', _application_id USING ERRCODE = 'P0002';
  END IF;
  IF _app.status <> 'pending' THEN
    RAISE EXCEPTION 'Mentor application is already %', _app.status USING ERRCODE = '22023';
  END IF;
  IF _app.user_id IS NULL THEN
    RAISE EXCEPTION 'Mentor application has no applicant' USING ERRCODE = '22023';
  END IF;

  UPDATE public.mentor_applications
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _application_id;

  UPDATE public.profiles SET role = 'mentor' WHERE id = _app.user_id;

  INSERT INTO public.mentors (id, full_name, email, expertise, qualification,
                              experience_years, is_volunteer, is_verified)
  VALUES (_app.user_id, _app.full_name, _app.email, _app.expertise, _app.qualification,
          _app.experience_years, COALESCE(_app.is_volunteer, false), true)
  ON CONFLICT (id) DO UPDATE
    SET expertise = EXCLUDED.expertise,
        qualification = EXCLUDED.qualification,
        experience_years = EXCLUDED.experience_years,
        is_volunteer = EXCLUDED.is_volunteer,
        is_verified = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_mentor_application(_application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can reject mentor applications'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.mentor_applications
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _application_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pending mentor application %', _application_id USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_mentor_role(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can revoke mentor roles'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles SET role = 'student' WHERE id = _user_id;
  UPDATE public.mentors SET is_verified = false WHERE id = _user_id;
END;
$$;

-- EXECUTE stays granted to API roles: this function enforces access itself
-- (see docs/remediation/phase-0-security.md, "supautils crash"). Revoking
-- EXECUTE from anon made the local Supabase Postgres image (17.6.1.106,
-- supautils) crash the backend when such a function was called.
GRANT EXECUTE ON FUNCTION public.approve_mentor_application(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_mentor_application(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_mentor_role(uuid) TO authenticated;


-- -----------------------------------------------------------------------------
-- 5. SEC-006 — mentorship programs are platform-managed (admin only)
-- -----------------------------------------------------------------------------
-- The table has no owner column and the original policies were already named
-- "Only admins can ..." while checking role = 'mentor'. Programs are therefore
-- treated as platform catalogue data.
DROP POLICY IF EXISTS "Only admins can create programs" ON public.mentorship_programs;
DROP POLICY IF EXISTS "Only admins can update programs" ON public.mentorship_programs;
DROP POLICY IF EXISTS "Only admins can delete programs" ON public.mentorship_programs;

CREATE POLICY "Only admins can create programs"
ON public.mentorship_programs FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update programs"
ON public.mentorship_programs FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete programs"
ON public.mentorship_programs FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));


-- -----------------------------------------------------------------------------
-- 6. SEC-008 / BUG-008 — blog author ownership and draft visibility
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Mentors can create blog posts" ON public.blog_posts;
CREATE POLICY "Mentors can create blog posts"
ON public.blog_posts
FOR INSERT
TO authenticated
WITH CHECK (author_id = auth.uid() AND public.is_mentor(auth.uid()));

DROP POLICY IF EXISTS "Authors can update own posts" ON public.blog_posts;
CREATE POLICY "Authors can update own posts"
ON public.blog_posts
FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

-- Authors can see their own drafts (published posts stay public; other
-- people's drafts stay private).
DROP POLICY IF EXISTS "Authors can read own posts" ON public.blog_posts;
CREATE POLICY "Authors can read own posts"
ON public.blog_posts
FOR SELECT
TO authenticated
USING (author_id = auth.uid());

-- author_name is derived from the author's profile so it cannot be spoofed.
CREATE OR REPLACE FUNCTION public.set_blog_author_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.author_id IS NOT DISTINCT FROM OLD.author_id
     AND NEW.author_name IS NOT DISTINCT FROM OLD.author_name THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(nullif(btrim(p.full_name), ''), 'Freequademy Mentor')
  INTO NEW.author_name
  FROM public.profiles p
  WHERE p.id = NEW.author_id;

  NEW.author_name := COALESCE(NEW.author_name, 'Freequademy Mentor');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_blog_author_name ON public.blog_posts;
CREATE TRIGGER set_blog_author_name
  BEFORE INSERT OR UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_blog_author_name();


-- -----------------------------------------------------------------------------
-- 7. SEC-005 — mentorship meeting links are private
-- -----------------------------------------------------------------------------
-- Session rows stay publicly listable (the /mentorship page depends on it),
-- but the meeting_link column is no longer readable by API roles. The link is
-- served only through get_session_meeting_link(), which checks that the caller
-- is the session's mentor, a registered participant, or an admin.
REVOKE SELECT ON public.mentorship_sessions FROM anon, authenticated;
GRANT SELECT (id, program_id, mentor_id, title, description, session_type,
              scheduled_at, duration_minutes, status, max_participants,
              created_at, updated_at)
  ON public.mentorship_sessions TO anon, authenticated;

DROP POLICY IF EXISTS "Mentors can create their sessions" ON public.mentorship_sessions;
CREATE POLICY "Mentors can create their sessions"
ON public.mentorship_sessions
FOR INSERT
TO authenticated
WITH CHECK (mentor_id = auth.uid() AND public.is_mentor(auth.uid()));

DROP POLICY IF EXISTS "Mentors can update their sessions" ON public.mentorship_sessions;
CREATE POLICY "Mentors can update their sessions"
ON public.mentorship_sessions
FOR UPDATE
TO authenticated
USING (mentor_id = auth.uid())
WITH CHECK (mentor_id = auth.uid());

ALTER TABLE public.mentorship_sessions
  DROP CONSTRAINT IF EXISTS mentorship_sessions_meeting_link_https;
ALTER TABLE public.mentorship_sessions
  ADD CONSTRAINT mentorship_sessions_meeting_link_https
  CHECK (meeting_link IS NULL OR meeting_link ~* '^https://[^[:space:]]+$') NOT VALID;

CREATE OR REPLACE FUNCTION public.get_session_meeting_link(_session_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _mentor_id uuid;
  _link text;
BEGIN
  IF _uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT mentor_id, meeting_link INTO _mentor_id, _link
  FROM public.mentorship_sessions
  WHERE id = _session_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF _mentor_id = _uid
     OR public.is_admin(_uid)
     OR EXISTS (
       SELECT 1 FROM public.session_participants sp
       WHERE sp.session_id = _session_id
         AND sp.student_id = _uid
         AND sp.status IN ('registered', 'attended')
     ) THEN
    RETURN _link;
  END IF;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_session_meeting_link(uuid) TO authenticated;


-- -----------------------------------------------------------------------------
-- 8. SEC-011 / SEC-012 / SEC-005b — community creation boundaries
-- -----------------------------------------------------------------------------
-- Forum categories are platform navigation: admin managed.
DROP POLICY IF EXISTS "Authenticated users can create categories" ON public.forum_categories;
DROP POLICY IF EXISTS "Admins can create categories" ON public.forum_categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.forum_categories;
CREATE POLICY "Admins can create categories"
ON public.forum_categories FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update categories"
ON public.forum_categories FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Events carry external meeting links shown to minors: only approved mentors
-- and admins may publish them, and links must be https.
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.community_events;
DROP POLICY IF EXISTS "Mentors and admins can create events" ON public.community_events;
CREATE POLICY "Mentors and admins can create events"
ON public.community_events FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (public.is_mentor(auth.uid()) OR public.is_admin(auth.uid()))
);

DROP POLICY IF EXISTS "Event creators can update their events" ON public.community_events;
CREATE POLICY "Event creators can update their events"
ON public.community_events FOR UPDATE TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

ALTER TABLE public.community_events
  DROP CONSTRAINT IF EXISTS community_events_meeting_link_https;
ALTER TABLE public.community_events
  ADD CONSTRAINT community_events_meeting_link_https
  CHECK (meeting_link IS NULL OR meeting_link ~* '^https://[^[:space:]]+$') NOT VALID;

-- Student clubs are intentionally student-led (the product is "Student Clubs"),
-- so any authenticated user may still create one, but only as themselves.
DROP POLICY IF EXISTS "Authenticated users can create clubs" ON public.student_clubs;
CREATE POLICY "Authenticated users can create clubs"
ON public.student_clubs FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Club creators can update their clubs" ON public.student_clubs;
CREATE POLICY "Club creators can update their clubs"
ON public.student_clubs FOR UPDATE TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Joining a club always grants the plain 'member' role.
DROP POLICY IF EXISTS "Users can join clubs" ON public.club_members;
CREATE POLICY "Users can join clubs"
ON public.club_members FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'member');


-- -----------------------------------------------------------------------------
-- 9. AI-001 — per-user daily AI usage quota
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own AI usage" ON public.ai_usage_daily;
CREATE POLICY "Users can view their own AI usage"
ON public.ai_usage_daily FOR SELECT TO authenticated
USING (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.ai_usage_daily FROM anon, authenticated;

-- Atomically consumes one AI request for the calling user. The limit lives
-- server-side (not a parameter) so a client calling the RPC directly can only
-- use up its own quota. The day boundary is India Standard Time, matching the
-- platform's audience. Returns whether the request is allowed plus remaining.
CREATE OR REPLACE FUNCTION public.consume_ai_quota()
RETURNS TABLE (allowed boolean, remaining integer, daily_limit integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _limit CONSTANT integer := 30;
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  _count integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Single statement: the row lock taken by ON CONFLICT DO UPDATE serialises
  -- concurrent requests from the same user, so the limit cannot be raced.
  INSERT INTO public.ai_usage_daily AS u (user_id, usage_date, request_count)
  VALUES (_uid, _today, 1)
  ON CONFLICT (user_id, usage_date) DO UPDATE
    SET request_count = u.request_count + 1, updated_at = now()
    WHERE u.request_count < _limit
  RETURNING u.request_count INTO _count;

  IF _count IS NULL THEN
    RETURN QUERY SELECT false, 0, _limit;
  ELSE
    RETURN QUERY SELECT true, _limit - _count, _limit;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_ai_quota() TO authenticated;
