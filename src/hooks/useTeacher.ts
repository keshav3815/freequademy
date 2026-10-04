import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import * as api from "@/lib/teacher/api";

/**
 * React Query hooks for the teacher portal. Query keys are all under
 * ["teacher", uid, …] so a sign-out/sign-in never shows another teacher's
 * cached data, and pages that share a query (e.g. the roster on Students,
 * Needs Attention and global search) share one request.
 */
function useUid() {
  const { user } = useAuth();
  return user?.id;
}

const key = (uid: string | undefined, ...parts: unknown[]): QueryKey => ["teacher", uid, ...parts];

export function useOverview() {
  const uid = useUid();
  return useQuery({ queryKey: key(uid, "overview"), queryFn: api.fetchOverview, enabled: !!uid });
}

export function useCourses() {
  const uid = useUid();
  return useQuery({ queryKey: key(uid, "courses"), queryFn: api.fetchCourses, enabled: !!uid });
}

export function useStudents() {
  const uid = useUid();
  return useQuery({ queryKey: key(uid, "students"), queryFn: api.fetchStudents, enabled: !!uid });
}

export function useStudent(studentId: string | undefined) {
  const uid = useUid();
  return useQuery({
    queryKey: key(uid, "student", studentId),
    queryFn: () => api.fetchStudent(studentId!),
    enabled: !!uid && !!studentId,
  });
}

export function useStudentCourses(studentId: string | undefined) {
  const uid = useUid();
  return useQuery({ queryKey: key(uid, "student", studentId, "courses"), queryFn: () => api.fetchStudentCourses(studentId!), enabled: !!uid && !!studentId });
}

export function useStudentAttempts(studentId: string | undefined) {
  const uid = useUid();
  return useQuery({ queryKey: key(uid, "student", studentId, "attempts"), queryFn: () => api.fetchStudentAttempts(studentId!), enabled: !!uid && !!studentId });
}

export function useStudentSessions(studentId: string | undefined) {
  const uid = useUid();
  return useQuery({ queryKey: key(uid, "student", studentId, "sessions"), queryFn: () => api.fetchStudentSessions(studentId!), enabled: !!uid && !!studentId });
}

export function useAssignments() {
  const uid = useUid();
  return useQuery({ queryKey: key(uid, "assignments"), queryFn: api.fetchAssignments, enabled: !!uid });
}

export function useSubmissions(testId: string | undefined) {
  const uid = useUid();
  return useQuery({ queryKey: key(uid, "submissions", testId), queryFn: () => api.fetchSubmissions(testId!), enabled: !!uid && !!testId });
}

export function useAttemptAnswers(attemptId: string | undefined) {
  const uid = useUid();
  return useQuery({ queryKey: key(uid, "answers", attemptId), queryFn: () => api.fetchAttemptAnswers(attemptId!), enabled: !!uid && !!attemptId });
}

export function useActivity(limit = 20) {
  const uid = useUid();
  return useQuery({ queryKey: key(uid, "activity", limit), queryFn: () => api.fetchActivity(limit), enabled: !!uid, refetchInterval: 120_000 });
}

export function useTrend(weeks: number, subjectId: string | null) {
  const uid = useUid();
  return useQuery({ queryKey: key(uid, "trend", weeks, subjectId), queryFn: () => api.fetchTrend(weeks, subjectId), enabled: !!uid });
}

export function useCurriculum(subjectId: string | undefined) {
  const uid = useUid();
  return useQuery({ queryKey: key(uid, "curriculum", subjectId), queryFn: () => api.fetchCurriculum(subjectId!, uid!), enabled: !!uid && !!subjectId });
}

export function useLessonIndex() {
  const uid = useUid();
  return useQuery({ queryKey: key(uid, "lesson-index"), queryFn: () => api.fetchMyLessonIndex(uid!), enabled: !!uid, staleTime: 120_000 });
}

export function useSessions() {
  const uid = useUid();
  return useQuery({ queryKey: key(uid, "sessions"), queryFn: () => api.fetchSessions(uid!), enabled: !!uid, refetchInterval: 60_000 });
}

export function useRoster(sessionId: string | undefined) {
  const uid = useUid();
  return useQuery({ queryKey: key(uid, "roster", sessionId), queryFn: () => api.fetchRoster(sessionId!), enabled: !!uid && !!sessionId });
}

export function useSessionFeedback() {
  const uid = useUid();
  return useQuery({ queryKey: key(uid, "feedback"), queryFn: () => api.fetchSessionFeedback(uid!), enabled: !!uid });
}

export function useEscalatedDoubts() {
  const uid = useUid();
  return useQuery({ queryKey: key(uid, "doubts", "open"), queryFn: api.fetchEscalatedDoubts, enabled: !!uid, refetchInterval: 120_000 });
}

export function useAnsweredDoubts() {
  const uid = useUid();
  return useQuery({ queryKey: key(uid, "doubts", "answered"), queryFn: () => api.fetchAnsweredDoubts(uid!), enabled: !!uid });
}

export function useAnnouncements() {
  const uid = useUid();
  return useQuery({ queryKey: key(uid, "announcements"), queryFn: api.fetchAnnouncements, enabled: !!uid });
}

export function useResources() {
  const uid = useUid();
  return useQuery({ queryKey: key(uid, "resources"), queryFn: api.fetchResources, enabled: !!uid });
}

export function useNotes(studentId: string | undefined) {
  const uid = useUid();
  return useQuery({ queryKey: key(uid, "notes", studentId), queryFn: () => api.fetchNotes(studentId!), enabled: !!uid && !!studentId });
}

export function useTeacherProfile() {
  const uid = useUid();
  return useQuery({ queryKey: key(uid, "profile"), queryFn: () => api.fetchTeacherProfile(uid!), enabled: !!uid });
}

/**
 * A mutation that invalidates the given teacher query groups on success,
 * e.g. useTeacherMutation(api.reviewAttempt, ["submissions", "assignments", "overview"]).
 */
export function useTeacherMutation<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  invalidate: string[],
) {
  const uid = useUid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => fn(...args),
    onSuccess: () => Promise.all(invalidate.map((group) => qc.invalidateQueries({ queryKey: key(uid, group) }))),
  });
}

export { api as teacherApi };

export function useBlogPosts() {
  const uid = useUid();
  return useQuery({ queryKey: key(uid, "blog"), queryFn: () => api.fetchBlogPosts(uid!), enabled: !!uid });
}
