-- =============================================================================
-- PHASE 10 — Teacher Portal
--
-- The teacher portal (/teacher) needs to read aggregate progress for the
-- students who use a teacher's own content. Row-level security keeps
-- lesson_progress / test_attempts own-row only, so every read below goes
-- through a SECURITY DEFINER function that:
--
--   1. requires the caller to be a mentor (teacher) or admin, and
--   2. only ever returns rows tied to content the CALLER authored
--      (lessons/tests.author_id) or sessions the caller runs
--      (mentorship_sessions.mentor_id).
--
-- "My students" = anyone who has progress on one of my lessons, an attempt on
-- one of my tests, or a live registration for one of my sessions. Only a
-- student's name and grade are exposed — never email.
--
-- New tables:
--   attempt_reviews        teacher feedback on a submitted test attempt
--   teacher_student_notes  private notes a teacher keeps about a student
--   announcements          teacher → students announcements
--   teacher_resources      a teacher's resource library (links + uploads)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. Indexes for teacher-side aggregation
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON public.lesson_progress (lesson_id, status);
CREATE INDEX IF NOT EXISTS idx_test_attempts_test ON public.test_attempts (test_id, status);


-- -----------------------------------------------------------------------------
-- 1. Helpers
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

-- Returns the caller's id, or raises when the caller is not a teacher/admin.
CREATE OR REPLACE FUNCTION private.require_teacher()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT (public.is_mentor(_uid) OR public.is_admin(_uid)) THEN
    RAISE EXCEPTION 'Only teachers can use the teacher portal' USING ERRCODE = '42501';
  END IF;
  RETURN _uid;
END;
$$;

-- (student, subject) pairs for a teacher. subject_id is NULL for students
-- known only through a live session. Private: callable only from the
-- SECURITY DEFINER functions below, never through the API.
CREATE OR REPLACE FUNCTION private.teacher_students(_teacher uuid)
RETURNS TABLE (student_id uuid, subject_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.user_id, t.subject_id
  FROM public.test_attempts a
  JOIN public.tests t ON t.id = a.test_id
  WHERE t.author_id = _teacher AND a.user_id <> _teacher
  UNION
  SELECT lp.user_id, c.subject_id
  FROM public.lesson_progress lp
  JOIN public.lessons l ON l.id = lp.lesson_id
  JOIN public.chapters c ON c.id = l.chapter_id
  WHERE l.author_id = _teacher AND lp.user_id <> _teacher
  UNION
  SELECT sp.student_id, NULL::uuid
  FROM public.session_participants sp
  JOIN public.mentorship_sessions s ON s.id = sp.session_id
  WHERE s.mentor_id = _teacher AND sp.status <> 'cancelled'
    AND sp.student_id IS NOT NULL AND sp.student_id <> _teacher
$$;

-- Used by RLS policies below. Only answers about the caller's own roster.
CREATE OR REPLACE FUNCTION public.is_my_student(_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM private.teacher_students(auth.uid()) ts WHERE ts.student_id = _student_id
  )
$$;

CREATE OR REPLACE FUNCTION public.are_my_students(_student_ids uuid[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM unnest(_student_ids) AS s(id)
    WHERE s.id NOT IN (SELECT ts.student_id FROM private.teacher_students(auth.uid()) ts)
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_my_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.are_my_students(uuid[]) TO authenticated;


-- -----------------------------------------------------------------------------
-- 2. attempt_reviews — teacher feedback on a submitted attempt. Scores stay
--    auto-graded (submit_test_attempt); a review adds feedback and marks the
--    submission as reviewed. Written only through review_attempt().
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attempt_reviews (
  attempt_id UUID PRIMARY KEY REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback TEXT CHECK (feedback IS NULL OR char_length(feedback) <= 5000),
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attempt_reviews_teacher ON public.attempt_reviews (teacher_id, reviewed_at DESC);

ALTER TABLE public.attempt_reviews ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.attempt_reviews FROM anon, authenticated;

DROP POLICY IF EXISTS "Reviews visible to reviewer and student" ON public.attempt_reviews;
CREATE POLICY "Reviews visible to reviewer and student" ON public.attempt_reviews FOR SELECT TO authenticated
USING (
  teacher_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.test_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.review_attempt(_attempt_id uuid, _feedback text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := private.require_teacher();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.test_attempts a JOIN public.tests t ON t.id = a.test_id
    WHERE a.id = _attempt_id AND t.author_id = _uid AND a.status = 'submitted'
  ) THEN
    RAISE EXCEPTION 'You can only review submitted attempts on your own assignments' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.attempt_reviews (attempt_id, teacher_id, feedback, reviewed_at)
  VALUES (_attempt_id, _uid, left(nullif(btrim(_feedback), ''), 5000), now())
  ON CONFLICT (attempt_id) DO UPDATE
    SET feedback = EXCLUDED.feedback, teacher_id = EXCLUDED.teacher_id, reviewed_at = now();
END;
$$;
GRANT EXECUTE ON FUNCTION public.review_attempt(uuid, text) TO authenticated;


-- -----------------------------------------------------------------------------
-- 3. teacher_student_notes — private to the teacher who wrote them
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_student_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_notes_pair ON public.teacher_student_notes (teacher_id, student_id, created_at DESC);

DROP TRIGGER IF EXISTS update_teacher_student_notes_updated_at ON public.teacher_student_notes;
CREATE TRIGGER update_teacher_student_notes_updated_at BEFORE UPDATE ON public.teacher_student_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.teacher_student_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers read own notes" ON public.teacher_student_notes;
CREATE POLICY "Teachers read own notes" ON public.teacher_student_notes FOR SELECT TO authenticated
USING (teacher_id = auth.uid());
DROP POLICY IF EXISTS "Teachers note their students" ON public.teacher_student_notes;
CREATE POLICY "Teachers note their students" ON public.teacher_student_notes FOR INSERT TO authenticated
WITH CHECK (teacher_id = auth.uid() AND public.is_my_student(student_id));
DROP POLICY IF EXISTS "Teachers edit own notes" ON public.teacher_student_notes;
CREATE POLICY "Teachers edit own notes" ON public.teacher_student_notes FOR UPDATE TO authenticated
USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid() AND public.is_my_student(student_id));
DROP POLICY IF EXISTS "Teachers delete own notes" ON public.teacher_student_notes;
CREATE POLICY "Teachers delete own notes" ON public.teacher_student_notes FOR DELETE TO authenticated
USING (teacher_id = auth.uid());


-- -----------------------------------------------------------------------------
-- 4. announcements — a course (subject), a class (session) or chosen students.
--    A published announcement with a future publish_at is "scheduled".
--    Students read theirs through get_my_announcements().
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 200),
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 5000),
  audience TEXT NOT NULL CHECK (audience IN ('subject', 'session', 'students')),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.mentorship_sessions(id) ON DELETE CASCADE,
  student_ids UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  publish_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (audience = 'subject' AND subject_id IS NOT NULL)
    OR (audience = 'session' AND session_id IS NOT NULL)
    OR (audience = 'students' AND cardinality(student_ids) BETWEEN 1 AND 200)
  )
);
CREATE INDEX IF NOT EXISTS idx_announcements_teacher ON public.announcements (teacher_id, publish_at DESC);

