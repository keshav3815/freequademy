import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCourses, useTrend } from "@/hooks/useTeacher";
import { LineChart } from "@/components/teacher/portal/charts";
import { ErrorState, Panel } from "@/components/teacher/portal/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { WEEK_OPTIONS } from "./shared";
import { TREND_METRICS, trendPoints, type TrendMetric } from "./trend";

const selectTrigger = "h-8 w-auto min-w-[128px] gap-2 rounded-md border-input bg-card text-[13px]";

/** Weekly trend with course / metric / period filters, in one row above the chart. */
export default function PerformanceTrend({
  title = "Student performance",
  initialMetric = "avg_score",
  metrics = TREND_METRICS.map((m) => m.value),
  height = 240,
  fixedCourse,
}: {
  /** lock the chart to one course (hides the course filter) */
  fixedCourse?: string;
  title?: string;
  initialMetric?: TrendMetric;
  metrics?: TrendMetric[];
  height?: number;
}) {
  const [metric, setMetric] = useState<TrendMetric>(initialMetric);
  const [weeks, setWeeks] = useState("12");
  const [course, setCourse] = useState(fixedCourse ?? "all");
  const courses = useCourses();
  const trend = useTrend(Number(weeks), course === "all" ? null : course);
  const meta = TREND_METRICS.find((m) => m.value === metric)!;
  const fmt = (v: number) => (meta.percent ? `${v}%` : v.toLocaleString());

  return (
    <Panel
      title={title}
      description={meta.description}
      bodyClassName="pt-4"
      action={
        <div className="flex flex-wrap gap-2">
          {metrics.length > 1 && (
            <Select value={metric} onValueChange={(v) => setMetric(v as TrendMetric)}>
              <SelectTrigger className={selectTrigger} aria-label="Metric">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TREND_METRICS.filter((m) => metrics.includes(m.value)).map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {metric !== "attendance_pct" && !fixedCourse && (
            <Select value={course} onValueChange={setCourse}>
              <SelectTrigger className={selectTrigger} aria-label="Course">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses</SelectItem>
                {(courses.data ?? []).map((c) => (
                  <SelectItem key={c.subject_id} value={c.subject_id}>
                    {c.subject_name} · Class {c.class_level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={weeks} onValueChange={setWeeks}>
            <SelectTrigger className={selectTrigger} aria-label="Time period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEK_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {trend.isLoading ? (
        <Skeleton className="w-full rounded-md" style={{ height }} />
      ) : trend.isError || !trend.data ? (
        <ErrorState compact message="We couldn't load the trend." onRetry={() => trend.refetch()} />
      ) : (
        <LineChart
          data={trendPoints(trend.data, metric)}
          title={`${meta.label} by week`}
          valueLabel={meta.label}
          format={fmt}
          yMax={meta.percent ? 100 : undefined}
          height={height}
          empty={
            <span>
              No {meta.label.toLowerCase()} data in this period yet.
              <br />
              It fills in as students work through your lessons and assignments.
            </span>
          }
        />
      )}
    </Panel>
  );
}
