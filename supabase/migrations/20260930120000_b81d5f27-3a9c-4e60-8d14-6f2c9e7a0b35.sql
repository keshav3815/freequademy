-- =============================================================================
-- Study Notes: per-chapter note counts and the student's own completion, so
-- the Study Notes workspace can show real chapter cards and subject counts
-- without downloading every note to the browser.
--
-- A "study note" is a published, standard-format lesson with written content
-- (the same definition the Study Notes list query uses).
--
-- SECURITY INVOKER: lessons RLS still applies, and lesson_progress RLS limits
-- completion to the caller's own rows (anonymous callers get 0 completed).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_study_note_stats(_class_level smallint)
RETURNS TABLE (
  subject_id uuid,
  chapter_id uuid,
  note_count integer,
  completed_count integer,
  last_updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT c.subject_id,
         c.id,
         count(l.id)::integer,
         (count(lp.lesson_id) FILTER (WHERE lp.status = 'completed'))::integer,
         max(l.updated_at)
  FROM public.chapters c
  JOIN public.subjects s ON s.id = c.subject_id AND s.class_level = _class_level
  JOIN public.lessons l
    ON l.chapter_id = c.id
   AND l.status = 'published'
   AND l.content_format = 'standard'
   AND l.content_md <> ''
  LEFT JOIN public.lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = auth.uid()
  GROUP BY c.subject_id, c.id
$$;

REVOKE ALL ON FUNCTION public.get_study_note_stats(smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_study_note_stats(smallint) TO anon, authenticated;