DROP TRIGGER IF EXISTS update_announcements_updated_at ON public.announcements;
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers read own announcements" ON public.announcements;
CREATE POLICY "Teachers read own announcements" ON public.announcements FOR SELECT TO authenticated
USING (teacher_id = auth.uid());

-- Audience must be the teacher's own: their session, or students on their roster.
DROP POLICY IF EXISTS "Teachers create announcements" ON public.announcements;
CREATE POLICY "Teachers create announcements" ON public.announcements FOR INSERT TO authenticated
WITH CHECK (
  teacher_id = auth.uid()
  AND (public.is_mentor(auth.uid()) OR public.is_admin(auth.uid()))
  AND (session_id IS NULL OR EXISTS (SELECT 1 FROM public.mentorship_sessions s WHERE s.id = session_id AND s.mentor_id = auth.uid()))
  AND public.are_my_students(student_ids)
);
DROP POLICY IF EXISTS "Teachers update announcements" ON public.announcements;
CREATE POLICY "Teachers update announcements" ON public.announcements FOR UPDATE TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (
  teacher_id = auth.uid()
  AND (session_id IS NULL OR EXISTS (SELECT 1 FROM public.mentorship_sessions s WHERE s.id = session_id AND s.mentor_id = auth.uid()))
  AND public.are_my_students(student_ids)
);
DROP POLICY IF EXISTS "Teachers delete announcements" ON public.announcements;
CREATE POLICY "Teachers delete announcements" ON public.announcements FOR DELETE TO authenticated
USING (teacher_id = auth.uid());

-- Student side: published, due, and addressed to the caller.
CREATE OR REPLACE FUNCTION public.get_my_announcements(_limit integer DEFAULT 10)
RETURNS TABLE (id uuid, title text, body text, teacher_name text, publish_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Please log in' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT an.id, an.title, an.body, COALESCE(p.full_name, 'Your teacher'), an.publish_at
  FROM public.announcements an
  LEFT JOIN public.profiles p ON p.id = an.teacher_id
  WHERE an.status = 'published' AND an.publish_at <= now()
    AND (
      (an.audience = 'students' AND _uid = ANY(an.student_ids))
      OR (an.audience = 'session' AND EXISTS (
        SELECT 1 FROM public.session_participants sp
        WHERE sp.session_id = an.session_id AND sp.student_id = _uid AND sp.status <> 'cancelled'))
      OR (an.audience = 'subject' AND EXISTS (
        SELECT 1 FROM private.teacher_students(an.teacher_id) ts
        WHERE ts.student_id = _uid AND ts.subject_id = an.subject_id))
    )
  ORDER BY an.publish_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 50);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_announcements(integer) TO authenticated;


