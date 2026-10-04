/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { BookOpen, Clock, MoreHorizontal, Users, Video } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { teacherApi } from "@/hooks/useTeacher";
import { classState, pct, relativeTime, type ClassState } from "@/lib/teacher/format";
import type { ActivityEvent, TeacherCourse, TeacherSession } from "@/lib/teacher/types";
import { cn } from "@/lib/utils";
import { ProgressBar, StatusPill, TButton, type Tone } from "@/components/teacher/portal/ui";

/* Components shared by several teacher pages. */

export const CLASS_STATE: Record<ClassState, { label: string; tone: Tone }> = {
  live: { label: "Live", tone: "danger" },
  upcoming: { label: "Upcoming", tone: "info" },
  completed: { label: "Completed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export function ClassStatePill({ state }: { state: ClassState }) {
  const s = CLASS_STATE[state];
  return (
    <StatusPill tone={s.tone} dot pulse={state === "live"}>
      {state === "live" ? "LIVE" : s.label}
    </StatusPill>
  );
}

/** Opens the meeting link on demand; links are never loaded in bulk. */
export function EnterClassButton({ sessionId, state, size = "sm" }: { sessionId: string; state: ClassState; size?: "sm" | "md" }) {
  const [pending, setPending] = useState(false);
  if (state === "completed" || state === "cancelled") return null;
  const open = async () => {
    setPending(true);
    try {
      const link = await teacherApi.fetchMeetingLink(sessionId);
      if (!link) {
        toast.info("No meeting link yet", { description: "Add a meeting link to this class from Classes." });
        return;
      }
      window.open(link, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error("Could not open the class", { description: (e as Error).message });
    } finally {
      setPending(false);
    }
  };
  return (
    <TButton size={size} variant={state === "live" ? "primary" : "secondary"} onClick={open} loading={pending}>
      <Video />
      Enter class
    </TButton>
  );
}

export function registeredCount(session: TeacherSession) {
  return session.participants.filter((p) => p.status !== "cancelled").length;
}

export function ScheduleCard({ session, now = new Date() }: { session: TeacherSession; now?: Date }) {
  const state = classState(session, now);
  const start = new Date(session.scheduled_at);
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-4 transition-colors sm:flex-row sm:items-center",
        state === "live" ? "border-destructive/30 bg-destructive/[0.03]" : "border-border bg-card",
        state === "cancelled" && "opacity-70",
      )}
    >
      <div className="w-20 shrink-0">
        <div className="tp-tabular text-[15px] font-semibold text-foreground">{format(start, "h:mm a")}</div>
        <div className="text-[12px] text-muted-foreground">{session.duration_minutes} min</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("truncate text-[15px] font-semibold", state === "cancelled" && "line-through")}>{session.title}</p>
          <ClassStatePill state={state} />
        </div>
        <p className="mt-0.5 flex items-center gap-3 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            {registeredCount(session)}
            {session.max_participants ? ` / ${session.max_participants}` : ""} students
          </span>
          <span>{session.session_type === "one-on-one" ? "1-on-1" : "Group"}</span>
        </p>
      </div>
      <EnterClassButton sessionId={session.id} state={state} />
    </div>
  );
}

export function CourseCard({ course, onMore }: { course: TeacherCourse; onMore?: React.ReactNode }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-[var(--tp-shadow-sm)] transition-[border-color,box-shadow] hover:border-primary/30 hover:shadow-[var(--tp-shadow-md)]">
      <div className="relative flex h-24 items-end bg-gradient-to-br from-accent to-muted p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-card text-primary shadow-[var(--tp-shadow-sm)]">
          <BookOpen className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-card/90 px-2 py-0.5 text-[12px] font-medium text-muted-foreground">Class {course.class_level}</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[16px] font-semibold leading-snug">
            {course.subject_name} <span className="font-normal text-muted-foreground">— Grade {course.class_level}</span>
          </h3>
          {onMore}
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
          <div>
            <dt className="text-muted-foreground">Students</dt>
            <dd className="tp-tabular text-[14px] font-semibold">{course.student_count}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Lessons</dt>
            <dd className="tp-tabular text-[14px] font-semibold">{course.lesson_count}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Avg score</dt>
            <dd className="tp-tabular text-[14px] font-semibold">{pct(course.avg_score)}</dd>
          </div>
        </dl>
        <div className="mt-4">
          <div className="mb-1 text-[12px] text-muted-foreground">Average completion</div>
          <ProgressBar value={course.completion_pct} label={`${course.subject_name} average completion`} />
        </div>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
          <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Updated {relativeTime(course.last_updated_at)}
          </span>
          <TButton asChild variant="secondary" size="sm">
            <Link to={`/teacher/courses/${course.subject_id}`}>Manage course</Link>
          </TButton>
        </div>
      </div>
    </article>
  );
}

export function MoreMenu({ label, items }: { label: string; items: { label: string; onSelect: () => void; danger?: boolean }[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <TButton variant="ghost" size="iconSm" aria-label={label}>
          <MoreHorizontal />
        </TButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-lg">
        {items.map((i) => (
          <DropdownMenuItem key={i.label} onSelect={i.onSelect} className={cn("cursor-pointer", i.danger && "text-destructive focus:text-destructive")}>
            {i.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const ACTIVITY_VERB: Record<ActivityEvent["kind"], string> = {
  submission: "submitted",
  lesson_completed: "completed",
  session_registration: "registered for",
  published: "published",
};

export function activityHref(e: ActivityEvent): string {
  switch (e.kind) {
    case "submission":
      return `/teacher/assignments/${e.ref_id}/submissions`;
    case "session_registration":
      return "/teacher/classes";
    case "lesson_completed":
      return e.student_id ? `/teacher/students/${e.student_id}` : "/teacher/students";
    default:
      return "/teacher/courses";
  }
}

export function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
  return (
    <ol className="relative space-y-0">
      {events.map((e, i) => (
        <li key={`${e.kind}-${e.ref_id}-${e.student_id}-${e.occurred_at}`} className="relative flex gap-3 pb-4 last:pb-0">
          {i < events.length - 1 && <span className="absolute left-[5px] top-4 h-full w-px bg-border" aria-hidden="true" />}
          <span className={cn("relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-card", e.kind === "published" ? "bg-muted-foreground/50" : "bg-primary")} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-muted-foreground">{relativeTime(e.occurred_at)}</p>
            <Link to={activityHref(e)} className="tp-focus rounded text-[14px] leading-snug text-foreground hover:underline">
              <span className="font-medium">{e.kind === "published" ? "You" : e.student_name}</span> {ACTIVITY_VERB[e.kind]} <span className="font-medium">{e.title}</span>
            </Link>
          </div>
        </li>
      ))}
    </ol>
  );
}

export const WEEK_OPTIONS = [
  { value: "4", label: "4 weeks" },
  { value: "8", label: "8 weeks" },
  { value: "12", label: "12 weeks" },
  { value: "26", label: "6 months" },
] as const;
