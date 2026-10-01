import { useQuery } from "@tanstack/react-query";
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

export interface RecentDoubt {
  id: string;
  question: string;
  subject: string;
  status: string;
  created_at: string;
}

const HEATMAP_WEEKS = 12;

/** One dashboard section as DashboardSection consumes it. */
export interface SectionQuery<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

type SectionPayload = { data?: unknown; error?: string };
type DashboardPayload = Record<string, SectionPayload | undefined>;

/**
 * The dashboard's single data-fetching entry point: one call to the
 * get_student_dashboard() read model (Architecture V1 Phase 2) instead of ~14
 * separate RPCs and table queries. The function runs with the caller's
 * rights and every section is auth.uid()-scoped server-side, so this hook can
 * only ever return the signed-in student's own data — see
 * supabase/tests/database/017_student_dashboard_read_model.test.sql.
 *
 * Sections fail independently: the server returns {"error": SQLSTATE} for a
 * section that failed, and only that section shows its retry prompt. Every
 * field is either a real result or undefined while loading — never a
 * fabricated placeholder.
 */
export function useStudentDashboard(classLevel: string) {
  const { user } = useAuth();
  const uid = user?.id;
  const classNum = Number(classLevel);

  const query = useQuery({
    queryKey: ["dashboard", "student", uid, classNum],
    queryFn: async (): Promise<DashboardPayload> => {
      const to = new Date();
      const from = new Date(to);
      from.setDate(from.getDate() - HEATMAP_WEEKS * 7 + 1);
      const { data, error } = await supabase.rpc("get_student_dashboard", {
        _class_level: classNum,
        _from: from.toISOString().slice(0, 10),
        _to: to.toISOString().slice(0, 10),
      });
      if (error) throw error;
      return (data ?? {}) as DashboardPayload;
    },
    enabled: !!uid,
  });

  function section<T>(key: string, map: (raw: unknown) => T): SectionQuery<T> {
    const payload = query.data?.[key];
    const failed = query.isError || (!!query.data && (!payload || payload.error !== undefined));
    return {
      data: payload && payload.error === undefined ? map(payload.data) : undefined,
      isLoading: query.isLoading,
      isError: failed,
      refetch: () => void query.refetch(),
    };
  }

  const list = <T,>(raw: unknown) => (raw ?? []) as T[];
  const one = <T,>(raw: unknown) => (raw ?? null) as T | null;

  return {
    summary: section("summary", one<LearningSummary>),
    subjects: section("subjects", list<SubjectProgressRow>),
    xpBreakdown: section("xp_breakdown", list<XpBreakdownRow>),
    weakAreas: section("weak_areas", list<WeakAreaRow>),
    recentTests: section("recent_tests", list<RecentTestRow>),
    weeklySummary: section("weekly_summary", (raw) => {
      const rows = list<WeeklySummaryRow>(raw);
      return {
        thisWeek: rows.find((r) => r.period === "this_week") ?? null,
        lastWeek: rows.find((r) => r.period === "last_week") ?? null,
      };
    }),
    mentorship: section("mentorship", one<MentorshipSummary>),
    activityDays: section("activity_days", list<ActivityDay>),
    continueLesson: section("continue_lesson", one<ContinueLesson>),
    doubtStats: section("doubt_stats", (raw) => raw as DoubtStats),
    recentDoubts: section("recent_doubts", list<RecentDoubt>),
  };
}

export type StudentDashboardData = ReturnType<typeof useStudentDashboard>;

/** True once every section has finished its first fetch (success or error). */
export function allSettled(data: StudentDashboardData): boolean {
  return Object.values(data).every((q) => q.isLoading === false);
}
