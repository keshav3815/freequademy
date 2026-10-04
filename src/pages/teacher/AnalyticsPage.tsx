import { useMemo, useState } from "react";
import { Activity, ClipboardCheck, GraduationCap, Target, UserCheck, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAssignments, useCourses, useOverview, useStudents, useTrend } from "@/hooks/useTeacher";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { pct } from "@/lib/teacher/format";
import { BarList, ColumnChart, LineChart } from "@/components/teacher/portal/charts";
import { ErrorState, PageHeader, Panel, Segmented, StatCard } from "@/components/teacher/portal/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { TREND_METRICS, trendPoints, type TrendMetric } from "./components/trend";
import { WEEK_OPTIONS } from "./components/shared";

const BUCKETS = ["0–9", "10–19", "20–29", "30–39", "40–49", "50–59", "60–69", "70–79", "80–89", "90–100"];

function ChartSkeleton({ h = 240 }: { h?: number }) {
  return <Skeleton className="w-full rounded-md" style={{ height: h }} />;
}

export default function AnalyticsPage() {
  useDocumentMeta({ title: "Analytics" });
  const [weeks, setWeeks] = useState("12");
  const [course, setCourse] = useState("all");
  const [engagement, setEngagement] = useState<TrendMetric>("active_students");
  const courses = useCourses();
  const overview = useOverview();
  const students = useStudents();
  const assignments = useAssignments();
  const trend = useTrend(Number(weeks), course === "all" ? null : course);
  const courseFilter = course === "all" ? null : course;

  const period = useMemo(() => {
    const rows = trend.data ?? [];
    const subs = rows.reduce((s, r) => s + r.submissions, 0);
    const weighted = rows.reduce((s, r) => s + (r.avg_score ?? 0) * r.submissions, 0);
    const att = rows.filter((r) => r.attendance_pct !== null);
    return {
      submissions: subs,
      lessons: rows.reduce((s, r) => s + r.lessons_completed, 0),
      avgScore: subs > 0 ? Math.round((weighted / subs) * 10) / 10 : null,
      attendance: att.length > 0 ? Math.round(att.reduce((s, r) => s + (r.attendance_pct ?? 0), 0) / att.length) : null,
    };
  }, [trend.data]);

  const scopedStudents = useMemo(() => (students.data ?? []).filter((s) => !courseFilter || s.subject_ids.includes(courseFilter)), [students.data, courseFilter]);
  const distribution = useMemo(() => {
    const counts = new Array(10).fill(0) as number[];
    scopedStudents.forEach((s) => {
      if (s.avg_score !== null) counts[Math.min(9, Math.floor(s.avg_score / 10))]++;
    });
    return BUCKETS.map((label, i) => ({ label, value: counts[i] }));
  }, [scopedStudents]);
  const scoredCount = scopedStudents.filter((s) => s.avg_score !== null).length;

  const selectedCourse = courses.data?.find((c) => c.subject_id === courseFilter);
  const engagementMeta = TREND_METRICS.find((m) => m.value === engagement)!;

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Explore how students are progressing through your courses." />

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center">
        <span className="text-[13px] font-medium text-muted-foreground sm:mr-2">Filters</span>
        <Select value={weeks} onValueChange={setWeeks}>
          <SelectTrigger className="h-9 sm:w-40" aria-label="Date range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WEEK_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                Last {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={course} onValueChange={setCourse}>
          <SelectTrigger className="h-9 sm:w-60" aria-label="Course">
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
      </div>

      {trend.isError ? (
        <div className="rounded-lg border border-border bg-card">
          <ErrorState message="We couldn't load analytics." onRetry={() => trend.refetch()} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {trend.isLoading || students.isLoading ? (
            Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[118px] rounded-lg" />)
          ) : (
            <>
              <StatCard icon={Users} label="Students" value={scopedStudents.length} hint={selectedCourse ? selectedCourse.subject_name : "All courses"} />
              <StatCard icon={GraduationCap} label="Average score" value={pct(period.avgScore)} hint="Submissions in period" />
              <StatCard icon={Target} label="Completion" value={pct(selectedCourse ? selectedCourse.completion_pct : (overview.data?.completion_pct ?? null))} hint="Average lesson completion" />
              <StatCard icon={ClipboardCheck} label="Submissions" value={period.submissions} hint="In period" />
              <StatCard icon={Activity} label="Lessons completed" value={period.lessons} hint="In period" />
              <StatCard icon={UserCheck} label="Attendance" value={pct(period.attendance)} hint="Mean of weekly rates" />
            </>
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Performance trend" description="Average score of submissions per week">
          {trend.isLoading ? <ChartSkeleton /> : <LineChart data={trendPoints(trend.data ?? [], "avg_score")} title="Average score by week" valueLabel="Average score" yMax={100} format={(v) => `${v}%`} empty="No submissions in this period." />}
        </Panel>

        <Panel
          title="Engagement"
          description={engagementMeta.description}
          action={
            <Segmented
              label="Engagement metric"
              value={engagement}
              onChange={setEngagement}
              options={[
                { value: "active_students", label: "Active" },
                { value: "lessons_completed", label: "Lessons" },
                { value: "submissions", label: "Submissions" },
              ]}
            />
          }
        >
          {trend.isLoading ? <ChartSkeleton /> : <LineChart data={trendPoints(trend.data ?? [], engagement)} title={`${engagementMeta.label} by week`} valueLabel={engagementMeta.label} empty="No activity in this period." />}
        </Panel>

        <Panel title="Course completion" description="Average share of your published lessons completed, per student">
          {courses.isLoading ? (
            <ChartSkeleton h={200} />
          ) : (
            <BarList
              title="Course completion"
              valueLabel="Completion"
              max={100}
              format={(v) => `${v}%`}
              data={(courses.data ?? []).map((c) => ({ label: `${c.subject_name} · Class ${c.class_level}`, sublabel: `${c.student_count} students`, value: c.completion_pct }))}
              empty="No courses yet."
            />
          )}
        </Panel>

        <Panel title="Assignment performance" description="Average score per assignment (most-submitted first)">
          {assignments.isLoading ? (
            <ChartSkeleton h={200} />
          ) : (
            <BarList
              title="Assignment performance"
              valueLabel="Average score"
              max={100}
              format={(v) => `${v}%`}
              data={(assignments.data ?? [])
                .filter((a) => a.submitted_count > 0 && (!courseFilter || a.subject_id === courseFilter))
                .sort((a, b) => b.submitted_count - a.submitted_count)
                .slice(0, 10)
                .map((a) => ({ label: a.title, sublabel: `${a.submitted_count} submitted`, value: a.avg_score }))}
              empty="No submissions yet."
            />
          )}
        </Panel>

        <Panel title="Attendance" description="Attended ÷ marked, per week across your classes">
          {trend.isLoading ? <ChartSkeleton /> : <LineChart data={trendPoints(trend.data ?? [], "attendance_pct")} title="Attendance by week" valueLabel="Attendance" yMax={100} format={(v) => `${v}%`} empty="No attendance marked in this period." />}
        </Panel>

        <Panel title="Student distribution" description={`Students by average score (${scoredCount} with at least one submission)`}>
          {students.isLoading ? <ChartSkeleton h={200} /> : <ColumnChart data={distribution} title="Students by average score" valueLabel="Students" empty="No scored students yet." />}
        </Panel>
      </div>
    </div>
  );
}
