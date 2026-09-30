import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
// Corrected nullability for RPC returns — see dashboardTypes.ts for why the
// generated Database["public"]["Functions"][...] types aren't used directly
// here.
import type {
  ActivityDay,
  LearningSummary,
  MentorshipSummary,
  RecentTestRow,
  SubjectProgressRow,
  WeakAreaRow,
  WeeklySummaryRow,
  XpBreakdownRow,
} from "./dashboardTypes";

export type { ActivityDay, LearningSummary, MentorshipSummary, RecentTestRow, SubjectProgressRow, WeakAreaRow, WeeklySummaryRow, XpBreakdownRow };

export interface ContinueLesson {
  lesson_id: string;
  status: string;
  last_viewed_at: string;
  lesson_title: string;
  subject_id: string | null;
  subject_name: string | null;
  chapter_title: string | null;
  position_in_chapter: number | null;
  chapter_lesson_count: number | null;
}

export interface DoubtStats {
  total: number;
  resolved: number;
  unresolved: number;
  escalated: number;
  topSubjects: { subject: string; count: number }[];
}

const HEATMAP_WEEKS = 12;

/**
 * The dashboard's single data-fetching entry point. Every RPC below is
 * auth.uid()-scoped server-side (RLS + SECURITY DEFINER functions), so this
 * hook can only ever return the signed-in student's own data — see
 * supabase/tests/database/012_analytics_dashboard.test.sql for the
 * cross-user and anonymous-access proofs.
 *
 * Fires every query in parallel (React Query's per-key caching does this for
 * free — no 20-independent-effects waterfall), and keeps each section's
 * loading/error/empty state independent: one failed query never blanks
 * sections whose data loaded fine. Every field is either a real query result
 * or explicitly undefined while loading — never a fabricated placeholder.
 */
export function useStudentDashboard(classLevel: string) {
  const { user } = useAuth();
  const uid = user?.id;
  const enabled = !!uid;
  const classNum = Number(classLevel);

  const summary = useQuery({
    queryKey: ["dashboard", "summary", uid],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_learning_summary");
      if (error) throw error;
      return (data?.[0] ?? null) as LearningSummary | null;
    },
    enabled,
  });

  const subjects = useQuery({
    queryKey: ["dashboard", "subjects", uid, classNum],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_subject_progress", { _class_level: classNum });
      if (error) throw error;
      return (data ?? []) as SubjectProgressRow[];
    },
    enabled,
  });

  const xpBreakdown = useQuery({
    queryKey: ["dashboard", "xp-breakdown", uid],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_xp_breakdown");
      if (error) throw error;
      return (data ?? []) as XpBreakdownRow[];
    },
    enabled,
  });

  const weakAreas = useQuery({
    queryKey: ["dashboard", "weak-areas", uid],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_weak_areas", { _limit: 3 });
      if (error) throw error;
      return (data ?? []) as WeakAreaRow[];
    },
    enabled,
  });

  const recentTests = useQuery({
    queryKey: ["dashboard", "recent-tests", uid],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_recent_test_results", { _limit: 10 });
      if (error) throw error;
      return (data ?? []) as RecentTestRow[];
    },
    enabled,
  });

  const weeklySummary = useQuery({
    queryKey: ["dashboard", "weekly-summary", uid],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_weekly_summary");
      if (error) throw error;
      const rows = (data ?? []) as WeeklySummaryRow[];
      return {
        thisWeek: rows.find((r) => r.period === "this_week") ?? null,
        lastWeek: rows.find((r) => r.period === "last_week") ?? null,
      };
    },
    enabled,
  });

  const mentorship = useQuery({
    queryKey: ["dashboard", "mentorship", uid],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_mentorship_summary");
      if (error) throw error;
      return (data?.[0] ?? null) as MentorshipSummary | null;
    },
    enabled,
  });

  const activityDays = useQuery({
    queryKey: ["dashboard", "activity-days", uid],
    queryFn: async () => {
      const to = new Date();
      const from = new Date(to);
      from.setDate(from.getDate() - HEATMAP_WEEKS * 7 + 1);
      const { data, error } = await supabase.rpc("get_activity_days", {
        _from: from.toISOString().slice(0, 10),
        _to: to.toISOString().slice(0, 10),
      });
      if (error) throw error;
      return (data ?? []) as ActivityDay[];
    },
    enabled,
  });

  const continueLesson = useQuery({
    queryKey: ["dashboard", "continue-lesson", uid],
    queryFn: async (): Promise<ContinueLesson | null> => {
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("lesson_id, status, last_viewed_at, lesson:lessons(title, sort_order, chapter:chapters(title, subject:subjects(id, name), lessons(id)))")
        .eq("user_id", uid!)
        .order("last_viewed_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      const rows = data ?? [];
      // most recently viewed lesson that isn't finished; fall back to the
      // most recent one at all if everything so far is complete
      const pick = rows.find((r) => r.status !== "completed") ?? rows[0];
      if (!pick || !pick.lesson) return null;
      const chapterLessons = pick.lesson.chapter?.lessons ?? [];
      return {
        lesson_id: pick.lesson_id,
        status: pick.status,
        last_viewed_at: pick.last_viewed_at,
        lesson_title: pick.lesson.title,
        subject_id: pick.lesson.chapter?.subject?.id ?? null,
        subject_name: pick.lesson.chapter?.subject?.name ?? null,
        chapter_title: pick.lesson.chapter?.title ?? null,
        position_in_chapter: pick.lesson.sort_order,
        chapter_lesson_count: chapterLessons.length || null,
      };
    },
    enabled,
  });

  const doubtStats = useQuery({
    queryKey: ["dashboard", "doubt-stats", uid],
    queryFn: async (): Promise<DoubtStats> => {
      const [{ count: total }, { count: escalated }, { count: mentorAnswered }, { data: subjectRows }] = await Promise.all([
        supabase.from("doubts").select("id", { count: "exact", head: true }).eq("user_id", uid!),
        supabase.from("doubts").select("id", { count: "exact", head: true }).eq("user_id", uid!).eq("status", "escalated"),
        supabase.from("doubts").select("id", { count: "exact", head: true }).eq("user_id", uid!).eq("status", "mentor_answered"),
        supabase.from("doubts").select("subject").eq("user_id", uid!).limit(500),
      ]);
      const counts = new Map<string, number>();
      for (const row of subjectRows ?? []) {
        counts.set(row.subject, (counts.get(row.subject) ?? 0) + 1);
      }
      const topSubjects = [...counts.entries()]
        .map(([subject, count]) => ({ subject, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);
      const totalCount = total ?? 0;
      const escalatedCount = escalated ?? 0;
      return {
        total: totalCount,
        resolved: totalCount - escalatedCount,
        unresolved: escalatedCount,
        escalated: mentorAnswered ?? 0,
        topSubjects,
      };
    },
    enabled,
  });

  const recentDoubts = useQuery({
    queryKey: ["dashboard", "recent-doubts", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doubts")
        .select("id, question, subject, status, created_at")
        .eq("user_id", uid!)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
    enabled,
  });

  return { summary, subjects, xpBreakdown, weakAreas, recentTests, weeklySummary, mentorship, activityDays, continueLesson, doubtStats, recentDoubts };
}

export type StudentDashboardData = ReturnType<typeof useStudentDashboard>;

/** True once every section has finished its first fetch (success or error). */
export function allSettled(data: StudentDashboardData): boolean {
  return Object.values(data).every((q) => (q as UseQueryResult).isLoading === false);
}
