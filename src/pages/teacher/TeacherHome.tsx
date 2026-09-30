import { useMemo } from "react";
import { Link } from "react-router-dom";
import { isSameDay } from "date-fns";
import { BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, GraduationCap, History, MessageSquare, Target, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useActivity, useCourses, useEscalatedDoubts, useOverview, useSessions, useStudents } from "@/hooks/useTeacher";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { firstName, greetingFor, pct, pointDelta } from "@/lib/teacher/format";
import { studentsNeedingAttention } from "@/lib/teacher/signals";
import { cn } from "@/lib/utils";
import { EmptyState, ErrorState, Panel, PanelLink, QueryView, SkeletonCards, SkeletonRows, StatCard, TButton } from "@/components/teacher/portal/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityTimeline, CourseCard, ScheduleCard } from "./components/shared";
import PerformanceTrend from "./components/PerformanceTrend";

interface AttentionItem {
  key: string;
  tone: "danger" | "warning" | "info";
  title: string;
  detail: string;
  to: string;
}

const TONE_DOT = { danger: "bg-destructive", warning: "bg-warning", info: "bg-info" } as const;
const TONE_LABEL = { danger: "Urgent", warning: "Needs follow-up", info: "To do" } as const;

function NeedsAttention() {
  const overview = useOverview();
  const doubts = useEscalatedDoubts();
  const students = useStudents();

  const items = useMemo<AttentionItem[]>(() => {
    const list: AttentionItem[] = [];
    const review = overview.data?.awaiting_review ?? 0;
    if (review > 0) {
      list.push({ key: "review", tone: "danger", title: `${review} submission${review === 1 ? "" : "s"} awaiting review`, detail: "From the last 14 days", to: "/teacher/assignments?tab=review" });
    }
    const flagged = studentsNeedingAttention(students.data ?? []);
    for (const { student, signals } of flagged.slice(0, 4)) {
      list.push({
        key: student.student_id,
        tone: signals[0].severity === "high" ? "danger" : "warning",
        title: student.full_name,
        detail: signals[0].label + (signals.length > 1 ? ` · +${signals.length - 1} more` : ""),
        to: `/teacher/students/${student.student_id}`,
      });
    }
    const open = doubts.data?.length ?? 0;
    if (open > 0) {
      list.push({ key: "doubts", tone: "info", title: `${open} student question${open === 1 ? "" : "s"} awaiting a reply`, detail: "Escalated from the AI doubt solver", to: "/teacher/messages" });
    }
    return list;
  }, [overview.data, doubts.data, students.data]);

  const loading = overview.isLoading || doubts.isLoading || students.isLoading;
  const failed = overview.isError && students.isError;

  return (
    <Panel title="Needs attention" description="What to act on next" action={<PanelLink to="/teacher/students/attention">View all</PanelLink>} bodyClassName="p-2">
      {loading ? (
        <SkeletonRows rows={4} className="p-3" />
      ) : failed ? (
        <ErrorState compact message="We couldn't check what needs attention." onRetry={() => { overview.refetch(); students.refetch(); doubts.refetch(); }} />
      ) : items.length === 0 ? (
        <EmptyState compact icon={CheckCircle2} title="Nothing needs your attention right now" description="You're all caught up." />
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.key}>
              <Link to={item.to} className="tp-focus flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/70">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", TONE_DOT[item.tone])} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="sr-only">{TONE_LABEL[item.tone]}: </span>
                  <span className="block text-[14px] font-medium text-foreground">{item.title}</span>
                  <span className="block text-[13px] text-muted-foreground">{item.detail}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function TodaysClasses() {
  const sessions = useSessions();
  const now = new Date();
  return (
    <Panel title="Today's classes" action={<PanelLink to="/teacher/calendar">View calendar</PanelLink>}>
      <QueryView query={sessions} what="today's classes" compact skeleton={<SkeletonRows rows={3} />}>
        {(all) => {
          const today = all.filter((s) => isSameDay(new Date(s.scheduled_at), now));
          if (today.length === 0) {
            const next = all.find((s) => new Date(s.scheduled_at) > now && s.status === "scheduled");
            return (
              <EmptyState
                compact
                icon={CalendarDays}
                title="No classes today"
                description={next ? `Next: ${next.title} on ${new Date(next.scheduled_at).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}.` : "Schedule a live class for your students."}
                action={
                  <TButton asChild variant="secondary" size="sm">
                    <Link to="/teacher/classes?new=1">Schedule a class</Link>
                  </TButton>
                }
              />
            );
          }
          return (
            <div className="space-y-3">
              {today.map((s) => (
                <ScheduleCard key={s.id} session={s} now={now} />
              ))}
            </div>
          );
        }}
      </QueryView>
    </Panel>
  );
}

function Kpis() {
  const overview = useOverview();
  if (overview.isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" role="status" aria-label="Loading key metrics">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[118px] rounded-lg" />
        ))}
      </div>
    );
  }
  if (overview.isError || !overview.data) {
    return (
      <div className="rounded-lg border border-border bg-card">
        <ErrorState compact message="We couldn't load your key metrics." onRetry={() => overview.refetch()} />
      </div>
    );
  }
  const o = overview.data;
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <StatCard icon={Users} label="Students" value={o.student_count} hint={`Across ${o.course_count} course${o.course_count === 1 ? "" : "s"}`} to="/teacher/students" />
      <StatCard icon={Target} label="Completion" value={pct(o.completion_pct)} hint="Average lesson completion" to="/teacher/analytics" />
      <StatCard
        icon={GraduationCap}
        label="Average score"
        value={pct(o.avg_score_30d)}
        delta={pointDelta(o.avg_score_30d, o.avg_score_prev_30d)}
        hint="Last 30 days"
        to="/teacher/analytics"
      />
      <StatCard icon={ClipboardCheck} label="To review" value={o.awaiting_review} hint="Submissions awaiting review" to="/teacher/assignments?tab=review" />
    </div>
  );
}

