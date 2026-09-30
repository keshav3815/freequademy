-- =============================================================================
-- PHASE 2 — Learning domain: curriculum, lessons, tests, attempts, progress
--
--   subjects ─< chapters ─< lessons ─< lesson_progress (per student)
--                        └─< tests ─< test_questions
--                                 └─< test_attempts ─< attempt_answers
--   xp_events (idempotent awards) → get_learning_summary()
--
-- Security model
--   * Curriculum structure (subjects, chapters) is admin-managed.
--   * Lessons/tests are authored by approved mentors (own rows) and admins;
--     only `published` rows are visible to everyone else.
--   * Correct answers and explanations are never readable through the API
--     before an attempt is submitted (column-level privileges + RPCs).
--   * Attempts are created, answered and scored only through RPCs; scoring
--     happens in the database, never in the browser.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Curriculum structure
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_level SMALLINT NOT NULL CHECK (class_level BETWEEN 6 AND 12),
  slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  stream TEXT CHECK (stream IN ('science', 'commerce', 'humanities')),
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_level, slug)
);

CREATE TABLE IF NOT EXISTS public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chapters_subject ON public.chapters (subject_id, sort_order);


-- -----------------------------------------------------------------------------
-- 2. Lessons and progress
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  summary TEXT CHECK (summary IS NULL OR char_length(summary) <= 500),
  content_md TEXT NOT NULL DEFAULT '' CHECK (char_length(content_md) <= 100000),
  video_url TEXT CHECK (video_url IS NULL OR video_url ~* '^https://[^[:space:]]+$'),
  duration_minutes INTEGER NOT NULL DEFAULT 10 CHECK (duration_minutes BETWEEN 1 AND 600),
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lessons_chapter ON public.lessons (chapter_id, sort_order) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_lessons_author ON public.lessons (author_id);

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_recent ON public.lesson_progress (user_id, last_viewed_at DESC);


-- -----------------------------------------------------------------------------
-- 3. Tests, questions, attempts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  description TEXT,
  test_type TEXT NOT NULL DEFAULT 'practice' CHECK (test_type IN ('practice', 'chapter', 'full')),
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  duration_minutes INTEGER NOT NULL DEFAULT 15 CHECK (duration_minutes BETWEEN 1 AND 300),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tests_subject ON public.tests (subject_id) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_tests_author ON public.tests (author_id);

CREATE TABLE IF NOT EXISTS public.test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  prompt TEXT NOT NULL CHECK (char_length(prompt) BETWEEN 1 AND 5000),
  options JSONB NOT NULL CHECK (
    jsonb_typeof(options) = 'array' AND jsonb_array_length(options) BETWEEN 2 AND 6
  ),
  correct_option SMALLINT NOT NULL CHECK (correct_option >= 0),
  explanation TEXT,
  marks SMALLINT NOT NULL DEFAULT 1 CHECK (marks BETWEEN 1 AND 20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (correct_option < jsonb_array_length(options))
);
CREATE INDEX IF NOT EXISTS idx_test_questions_test ON public.test_questions (test_id, sort_order);

CREATE TABLE IF NOT EXISTS public.test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deadline_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  score INTEGER,
  max_score INTEGER,
  percentage NUMERIC(5, 2),
  correct_count INTEGER,
  question_count INTEGER
);
-- one open attempt per user per test (resume instead of duplicating)
CREATE UNIQUE INDEX IF NOT EXISTS uq_test_attempts_open
  ON public.test_attempts (user_id, test_id) WHERE status = 'in_progress';
CREATE INDEX IF NOT EXISTS idx_test_attempts_user ON public.test_attempts (user_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS public.attempt_answers (
  attempt_id UUID NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.test_questions(id) ON DELETE CASCADE,
  selected_option SMALLINT CHECK (selected_option IS NULL OR selected_option >= 0),
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_id, question_id)
);


-- -----------------------------------------------------------------------------
-- 4. XP (idempotent awards) — source of truth for gamification
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('lesson_completed', 'test_submitted', 'doubt_asked')),
  source_id UUID NOT NULL,
  points INTEGER NOT NULL CHECK (points BETWEEN 0 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_type, source_id)
);
CREATE INDEX IF NOT EXISTS idx_xp_events_user ON public.xp_events (user_id, created_at DESC);


