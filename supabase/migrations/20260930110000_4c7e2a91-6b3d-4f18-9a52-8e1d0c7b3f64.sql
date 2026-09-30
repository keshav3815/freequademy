-- =============================================================================
-- Learning workspaces (Study Notes / Videos / Animated / Quizzes / Test Series)
--
-- 1. lessons.content_format — lets a mentor mark a lesson as an animated /
--    interactive lesson so the Animated workspace lists real content instead
--    of being permanently empty or guessing from the video URL.
-- 2. saved_items — a student's own bookmarks of lessons and tests. Backs
--    "Saved Notes", "Watch Later", "Favorites" and "Saved" quizzes/tests.
-- =============================================================================

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS content_format TEXT NOT NULL DEFAULT 'standard';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lessons_content_format_check') THEN
    ALTER TABLE public.lessons
      ADD CONSTRAINT lessons_content_format_check CHECK (content_format IN ('standard', 'animated'));
  END IF;
END $$;


CREATE TABLE IF NOT EXISTS public.saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(lesson_id, test_id) = 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_saved_items_lesson ON public.saved_items (user_id, lesson_id) WHERE lesson_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_saved_items_test ON public.saved_items (user_id, test_id) WHERE test_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_saved_items_user ON public.saved_items (user_id, created_at DESC);

ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students read own saved items" ON public.saved_items;
CREATE POLICY "Students read own saved items" ON public.saved_items FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- The EXISTS subqueries run with the caller's RLS, so only lessons/tests the
-- student can already see (published, or their own drafts) can be saved.
DROP POLICY IF EXISTS "Students save visible content" ON public.saved_items;
CREATE POLICY "Students save visible content" ON public.saved_items FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    (lesson_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_id))
    OR (test_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id))
  )
);

DROP POLICY IF EXISTS "Students remove own saved items" ON public.saved_items;
CREATE POLICY "Students remove own saved items" ON public.saved_items FOR DELETE TO authenticated
USING (user_id = auth.uid());

REVOKE ALL ON public.saved_items FROM anon;
REVOKE UPDATE ON public.saved_items FROM authenticated;
GRANT SELECT, INSERT, DELETE ON public.saved_items TO authenticated;
