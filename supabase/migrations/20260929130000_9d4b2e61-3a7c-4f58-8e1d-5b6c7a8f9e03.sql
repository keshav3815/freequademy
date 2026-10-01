-- =============================================================================
-- PHASE 4 — AI doubts: history and mentor escalation
--
--   student asks → doubt-solver function answers → row in public.doubts
--   student can escalate an answer → mentors see the queue → mentor answers
--
-- Replaces: in-memory "recent doubts", no-op "Ask Teacher", and the teacher
-- "Pending Doubts" panel that was really unanswered forum threads (AI-005).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.doubts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL CHECK (char_length(question) BETWEEN 1 AND 2000),
  subject TEXT NOT NULL DEFAULT 'General' CHECK (char_length(subject) <= 50),
  grade SMALLINT CHECK (grade IS NULL OR grade BETWEEN 6 AND 12),
  has_image BOOLEAN NOT NULL DEFAULT false,
  ai_answer TEXT CHECK (ai_answer IS NULL OR char_length(ai_answer) <= 20000),
  model TEXT,
  status TEXT NOT NULL DEFAULT 'answered'
    CHECK (status IN ('answered', 'escalated', 'mentor_answered')),
  escalation_note TEXT CHECK (escalation_note IS NULL OR char_length(escalation_note) <= 1000),
  escalated_at TIMESTAMPTZ,
  mentor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mentor_answer TEXT CHECK (mentor_answer IS NULL OR char_length(mentor_answer) <= 10000),
  mentor_answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doubts_user_created ON public.doubts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doubts_escalated ON public.doubts (escalated_at) WHERE status = 'escalated';

DROP TRIGGER IF EXISTS update_doubts_updated_at ON public.doubts;
CREATE TRIGGER update_doubts_updated_at BEFORE UPDATE ON public.doubts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.doubts ENABLE ROW LEVEL SECURITY;

-- Students see their own doubts; approved mentors see the escalation queue and
-- the doubts they answered; admins/moderators see everything.
DROP POLICY IF EXISTS "Students read own doubts" ON public.doubts;
CREATE POLICY "Students read own doubts" ON public.doubts FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (public.is_mentor(auth.uid()) AND (status = 'escalated' OR mentor_id = auth.uid()))
  OR public.is_moderator(auth.uid())
);

-- The doubt-solver function inserts with the caller's JWT. A student can only
-- create rows for themselves, and only in the initial state.
DROP POLICY IF EXISTS "Students log own doubts" ON public.doubts;
CREATE POLICY "Students log own doubts" ON public.doubts FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND status = 'answered'
  AND escalated_at IS NULL
  AND mentor_id IS NULL
  AND mentor_answer IS NULL
);

-- No direct UPDATE/DELETE: state changes go through the RPCs below.
REVOKE UPDATE, DELETE ON public.doubts FROM anon, authenticated;


CREATE OR REPLACE FUNCTION public.escalate_doubt(_doubt_id uuid, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Please log in' USING ERRCODE = '42501';
  END IF;
  -- keep the mentor queue manageable: at most 5 open escalations per student
  IF (SELECT count(*) FROM public.doubts WHERE user_id = _uid AND status = 'escalated') >= 5 THEN
    RAISE EXCEPTION 'You already have 5 questions waiting for a mentor' USING ERRCODE = '22023';
  END IF;

  UPDATE public.doubts
  SET status = 'escalated', escalated_at = now(), escalation_note = left(nullif(btrim(_note), ''), 1000)
  WHERE id = _doubt_id AND user_id = _uid AND status = 'answered';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This doubt cannot be sent to a mentor' USING ERRCODE = '22023';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.answer_escalated_doubt(_doubt_id uuid, _answer text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (public.is_mentor(auth.uid()) OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Only mentors can answer doubts' USING ERRCODE = '42501';
  END IF;
  IF _answer IS NULL OR char_length(btrim(_answer)) = 0 THEN
    RAISE EXCEPTION 'Answer cannot be empty' USING ERRCODE = '22023';
  END IF;

  UPDATE public.doubts
  SET status = 'mentor_answered', mentor_id = auth.uid(),
      mentor_answer = left(btrim(_answer), 10000), mentor_answered_at = now()
  WHERE id = _doubt_id AND status = 'escalated';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This doubt is not waiting for a mentor' USING ERRCODE = '22023';
  END IF;
END;
$$;

-- Escalation queue for mentors with a display name for the student.
CREATE OR REPLACE FUNCTION public.get_escalated_doubts(_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid, question text, subject text, grade smallint, ai_answer text,
  escalation_note text, escalated_at timestamptz, student_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (public.is_mentor(auth.uid()) OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Only mentors can view the doubt queue' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT d.id, d.question, d.subject, d.grade, d.ai_answer, d.escalation_note, d.escalated_at,
         COALESCE(split_part(p.full_name, ' ', 1), 'Student')
  FROM public.doubts d
  LEFT JOIN public.profiles p ON p.id = d.user_id
  WHERE d.status = 'escalated'
  ORDER BY d.escalated_at
  LIMIT LEAST(GREATEST(_limit, 1), 100);
END;
$$;