-- -----------------------------------------------------------------------------
-- 5. teacher_resources — each row is either an https link or a file in the
--    private "teacher-resources" storage bucket under <teacher_id>/...
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  kind TEXT NOT NULL CHECK (kind IN ('pdf', 'video', 'image', 'document', 'question_bank', 'worksheet', 'link')),
  folder TEXT NOT NULL DEFAULT 'General' CHECK (char_length(btrim(folder)) BETWEEN 1 AND 80),
  tags TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(tags) <= 10),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  external_url TEXT CHECK (external_url IS NULL OR external_url ~* '^https://[^[:space:]]+$'),
  storage_path TEXT,
  mime_type TEXT,
  size_bytes BIGINT CHECK (size_bytes IS NULL OR size_bytes BETWEEN 0 AND 52428800),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((external_url IS NULL) <> (storage_path IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_teacher_resources_teacher ON public.teacher_resources (teacher_id, created_at DESC);

DROP TRIGGER IF EXISTS update_teacher_resources_updated_at ON public.teacher_resources;
CREATE TRIGGER update_teacher_resources_updated_at BEFORE UPDATE ON public.teacher_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.teacher_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers read own resources" ON public.teacher_resources;
CREATE POLICY "Teachers read own resources" ON public.teacher_resources FOR SELECT TO authenticated
USING (teacher_id = auth.uid());
DROP POLICY IF EXISTS "Teachers add resources" ON public.teacher_resources;
CREATE POLICY "Teachers add resources" ON public.teacher_resources FOR INSERT TO authenticated
WITH CHECK (
  teacher_id = auth.uid()
  AND (public.is_mentor(auth.uid()) OR public.is_admin(auth.uid()))
  AND (storage_path IS NULL OR storage_path LIKE auth.uid()::text || '/%')
);
DROP POLICY IF EXISTS "Teachers edit own resources" ON public.teacher_resources;
CREATE POLICY "Teachers edit own resources" ON public.teacher_resources FOR UPDATE TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid() AND (storage_path IS NULL OR storage_path LIKE auth.uid()::text || '/%'));
DROP POLICY IF EXISTS "Teachers delete own resources" ON public.teacher_resources;
CREATE POLICY "Teachers delete own resources" ON public.teacher_resources FOR DELETE TO authenticated
USING (teacher_id = auth.uid());

-- Private storage bucket; each teacher only touches their own folder. Guarded
-- so the migration also applies on a bare Postgres without Supabase Storage,
-- including images that ship only a stub storage schema (no `public` column,
-- no storage.foldername) until the Storage service migrates it.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL AND to_regclass('storage.objects') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'storage' AND table_name = 'buckets' AND column_name = 'public')
     AND to_regprocedure('storage.foldername(text)') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit)
    VALUES ('teacher-resources', 'teacher-resources', false, 52428800)
    ON CONFLICT (id) DO NOTHING;

    EXECUTE 'DROP POLICY IF EXISTS "Teachers read own resource files" ON storage.objects';
    EXECUTE $p$CREATE POLICY "Teachers read own resource files" ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'teacher-resources' AND (storage.foldername(name))[1] = auth.uid()::text)$p$;
    EXECUTE 'DROP POLICY IF EXISTS "Teachers upload resource files" ON storage.objects';
    EXECUTE $p$CREATE POLICY "Teachers upload resource files" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'teacher-resources' AND (storage.foldername(name))[1] = auth.uid()::text
                  AND (public.is_mentor(auth.uid()) OR public.is_admin(auth.uid())))$p$;
    EXECUTE 'DROP POLICY IF EXISTS "Teachers delete resource files" ON storage.objects';
    EXECUTE $p$CREATE POLICY "Teachers delete resource files" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'teacher-resources' AND (storage.foldername(name))[1] = auth.uid()::text)$p$;
  END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 6. Read models for the portal. Every function starts with
--    private.require_teacher() and filters by the caller's own content.
-- -----------------------------------------------------------------------------

