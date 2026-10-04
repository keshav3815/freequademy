import type { DoubtStats } from "@/hooks/useStudentDashboard";
import type { SubjectProgressRow as SubjectRow, WeakAreaRow as WeakArea } from "@/hooks/dashboardTypes";
import { WEAK_AREA_THRESHOLD } from "./testGrading";

export interface Recommendation {
  id: string;
  title: string;
  detail: string;
  href: string;
  cta: string;
}

/**
 * Deterministic recommendations from data already fetched for the rest of
 * the dashboard — no LLM call, no invented advice. Each recommendation
 * traces to one real signal:
 *   1. the single weakest area, if it's below the weak-area threshold
 *   2. a subject with published tests the student has never attempted
 *   3. unresolved (escalated) doubts waiting on a mentor
 * (Continuing an in-progress lesson has its own dedicated "Continue
 * Learning" card — ContinueLearningWidget.tsx — so it isn't duplicated
 * here.) Returns at most 4, in this priority order, skipping any signal
 * that has no real data behind it.
 */
export function buildRecommendations(input: {
  weakAreas: WeakArea[] | undefined;
  subjects: SubjectRow[] | undefined;
  doubtStats: DoubtStats | undefined;
}): Recommendation[] {
  const recs: Recommendation[] = [];
  const { weakAreas, subjects, doubtStats } = input;

  const weakest = weakAreas?.[0];
  if (weakest && Number(weakest.average_score) < WEAK_AREA_THRESHOLD) {
    recs.push({
      id: "weak-area",
      title: `Review ${weakest.chapter_title ?? weakest.subject_name}`,
      detail: `Your recent average here is ${weakest.average_score}%.`,
      href: `/courses/${weakest.subject_id}`,
      cta: "Revise",
    });
  }

  const untested = subjects?.find((s) => s.test_count > 0 && s.average_score === null);
  if (untested) {
    recs.push({
      id: "untested-subject",
      title: `Take a ${untested.subject_name} practice test`,
      detail: `You haven't attempted a test in this subject yet.`,
      href: `/courses/${untested.subject_id}`,
      cta: "Find a test",
    });
  }

  if (doubtStats && doubtStats.unresolved > 0) {
    recs.push({
      id: "unresolved-doubts",
      title: `Ask your mentor about your open doubt${doubtStats.unresolved > 1 ? "s" : ""}`,
      detail: `You have ${doubtStats.unresolved} doubt${doubtStats.unresolved > 1 ? "s" : ""} waiting for a mentor's answer.`,
      href: "/doubts",
      cta: "View doubts",
    });
  }

  return recs.slice(0, 4);
}
