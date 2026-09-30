-- =============================================================================
-- PHASE 1 — Make existing mentorship / community / blog workflows work
--
-- DB-001  public views returned nothing (security_invoker over own-row RLS)
-- BUG-011 author names unreadable (profiles is own-row only)
-- BUG-012 session registration: no capacity, no cancel path, self-attendance
-- SEC-009 feedback without attending
-- SEC-010 forum counters / pins editable by authors
-- BUG-010 counters never maintained
-- PROD-003 moderation policies for moderators/admins
--
-- Data note: section 7 recomputes the denormalised counters (upvotes,
-- reply_count, member_count, attendee_count, mentors.rating/total_sessions)
-- from their source tables. These columns are derived data that was never
-- maintained, so recomputing them corrects rather than destroys information.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Public read models
-- -----------------------------------------------------------------------------
-- Display names for community/mentorship UIs. Deliberately exposes only the
-- name: no email, grade or role.
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = off) AS
SELECT id, full_name
FROM public.profiles;

REVOKE ALL ON public.public_profiles FROM anon, authenticated;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Verified mentor directory without email. Runs with the view owner's rights
-- so it is not filtered by the own-row policy on public.mentors; the WHERE
-- clause and column list are the access control.
CREATE OR REPLACE VIEW public.mentors_public
WITH (security_invoker = off) AS
SELECT
  id,
  full_name,
  bio,
  expertise,
  qualification,
  rating,
  total_sessions,
  is_verified,
  is_volunteer,
  experience_years,
  availability_hours,
  created_at,
  updated_at
FROM public.mentors
WHERE is_verified = true;

REVOKE ALL ON public.mentors_public FROM anon, authenticated;
GRANT SELECT ON public.mentors_public TO anon, authenticated;


-- -----------------------------------------------------------------------------
-- 2. Session registration through RPCs (capacity, cancel, attendance)
-- -----------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.session_participants FROM anon, authenticated;
DROP POLICY IF EXISTS "Students can register for sessions" ON public.session_participants;
DROP POLICY IF EXISTS "Participants can update their status" ON public.session_participants;