-- Dashboard KPIs.
--   completion_pct: mean over (student, course) pairs of
--                   completed / published lessons of mine in that course.
--   awaiting_review: submitted attempts on my tests in the last 14 days
--                    with no review yet.
CREATE OR REPLACE FUNCTION public.get_teacher_overview()
RETURNS TABLE (
  course_count integer, lesson_count integer, published_lesson_count integer,
  assignment_count integer, published_assignment_count integer, student_count integer,
  completion_pct numeric, avg_score_30d numeric, avg_score_prev_30d numeric,
  submissions_7d integer, awaiting_review integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  _uid uuid := private.require_teacher();
BEGIN
  RETURN QUERY
  WITH my_lessons AS (
    SELECT l.id, l.status, c.subject_id FROM public.lessons l JOIN public.chapters c ON c.id = l.chapter_id
    WHERE l.author_id = _uid
  ),
  my_tests AS (SELECT t.id, t.status, t.subject_id FROM public.tests t WHERE t.author_id = _uid),
  subjects_taught AS (SELECT subject_id FROM my_lessons UNION SELECT subject_id FROM my_tests),
  published_per_subject AS (
    SELECT subject_id, count(*) AS n FROM my_lessons WHERE status = 'published' GROUP BY subject_id
  ),
  pair_completion AS (
    SELECT ts.student_id, ts.subject_id,
      (SELECT count(*) FROM public.lesson_progress lp JOIN my_lessons ml ON ml.id = lp.lesson_id
        WHERE lp.user_id = ts.student_id AND ml.subject_id = ts.subject_id
          AND ml.status = 'published' AND lp.status = 'completed')::numeric / pps.n AS ratio
    FROM private.teacher_students(_uid) ts
    JOIN published_per_subject pps ON pps.subject_id = ts.subject_id
  ),
  my_attempts AS (
    SELECT a.id, a.percentage, a.submitted_at FROM public.test_attempts a
    JOIN my_tests mt ON mt.id = a.test_id WHERE a.status = 'submitted'
  )
  SELECT
    (SELECT count(*)::integer FROM subjects_taught),
    (SELECT count(*)::integer FROM my_lessons),
    (SELECT count(*)::integer FROM my_lessons WHERE status = 'published'),
    (SELECT count(*)::integer FROM my_tests),
    (SELECT count(*)::integer FROM my_tests WHERE status = 'published'),
    (SELECT count(DISTINCT student_id)::integer FROM private.teacher_students(_uid)),
    (SELECT round(100 * avg(LEAST(ratio, 1)), 0) FROM pair_completion),
    (SELECT round(avg(percentage), 1) FROM my_attempts WHERE submitted_at >= now() - interval '30 days'),
    (SELECT round(avg(percentage), 1) FROM my_attempts
      WHERE submitted_at >= now() - interval '60 days' AND submitted_at < now() - interval '30 days'),
    (SELECT count(*)::integer FROM my_attempts WHERE submitted_at >= now() - interval '7 days'),
    (SELECT count(*)::integer FROM my_attempts ma
      WHERE ma.submitted_at >= now() - interval '14 days'
        AND NOT EXISTS (SELECT 1 FROM public.attempt_reviews r WHERE r.attempt_id = ma.id));
END;
$$;

-- One row per subject ("course") the teacher has authored content in.
CREATE OR REPLACE FUNCTION public.get_teacher_courses()
RETURNS TABLE (
  subject_id uuid, subject_name text, subject_slug text, class_level integer,
  lesson_count integer, published_lesson_count integer, assignment_count integer,
  student_count integer, completion_pct numeric, avg_score numeric, last_updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  _uid uuid := private.require_teacher();
BEGIN
  RETURN QUERY
  WITH my_lessons AS (
    SELECT l.id, l.status, l.updated_at, c.subject_id FROM public.lessons l
    JOIN public.chapters c ON c.id = l.chapter_id WHERE l.author_id = _uid
  ),
  my_tests AS (SELECT t.id, t.status, t.updated_at, t.subject_id FROM public.tests t WHERE t.author_id = _uid),
  roster AS (SELECT DISTINCT student_id, subject_id FROM private.teacher_students(_uid) WHERE subject_id IS NOT NULL)
  SELECT s.id, s.name, s.slug, s.class_level::integer,
    (SELECT count(*)::integer FROM my_lessons ml WHERE ml.subject_id = s.id),
    (SELECT count(*)::integer FROM my_lessons ml WHERE ml.subject_id = s.id AND ml.status = 'published'),
    (SELECT count(*)::integer FROM my_tests mt WHERE mt.subject_id = s.id),
    (SELECT count(*)::integer FROM roster r WHERE r.subject_id = s.id),
    (SELECT round(100 * avg(LEAST(x.done::numeric / NULLIF(x.total, 0), 1)), 0) FROM (
       SELECT r.student_id,
         (SELECT count(*) FROM public.lesson_progress lp JOIN my_lessons ml ON ml.id = lp.lesson_id
           WHERE lp.user_id = r.student_id AND ml.subject_id = s.id AND ml.status = 'published' AND lp.status = 'completed') AS done,
         (SELECT count(*) FROM my_lessons ml WHERE ml.subject_id = s.id AND ml.status = 'published') AS total
       FROM roster r WHERE r.subject_id = s.id) x),
    (SELECT round(avg(a.percentage), 1) FROM public.test_attempts a JOIN my_tests mt ON mt.id = a.test_id
      WHERE mt.subject_id = s.id AND a.status = 'submitted'),
    GREATEST(
      (SELECT max(ml.updated_at) FROM my_lessons ml WHERE ml.subject_id = s.id),
      (SELECT max(mt.updated_at) FROM my_tests mt WHERE mt.subject_id = s.id))
  FROM public.subjects s
  WHERE s.id IN (SELECT ml.subject_id FROM my_lessons ml UNION SELECT mt.subject_id FROM my_tests mt)
  ORDER BY 11 DESC NULLS LAST;
END;
$$;

-- The roster with per-student aggregates over the teacher's own content only.
-- recent_avg = last 30 days, previous_avg = the 30 days before that.
CREATE OR REPLACE FUNCTION public.get_teacher_students(_student_id uuid DEFAULT NULL)
RETURNS TABLE (
  student_id uuid, full_name text, grade text, subject_ids uuid[], subject_names text[],
  lessons_started integer, lessons_completed integer, tests_submitted integer,
  avg_score numeric, recent_avg numeric, previous_avg numeric,
  sessions_attended integer, sessions_absent integer, attendance_pct numeric,
  last_active_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  _uid uuid := private.require_teacher();
BEGIN
  RETURN QUERY
  WITH ts AS (
    SELECT * FROM private.teacher_students(_uid) t WHERE _student_id IS NULL OR t.student_id = _student_id
  ),
  roster AS (SELECT DISTINCT student_id FROM ts),
  subj AS (
    SELECT ts.student_id, array_agg(DISTINCT s.id) AS ids, array_agg(DISTINCT s.name) AS names
    FROM ts JOIN public.subjects s ON s.id = ts.subject_id GROUP BY ts.student_id
  ),
  lp AS (
    SELECT lp.user_id, count(*) AS started, count(*) FILTER (WHERE lp.status = 'completed') AS completed,
           max(lp.last_viewed_at) AS last_at
    FROM public.lesson_progress lp JOIN public.lessons l ON l.id = lp.lesson_id
    WHERE l.author_id = _uid AND lp.user_id IN (SELECT student_id FROM roster)
    GROUP BY lp.user_id
  ),
  ta AS (
    SELECT a.user_id, count(*) AS submitted, round(avg(a.percentage), 1) AS avg_all,
      round(avg(a.percentage) FILTER (WHERE a.submitted_at >= now() - interval '30 days'), 1) AS recent,
      round(avg(a.percentage) FILTER (WHERE a.submitted_at >= now() - interval '60 days'
                                        AND a.submitted_at < now() - interval '30 days'), 1) AS previous,
      max(a.submitted_at) AS last_at
    FROM public.test_attempts a JOIN public.tests t ON t.id = a.test_id
    WHERE t.author_id = _uid AND a.status = 'submitted' AND a.user_id IN (SELECT student_id FROM roster)
    GROUP BY a.user_id
  ),
  ss AS (
    SELECT sp.student_id, count(*) FILTER (WHERE sp.status = 'attended') AS attended,
      count(*) FILTER (WHERE sp.status = 'absent') AS absent,
      max(s.scheduled_at) FILTER (WHERE sp.status = 'attended') AS last_at
    FROM public.session_participants sp JOIN public.mentorship_sessions s ON s.id = sp.session_id
    WHERE s.mentor_id = _uid AND sp.student_id IN (SELECT student_id FROM roster)
    GROUP BY sp.student_id
  )
  SELECT r.student_id, COALESCE(p.full_name, 'Student'), p.grade,
    COALESCE(subj.ids, '{}'), COALESCE(subj.names, '{}'),
    COALESCE(lp.started, 0)::integer, COALESCE(lp.completed, 0)::integer, COALESCE(ta.submitted, 0)::integer,
    ta.avg_all, ta.recent, ta.previous,
    COALESCE(ss.attended, 0)::integer, COALESCE(ss.absent, 0)::integer,
    CASE WHEN COALESCE(ss.attended, 0) + COALESCE(ss.absent, 0) = 0 THEN NULL
         ELSE round(100.0 * ss.attended / (ss.attended + ss.absent), 0) END,
    NULLIF(GREATEST(COALESCE(lp.last_at, '-infinity'), COALESCE(ta.last_at, '-infinity'), COALESCE(ss.last_at, '-infinity')), '-infinity')
  FROM roster r
  LEFT JOIN public.profiles p ON p.id = r.student_id
  LEFT JOIN subj ON subj.student_id = r.student_id
  LEFT JOIN lp ON lp.user_id = r.student_id
  LEFT JOIN ta ON ta.user_id = r.student_id
  LEFT JOIN ss ON ss.student_id = r.student_id
  ORDER BY p.full_name NULLS LAST;
END;
$$;

-- Per-course progress of one of my students, on my content.
CREATE OR REPLACE FUNCTION public.get_teacher_student_courses(_student_id uuid)
RETURNS TABLE (
  subject_id uuid, subject_name text, class_level integer,
  published_lessons integer, lessons_completed integer, tests_submitted integer, avg_score numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  _uid uuid := private.require_teacher();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM private.teacher_students(_uid) t WHERE t.student_id = _student_id) THEN
    RAISE EXCEPTION 'This student is not in your classes' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT s.id, s.name, s.class_level::integer,
    (SELECT count(*)::integer FROM public.lessons l JOIN public.chapters c ON c.id = l.chapter_id
      WHERE l.author_id = _uid AND c.subject_id = s.id AND l.status = 'published'),
    (SELECT count(*)::integer FROM public.lesson_progress lp JOIN public.lessons l ON l.id = lp.lesson_id
      JOIN public.chapters c ON c.id = l.chapter_id
      WHERE lp.user_id = _student_id AND l.author_id = _uid AND c.subject_id = s.id
        AND l.status = 'published' AND lp.status = 'completed'),
    (SELECT count(*)::integer FROM public.test_attempts a JOIN public.tests t ON t.id = a.test_id
      WHERE a.user_id = _student_id AND t.author_id = _uid AND t.subject_id = s.id AND a.status = 'submitted'),
    (SELECT round(avg(a.percentage), 1) FROM public.test_attempts a JOIN public.tests t ON t.id = a.test_id
      WHERE a.user_id = _student_id AND t.author_id = _uid AND t.subject_id = s.id AND a.status = 'submitted')
  FROM public.subjects s
  WHERE s.id IN (SELECT t.subject_id FROM private.teacher_students(_uid) t WHERE t.student_id = _student_id)
  ORDER BY s.name;
END;
$$;

-- Attempts of one of my students on my tests (all, newest first).
CREATE OR REPLACE FUNCTION public.get_teacher_student_attempts(_student_id uuid)
RETURNS TABLE (
  attempt_id uuid, test_id uuid, test_title text, subject_name text, status text,
  submitted_at timestamptz, percentage numeric, score integer, max_score integer,
  reviewed_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  _uid uuid := private.require_teacher();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM private.teacher_students(_uid) t WHERE t.student_id = _student_id) THEN
    RAISE EXCEPTION 'This student is not in your classes' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT a.id, t.id, t.title, s.name, a.status, a.submitted_at, a.percentage, a.score, a.max_score, r.reviewed_at
  FROM public.test_attempts a
  JOIN public.tests t ON t.id = a.test_id
  JOIN public.subjects s ON s.id = t.subject_id
  LEFT JOIN public.attempt_reviews r ON r.attempt_id = a.id
  WHERE a.user_id = _student_id AND t.author_id = _uid
  ORDER BY COALESCE(a.submitted_at, a.started_at) DESC
  LIMIT 200;
END;
$$;

-- Sessions of mine a student registered for, with attendance.
CREATE OR REPLACE FUNCTION public.get_teacher_student_sessions(_student_id uuid)
RETURNS TABLE (session_id uuid, title text, scheduled_at timestamptz, session_status text, attendance text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  _uid uuid := private.require_teacher();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM private.teacher_students(_uid) t WHERE t.student_id = _student_id) THEN
    RAISE EXCEPTION 'This student is not in your classes' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT s.id, s.title, s.scheduled_at, s.status, sp.status
  FROM public.session_participants sp
  JOIN public.mentorship_sessions s ON s.id = sp.session_id
  WHERE sp.student_id = _student_id AND s.mentor_id = _uid
  ORDER BY s.scheduled_at DESC
  LIMIT 200;
END;
$$;

-- My tests ("assignments") with submission/review counts, in one query.
CREATE OR REPLACE FUNCTION public.get_teacher_assignments()
RETURNS TABLE (
  test_id uuid, title text, subject_id uuid, subject_name text, class_level integer,
  chapter_title text, test_type text, difficulty text, status text, duration_minutes integer,
  question_count integer, total_marks integer, updated_at timestamptz, published_at timestamptz,
  submitted_count integer, in_progress_count integer, student_count integer,
  reviewed_count integer, awaiting_review_count integer, avg_score numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  _uid uuid := private.require_teacher();
BEGIN
  RETURN QUERY
  WITH att AS (
    SELECT a.test_id,
      count(*) FILTER (WHERE a.status = 'submitted') AS submitted,
      count(*) FILTER (WHERE a.status = 'in_progress') AS in_progress,
      count(DISTINCT a.user_id) FILTER (WHERE a.status = 'submitted') AS students,
      count(r.attempt_id) AS reviewed,
      round(avg(a.percentage) FILTER (WHERE a.status = 'submitted'), 1) AS avg_pct
    FROM public.test_attempts a
    JOIN public.tests t ON t.id = a.test_id AND t.author_id = _uid
    LEFT JOIN public.attempt_reviews r ON r.attempt_id = a.id
    GROUP BY a.test_id
  ),
  q AS (
    SELECT tq.test_id, count(*) AS n, sum(tq.marks) AS marks
    FROM public.test_questions tq JOIN public.tests t ON t.id = tq.test_id AND t.author_id = _uid
    GROUP BY tq.test_id
  )
  SELECT t.id, t.title, s.id, s.name, s.class_level::integer, c.title, t.test_type, t.difficulty, t.status,
    t.duration_minutes, COALESCE(q.n, 0)::integer, COALESCE(q.marks, 0)::integer, t.updated_at, t.published_at,
    COALESCE(att.submitted, 0)::integer, COALESCE(att.in_progress, 0)::integer, COALESCE(att.students, 0)::integer,
    COALESCE(att.reviewed, 0)::integer, (COALESCE(att.submitted, 0) - COALESCE(att.reviewed, 0))::integer,
    att.avg_pct
  FROM public.tests t
  JOIN public.subjects s ON s.id = t.subject_id
  LEFT JOIN public.chapters c ON c.id = t.chapter_id
  LEFT JOIN att ON att.test_id = t.id
  LEFT JOIN q ON q.test_id = t.id
  WHERE t.author_id = _uid
  ORDER BY t.updated_at DESC;
END;
$$;

-- Submissions for one of my tests: not-yet-reviewed first.
CREATE OR REPLACE FUNCTION public.get_teacher_submissions(_test_id uuid)
RETURNS TABLE (
  attempt_id uuid, student_id uuid, student_name text, status text,
  started_at timestamptz, submitted_at timestamptz, score integer, max_score integer,
  percentage numeric, correct_count integer, question_count integer,
  reviewed_at timestamptz, feedback text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  _uid uuid := private.require_teacher();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tests t WHERE t.id = _test_id AND t.author_id = _uid) THEN
    RAISE EXCEPTION 'You can only review your own assignments' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT a.id, a.user_id, COALESCE(p.full_name, 'Student'), a.status, a.started_at, a.submitted_at,
    a.score, a.max_score, a.percentage, a.correct_count, a.question_count, r.reviewed_at, r.feedback
  FROM public.test_attempts a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  LEFT JOIN public.attempt_reviews r ON r.attempt_id = a.id
  WHERE a.test_id = _test_id
  ORDER BY (a.status = 'submitted' AND r.attempt_id IS NULL) DESC, a.submitted_at DESC NULLS LAST;
END;
$$;

-- Question-by-question answers for a submitted attempt on one of my tests.
CREATE OR REPLACE FUNCTION public.get_teacher_attempt_answers(_attempt_id uuid)
RETURNS TABLE (
  question_id uuid, sort_order integer, prompt text, options jsonb, correct_option smallint,
  selected_option smallint, is_correct boolean, marks smallint, explanation text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  _uid uuid := private.require_teacher();
  _test_id uuid;
BEGIN
  SELECT a.test_id INTO _test_id
  FROM public.test_attempts a JOIN public.tests t ON t.id = a.test_id
  WHERE a.id = _attempt_id AND t.author_id = _uid AND a.status = 'submitted';
  IF _test_id IS NULL THEN
    RAISE EXCEPTION 'You can only review submitted attempts on your own assignments' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT q.id, q.sort_order, q.prompt, q.options, q.correct_option, aa.selected_option, aa.is_correct, q.marks, q.explanation
  FROM public.test_questions q
  LEFT JOIN public.attempt_answers aa ON aa.question_id = q.id AND aa.attempt_id = _attempt_id
  WHERE q.test_id = _test_id
  ORDER BY q.sort_order, q.created_at;
END;
$$;

-- Recent events on my content, newest first.
CREATE OR REPLACE FUNCTION public.get_teacher_activity(_limit integer DEFAULT 20)
RETURNS TABLE (kind text, student_id uuid, student_name text, title text, ref_id uuid, occurred_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  _uid uuid := private.require_teacher();
  _n integer := LEAST(GREATEST(_limit, 1), 100);
BEGIN
  RETURN QUERY
  SELECT * FROM (
    (SELECT 'submission'::text, a.user_id, COALESCE(p.full_name, 'Student'), t.title, t.id, a.submitted_at
     FROM public.test_attempts a JOIN public.tests t ON t.id = a.test_id
     LEFT JOIN public.profiles p ON p.id = a.user_id
     WHERE t.author_id = _uid AND a.status = 'submitted'
     ORDER BY a.submitted_at DESC LIMIT _n)
    UNION ALL
    (SELECT 'lesson_completed', lp.user_id, COALESCE(p.full_name, 'Student'), l.title, l.id, lp.completed_at
     FROM public.lesson_progress lp JOIN public.lessons l ON l.id = lp.lesson_id
     LEFT JOIN public.profiles p ON p.id = lp.user_id
     WHERE l.author_id = _uid AND lp.status = 'completed' AND lp.completed_at IS NOT NULL
     ORDER BY lp.completed_at DESC LIMIT _n)
    UNION ALL
    (SELECT 'session_registration', sp.student_id, COALESCE(p.full_name, 'Student'), s.title, s.id, sp.created_at
     FROM public.session_participants sp JOIN public.mentorship_sessions s ON s.id = sp.session_id
     LEFT JOIN public.profiles p ON p.id = sp.student_id
     WHERE s.mentor_id = _uid AND sp.status <> 'cancelled'
     ORDER BY sp.created_at DESC LIMIT _n)
    UNION ALL
    (SELECT 'published', NULL::uuid, NULL::text, x.title, x.id, x.published_at FROM (
       SELECT l.id, l.title, l.published_at FROM public.lessons l WHERE l.author_id = _uid AND l.published_at IS NOT NULL
       UNION ALL
       SELECT t.id, t.title, t.published_at FROM public.tests t WHERE t.author_id = _uid AND t.published_at IS NOT NULL
     ) x ORDER BY x.published_at DESC LIMIT _n)
  ) events(kind, student_id, student_name, title, ref_id, occurred_at)
  ORDER BY occurred_at DESC
  LIMIT _n;
END;
$$;

-- Weekly trend (Asia/Kolkata weeks, oldest first) over my content, optionally
-- for one course. Weeks without data return NULL averages, never 0.
CREATE OR REPLACE FUNCTION public.get_teacher_trend(_weeks integer DEFAULT 12, _subject_id uuid DEFAULT NULL)
RETURNS TABLE (
  week_start date, avg_score numeric, submissions integer, lessons_completed integer,
  active_students integer, attendance_pct numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  _uid uuid := private.require_teacher();
  _w integer := LEAST(GREATEST(_weeks, 1), 52);
  _first date := (date_trunc('week', (now() AT TIME ZONE 'Asia/Kolkata')) - make_interval(weeks => _w - 1))::date;
BEGIN
  RETURN QUERY
  WITH weeks AS (
    SELECT generate_series(_first, (date_trunc('week', now() AT TIME ZONE 'Asia/Kolkata'))::date, interval '1 week')::date AS wk
  ),
  att AS (
    SELECT date_trunc('week', a.submitted_at AT TIME ZONE 'Asia/Kolkata')::date AS wk, a.user_id, a.percentage
    FROM public.test_attempts a JOIN public.tests t ON t.id = a.test_id
    WHERE t.author_id = _uid AND a.status = 'submitted' AND a.submitted_at >= _first
      AND (_subject_id IS NULL OR t.subject_id = _subject_id)
  ),
  les AS (
    SELECT date_trunc('week', lp.completed_at AT TIME ZONE 'Asia/Kolkata')::date AS wk, lp.user_id
    FROM public.lesson_progress lp JOIN public.lessons l ON l.id = lp.lesson_id
    JOIN public.chapters c ON c.id = l.chapter_id
    WHERE l.author_id = _uid AND lp.status = 'completed' AND lp.completed_at >= _first
      AND (_subject_id IS NULL OR c.subject_id = _subject_id)
  ),
  ses AS (
    SELECT date_trunc('week', s.scheduled_at AT TIME ZONE 'Asia/Kolkata')::date AS wk, sp.status
    FROM public.session_participants sp JOIN public.mentorship_sessions s ON s.id = sp.session_id
    WHERE s.mentor_id = _uid AND sp.status IN ('attended', 'absent') AND s.scheduled_at >= _first
  )
  SELECT w.wk,
    (SELECT round(avg(att.percentage), 1) FROM att WHERE att.wk = w.wk),
    (SELECT count(*)::integer FROM att WHERE att.wk = w.wk),
    (SELECT count(*)::integer FROM les WHERE les.wk = w.wk),
    (SELECT count(DISTINCT u)::integer FROM (
       SELECT att.user_id AS u FROM att WHERE att.wk = w.wk
       UNION SELECT les.user_id FROM les WHERE les.wk = w.wk) x),
    (SELECT CASE WHEN count(*) = 0 THEN NULL
                 ELSE round(100.0 * count(*) FILTER (WHERE ses.status = 'attended') / count(*), 0) END
     FROM ses WHERE ses.wk = w.wk)
  FROM weeks w
  ORDER BY w.wk;
END;
$$;

-- Reorder my lessons within one chapter. Reuses the slots those lessons
-- already occupy so lessons by other authors keep their positions.
CREATE OR REPLACE FUNCTION public.reorder_teacher_lessons(_lesson_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := private.require_teacher();
  _n integer := cardinality(_lesson_ids);
  _slots integer[];
BEGIN
  IF _n IS NULL OR _n = 0 OR _n > 200 THEN
    RAISE EXCEPTION 'Nothing to reorder' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(DISTINCT x) FROM unnest(_lesson_ids) x) <> _n THEN
    RAISE EXCEPTION 'Duplicate lessons in the new order' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(*) FROM public.lessons WHERE id = ANY(_lesson_ids) AND author_id = _uid) <> _n
     OR (SELECT count(DISTINCT chapter_id) FROM public.lessons WHERE id = ANY(_lesson_ids)) <> 1 THEN
    RAISE EXCEPTION 'You can only reorder your own lessons within one chapter' USING ERRCODE = '42501';
  END IF;

  SELECT array_agg(sort_order ORDER BY sort_order) INTO _slots
  FROM public.lessons WHERE id = ANY(_lesson_ids);
  -- Colliding slots (e.g. every lesson at 0) would make the new order a no-op.
  IF (SELECT count(DISTINCT s) FROM unnest(_slots) s) < _n THEN
    SELECT array_agg(_slots[1] + i - 1 ORDER BY i) INTO _slots FROM generate_series(1, _n) i;
  END IF;

  UPDATE public.lessons l
  SET sort_order = _slots[o.pos]
  FROM unnest(_lesson_ids) WITH ORDINALITY AS o(id, pos)
  WHERE l.id = o.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_teacher_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_courses() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_students(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_student_courses(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_student_attempts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_student_sessions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_assignments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_submissions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_attempt_answers(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_activity(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_trend(integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_teacher_lessons(uuid[]) TO authenticated;