-- -----------------------------------------------------------------------------
-- 5. updated_at triggers
-- -----------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['subjects', 'chapters', 'lessons', 'tests'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%1$s_updated_at ON public.%1$s', t);
    EXECUTE format('CREATE TRIGGER update_%1$s_updated_at BEFORE UPDATE ON public.%1$s
                    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END $$;

-- published_at stamps + author forced to the caller for API inserts
CREATE OR REPLACE FUNCTION public.stamp_authored_content()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND public.is_api_client() THEN
    NEW.author_id := auth.uid();
  END IF;
  IF TG_OP = 'UPDATE' AND public.is_api_client() THEN
    NEW.author_id := OLD.author_id;
  END IF;
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stamp_authored_content ON public.lessons;
CREATE TRIGGER stamp_authored_content BEFORE INSERT OR UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.stamp_authored_content();
DROP TRIGGER IF EXISTS stamp_authored_content ON public.tests;
CREATE TRIGGER stamp_authored_content BEFORE INSERT OR UPDATE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.stamp_authored_content();


-- -----------------------------------------------------------------------------
-- 6. Row Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

-- subjects / chapters: public read, admin write
DROP POLICY IF EXISTS "Anyone can read subjects" ON public.subjects;
CREATE POLICY "Anyone can read subjects" ON public.subjects FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage subjects" ON public.subjects;
CREATE POLICY "Admins manage subjects" ON public.subjects FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can read chapters" ON public.chapters;
CREATE POLICY "Anyone can read chapters" ON public.chapters FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage chapters" ON public.chapters;
CREATE POLICY "Admins manage chapters" ON public.chapters FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- lessons / tests: published public; drafts to author + admin; mentors author
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['lessons', 'tests'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Published %1$s are public" ON public.%1$s', t);
    EXECUTE format('CREATE POLICY "Published %1$s are public" ON public.%1$s FOR SELECT
                    USING (status = ''published'' OR author_id = auth.uid() OR public.is_admin(auth.uid()))', t);
    EXECUTE format('DROP POLICY IF EXISTS "Mentors create %1$s" ON public.%1$s', t);
    EXECUTE format('CREATE POLICY "Mentors create %1$s" ON public.%1$s FOR INSERT TO authenticated
                    WITH CHECK (public.is_mentor(auth.uid()) OR public.is_admin(auth.uid()))', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authors update %1$s" ON public.%1$s', t);
    EXECUTE format('CREATE POLICY "Authors update %1$s" ON public.%1$s FOR UPDATE TO authenticated
                    USING (author_id = auth.uid() OR public.is_admin(auth.uid()))
                    WITH CHECK (author_id = auth.uid() OR public.is_admin(auth.uid()))', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authors delete %1$s" ON public.%1$s', t);
    EXECUTE format('CREATE POLICY "Authors delete %1$s" ON public.%1$s FOR DELETE TO authenticated
                    USING (author_id = auth.uid() OR public.is_admin(auth.uid()))', t);
  END LOOP;
END $$;

-- questions: visible with their test; answers hidden by column privileges
DROP POLICY IF EXISTS "Questions follow their test" ON public.test_questions;
CREATE POLICY "Questions follow their test" ON public.test_questions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.tests t WHERE t.id = test_id
    AND (t.status = 'published' OR t.author_id = auth.uid() OR public.is_admin(auth.uid()))
));
DROP POLICY IF EXISTS "Test authors manage questions" ON public.test_questions;
CREATE POLICY "Test authors manage questions" ON public.test_questions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND (t.author_id = auth.uid() OR public.is_admin(auth.uid()))))
WITH CHECK (EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND (t.author_id = auth.uid() OR public.is_admin(auth.uid()))));

REVOKE SELECT ON public.test_questions FROM anon, authenticated;
GRANT SELECT (id, test_id, sort_order, prompt, options, marks, created_at)
  ON public.test_questions TO anon, authenticated;

