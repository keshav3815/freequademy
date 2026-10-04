-- Architecture V1 Phase 0: close the one anon-callable SECURITY DEFINER function
-- that has no auth check and no caller.
--
-- get_user_counts() returns platform-wide user totals (all, students, mentors)
-- to anyone, including anonymous visitors. Nothing in the app calls it (the
-- landing-page live stats that used it were removed), and no function, view or
-- policy depends on it. Only the service role keeps access, for admin tooling.
--
-- Deliberately NOT changed (dependency analysis, docs/architecture/phase-0-report.md):
--   has_role, is_mentor           called by RLS policies on anon-readable tables
--                                 (lessons, tests, test_questions); revoking breaks
--                                 public course browsing
--   session_participant_counts    called by the public /mentorship page
--
-- Rollback: supabase/rollbacks/20261001100000_revoke_get_user_counts.sql

REVOKE EXECUTE ON FUNCTION public.get_user_counts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_counts() TO service_role;
