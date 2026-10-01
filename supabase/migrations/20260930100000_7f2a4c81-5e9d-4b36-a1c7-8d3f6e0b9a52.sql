-- =============================================================================
-- Student 360° Analytics Dashboard — backend
--
-- Every RPC here is SECURITY DEFINER but scoped internally to auth.uid(): a
-- student can only ever see aggregates of their own rows. All read from
-- tables that already existed (lesson_progress, test_attempts, xp_events,
-- doubts, session_participants, mentorship_sessions) — no new tables, no
-- fabricated data. Where a metric from the product brief has no real backing
-- data (per-lesson time tracking, a mentor-request concept, a student-level
-- stream field), it is intentionally left out rather than invented — see
-- docs/remediation/phase-9-analytics-dashboard.md for the full reasoning.
--
-- EXECUTE grants follow the pattern established since Phase 0: functions
-- that must reject anonymous callers do so with an internal `auth.uid() IS
-- NULL` check rather than a REVOKE, because revoking EXECUTE from anon
-- crashes the local test Postgres image when anon then calls the function
-- (see docs/testing.md, "supautils crash").
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Doubt-asking joins lesson/test completion as a real XP source.
--    xp_events.source_type already allowed 'doubt_asked' (Phase 2) but
--    nothing ever awarded it — the AI doubt solver persisted a row and
--    stopped. One doubt = one award, enforced by the existing
--    UNIQUE (user_id, source_type, source_id) constraint on xp_events, so a
--    mentor's later answer to the same doubt doesn't award XP again.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.award_doubt_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM private.award_xp(NEW.user_id, 'doubt_asked', NEW.id, 3);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS award_doubt_xp ON public.doubts;
CREATE TRIGGER award_doubt_xp
  AFTER INSERT ON public.doubts
  FOR EACH ROW EXECUTE FUNCTION private.award_doubt_xp();


-- -----------------------------------------------------------------------------
-- 2. get_learning_summary — extended with best streak, this-week XP, and
--    active-day counts (7-day and 30-day windows). Return shape changed, so
--    the function is dropped and recreated rather than CREATE OR REPLACE'd.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_learning_summary();

