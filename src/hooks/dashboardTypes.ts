/**
 * `supabase gen types typescript` does not carry per-column nullability for
 * `RETURNS TABLE` functions the way it does for real table columns (there's
 * no `attnotnull` catalog entry for a function's output columns) — every
 * column in Database["public"]["Functions"][...]["Returns"] comes out
 * non-null regardless of what the SQL can actually return. These types
 * correct that for the columns that are genuinely nullable, based on the
 * actual RPC bodies in
 * supabase/migrations/20260930100000_7f2a4c81-….sql — not guessed.
 */

export interface LearningSummary {
  total_xp: number;
  level: number;
  xp_into_level: number;
  xp_for_next_level: number;
  streak_days: number;
  best_streak_days: number;
  active_today: boolean;
  active_days_this_week: number;
  active_days_last_30: number;
  xp_this_week: number;
  lessons_completed: number;
  tests_submitted: number;
  average_score: number | null; // NULL until the student has a submitted attempt
}

export interface SubjectProgressRow {
  subject_id: string;
  subject_name: string;
  slug: string;
  sort_order: number;
  chapter_count: number;
  lesson_count: number;
  lessons_completed: number;
  test_count: number;
  average_score: number | null; // NULL until an attempt exists for the subject
  status: string;
  last_activity_at: string | null; // NULL until any lesson/test activity exists
}

export interface WeakAreaRow {
  subject_id: string;
  subject_name: string;
  chapter_id: string | null; // NULL when the test wasn't scoped to a chapter
  chapter_title: string | null;
  average_score: number;
  attempts_count: number;
}

export interface RecentTestRow {
  attempt_id: string;
  test_id: string;
  test_title: string;
  subject_id: string;
  subject_name: string;
  submitted_at: string;
  score: number;
  max_score: number;
  percentage: number;
}

export interface WeeklySummaryRow {
  period: string;
  period_start: string;
  period_end: string;
  lessons_completed: number;
  tests_attempted: number;
  average_score: number | null; // NULL for a week with zero attempts
  doubts_asked: number;
  doubts_resolved: number;
  sessions_attended: number;
  xp_earned: number;
  active_days: number;
}

export interface MentorshipSummary {
  upcoming_count: number;
  completed_count: number;
  attendance_pct: number | null; // NULL until the student has any past session
  next_session_id: string | null; // NULL when there is no upcoming session
  next_session_title: string | null;
  next_session_at: string | null;
  next_mentor_name: string | null;
}

export interface ActivityDay {
  activity_date: string;
  lesson_count: number;
  test_count: number;
  doubt_count: number;
  session_count: number;
  total_count: number;
}

export interface XpBreakdownRow {
  source_type: string;
  total_points: number;
  event_count: number;
}
