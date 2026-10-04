-- Rollback for 20261001110000_8e2b4c6d-1f3a-4b57-9d80-2c6e7f1a3b95.sql
-- The frontend falls back to nothing: revert src/hooks/useStudentDashboard.ts in
-- the same release before running this.
DROP FUNCTION IF EXISTS public.get_student_dashboard(smallint, date, date);

DROP INDEX IF EXISTS public.idx_announcements_session, public.idx_announcements_subject,
  public.idx_attempt_answers_question, public.idx_club_members_user, public.idx_club_posts_author,
  public.idx_community_events_created_by, public.idx_dashboard_content_author, public.idx_doubts_mentor,
  public.idx_event_registrations_user, public.idx_forum_replies_author, public.idx_forum_threads_author,
  public.idx_mentor_applications_reviewed_by, public.idx_mentor_applications_user,
  public.idx_mentorship_feedback_student, public.idx_mentorship_sessions_program, public.idx_reply_votes_user,
  public.idx_saved_items_lesson, public.idx_saved_items_test, public.idx_student_clubs_created_by,
  public.idx_teacher_resources_subject, public.idx_teacher_student_notes_student, public.idx_tests_chapter,
  public.idx_thread_votes_user, public.idx_user_activity_log_user, public.idx_user_reports_reported_by;