CREATE OR REPLACE FUNCTION public.get_learning_summary()
RETURNS TABLE (
  total_xp integer, level integer, xp_into_level integer, xp_for_next_level integer,
  streak_days integer, best_streak_days integer, active_today boolean,
  active_days_this_week integer, active_days_last_30 integer, xp_this_week integer,
  lessons_completed integer, tests_submitted integer, average_score numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _xp integer;
  _today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  _week_start date := date_trunc('week', (now() AT TIME ZONE 'Asia/Kolkata'))::date; -- Monday
  _streak integer := 0;
  _best integer := 0;
  _run integer := 0;
  _day date;
  _prev date;
  _active_days date[];
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Please log in' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(sum(points), 0) INTO _xp FROM public.xp_events WHERE user_id = _uid;

  -- current streak: consecutive active days ending today (or yesterday, so
  -- the streak doesn't reset before the student has had a chance to study
  -- today)
  _day := _today;
  IF NOT EXISTS (SELECT 1 FROM public.xp_events WHERE user_id = _uid
                 AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = _today) THEN
    _day := _today - 1;
  END IF;
  WHILE EXISTS (SELECT 1 FROM public.xp_events WHERE user_id = _uid
                AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = _day) LOOP
    _streak := _streak + 1;
    _day := _day - 1;
  END LOOP;

  -- best streak ever: scan every distinct active day once, in order, and
  -- track the longest run of consecutive dates.
  SELECT array_agg(DISTINCT (created_at AT TIME ZONE 'Asia/Kolkata')::date ORDER BY (created_at AT TIME ZONE 'Asia/Kolkata')::date)
  INTO _active_days
  FROM public.xp_events WHERE user_id = _uid;

  IF _active_days IS NOT NULL THEN
    _run := 1;
    _best := 1;
    FOR i IN 2 .. array_length(_active_days, 1) LOOP
      IF _active_days[i] = _active_days[i-1] + 1 THEN
        _run := _run + 1;
      ELSE
        _run := 1;
      END IF;
      IF _run > _best THEN _best := _run; END IF;
    END LOOP;
  END IF;
  _best := GREATEST(_best, _streak);

  RETURN QUERY SELECT
    _xp,
    (_xp / 250) + 1,
    _xp % 250,
    250,
    _streak,
    _best,
    EXISTS (SELECT 1 FROM public.xp_events WHERE user_id = _uid
            AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = _today),
    (SELECT count(DISTINCT (created_at AT TIME ZONE 'Asia/Kolkata')::date)::integer
      FROM public.xp_events WHERE user_id = _uid
      AND (created_at AT TIME ZONE 'Asia/Kolkata')::date >= _week_start),
    (SELECT count(DISTINCT (created_at AT TIME ZONE 'Asia/Kolkata')::date)::integer
      FROM public.xp_events WHERE user_id = _uid
      AND (created_at AT TIME ZONE 'Asia/Kolkata')::date >= _today - 29),
    (SELECT COALESCE(sum(points), 0)::integer FROM public.xp_events WHERE user_id = _uid
      AND (created_at AT TIME ZONE 'Asia/Kolkata')::date >= _week_start),
    (SELECT count(*)::integer FROM public.lesson_progress WHERE user_id = _uid AND status = 'completed'),
    (SELECT count(*)::integer FROM public.test_attempts WHERE user_id = _uid AND status = 'submitted'),
    (SELECT round(avg(percentage), 1) FROM public.test_attempts WHERE user_id = _uid AND status = 'submitted');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_learning_summary() TO authenticated;


-- -----------------------------------------------------------------------------
-- 3. get_subject_progress — extended with a completion status classification
--    (drives the "All / In Progress / Completed / Not Started" filter) and
--    the subject's most recent activity timestamp (drives "last studied").
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_subject_progress(smallint);

CREATE OR REPLACE FUNCTION public.get_subject_progress(_class_level smallint)
RETURNS TABLE (
  subject_id uuid, subject_name text, slug text, sort_order integer,
  chapter_count integer, lesson_count integer, lessons_completed integer,
  test_count integer, average_score numeric,
  status text, last_activity_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name, s.slug, s.sort_order,
    (SELECT count(*)::integer FROM public.chapters c WHERE c.subject_id = s.id),
    (SELECT count(*)::integer FROM public.lessons l JOIN public.chapters c ON c.id = l.chapter_id
      WHERE c.subject_id = s.id AND l.status = 'published'),
    (SELECT count(*)::integer FROM public.lesson_progress lp
      JOIN public.lessons l ON l.id = lp.lesson_id JOIN public.chapters c ON c.id = l.chapter_id
      WHERE c.subject_id = s.id AND lp.user_id = auth.uid() AND lp.status = 'completed'),
    (SELECT count(*)::integer FROM public.tests t WHERE t.subject_id = s.id AND t.status = 'published'),
    (SELECT round(avg(a.percentage), 1) FROM public.test_attempts a JOIN public.tests t ON t.id = a.test_id
      WHERE t.subject_id = s.id AND a.user_id = auth.uid() AND a.status = 'submitted'),
    CASE
      WHEN (SELECT count(*) FROM public.lessons l JOIN public.chapters c ON c.id = l.chapter_id
            WHERE c.subject_id = s.id AND l.status = 'published') = 0 THEN 'not_started'
      WHEN (SELECT count(*) FROM public.lesson_progress lp
            JOIN public.lessons l ON l.id = lp.lesson_id JOIN public.chapters c ON c.id = l.chapter_id
            WHERE c.subject_id = s.id AND lp.user_id = auth.uid() AND lp.status = 'completed')
           >= (SELECT count(*) FROM public.lessons l JOIN public.chapters c ON c.id = l.chapter_id
               WHERE c.subject_id = s.id AND l.status = 'published')
        THEN 'completed'
      WHEN (SELECT count(*) FROM public.lesson_progress lp
            JOIN public.lessons l ON l.id = lp.lesson_id JOIN public.chapters c ON c.id = l.chapter_id
            WHERE c.subject_id = s.id AND lp.user_id = auth.uid()) > 0
        THEN 'in_progress'
      ELSE 'not_started'
    END,
    GREATEST(
      (SELECT max(lp.last_viewed_at) FROM public.lesson_progress lp
        JOIN public.lessons l ON l.id = lp.lesson_id JOIN public.chapters c ON c.id = l.chapter_id
        WHERE c.subject_id = s.id AND lp.user_id = auth.uid()),
      (SELECT max(a.submitted_at) FROM public.test_attempts a JOIN public.tests t ON t.id = a.test_id
        WHERE t.subject_id = s.id AND a.user_id = auth.uid() AND a.status = 'submitted')
    )
  FROM public.subjects s
  WHERE s.class_level = _class_level
  ORDER BY s.sort_order, s.name
$$;

GRANT EXECUTE ON FUNCTION public.get_subject_progress(smallint) TO anon, authenticated;


-- -----------------------------------------------------------------------------
-- 4. get_xp_breakdown — where the student's XP actually came from. Only the
--    three source_types that exist (lesson/test/doubt); no invented category.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_xp_breakdown()
RETURNS TABLE (source_type text, total_points integer, event_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.source_type, sum(e.points)::integer, count(*)::integer
  FROM public.xp_events e
  WHERE e.user_id = auth.uid()
  GROUP BY e.source_type
  ORDER BY sum(e.points) DESC
$$;

GRANT EXECUTE ON FUNCTION public.get_xp_breakdown() TO authenticated;


-- -----------------------------------------------------------------------------
-- 5. get_weak_areas — subjects/chapters with the lowest average test score,
--    from the student's own submitted attempts only. A chapter needs at
--    least 1 attempt to appear; nothing is inferred without real data.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_weak_areas(_limit integer DEFAULT 3)
RETURNS TABLE (
  subject_id uuid, subject_name text, chapter_id uuid, chapter_title text,
  average_score numeric, attempts_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name, t.chapter_id, c.title,
    round(avg(a.percentage), 1), count(*)::integer
  FROM public.test_attempts a
  JOIN public.tests t ON t.id = a.test_id
  JOIN public.subjects s ON s.id = t.subject_id
  LEFT JOIN public.chapters c ON c.id = t.chapter_id
  WHERE a.user_id = auth.uid() AND a.status = 'submitted'
  GROUP BY s.id, s.name, t.chapter_id, c.title
  ORDER BY avg(a.percentage) ASC
  LIMIT LEAST(GREATEST(_limit, 1), 20)
$$;

GRANT EXECUTE ON FUNCTION public.get_weak_areas(integer) TO authenticated;


-- -----------------------------------------------------------------------------
-- 6. get_recent_test_results — backs both the recent-results table and the
--    score-trend chart with a single query (same rows, two presentations).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_recent_test_results(_limit integer DEFAULT 10)
RETURNS TABLE (
  attempt_id uuid, test_id uuid, test_title text, subject_id uuid, subject_name text,
  submitted_at timestamptz, score integer, max_score integer, percentage numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, t.id, t.title, s.id, s.name, a.submitted_at, a.score, a.max_score, a.percentage
  FROM public.test_attempts a
  JOIN public.tests t ON t.id = a.test_id
  JOIN public.subjects s ON s.id = t.subject_id
  WHERE a.user_id = auth.uid() AND a.status = 'submitted'
  ORDER BY a.submitted_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 100)
$$;

GRANT EXECUTE ON FUNCTION public.get_recent_test_results(integer) TO authenticated;


-- -----------------------------------------------------------------------------
-- 7. get_weekly_summary — this week vs. last week (Asia/Kolkata, Monday
--    start), real countable metrics only. No "study time" row: lessons have
--    no duration tracking, so a total study-time figure would be fabricated
--    for anything but tests (see phase-9 doc for why that's left out rather
--    than guessed).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_weekly_summary()
RETURNS TABLE (
  period text, period_start date, period_end date,
  lessons_completed integer, tests_attempted integer, average_score numeric,
  doubts_asked integer, doubts_resolved integer, sessions_attended integer,
  xp_earned integer, active_days integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _this_start date := date_trunc('week', (now() AT TIME ZONE 'Asia/Kolkata'))::date;
  _last_start date := _this_start - 7;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Please log in' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    w.label, w.start_date, w.start_date + 6,
    (SELECT count(*)::integer FROM public.lesson_progress lp WHERE lp.user_id = _uid
      AND lp.status = 'completed' AND (lp.completed_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN w.start_date AND w.start_date + 6),
    (SELECT count(*)::integer FROM public.test_attempts a WHERE a.user_id = _uid
      AND a.status = 'submitted' AND (a.submitted_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN w.start_date AND w.start_date + 6),
    (SELECT round(avg(a.percentage), 1) FROM public.test_attempts a WHERE a.user_id = _uid
      AND a.status = 'submitted' AND (a.submitted_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN w.start_date AND w.start_date + 6),
    (SELECT count(*)::integer FROM public.doubts d WHERE d.user_id = _uid
      AND (d.created_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN w.start_date AND w.start_date + 6),
    (SELECT count(*)::integer FROM public.doubts d WHERE d.user_id = _uid
      AND d.status IN ('answered', 'mentor_answered')
      AND (d.created_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN w.start_date AND w.start_date + 6),
    (SELECT count(*)::integer FROM public.session_participants sp
      JOIN public.mentorship_sessions s ON s.id = sp.session_id
      WHERE sp.student_id = _uid AND sp.status = 'attended'
      AND (s.scheduled_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN w.start_date AND w.start_date + 6),
    (SELECT COALESCE(sum(e.points), 0)::integer FROM public.xp_events e WHERE e.user_id = _uid
      AND (e.created_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN w.start_date AND w.start_date + 6),
    (SELECT count(DISTINCT (e.created_at AT TIME ZONE 'Asia/Kolkata')::date)::integer FROM public.xp_events e WHERE e.user_id = _uid
      AND (e.created_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN w.start_date AND w.start_date + 6)
  FROM (VALUES ('this_week', _this_start), ('last_week', _last_start)) AS w(label, start_date);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_weekly_summary() TO authenticated;


-- -----------------------------------------------------------------------------
-- 8. get_mentorship_summary — counts plus the next session's basic details.
--    Deliberately does NOT include meeting_link: the frontend fetches that
--    on demand via the existing get_session_meeting_link() RPC (Phase 0)
--    only when the student actually clicks Join, exactly like MySessions.tsx.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_mentorship_summary()
RETURNS TABLE (
  upcoming_count integer, completed_count integer, attendance_pct numeric,
  next_session_id uuid, next_session_title text, next_session_at timestamptz,
  next_mentor_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Please log in' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*)::integer FROM public.session_participants sp
      JOIN public.mentorship_sessions s ON s.id = sp.session_id
      WHERE sp.student_id = _uid AND sp.status = 'registered'
        AND s.status = 'scheduled' AND s.scheduled_at > now()),
    (SELECT count(*)::integer FROM public.session_participants sp
      WHERE sp.student_id = _uid AND sp.status = 'attended'),
    (SELECT CASE WHEN count(*) = 0 THEN NULL ELSE round(100.0 * count(*) FILTER (WHERE sp.status = 'attended') / count(*), 0) END
      FROM public.session_participants sp
      JOIN public.mentorship_sessions s ON s.id = sp.session_id
      WHERE sp.student_id = _uid AND sp.status IN ('attended', 'absent') AND s.scheduled_at < now()),
    n.id, n.title, n.scheduled_at, p.full_name
  -- (VALUES (true)) guarantees exactly one row even when the student has no
  -- upcoming session at all — a plain `FROM (subquery LIMIT 1) n` would make
  -- the whole SELECT return zero rows instead of a row of real zeros/NULLs
  -- in that case, which is exactly the "silently converts absence of data
  -- into a misleading result" failure mode this dashboard must avoid.
  FROM (VALUES (true)) AS _one(ok)
  LEFT JOIN LATERAL (
    SELECT s.id, s.title, s.scheduled_at, s.mentor_id
    FROM public.session_participants sp
    JOIN public.mentorship_sessions s ON s.id = sp.session_id
    WHERE sp.student_id = _uid AND sp.status = 'registered'
      AND s.status = 'scheduled' AND s.scheduled_at > now()
    ORDER BY s.scheduled_at
    LIMIT 1
  ) n ON true
  LEFT JOIN public.profiles p ON p.id = n.mentor_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mentorship_summary() TO authenticated;


-- -----------------------------------------------------------------------------
-- 9. get_activity_days — the learning-activity heatmap's data source. Unions
--    every real, already-defined activity signal for the range (inclusive):
--    a lesson completed, a test submitted, a doubt asked, a mentorship
--    session attended. A page visit is never counted.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_activity_days(_from date, _to date)
RETURNS TABLE (activity_date date, lesson_count integer, test_count integer, doubt_count integer, session_count integer, total_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT LEAST(_from, _to) AS d_from, GREATEST(_from, _to) AS d_to
  ),
  days AS (
    SELECT generate_series((SELECT d_from FROM bounds), (SELECT d_to FROM bounds), interval '1 day')::date AS d
  ),
  lessons AS (
    SELECT (lp.completed_at AT TIME ZONE 'Asia/Kolkata')::date AS d, count(*) AS n
    FROM public.lesson_progress lp
    WHERE lp.user_id = auth.uid() AND lp.status = 'completed' AND lp.completed_at IS NOT NULL
    GROUP BY 1
  ),
  tests AS (
    SELECT (a.submitted_at AT TIME ZONE 'Asia/Kolkata')::date AS d, count(*) AS n
    FROM public.test_attempts a
    WHERE a.user_id = auth.uid() AND a.status = 'submitted' AND a.submitted_at IS NOT NULL
    GROUP BY 1
  ),
  doubts_asked AS (
    SELECT (d.created_at AT TIME ZONE 'Asia/Kolkata')::date AS d, count(*) AS n
    FROM public.doubts d WHERE d.user_id = auth.uid()
    GROUP BY 1
  ),
  sessions AS (
    SELECT (s.scheduled_at AT TIME ZONE 'Asia/Kolkata')::date AS d, count(*) AS n
    FROM public.session_participants sp JOIN public.mentorship_sessions s ON s.id = sp.session_id
    WHERE sp.student_id = auth.uid() AND sp.status = 'attended'
    GROUP BY 1
  )
  SELECT days.d, COALESCE(lessons.n, 0)::integer, COALESCE(tests.n, 0)::integer,
    COALESCE(doubts_asked.n, 0)::integer, COALESCE(sessions.n, 0)::integer,
    (COALESCE(lessons.n, 0) + COALESCE(tests.n, 0) + COALESCE(doubts_asked.n, 0) + COALESCE(sessions.n, 0))::integer
  FROM days
  LEFT JOIN lessons ON lessons.d = days.d
  LEFT JOIN tests ON tests.d = days.d
  LEFT JOIN doubts_asked ON doubts_asked.d = days.d
  LEFT JOIN sessions ON sessions.d = days.d
  ORDER BY days.d
$$;

GRANT EXECUTE ON FUNCTION public.get_activity_days(date, date) TO authenticated;
