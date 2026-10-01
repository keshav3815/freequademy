-- Architecture V1 Phase 2: student dashboard read model + foreign-key indexes.
--
-- 1. get_student_dashboard() replaces ~14 browser round trips (8 RPCs, 6 table
--    queries in useStudentDashboard.ts) with one bounded call. It is SECURITY
--    INVOKER: the existing SECURITY DEFINER section functions keep their own
--    auth.uid() scoping, and the direct reads (lesson_progress, doubts, lessons)
--    stay under the caller's RLS. Each section is computed in its own
--    exception block so one failing section returns {"error": SQLSTATE}
--    instead of failing the whole dashboard (same isolation the per-query
--    React version had). Payload is bounded: fixed limits on every list.
--
-- 2. Indexes on the 25 foreign-key columns that had none. Postgres does not
--    index the referencing side of a foreign key, so every delete or key
--    update on the parent (a user deleting their account cascades through
--    profiles; an author deleting a question, lesson or chapter) scans the
--    child table in full. Each index below is on such a column; several are
--    also join/filter keys in RPCs (noted). Tables are small today, so plain
--    CREATE INDEX inside the migration transaction is acceptable.
--
-- Rollback: supabase/rollbacks/20261001110000_dashboard_read_model.sql

-- ---------------------------------------------------------------------------
-- 1. Read model
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_student_dashboard(
  _class_level smallint,
  _from date,
  _to date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _out jsonb := '{}'::jsonb;
  _section jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF _from IS NULL OR _to IS NULL OR _to < _from OR _to - _from > 366 THEN
    RAISE EXCEPTION 'invalid activity range' USING ERRCODE = '22023';
  END IF;

  BEGIN
    SELECT to_jsonb(s) INTO _section FROM public.get_learning_summary() s LIMIT 1;
    _out := _out || jsonb_build_object('summary', jsonb_build_object('data', _section));
  EXCEPTION WHEN OTHERS THEN
    _out := _out || jsonb_build_object('summary', jsonb_build_object('error', SQLSTATE));
  END;

  BEGIN
    SELECT coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) INTO _section FROM public.get_subject_progress(_class_level) s;
    _out := _out || jsonb_build_object('subjects', jsonb_build_object('data', _section));
  EXCEPTION WHEN OTHERS THEN
    _out := _out || jsonb_build_object('subjects', jsonb_build_object('error', SQLSTATE));
  END;

  BEGIN
    SELECT coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) INTO _section FROM public.get_xp_breakdown() s;
    _out := _out || jsonb_build_object('xp_breakdown', jsonb_build_object('data', _section));
  EXCEPTION WHEN OTHERS THEN
    _out := _out || jsonb_build_object('xp_breakdown', jsonb_build_object('error', SQLSTATE));
  END;

  BEGIN
    SELECT coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) INTO _section FROM public.get_weak_areas(3) s;
    _out := _out || jsonb_build_object('weak_areas', jsonb_build_object('data', _section));
  EXCEPTION WHEN OTHERS THEN
    _out := _out || jsonb_build_object('weak_areas', jsonb_build_object('error', SQLSTATE));
  END;

  BEGIN
    SELECT coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) INTO _section FROM public.get_recent_test_results(10) s;
    _out := _out || jsonb_build_object('recent_tests', jsonb_build_object('data', _section));
  EXCEPTION WHEN OTHERS THEN
    _out := _out || jsonb_build_object('recent_tests', jsonb_build_object('error', SQLSTATE));
  END;

  BEGIN
    SELECT coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) INTO _section FROM public.get_weekly_summary() s;
    _out := _out || jsonb_build_object('weekly_summary', jsonb_build_object('data', _section));
  EXCEPTION WHEN OTHERS THEN
    _out := _out || jsonb_build_object('weekly_summary', jsonb_build_object('error', SQLSTATE));
  END;

  BEGIN
    SELECT to_jsonb(s) INTO _section FROM public.get_mentorship_summary() s LIMIT 1;
    _out := _out || jsonb_build_object('mentorship', jsonb_build_object('data', _section));
  EXCEPTION WHEN OTHERS THEN
    _out := _out || jsonb_build_object('mentorship', jsonb_build_object('error', SQLSTATE));
  END;

  BEGIN
    SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.activity_date), '[]'::jsonb) INTO _section
    FROM public.get_activity_days(_from, _to) s;
    _out := _out || jsonb_build_object('activity_days', jsonb_build_object('data', _section));
  EXCEPTION WHEN OTHERS THEN
    _out := _out || jsonb_build_object('activity_days', jsonb_build_object('error', SQLSTATE));
  END;

  -- Most recently viewed unfinished lesson among the last 10 viewed; falls
  -- back to the most recent one when all of them are completed.
  BEGIN
    SELECT jsonb_build_object(
             'lesson_id', r.lesson_id,
             'status', r.status,
             'last_viewed_at', r.last_viewed_at,
             'lesson_title', l.title,
             'subject_id', s.id,
             'subject_name', s.name,
             'chapter_title', c.title,
             'position_in_chapter', l.sort_order,
             'chapter_lesson_count', nullif((SELECT count(*) FROM public.lessons l2 WHERE l2.chapter_id = l.chapter_id), 0))
      INTO _section
      FROM (SELECT lp.lesson_id, lp.status, lp.last_viewed_at
              FROM public.lesson_progress lp
             WHERE lp.user_id = _uid
             ORDER BY lp.last_viewed_at DESC
             LIMIT 10) r
      JOIN public.lessons l ON l.id = r.lesson_id
      LEFT JOIN public.chapters c ON c.id = l.chapter_id
      LEFT JOIN public.subjects s ON s.id = c.subject_id
     ORDER BY (r.status = 'completed'), r.last_viewed_at DESC
     LIMIT 1;
    _out := _out || jsonb_build_object('continue_lesson', jsonb_build_object('data', _section));
  EXCEPTION WHEN OTHERS THEN
    _out := _out || jsonb_build_object('continue_lesson', jsonb_build_object('error', SQLSTATE));
  END;

  -- One scan instead of four count queries. Field meanings match the
  -- previous client-side DoubtStats exactly.
  BEGIN
    SELECT jsonb_build_object(
             'total', count(*),
             'resolved', count(*) - count(*) FILTER (WHERE d.status = 'escalated'),
             'unresolved', count(*) FILTER (WHERE d.status = 'escalated'),
             'escalated', count(*) FILTER (WHERE d.status = 'mentor_answered'),
             'topSubjects', coalesce((
               SELECT jsonb_agg(jsonb_build_object('subject', t.subject, 'count', t.n) ORDER BY t.n DESC, t.subject)
                 FROM (SELECT d2.subject, count(*) AS n
                         FROM public.doubts d2
                        WHERE d2.user_id = _uid
                        GROUP BY d2.subject
                        ORDER BY count(*) DESC, d2.subject
                        LIMIT 4) t), '[]'::jsonb))
      INTO _section
      FROM public.doubts d
     WHERE d.user_id = _uid;
    _out := _out || jsonb_build_object('doubt_stats', jsonb_build_object('data', _section));
  EXCEPTION WHEN OTHERS THEN
    _out := _out || jsonb_build_object('doubt_stats', jsonb_build_object('error', SQLSTATE));
  END;

  BEGIN
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'id', d.id, 'question', d.question, 'subject', d.subject,
             'status', d.status, 'created_at', d.created_at) ORDER BY d.created_at DESC), '[]'::jsonb)
      INTO _section
      FROM (SELECT * FROM public.doubts WHERE user_id = _uid ORDER BY created_at DESC LIMIT 3) d;
    _out := _out || jsonb_build_object('recent_doubts', jsonb_build_object('data', _section));
  EXCEPTION WHEN OTHERS THEN
    _out := _out || jsonb_build_object('recent_doubts', jsonb_build_object('error', SQLSTATE));
  END;

  RETURN _out;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_student_dashboard(smallint, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_dashboard(smallint, date, date) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Foreign-key indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_announcements_session ON public.announcements (session_id);
CREATE INDEX IF NOT EXISTS idx_announcements_subject ON public.announcements (subject_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_question ON public.attempt_answers (question_id);       -- question delete; review joins
CREATE INDEX IF NOT EXISTS idx_club_members_user ON public.club_members (user_id);
CREATE INDEX IF NOT EXISTS idx_club_posts_author ON public.club_posts (author_id);
CREATE INDEX IF NOT EXISTS idx_community_events_created_by ON public.community_events (created_by);
CREATE INDEX IF NOT EXISTS idx_dashboard_content_author ON public.dashboard_content (author_id);
CREATE INDEX IF NOT EXISTS idx_doubts_mentor ON public.doubts (mentor_id);                            -- mentor's answered doubts
CREATE INDEX IF NOT EXISTS idx_event_registrations_user ON public.event_registrations (user_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_author ON public.forum_replies (author_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_author ON public.forum_threads (author_id);
CREATE INDEX IF NOT EXISTS idx_mentor_applications_reviewed_by ON public.mentor_applications (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_mentor_applications_user ON public.mentor_applications (user_id);      -- "my application" lookup
CREATE INDEX IF NOT EXISTS idx_mentorship_feedback_student ON public.mentorship_feedback (student_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_sessions_program ON public.mentorship_sessions (program_id);
CREATE INDEX IF NOT EXISTS idx_reply_votes_user ON public.reply_votes (user_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_lesson ON public.saved_items (lesson_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_test ON public.saved_items (test_id);
CREATE INDEX IF NOT EXISTS idx_student_clubs_created_by ON public.student_clubs (created_by);
CREATE INDEX IF NOT EXISTS idx_teacher_resources_subject ON public.teacher_resources (subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_student_notes_student ON public.teacher_student_notes (student_id);
CREATE INDEX IF NOT EXISTS idx_tests_chapter ON public.tests (chapter_id);                            -- chapter tests; get_weak_areas
CREATE INDEX IF NOT EXISTS idx_thread_votes_user ON public.thread_votes (user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user ON public.user_activity_log (user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported_by ON public.user_reports (reported_by);
