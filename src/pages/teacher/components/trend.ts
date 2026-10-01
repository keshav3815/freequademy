import { format } from "date-fns";
import type { TrendWeek } from "@/lib/teacher/types";

export type TrendMetric = "avg_score" | "submissions" | "lessons_completed" | "active_students" | "attendance_pct";

export const TREND_METRICS: { value: TrendMetric; label: string; percent: boolean; description: string }[] = [
  { value: "avg_score", label: "Average score", percent: true, description: "Mean score of submissions on your assignments" },
  { value: "lessons_completed", label: "Lessons completed", percent: false, description: "Lesson completions on your content" },
  { value: "submissions", label: "Submissions", percent: false, description: "Assignment submissions" },
  { value: "active_students", label: "Active students", percent: false, description: "Students who completed a lesson or submitted work" },
  { value: "attendance_pct", label: "Attendance", percent: true, description: "Attended ÷ marked, across your classes" },
];

export function trendPoints(rows: TrendWeek[], metric: TrendMetric) {
  return rows.map((r) => ({
    label: format(new Date(`${r.week_start}T00:00:00`), "MMM d"),
    value: r[metric] as number | null,
    detail: metric === "avg_score" ? `${r.submissions} submission${r.submissions === 1 ? "" : "s"}` : undefined,
  }));
}
