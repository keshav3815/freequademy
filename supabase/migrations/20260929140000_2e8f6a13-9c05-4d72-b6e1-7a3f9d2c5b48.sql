-- =============================================================================
-- PHASE 7 — Performance: stop paying for unused realtime replication
--
-- PERF-011 (audit): `profiles` and `forum_threads` were switched to
-- REPLICA IDENTITY FULL and added to the supabase_realtime publication in
-- earlier migrations (20260106083325, 20260106083655), but no frontend code
-- has ever subscribed to postgres_changes on either table — confirmed by
-- grep across src/ (see docs/remediation/phase-7-performance-a11y-seo.md).
-- FULL replica identity makes Postgres log the entire old row on every
-- UPDATE (not just the primary key) purely so a logical-replication
-- subscriber COULD reconstruct the diff; with no subscriber that's pure WAL
-- overhead on every profile edit and every forum thread counter update
-- (and Phase 1 added triggers that update forum_threads.reply_count/upvotes
-- on essentially every reply/vote, so this table churns).
--
-- `mentorship_sessions` keeps FULL + its publication membership:
-- TeacherDashboard.tsx genuinely subscribes to it (filtered to
-- mentor_id=eq.<uid> since Phase 1) to refresh a mentor's own session list
-- live.
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'forum_threads'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.forum_threads;
  END IF;
END $$;

ALTER TABLE public.profiles REPLICA IDENTITY DEFAULT;
ALTER TABLE public.forum_threads REPLICA IDENTITY DEFAULT;
