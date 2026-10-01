import { supabase } from "@/integrations/supabase/client";
import type {
  ActivityEvent,
  AnsweredDoubt,
  Announcement,
  AnnouncementAudience,
  AttemptAnswer,
  CourseCurriculum,
  CurriculumChapter,
  CurriculumLesson,
  CurriculumTest,
  EscalatedDoubt,
  Resource,
  ResourceKind,
  RosterEntry,
  SessionFeedbackRow,
  StudentAttempt,
  StudentCourseProgress,
  StudentNote,
  StudentSession,
  Submission,
  TeacherAssignment,
  TeacherCourse,
  TeacherOverview,
  TeacherProfile,
  TeacherSession,
  TeacherStudent,
  TrendWeek,
} from "./types";

/**
 * The teacher portal's only data-access module. Pages and components go
 * through the hooks in src/hooks/useTeacher.ts, which call these functions;
 * nothing in the portal talks to Supabase directly.
 *
 * Authorization lives in the database: every RPC below checks that the
 * caller is a teacher and scopes results to the caller's own content, and
 * every table write is covered by RLS (supabase/tests/database/015_…).
 */

export const RESOURCE_BUCKET = "teacher-resources";
export const MAX_RESOURCE_BYTES = 50 * 1024 * 1024;

function unwrap<T>(result: { data: unknown; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

// ---------------------------------------------------------------------------
// Aggregates
// ---------------------------------------------------------------------------
export async function fetchOverview(): Promise<TeacherOverview | null> {
  const rows = unwrap<TeacherOverview[]>(await supabase.rpc("get_teacher_overview"));
  return rows?.[0] ?? null;
}

export async function fetchCourses(): Promise<TeacherCourse[]> {
  return unwrap<TeacherCourse[]>(await supabase.rpc("get_teacher_courses")) ?? [];
}

export async function fetchStudents(): Promise<TeacherStudent[]> {
  return unwrap<TeacherStudent[]>(await supabase.rpc("get_teacher_students", {})) ?? [];
}

export async function fetchStudent(studentId: string): Promise<TeacherStudent | null> {
  const rows = unwrap<TeacherStudent[]>(await supabase.rpc("get_teacher_students", { _student_id: studentId }));
  return rows?.[0] ?? null;
}

export async function fetchStudentCourses(studentId: string): Promise<StudentCourseProgress[]> {
  return unwrap<StudentCourseProgress[]>(await supabase.rpc("get_teacher_student_courses", { _student_id: studentId })) ?? [];
}

export async function fetchStudentAttempts(studentId: string): Promise<StudentAttempt[]> {
  return unwrap<StudentAttempt[]>(await supabase.rpc("get_teacher_student_attempts", { _student_id: studentId })) ?? [];
}

export async function fetchStudentSessions(studentId: string): Promise<StudentSession[]> {
  return unwrap<StudentSession[]>(await supabase.rpc("get_teacher_student_sessions", { _student_id: studentId })) ?? [];
}

export async function fetchAssignments(): Promise<TeacherAssignment[]> {
  return unwrap<TeacherAssignment[]>(await supabase.rpc("get_teacher_assignments")) ?? [];
}

export async function fetchSubmissions(testId: string): Promise<Submission[]> {
  return unwrap<Submission[]>(await supabase.rpc("get_teacher_submissions", { _test_id: testId })) ?? [];
}

export async function fetchAttemptAnswers(attemptId: string): Promise<AttemptAnswer[]> {
  const rows = unwrap<(Omit<AttemptAnswer, "options"> & { options: unknown })[]>(
    await supabase.rpc("get_teacher_attempt_answers", { _attempt_id: attemptId }),
  );
  return (rows ?? []).map((r) => ({ ...r, options: Array.isArray(r.options) ? (r.options as string[]) : [] }));
}

export async function reviewAttempt(attemptId: string, feedback: string): Promise<void> {
  unwrap(await supabase.rpc("review_attempt", { _attempt_id: attemptId, _feedback: feedback }));
}

export async function fetchActivity(limit = 20): Promise<ActivityEvent[]> {
  return unwrap<ActivityEvent[]>(await supabase.rpc("get_teacher_activity", { _limit: limit })) ?? [];
}

export async function fetchTrend(weeks: number, subjectId: string | null): Promise<TrendWeek[]> {
  const args: { _weeks: number; _subject_id?: string } = { _weeks: weeks };
  if (subjectId) args._subject_id = subjectId;
  return unwrap<TrendWeek[]>(await supabase.rpc("get_teacher_trend", args)) ?? [];
}

// ---------------------------------------------------------------------------
// Course content (curriculum = subject → chapters → my lessons/tests)
// ---------------------------------------------------------------------------
export async function fetchCurriculum(subjectId: string, teacherId: string): Promise<CourseCurriculum | null> {
  const subject = unwrap<CourseCurriculum["subject"] | null>(
    await supabase.from("subjects").select("id, name, class_level, description").eq("id", subjectId).maybeSingle(),
  );
  if (!subject) return null;

  const chapters = unwrap<{ id: string; title: string; sort_order: number }[]>(
    await supabase.from("chapters").select("id, title, sort_order").eq("subject_id", subjectId).order("sort_order"),
  ) ?? [];
  const chapterIds = chapters.map((c) => c.id);

  const [lessonsRes, testsRes] = await Promise.all([
    chapterIds.length
      ? supabase
          .from("lessons")
          .select("id, title, status, sort_order, duration_minutes, video_url, content_format, updated_at, author_id, chapter_id")
          .in("chapter_id", chapterIds)
          .eq("author_id", teacherId)
          .order("sort_order")
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("tests")
      .select("id, title, status, chapter_id, test_type, duration_minutes")
      .eq("subject_id", subjectId)
      .eq("author_id", teacherId)
      .order("created_at"),
  ]);
  const lessons = unwrap<(CurriculumLesson & { chapter_id: string })[]>(lessonsRes) ?? [];
  const tests = unwrap<CurriculumTest[]>(testsRes) ?? [];

  const byChapter: CurriculumChapter[] = chapters.map((c) => ({
    ...c,
    lessons: lessons.filter((l) => l.chapter_id === c.id),
    tests: tests.filter((t) => t.chapter_id === c.id),
  }));
  return { subject, chapters: byChapter, subjectTests: tests.filter((t) => !t.chapter_id) };
}

export async function reorderLessons(lessonIds: string[]): Promise<void> {
  unwrap(await supabase.rpc("reorder_teacher_lessons", { _lesson_ids: lessonIds }));
}

export async function setContentStatus(kind: "lesson" | "test", id: string, status: "draft" | "published"): Promise<void> {
  const table = kind === "lesson" ? "lessons" : "tests";
  unwrap(await supabase.from(table).update({ status }).eq("id", id));
}

export async function deleteContent(kind: "lesson" | "test", id: string): Promise<void> {
  const table = kind === "lesson" ? "lessons" : "tests";
  unwrap(await supabase.from(table).delete().eq("id", id));
}

export async function fetchSubjectsForClass(classLevel: number) {
  return unwrap<{ id: string; name: string; class_level: number; description: string | null }[]>(
    await supabase.from("subjects").select("id, name, class_level, description").eq("class_level", classLevel).order("sort_order"),
  ) ?? [];
}

export async function fetchChapters(subjectId: string) {
  return unwrap<{ id: string; title: string; sort_order: number }[]>(
    await supabase.from("chapters").select("id, title, sort_order").eq("subject_id", subjectId).order("sort_order"),
  ) ?? [];
}

export interface ContentIndexItem {
  id: string;
  title: string;
  kind: "lesson";
  status: string;
  subject_id: string | null;
}

/** My lessons, for global search. */
export async function fetchMyLessonIndex(teacherId: string): Promise<ContentIndexItem[]> {
  const rows = unwrap<{ id: string; title: string; status: string; chapter: { subject_id: string } | null }[]>(
    await supabase.from("lessons").select("id, title, status, chapter:chapters(subject_id)").eq("author_id", teacherId).limit(500),
  ) ?? [];
  return rows.map((r) => ({ id: r.id, title: r.title, kind: "lesson", status: r.status, subject_id: r.chapter?.subject_id ?? null }));
}

// ---------------------------------------------------------------------------
// Classes (mentorship_sessions) and attendance
// ---------------------------------------------------------------------------
export async function fetchSessions(teacherId: string): Promise<TeacherSession[]> {
  return unwrap<TeacherSession[]>(
    await supabase
      .from("mentorship_sessions")
      .select("id, title, description, session_type, scheduled_at, duration_minutes, status, max_participants, participants:session_participants(status)")
      .eq("mentor_id", teacherId)
      .order("scheduled_at", { ascending: true })
      .limit(500),
  ) ?? [];
}

export interface NewSession {
  title: string;
  description: string;
  session_type: "one-on-one" | "group";
  scheduled_at: string; // ISO
  duration_minutes: number;
  max_participants: number;
  meeting_link: string;
}

export async function createSession(teacherId: string, input: NewSession): Promise<void> {
  unwrap(
    await supabase.from("mentorship_sessions").insert({
      mentor_id: teacherId,
      title: input.title.trim(),
      description: input.description.trim() || null,
      session_type: input.session_type,
      scheduled_at: input.scheduled_at,
      duration_minutes: input.duration_minutes,
      max_participants: input.session_type === "one-on-one" ? 1 : Math.max(1, input.max_participants),
      meeting_link: input.meeting_link.trim() || null,
      status: "scheduled",
    }),
  );
}

export async function updateSessionStatus(sessionId: string, status: "scheduled" | "completed" | "cancelled"): Promise<void> {
  unwrap(await supabase.from("mentorship_sessions").update({ status }).eq("id", sessionId));
}

export async function fetchRoster(sessionId: string): Promise<RosterEntry[]> {
  const rows = unwrap<{ id: string; student_id: string | null; status: string }[]>(
    await supabase.from("session_participants").select("id, student_id, status").eq("session_id", sessionId),
  ) ?? [];
  const ids = rows.map((r) => r.student_id).filter((id): id is string => !!id);
  const names = ids.length
    ? unwrap<{ id: string | null; full_name: string | null }[]>(
        await supabase.from("public_profiles").select("id, full_name").in("id", ids),
      ) ?? []
    : [];
  const nameOf = new Map(names.map((n) => [n.id, n.full_name]));
  return rows
    .filter((r) => r.student_id)
    .map((r) => ({ id: r.id, student_id: r.student_id!, student_name: nameOf.get(r.student_id!) ?? "Student", status: r.status }))
    .sort((a, b) => a.student_name.localeCompare(b.student_name));
}

export async function setAttendance(sessionId: string, studentId: string, status: "attended" | "absent"): Promise<void> {
  unwrap(await supabase.rpc("set_participant_attendance", { _session_id: sessionId, _student_id: studentId, _status: status }));
}

/** Meeting links are never listed in bulk; fetched only on "Enter class". */
export async function fetchMeetingLink(sessionId: string): Promise<string | null> {
  return unwrap<string | null>(await supabase.rpc("get_session_meeting_link", { _session_id: sessionId }));
}

export async function fetchSessionFeedback(teacherId: string): Promise<SessionFeedbackRow[]> {
  const rows = unwrap<{ id: string; rating: number | null; feedback_text: string | null; is_anonymous: boolean | null; created_at: string; session: { title: string } | null }[]>(
    await supabase
      .from("mentorship_feedback")
      .select("id, rating, feedback_text, is_anonymous, created_at, session:mentorship_sessions(title)")
      .eq("mentor_id", teacherId)
      .order("created_at", { ascending: false })
      .limit(200),
  ) ?? [];
  return rows.map(({ session, ...r }) => ({ ...r, session_title: session?.title ?? null }));
}

// ---------------------------------------------------------------------------
// Messages (student questions escalated to a teacher)
// ---------------------------------------------------------------------------
export async function fetchEscalatedDoubts(): Promise<EscalatedDoubt[]> {
  return unwrap<EscalatedDoubt[]>(await supabase.rpc("get_escalated_doubts", { _limit: 100 })) ?? [];
}

export async function fetchAnsweredDoubts(teacherId: string): Promise<AnsweredDoubt[]> {
  return unwrap<AnsweredDoubt[]>(
    await supabase
      .from("doubts")
      .select("id, question, subject, ai_answer, escalation_note, escalated_at, mentor_answer, mentor_answered_at")
      .eq("mentor_id", teacherId)
      .order("mentor_answered_at", { ascending: false })
      .limit(100),
  ) ?? [];
}

export async function answerDoubt(doubtId: string, answer: string): Promise<void> {
  unwrap(await supabase.rpc("answer_escalated_doubt", { _doubt_id: doubtId, _answer: answer }));
}

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------
export async function fetchAnnouncements(): Promise<Announcement[]> {
  return unwrap<Announcement[]>(
    await supabase
      .from("announcements")
      .select("id, title, body, audience, subject_id, session_id, student_ids, status, publish_at, created_at")
      .order("publish_at", { ascending: false })
      .limit(200),
  ) ?? [];
}

export interface AnnouncementInput {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  subject_id: string | null;
  session_id: string | null;
  student_ids: string[];
  status: "draft" | "published";
  publish_at: string;
}

export async function saveAnnouncement(input: AnnouncementInput, id?: string): Promise<void> {
  const payload = {
    ...input,
    title: input.title.trim(),
    body: input.body.trim(),
    subject_id: input.audience === "subject" ? input.subject_id : null,
    session_id: input.audience === "session" ? input.session_id : null,
    student_ids: input.audience === "students" ? input.student_ids : [],
  };
  unwrap(id ? await supabase.from("announcements").update(payload).eq("id", id) : await supabase.from("announcements").insert(payload));
}

export async function deleteAnnouncement(id: string): Promise<void> {
  unwrap(await supabase.from("announcements").delete().eq("id", id));
}

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------
export async function fetchResources(): Promise<Resource[]> {
  return unwrap<Resource[]>(
    await supabase
      .from("teacher_resources")
      .select("id, title, kind, folder, tags, subject_id, external_url, storage_path, mime_type, size_bytes, created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
  ) ?? [];
}

export interface ResourceInput {
  title: string;
  kind: ResourceKind;
  folder: string;
  tags: string[];
  subject_id: string | null;
}

export async function addLinkResource(input: ResourceInput, url: string): Promise<void> {
  unwrap(await supabase.from("teacher_resources").insert({ ...input, external_url: url.trim() }));
}

export async function uploadResource(teacherId: string, input: ResourceInput, file: File): Promise<void> {
  if (file.size > MAX_RESOURCE_BYTES) throw new Error("Files can be at most 50 MB.");
  const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(-120);
  const path = `${teacherId}/${crypto.randomUUID()}-${safeName}`;
  const upload = await supabase.storage.from(RESOURCE_BUCKET).upload(path, file, { contentType: file.type || undefined });
  if (upload.error) throw new Error(upload.error.message);
  const insert = await supabase.from("teacher_resources").insert({
    ...input,
    storage_path: path,
    mime_type: file.type || null,
    size_bytes: file.size,
  });
  if (insert.error) {
    // don't leave an orphaned file behind
    await supabase.storage.from(RESOURCE_BUCKET).remove([path]);
    throw new Error(insert.error.message);
  }
}

export async function updateResource(id: string, patch: Partial<ResourceInput>): Promise<void> {
  unwrap(await supabase.from("teacher_resources").update(patch).eq("id", id));
}

export async function deleteResource(resource: Pick<Resource, "id" | "storage_path">): Promise<void> {
  unwrap(await supabase.from("teacher_resources").delete().eq("id", resource.id));
  if (resource.storage_path) await supabase.storage.from(RESOURCE_BUCKET).remove([resource.storage_path]);
}

/** Short-lived link for preview/download of a private file. */
export async function resourceUrl(resource: Pick<Resource, "external_url" | "storage_path">, download = false): Promise<string> {
  if (resource.external_url) return resource.external_url;
  const { data, error } = await supabase.storage
    .from(RESOURCE_BUCKET)
    .createSignedUrl(resource.storage_path!, 60 * 10, download ? { download: true } : undefined);
  if (error || !data) throw new Error(error?.message ?? "Could not open this file");
  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// Private notes about a student
// ---------------------------------------------------------------------------
export async function fetchNotes(studentId: string): Promise<StudentNote[]> {
  return unwrap<StudentNote[]>(
    await supabase
      .from("teacher_student_notes")
      .select("id, body, created_at, updated_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false }),
  ) ?? [];
}

export async function addNote(studentId: string, body: string): Promise<void> {
  unwrap(await supabase.from("teacher_student_notes").insert({ student_id: studentId, body: body.trim() }));
}

export async function deleteNote(id: string): Promise<void> {
  unwrap(await supabase.from("teacher_student_notes").delete().eq("id", id));
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------
export async function fetchTeacherProfile(teacherId: string): Promise<TeacherProfile> {
  const [profile, mentor] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", teacherId).maybeSingle(),
    supabase.from("mentors").select("bio, expertise, qualification, experience_years").eq("id", teacherId).maybeSingle(),
  ]);
  const p = unwrap<{ full_name: string | null; email: string } | null>(profile);
  const m = unwrap<{ bio: string | null; expertise: string[] | null; qualification: string | null; experience_years: number | null } | null>(mentor);
  return {
    full_name: p?.full_name ?? "",
    email: p?.email ?? "",
    bio: m?.bio ?? "",
    expertise: m?.expertise ?? [],
    qualification: m?.qualification ?? "",
    experience_years: m?.experience_years ?? null,
    has_mentor_row: !!m,
  };
}

export async function saveTeacherProfile(teacherId: string, input: Omit<TeacherProfile, "email" | "has_mentor_row">, hasMentorRow: boolean): Promise<void> {
  unwrap(await supabase.from("profiles").update({ full_name: input.full_name.trim() }).eq("id", teacherId));
  if (hasMentorRow) {
    unwrap(
      await supabase
        .from("mentors")
        .update({
          full_name: input.full_name.trim(),
          bio: input.bio.trim() || null,
          expertise: input.expertise,
          qualification: input.qualification.trim() || null,
          experience_years: input.experience_years,
        })
        .eq("id", teacherId),
    );
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
  if (error) throw new Error(error.message);
}

export async function signOutEverywhere(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Blog posts (existing blog_posts table; editor lives at /blog/create, /blog/edit/:id)
// ---------------------------------------------------------------------------
export interface BlogPostRow {
  id: string;
  title: string;
  subject: string;
  class_level: string;
  status: string;
  created_at: string;
  slug: string;
}

export async function fetchBlogPosts(teacherId: string): Promise<BlogPostRow[]> {
  return unwrap<BlogPostRow[]>(
    await supabase
      .from("blog_posts")
      .select("id, title, subject, class_level, status, created_at, slug")
      .eq("author_id", teacherId)
      .order("created_at", { ascending: false }),
  ) ?? [];
}

export async function deleteBlogPost(id: string): Promise<void> {
  unwrap(await supabase.from("blog_posts").delete().eq("id", id));
}