CREATE OR REPLACE FUNCTION public.register_for_session(_session_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _session public.mentorship_sessions%ROWTYPE;
  _taken integer;
  _existing text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Please log in to register' USING ERRCODE = '42501';
  END IF;

  -- Lock the session row so concurrent registrations are serialised.
  SELECT * INTO _session FROM public.mentorship_sessions WHERE id = _session_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found' USING ERRCODE = 'P0002';
  END IF;
  IF _session.mentor_id = _uid THEN
    RAISE EXCEPTION 'You cannot register for your own session' USING ERRCODE = '22023';
  END IF;
  IF _session.status <> 'scheduled' OR _session.scheduled_at <= now() THEN
    RAISE EXCEPTION 'This session is not open for registration' USING ERRCODE = '22023';
  END IF;

  SELECT status INTO _existing FROM public.session_participants
  WHERE session_id = _session_id AND student_id = _uid;
  IF _existing IN ('registered', 'attended') THEN
    RETURN _existing;
  END IF;

  SELECT count(*) INTO _taken FROM public.session_participants
  WHERE session_id = _session_id AND status IN ('registered', 'attended');
  IF _taken >= COALESCE(_session.max_participants, 1) THEN
    RAISE EXCEPTION 'This session is full' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.session_participants (session_id, student_id, status)
  VALUES (_session_id, _uid, 'registered')
  ON CONFLICT (session_id, student_id) DO UPDATE SET status = 'registered';

  RETURN 'registered';
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_session_registration(_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Please log in' USING ERRCODE = '42501';
  END IF;
  UPDATE public.session_participants
  SET status = 'cancelled'
  WHERE session_id = _session_id AND student_id = auth.uid() AND status = 'registered';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active registration for this session' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_participant_attendance(_session_id uuid, _student_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _status NOT IN ('attended', 'absent') THEN
    RAISE EXCEPTION 'Attendance must be attended or absent' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.mentorship_sessions
    WHERE id = _session_id AND (mentor_id = auth.uid() OR public.is_admin(auth.uid()))
  ) THEN
    RAISE EXCEPTION 'Only the session mentor can record attendance' USING ERRCODE = '42501';
  END IF;
  UPDATE public.session_participants
  SET status = _status, joined_at = COALESCE(joined_at, now())
  WHERE session_id = _session_id AND student_id = _student_id AND status <> 'cancelled';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student is not registered for this session' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

-- EXECUTE stays granted to API roles: this function enforces access itself
-- (see docs/remediation/phase-0-security.md, "supautils crash"). Revoking
-- EXECUTE from anon made the local Supabase Postgres image (17.6.1.106,
-- supautils) crash the backend when such a function was called.
GRANT EXECUTE ON FUNCTION public.register_for_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_session_registration(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_participant_attendance(uuid, uuid, text) TO authenticated;

-- Registered participant counts per session for public listings.
CREATE OR REPLACE FUNCTION public.session_participant_counts(_session_ids uuid[])
RETURNS TABLE (session_id uuid, participant_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.session_id, count(*)::integer
  FROM public.session_participants sp
  WHERE sp.session_id = ANY(_session_ids) AND sp.status IN ('registered', 'attended')
  GROUP BY sp.session_id
$$;
GRANT EXECUTE ON FUNCTION public.session_participant_counts(uuid[]) TO anon, authenticated;


-- -----------------------------------------------------------------------------
-- 3. Feedback only from real participants, after the session
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Students can submit feedback" ON public.mentorship_feedback;
CREATE POLICY "Students can submit feedback"
ON public.mentorship_feedback
FOR INSERT
TO authenticated
WITH CHECK (
  student_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.mentorship_sessions s
    JOIN public.session_participants sp ON sp.session_id = s.id
    WHERE s.id = mentorship_feedback.session_id
      AND s.mentor_id = mentorship_feedback.mentor_id
      AND s.scheduled_at < now()
      AND sp.student_id = auth.uid()
      AND sp.status IN ('registered', 'attended')
  )
);

-- Internal helpers live in the `private` schema, which PostgREST does not
-- expose, so they cannot be called through the API at all.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

-- Mentor rating and completed-session count are derived, never client-set.
CREATE OR REPLACE FUNCTION private.refresh_mentor_stats(_mentor_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.mentors m
  SET rating = COALESCE((SELECT round(avg(f.rating)::numeric, 2) FROM public.mentorship_feedback f
                         WHERE f.mentor_id = m.id AND f.rating IS NOT NULL), 0),
      total_sessions = (SELECT count(*) FROM public.mentorship_sessions s
                        WHERE s.mentor_id = m.id AND s.status = 'completed')
  WHERE m.id = _mentor_id
$$;

CREATE OR REPLACE FUNCTION public.on_mentor_stats_source_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.mentor_id IS NOT NULL THEN
    PERFORM private.refresh_mentor_stats(NEW.mentor_id);
  END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.mentor_id IS NOT NULL
     AND (TG_OP = 'DELETE' OR OLD.mentor_id IS DISTINCT FROM NEW.mentor_id) THEN
    PERFORM private.refresh_mentor_stats(OLD.mentor_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS refresh_mentor_stats_on_feedback ON public.mentorship_feedback;
CREATE TRIGGER refresh_mentor_stats_on_feedback
  AFTER INSERT OR UPDATE OR DELETE ON public.mentorship_feedback
  FOR EACH ROW EXECUTE FUNCTION public.on_mentor_stats_source_change();

DROP TRIGGER IF EXISTS refresh_mentor_stats_on_session ON public.mentorship_sessions;
CREATE TRIGGER refresh_mentor_stats_on_session
  AFTER INSERT OR UPDATE OF status, mentor_id OR DELETE ON public.mentorship_sessions
  FOR EACH ROW EXECUTE FUNCTION public.on_mentor_stats_source_change();


-- -----------------------------------------------------------------------------
-- 4. Forum: counters maintained by triggers, not writable by authors
-- -----------------------------------------------------------------------------
REVOKE UPDATE ON public.forum_threads FROM anon, authenticated;
GRANT UPDATE (title, content, category_id) ON public.forum_threads TO authenticated;
REVOKE UPDATE ON public.forum_replies FROM anon, authenticated;
GRANT UPDATE (content) ON public.forum_replies TO authenticated;

-- Moderators/admins may pin threads and mark solutions through RPCs; column
-- grants above stop authors from doing so directly.
CREATE OR REPLACE FUNCTION public.is_moderator(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role)
      OR public.has_role(_user_id, 'moderator'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.reset_forum_counters_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.is_api_client() THEN
    NEW.upvotes := 0;
    IF TG_TABLE_NAME = 'forum_threads' THEN
      NEW.reply_count := 0;
      NEW.is_pinned := false;
    ELSE
      NEW.is_solution := false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reset_counters ON public.forum_threads;
CREATE TRIGGER reset_counters BEFORE INSERT ON public.forum_threads
  FOR EACH ROW EXECUTE FUNCTION public.reset_forum_counters_on_insert();
DROP TRIGGER IF EXISTS reset_counters ON public.forum_replies;
CREATE TRIGGER reset_counters BEFORE INSERT ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.reset_forum_counters_on_insert();

CREATE OR REPLACE FUNCTION public.maintain_forum_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'forum_replies' THEN
    UPDATE public.forum_threads t
    SET reply_count = (SELECT count(*) FROM public.forum_replies r WHERE r.thread_id = t.id)
    WHERE t.id = COALESCE(NEW.thread_id, OLD.thread_id);
  ELSIF TG_TABLE_NAME = 'thread_votes' THEN
    UPDATE public.forum_threads t
    SET upvotes = (SELECT count(*) FROM public.thread_votes v WHERE v.thread_id = t.id)
    WHERE t.id = COALESCE(NEW.thread_id, OLD.thread_id);
  ELSIF TG_TABLE_NAME = 'reply_votes' THEN
    UPDATE public.forum_replies r
    SET upvotes = (SELECT count(*) FROM public.reply_votes v WHERE v.reply_id = r.id)
    WHERE r.id = COALESCE(NEW.reply_id, OLD.reply_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS maintain_counters ON public.forum_replies;
CREATE TRIGGER maintain_counters AFTER INSERT OR DELETE ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.maintain_forum_counters();
DROP TRIGGER IF EXISTS maintain_counters ON public.thread_votes;
CREATE TRIGGER maintain_counters AFTER INSERT OR DELETE ON public.thread_votes
  FOR EACH ROW EXECUTE FUNCTION public.maintain_forum_counters();
DROP TRIGGER IF EXISTS maintain_counters ON public.reply_votes;
CREATE TRIGGER maintain_counters AFTER INSERT OR DELETE ON public.reply_votes
  FOR EACH ROW EXECUTE FUNCTION public.maintain_forum_counters();

-- Moderation
DROP POLICY IF EXISTS "Moderators can delete threads" ON public.forum_threads;
CREATE POLICY "Moderators can delete threads" ON public.forum_threads
FOR DELETE TO authenticated USING (public.is_moderator(auth.uid()));
DROP POLICY IF EXISTS "Moderators can delete replies" ON public.forum_replies;
CREATE POLICY "Moderators can delete replies" ON public.forum_replies
FOR DELETE TO authenticated USING (public.is_moderator(auth.uid()));
DROP POLICY IF EXISTS "Authors and moderators can delete club posts" ON public.club_posts;
CREATE POLICY "Authors and moderators can delete club posts" ON public.club_posts
FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.is_moderator(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_thread_pinned(_thread_id uuid, _pinned boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_moderator(auth.uid()) THEN
    RAISE EXCEPTION 'Only moderators can pin threads' USING ERRCODE = '42501';
  END IF;
  UPDATE public.forum_threads SET is_pinned = _pinned WHERE id = _thread_id;
END;
$$;

-- The thread author (or a moderator) can mark one reply as the solution.
CREATE OR REPLACE FUNCTION public.mark_reply_solution(_reply_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _thread_id uuid;
BEGIN
  SELECT r.thread_id INTO _thread_id FROM public.forum_replies r WHERE r.id = _reply_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reply not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.forum_threads t WHERE t.id = _thread_id AND t.author_id = auth.uid())
     AND NOT public.is_moderator(auth.uid()) THEN
    RAISE EXCEPTION 'Only the thread author can choose the solution' USING ERRCODE = '42501';
  END IF;
  UPDATE public.forum_replies SET is_solution = (id = _reply_id) WHERE thread_id = _thread_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_thread_pinned(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_reply_solution(uuid) TO authenticated;

-- Content bounds
ALTER TABLE public.forum_threads DROP CONSTRAINT IF EXISTS forum_threads_length_check;
ALTER TABLE public.forum_threads ADD CONSTRAINT forum_threads_length_check
  CHECK (char_length(title) BETWEEN 3 AND 200 AND char_length(content) BETWEEN 1 AND 10000) NOT VALID;
ALTER TABLE public.forum_replies DROP CONSTRAINT IF EXISTS forum_replies_length_check;
ALTER TABLE public.forum_replies ADD CONSTRAINT forum_replies_length_check
  CHECK (char_length(content) BETWEEN 1 AND 5000) NOT VALID;
ALTER TABLE public.club_posts DROP CONSTRAINT IF EXISTS club_posts_length_check;
ALTER TABLE public.club_posts ADD CONSTRAINT club_posts_length_check
  CHECK (char_length(content) BETWEEN 1 AND 5000) NOT VALID;


-- -----------------------------------------------------------------------------
-- 5. Clubs & events: counters and capacity maintained server-side
-- -----------------------------------------------------------------------------
REVOKE UPDATE ON public.student_clubs FROM anon, authenticated;
GRANT UPDATE (name, description, category, icon) ON public.student_clubs TO authenticated;
REVOKE UPDATE ON public.community_events FROM anon, authenticated;
GRANT UPDATE (title, description, event_type, scheduled_at, duration_minutes, max_attendees, meeting_link)
  ON public.community_events TO authenticated;

CREATE OR REPLACE FUNCTION public.reset_community_counters_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.is_api_client() THEN
    IF TG_TABLE_NAME = 'student_clubs' THEN
      NEW.member_count := 0;
    ELSE
      NEW.attendee_count := 0;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reset_counters ON public.student_clubs;
CREATE TRIGGER reset_counters BEFORE INSERT ON public.student_clubs
  FOR EACH ROW EXECUTE FUNCTION public.reset_community_counters_on_insert();
DROP TRIGGER IF EXISTS reset_counters ON public.community_events;
CREATE TRIGGER reset_counters BEFORE INSERT ON public.community_events
  FOR EACH ROW EXECUTE FUNCTION public.reset_community_counters_on_insert();

-- Club creators automatically become the club's owner member.
CREATE OR REPLACE FUNCTION public.add_club_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.club_members (club_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'owner')
    ON CONFLICT (club_id, user_id) DO NOTHING;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS add_club_owner ON public.student_clubs;
CREATE TRIGGER add_club_owner AFTER INSERT ON public.student_clubs
  FOR EACH ROW EXECUTE FUNCTION public.add_club_owner();

CREATE OR REPLACE FUNCTION public.maintain_community_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'club_members' THEN
    UPDATE public.student_clubs c
    SET member_count = (SELECT count(*) FROM public.club_members m WHERE m.club_id = c.id)
    WHERE c.id = COALESCE(NEW.club_id, OLD.club_id);
  ELSE
    UPDATE public.community_events e
    SET attendee_count = (SELECT count(*) FROM public.event_registrations r WHERE r.event_id = e.id)
    WHERE e.id = COALESCE(NEW.event_id, OLD.event_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS maintain_counters ON public.club_members;
CREATE TRIGGER maintain_counters AFTER INSERT OR DELETE ON public.club_members
  FOR EACH ROW EXECUTE FUNCTION public.maintain_community_counters();
DROP TRIGGER IF EXISTS maintain_counters ON public.event_registrations;
CREATE TRIGGER maintain_counters AFTER INSERT OR DELETE ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.maintain_community_counters();

-- Event capacity, checked under a row lock on the event.
CREATE OR REPLACE FUNCTION public.enforce_event_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _max integer;
  _starts timestamptz;
BEGIN
  SELECT max_attendees, scheduled_at INTO _max, _starts
  FROM public.community_events WHERE id = NEW.event_id FOR UPDATE;
  IF _starts IS NOT NULL AND _starts < now() THEN
    RAISE EXCEPTION 'This event has already started' USING ERRCODE = '22023';
  END IF;
  IF _max IS NOT NULL AND
     (SELECT count(*) FROM public.event_registrations WHERE event_id = NEW.event_id) >= _max THEN
    RAISE EXCEPTION 'This event is full' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enforce_event_capacity ON public.event_registrations;
CREATE TRIGGER enforce_event_capacity BEFORE INSERT ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_event_capacity();

-- Registrations/memberships: only your own rows are visible (previously the
-- full attendee list of every event was public).
DROP POLICY IF EXISTS "Users can view all registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Users can view their registrations" ON public.event_registrations;
CREATE POLICY "Users can view their registrations" ON public.event_registrations
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_moderator(auth.uid())
       OR EXISTS (SELECT 1 FROM public.community_events e WHERE e.id = event_id AND e.created_by = auth.uid()));

ALTER TABLE public.student_clubs DROP CONSTRAINT IF EXISTS student_clubs_name_length_check;
ALTER TABLE public.student_clubs ADD CONSTRAINT student_clubs_name_length_check
  CHECK (char_length(name) BETWEEN 3 AND 80) NOT VALID;


-- -----------------------------------------------------------------------------
-- 6. Moderation: user reports readable/updatable by moderators (existing);
--    reporters can see their own reports.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own reports" ON public.user_reports;
CREATE POLICY "Users can view their own reports" ON public.user_reports
FOR SELECT TO authenticated USING (reported_by = auth.uid());

-- Mentor applications: admins need to list them (existing SELECT policy covers
-- admins); applicants see their own.


-- -----------------------------------------------------------------------------
-- 7. One-time recompute of derived counters
-- -----------------------------------------------------------------------------
UPDATE public.forum_threads t SET
  reply_count = (SELECT count(*) FROM public.forum_replies r WHERE r.thread_id = t.id),
  upvotes = (SELECT count(*) FROM public.thread_votes v WHERE v.thread_id = t.id);
UPDATE public.forum_replies r SET
  upvotes = (SELECT count(*) FROM public.reply_votes v WHERE v.reply_id = r.id);
UPDATE public.student_clubs c SET
  member_count = (SELECT count(*) FROM public.club_members m WHERE m.club_id = c.id);
UPDATE public.community_events e SET
  attendee_count = (SELECT count(*) FROM public.event_registrations r WHERE r.event_id = e.id);
DO $$ BEGIN PERFORM private.refresh_mentor_stats(id) FROM public.mentors; END $$;


-- -----------------------------------------------------------------------------
-- 8. Indexes for the query patterns used by these pages (audit §7.3)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_forum_threads_category_created
  ON public.forum_threads (category_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_threads_created
  ON public.forum_threads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_replies_thread_created
  ON public.forum_replies (thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_club_posts_club_created
  ON public.club_posts (club_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_events_scheduled
  ON public.community_events (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_created
  ON public.blog_posts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author
  ON public.blog_posts (author_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_sessions_mentor_scheduled
  ON public.mentorship_sessions (mentor_id, scheduled_at);
-- superseded by the UNIQUE (session_id, student_id) index
DROP INDEX IF EXISTS public.idx_session_participants_session_id;
-- superseded by idx_mentorship_sessions_mentor_scheduled
DROP INDEX IF EXISTS public.idx_mentorship_sessions_mentor_id;
