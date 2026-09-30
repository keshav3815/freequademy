/**
 * Row shapes for the teacher portal. RPC rows are written by hand because
 * `supabase gen types` marks every RETURNS TABLE column non-null; the
 * nullable columns below match the SQL in
 * supabase/migrations/20260930130000_c3e91f5a-….sql (see dashboardTypes.ts
 * for the same convention on the student side).
 */

export interface TeacherOverview {
  course_count: number;
  lesson_count: number;
  published_lesson_count: number;
  assignment_count: number;
  published_assignment_count: number;
  student_count: number;
  completion_pct: number | null; // NULL until a student has progress on a published lesson
  avg_score_30d: number | null;
  avg_score_prev_30d: number | null;
  submissions_7d: number;
  awaiting_review: number;
}

export interface TeacherCourse {
  subject_id: string;
  subject_name: string;
  subject_slug: string;
  class_level: number;
  lesson_count: number;
  published_lesson_count: number;
  assignment_count: number;
  student_count: number;
  completion_pct: number | null;
  avg_score: number | null;
  last_updated_at: string | null;
}

export interface TeacherStudent {
  student_id: string;
  full_name: string;
  grade: string | null;
  subject_ids: string[];
  subject_names: string[];
  lessons_started: number;
  lessons_completed: number;
  tests_submitted: number;
  avg_score: number | null;
  recent_avg: number | null;
  previous_avg: number | null;
  sessions_attended: number;
  sessions_absent: number;
  attendance_pct: number | null;
  last_active_at: string | null;
}

export interface StudentCourseProgress {
  subject_id: string;
  subject_name: string;
  class_level: number;
  published_lessons: number;
  lessons_completed: number;
  tests_submitted: number;
  avg_score: number | null;
}

export interface StudentAttempt {
  attempt_id: string;
  test_id: string;
  test_title: string;
  subject_name: string;
  status: string;
  submitted_at: string | null;
  percentage: number | null;
  score: number | null;
  max_score: number | null;
  reviewed_at: string | null;
}

export interface StudentSession {
  session_id: string;
  title: string;
  scheduled_at: string;
  session_status: string;
  attendance: string;
}

export interface TeacherAssignment {
  test_id: string;
  title: string;
  subject_id: string;
  subject_name: string;
  class_level: number;
  chapter_title: string | null;
  test_type: string;
  difficulty: string;
  status: "draft" | "published" | string;
  duration_minutes: number;
  question_count: number;
  total_marks: number;
  updated_at: string;
  published_at: string | null;
  submitted_count: number;
  in_progress_count: number;
  student_count: number;
  reviewed_count: number;
  awaiting_review_count: number;
  avg_score: number | null;
}

export interface Submission {
  attempt_id: string;
  student_id: string;
  student_name: string;
  status: "in_progress" | "submitted" | string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  correct_count: number | null;
  question_count: number | null;
  reviewed_at: string | null;
  feedback: string | null;
}

export interface AttemptAnswer {
  question_id: string;
  sort_order: number;
  prompt: string;
  options: string[];
  correct_option: number;
  selected_option: number | null;
  is_correct: boolean | null;
  marks: number;
  explanation: string | null;
}

export type ActivityKind = "submission" | "lesson_completed" | "session_registration" | "published";

export interface ActivityEvent {
  kind: ActivityKind;
  student_id: string | null;
  student_name: string | null;
  title: string;
  ref_id: string;
  occurred_at: string;
}

export interface TrendWeek {
  week_start: string;
  avg_score: number | null;
  submissions: number;
  lessons_completed: number;
  active_students: number;
  attendance_pct: number | null;
}

export type SessionStatus = "scheduled" | "ongoing" | "completed" | "cancelled";

export interface TeacherSession {
  id: string;
  title: string;
  description: string | null;
  session_type: "one-on-one" | "group" | string;
  scheduled_at: string;
  duration_minutes: number;
  status: SessionStatus | string;
  max_participants: number | null;
  participants: { status: string }[];
}

export interface RosterEntry {
  id: string;
  student_id: string;
  student_name: string;
  status: "registered" | "attended" | "absent" | "cancelled" | string;
}

export interface CurriculumLesson {
  id: string;
  title: string;
  status: string;
  sort_order: number;
  duration_minutes: number;
  video_url: string | null;
  content_format: string;
  updated_at: string;
  author_id: string | null;
}

export interface CurriculumTest {
  id: string;
  title: string;
  status: string;
  chapter_id: string | null;
  test_type: string;
  duration_minutes: number;
}

export interface CurriculumChapter {
  id: string;
  title: string;
  sort_order: number;
  lessons: CurriculumLesson[];
  tests: CurriculumTest[];
}

export interface CourseCurriculum {
  subject: { id: string; name: string; class_level: number; description: string | null };
  chapters: CurriculumChapter[];
  /** tests attached to the whole subject rather than a chapter */
  subjectTests: CurriculumTest[];
}

export interface EscalatedDoubt {
  id: string;
  question: string;
  subject: string;
  grade: number | null;
  ai_answer: string | null;
  escalation_note: string | null;
  escalated_at: string | null;
  student_name: string;
}

export interface AnsweredDoubt {
  id: string;
  question: string;
  subject: string;
  ai_answer: string | null;
  escalation_note: string | null;
  escalated_at: string | null;
  mentor_answer: string | null;
  mentor_answered_at: string | null;
}

export type AnnouncementAudience = "subject" | "session" | "students";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  subject_id: string | null;
  session_id: string | null;
  student_ids: string[];
  status: "draft" | "published";
  publish_at: string;
  created_at: string;
}

export type ResourceKind = "pdf" | "video" | "image" | "document" | "question_bank" | "worksheet" | "link";

export interface Resource {
  id: string;
  title: string;
  kind: ResourceKind;
  folder: string;
  tags: string[];
  subject_id: string | null;
  external_url: string | null;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export interface StudentNote {
  id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface SessionFeedbackRow {
  id: string;
  rating: number | null;
  feedback_text: string | null;
  is_anonymous: boolean | null;
  created_at: string;
  session_title: string | null;
}

export interface TeacherProfile {
  full_name: string;
  email: string;
  bio: string;
  expertise: string[];
  qualification: string;
  experience_years: number | null;
  /** admins may use the portal without a mentors row */
  has_mentor_row: boolean;
}