function MyCourses() {
  const courses = useCourses();
  return (
    <section aria-labelledby="home-courses">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="home-courses" className="text-[18px] font-semibold">
          My courses
        </h2>
        <PanelLink to="/teacher/courses">View all courses</PanelLink>
      </div>
      <QueryView query={courses} what="your courses" skeleton={<SkeletonCards count={3} height={300} />}>
        {(rows) =>
          rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card">
              <EmptyState
                icon={BookOpen}
                title="No courses yet"
                description="Add your first lesson or assignment to a subject and it appears here as a course."
                action={
                  <TButton asChild>
                    <Link to="/teacher/courses/new">Create course</Link>
                  </TButton>
                }
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.slice(0, 3).map((c) => (
                <CourseCard key={c.subject_id} course={c} />
              ))}
            </div>
          )
        }
      </QueryView>
    </section>
  );
}

function RecentActivity() {
  const activity = useActivity(8);
  return (
    <Panel title="Recent activity">
      <QueryView query={activity} what="recent activity" compact skeleton={<SkeletonRows rows={5} />}>
        {(events) =>
          events.length === 0 ? (
            <EmptyState compact icon={History} title="No activity yet" description="Submissions, lesson completions and class registrations will appear here." />
          ) : (
            <ActivityTimeline events={events} />
          )
        }
      </QueryView>
    </Panel>
  );
}

function OpenQuestions() {
  const doubts = useEscalatedDoubts();
  return (
    <Panel title="Student questions" action={<PanelLink to="/teacher/messages">Open messages</PanelLink>}>
      <QueryView query={doubts} what="student questions" compact skeleton={<SkeletonRows rows={3} />}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState compact icon={MessageSquare} title="No questions waiting" description="Questions students send to a teacher appear here." />
          ) : (
            <ul className="space-y-3">
              {rows.slice(0, 3).map((d) => (
                <li key={d.id}>
                  <Link to={`/teacher/messages?open=${d.id}`} className="tp-focus block rounded-md hover:underline">
                    <span className="block text-[12px] text-muted-foreground">
                      {d.student_name} · {d.subject}
                    </span>
                    <span className="line-clamp-2 text-[14px] text-foreground">{d.question}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )
        }
      </QueryView>
    </Panel>
  );
}

export default function TeacherHome() {
  const { profile } = useAuth();
  useDocumentMeta({ title: "Teacher dashboard", description: "Your Freequademy teaching workspace." });
  const name = firstName(profile?.full_name);

  return (
    <div className="space-y-6 sm:space-y-8">
      <header>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px] sm:leading-9">
            {greetingFor()}
            {name ? `, ${name}` : ""} <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1 text-[14px] text-muted-foreground">Here's what needs your attention in your teaching workspace today.</p>
        </div>
      </header>

      <Kpis />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <TodaysClasses />
        </div>
        <div className="lg:col-span-2">
          <NeedsAttention />
        </div>
      </div>

      <PerformanceTrend />

      <MyCourses />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RecentActivity />
        </div>
        <div className="lg:col-span-2">
          <OpenQuestions />
        </div>
      </div>
    </div>
  );
}