-- progress: own rows; completion is written through RPCs
DROP POLICY IF EXISTS "Students read own lesson progress" ON public.lesson_progress;
CREATE POLICY "Students read own lesson progress" ON public.lesson_progress FOR SELECT TO authenticated
USING (user_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.lesson_progress FROM anon, authenticated;

DROP POLICY IF EXISTS "Students read own attempts" ON public.test_attempts;
CREATE POLICY "Students read own attempts" ON public.test_attempts FOR SELECT TO authenticated
USING (user_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.test_attempts FROM anon, authenticated;

DROP POLICY IF EXISTS "Students read own answers" ON public.attempt_answers;
CREATE POLICY "Students read own answers" ON public.attempt_answers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.test_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid()));
REVOKE INSERT, UPDATE, DELETE ON public.attempt_answers FROM anon, authenticated;

DROP POLICY IF EXISTS "Students read own xp" ON public.xp_events;
CREATE POLICY "Students read own xp" ON public.xp_events FOR SELECT TO authenticated
USING (user_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.xp_events FROM anon, authenticated;


-- -----------------------------------------------------------------------------
-- 7. RPCs — lessons
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.award_xp(_user_id uuid, _source_type text, _source_id uuid, _points integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.xp_events (user_id, source_type, source_id, points)
  VALUES (_user_id, _source_type, _source_id, _points)
  ON CONFLICT (user_id, source_type, source_id) DO NOTHING
$$;

CREATE OR REPLACE FUNCTION public.record_lesson_progress(_lesson_id uuid, _completed boolean DEFAULT false)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _status text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Please log in to track progress' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lessons WHERE id = _lesson_id AND status = 'published') THEN
    RAISE EXCEPTION 'Lesson not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.lesson_progress AS lp (user_id, lesson_id, status, last_viewed_at, completed_at)
  VALUES (_uid, _lesson_id,
          CASE WHEN _completed THEN 'completed' ELSE 'in_progress' END,
          now(),
          CASE WHEN _completed THEN now() END)
  ON CONFLICT (user_id, lesson_id) DO UPDATE
    SET last_viewed_at = now(),
        status = CASE WHEN lp.status = 'completed' OR _completed THEN 'completed' ELSE 'in_progress' END,
        completed_at = COALESCE(lp.completed_at, CASE WHEN _completed THEN now() END)
  RETURNING lp.status INTO _status;

  IF _status = 'completed' THEN
    PERFORM private.award_xp(_uid, 'lesson_completed', _lesson_id, 10);
  END IF;
  RETURN _status;
END;
$$;


-- -----------------------------------------------------------------------------
-- 8. RPCs — tests
-- -----------------------------------------------------------------------------
-- Starts (or resumes) an attempt; returns the attempt id.
CREATE OR REPLACE FUNCTION public.start_test_attempt(_test_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _test public.tests%ROWTYPE;
  _attempt_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Please log in to take tests' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO _test FROM public.tests WHERE id = _test_id AND status = 'published';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Test not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.test_questions WHERE test_id = _test_id) THEN
    RAISE EXCEPTION 'This test has no questions yet' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO _attempt_id FROM public.test_attempts
  WHERE user_id = _uid AND test_id = _test_id AND status = 'in_progress';
  IF FOUND THEN
    RETURN _attempt_id;
  END IF;

  INSERT INTO public.test_attempts (user_id, test_id, deadline_at)
  VALUES (_uid, _test_id, now() + make_interval(mins => _test.duration_minutes))
  RETURNING id INTO _attempt_id;
  RETURN _attempt_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_test_answer(_attempt_id uuid, _question_id uuid, _selected_option smallint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _attempt public.test_attempts%ROWTYPE;
  _option_count integer;
BEGIN
  SELECT * INTO _attempt FROM public.test_attempts WHERE id = _attempt_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt not found' USING ERRCODE = 'P0002';
  END IF;
  IF _attempt.status <> 'in_progress' THEN
    RAISE EXCEPTION 'This attempt has already been submitted' USING ERRCODE = '22023';
  END IF;
  -- small grace period for network latency
  IF now() > _attempt.deadline_at + interval '1 minute' THEN
    RAISE EXCEPTION 'Time is up for this attempt' USING ERRCODE = '22023';
  END IF;

  SELECT jsonb_array_length(options) INTO _option_count
  FROM public.test_questions WHERE id = _question_id AND test_id = _attempt.test_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question does not belong to this test' USING ERRCODE = '22023';
  END IF;
  IF _selected_option IS NOT NULL AND (_selected_option < 0 OR _selected_option >= _option_count) THEN
    RAISE EXCEPTION 'Invalid option' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.attempt_answers (attempt_id, question_id, selected_option)
  VALUES (_attempt_id, _question_id, _selected_option)
  ON CONFLICT (attempt_id, question_id) DO UPDATE
    SET selected_option = EXCLUDED.selected_option, answered_at = now();
END;
$$;

-- Scores the attempt in the database. Idempotent: resubmitting returns the
-- stored result. Late submissions are accepted (answers saved after the
-- deadline were already refused by save_test_answer).
CREATE OR REPLACE FUNCTION public.submit_test_attempt(_attempt_id uuid)
RETURNS TABLE (score integer, max_score integer, percentage numeric, correct_count integer, question_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _attempt public.test_attempts%ROWTYPE;
  _score integer;
  _max integer;
  _correct integer;
  _count integer;
  _pct numeric(5, 2);
BEGIN
  SELECT * INTO _attempt FROM public.test_attempts
  WHERE id = _attempt_id AND user_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt not found' USING ERRCODE = 'P0002';
  END IF;

  IF _attempt.status = 'in_progress' THEN
    -- make sure every question has an answer row (unanswered = null)
    INSERT INTO public.attempt_answers (attempt_id, question_id, selected_option)
    SELECT _attempt_id, q.id, NULL FROM public.test_questions q
    WHERE q.test_id = _attempt.test_id
    ON CONFLICT (attempt_id, question_id) DO NOTHING;

    UPDATE public.attempt_answers aa
    SET is_correct = (aa.selected_option IS NOT NULL AND aa.selected_option = q.correct_option)
    FROM public.test_questions q
    WHERE aa.attempt_id = _attempt_id AND q.id = aa.question_id;

    SELECT COALESCE(sum(q.marks) FILTER (WHERE aa.is_correct), 0),
           COALESCE(sum(q.marks), 0),
           count(*) FILTER (WHERE aa.is_correct),
           count(*)
    INTO _score, _max, _correct, _count
    FROM public.attempt_answers aa
    JOIN public.test_questions q ON q.id = aa.question_id
    WHERE aa.attempt_id = _attempt_id;

    _pct := CASE WHEN _max > 0 THEN round(_score * 100.0 / _max, 2) ELSE 0 END;

    UPDATE public.test_attempts
    SET status = 'submitted', submitted_at = now(), score = _score, max_score = _max,
        percentage = _pct, correct_count = _correct, question_count = _count
    WHERE id = _attempt_id;

    -- XP once per test (first submission), 5 base + up to 20 for score
    PERFORM private.award_xp(auth.uid(), 'test_submitted', _attempt.test_id, 5 + round(_pct / 5)::integer);
  END IF;

  RETURN QUERY
  SELECT a.score, a.max_score, a.percentage, a.correct_count, a.question_count
  FROM public.test_attempts a WHERE a.id = _attempt_id;
END;
$$;

-- Review with correct answers — only for the owner, only after submission.
CREATE OR REPLACE FUNCTION public.get_attempt_review(_attempt_id uuid)
RETURNS TABLE (
  question_id uuid, sort_order integer, prompt text, options jsonb, marks smallint,
  selected_option smallint, correct_option smallint, is_correct boolean, explanation text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.test_attempts
    WHERE id = _attempt_id AND user_id = auth.uid() AND status = 'submitted'
  ) THEN
    RAISE EXCEPTION 'Review is available after you submit your own attempt' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT q.id, q.sort_order, q.prompt, q.options, q.marks,
         aa.selected_option, q.correct_option, aa.is_correct, q.explanation
  FROM public.test_questions q
  JOIN public.test_attempts a ON a.test_id = q.test_id AND a.id = _attempt_id
  LEFT JOIN public.attempt_answers aa ON aa.attempt_id = a.id AND aa.question_id = q.id
  ORDER BY q.sort_order, q.created_at;
END;
$$;

-- Authoring view of questions including answers (test author or admin).
CREATE OR REPLACE FUNCTION public.get_test_questions_for_author(_test_id uuid)
RETURNS TABLE (id uuid, sort_order integer, prompt text, options jsonb, correct_option smallint, explanation text, marks smallint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.tests t
    WHERE t.id = _test_id AND (t.author_id = auth.uid() OR public.is_admin(auth.uid()))
  ) THEN
    RAISE EXCEPTION 'Only the test author can view answers' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT q.id, q.sort_order, q.prompt, q.options, q.correct_option, q.explanation, q.marks
  FROM public.test_questions q WHERE q.test_id = _test_id ORDER BY q.sort_order, q.created_at;
END;
$$;


-- -----------------------------------------------------------------------------
-- 9. RPCs — progress summaries (replace the dashboard mocks)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_learning_summary()
RETURNS TABLE (
  total_xp integer, level integer, xp_into_level integer, xp_for_next_level integer,
  streak_days integer, active_today boolean,
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
  _streak integer := 0;
  _day date;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Please log in' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(sum(points), 0) INTO _xp FROM public.xp_events WHERE user_id = _uid;

  -- consecutive active days ending today (or yesterday, so the streak does
  -- not reset before the student has had a chance to study today)
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

  RETURN QUERY SELECT
    _xp,
    (_xp / 250) + 1,
    _xp % 250,
    250,
    _streak,
    EXISTS (SELECT 1 FROM public.xp_events WHERE user_id = _uid
            AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = _today),
    (SELECT count(*)::integer FROM public.lesson_progress WHERE user_id = _uid AND status = 'completed'),
    (SELECT count(*)::integer FROM public.test_attempts WHERE user_id = _uid AND status = 'submitted'),
    (SELECT round(avg(percentage), 1) FROM public.test_attempts WHERE user_id = _uid AND status = 'submitted');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_subject_progress(_class_level smallint)
RETURNS TABLE (
  subject_id uuid, subject_name text, slug text, sort_order integer,
  chapter_count integer, lesson_count integer, lessons_completed integer,
  test_count integer, average_score numeric
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
      WHERE t.subject_id = s.id AND a.user_id = auth.uid() AND a.status = 'submitted')
  FROM public.subjects s
  WHERE s.class_level = _class_level
  ORDER BY s.sort_order, s.name
$$;

-- EXECUTE stays granted to API roles: this function enforces access itself
-- (see docs/remediation/phase-0-security.md, "supautils crash"). Revoking
-- EXECUTE from anon made the local Supabase Postgres image (17.6.1.106,
-- supautils) crash the backend when such a function was called.
GRANT EXECUTE ON FUNCTION public.record_lesson_progress(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_test_attempt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_test_answer(uuid, uuid, smallint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_test_attempt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_attempt_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_test_questions_for_author(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_learning_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_subject_progress(smallint) TO anon, authenticated;


-- -----------------------------------------------------------------------------
-- 10. Reference data: subjects offered per class (mirrors the previous
--     hard-coded Courses page). Chapters and content are authored in-app.
-- -----------------------------------------------------------------------------
INSERT INTO public.subjects (class_level, slug, name, stream, sort_order)
SELECT g, s.slug, s.name, NULL, s.ord
FROM generate_series(6, 10) AS g,
     (VALUES ('mathematics', 'Mathematics', 1), ('science', 'Science', 2), ('english', 'English', 3),
             ('social-science', 'Social Science', 4), ('hindi', 'Hindi', 5)) AS s(slug, name, ord)
ON CONFLICT (class_level, slug) DO NOTHING;

INSERT INTO public.subjects (class_level, slug, name, stream, sort_order)
SELECT g, s.slug, s.name, s.stream, s.ord
FROM generate_series(11, 12) AS g,
     (VALUES ('mathematics', 'Mathematics', 'science', 1), ('physics', 'Physics', 'science', 2),
             ('chemistry', 'Chemistry', 'science', 3), ('biology', 'Biology', 'science', 4),
             ('computer-science', 'Computer Science', 'science', 5),
             ('accountancy', 'Accountancy', 'commerce', 6), ('business-studies', 'Business Studies', 'commerce', 7),
             ('economics', 'Economics', 'commerce', 8), ('english', 'English', NULL, 9)) AS s(slug, name, stream, ord)
ON CONFLICT (class_level, slug) DO NOTHING;
