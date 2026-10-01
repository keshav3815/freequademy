import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BookCheck, CalendarClock, ClipboardCheck, MessageSquare, type LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useActivity, useEscalatedDoubts, useSessions } from "@/hooks/useTeacher";
import { classState, relativeTime } from "@/lib/teacher/format";
import { cn } from "@/lib/utils";
import { EmptyState, ErrorState, SkeletonRows, TButton } from "./ui";

type Category = "submission" | "message" | "course" | "class";

interface Notice {
  id: string;
  category: Category;
  title: string;
  detail: string;
  at: string;
  to: string;
}

const ICONS: Record<Category, LucideIcon> = {
  submission: ClipboardCheck,
  message: MessageSquare,
  course: BookCheck,
  class: CalendarClock,
};

const CATEGORY_LABEL: Record<Category, string> = {
  submission: "Assignment submitted",
  message: "Student message",
  course: "Course activity",
  class: "Class reminder",
};

function readSeen(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

/**
 * Notifications are derived from real events (submissions, registrations,
 * completions, the escalated-question queue and upcoming classes) — there is
 * no separate notifications table. "Read" state is a per-device last-seen
 * timestamp.
 */
export default function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const storageKey = `tp:notifications-seen:${user?.id ?? "anon"}`;
  const [seenAt, setSeenAt] = useState(() => readSeen(storageKey));

  const activity = useActivity(30);
  const doubts = useEscalatedDoubts();
  const sessions = useSessions();

  const notices = useMemo<Notice[]>(() => {
    const list: Notice[] = [];
    const openDoubts = doubts.data ?? [];
    if (openDoubts.length > 0) {
      const latest = openDoubts.reduce((a, b) => ((a.escalated_at ?? "") > (b.escalated_at ?? "") ? a : b));
      list.push({
        id: `doubts-${openDoubts.length}-${latest.id}`,
        category: "message",
        title: `${openDoubts.length} student question${openDoubts.length === 1 ? "" : "s"} waiting for a teacher`,
        detail: `Latest from ${latest.student_name}: ${latest.question.slice(0, 80)}`,
        at: latest.escalated_at ?? new Date().toISOString(),
        to: "/teacher/messages",
      });
    }
    const now = new Date();
    for (const s of sessions.data ?? []) {
      const start = new Date(s.scheduled_at);
      const mins = Math.round((start.getTime() - now.getTime()) / 60_000);
      const state = classState(s, now);
      if ((state === "upcoming" && mins <= 60) || state === "live") {
        list.push({
          id: `class-${s.id}`,
          category: "class",
          title: state === "live" ? `${s.title} is live now` : `${s.title} starts in ${mins} min`,
          detail: `${s.participants.filter((p) => p.status !== "cancelled").length} registered`,
          at: new Date(start.getTime() - 60 * 60_000).toISOString(),
          to: "/teacher/classes",
        });
      }
    }
    for (const e of activity.data ?? []) {
      if (e.kind === "published") continue;
      if (e.kind === "submission") {
        list.push({ id: `sub-${e.ref_id}-${e.occurred_at}`, category: "submission", title: `${e.student_name} submitted ${e.title}`, detail: "Ready for review", at: e.occurred_at, to: `/teacher/assignments/${e.ref_id}/submissions` });
      } else if (e.kind === "session_registration") {
        list.push({ id: `reg-${e.ref_id}-${e.student_id}`, category: "class", title: `${e.student_name} registered for ${e.title}`, detail: "Class registration", at: e.occurred_at, to: "/teacher/classes" });
      } else {
        list.push({ id: `les-${e.ref_id}-${e.student_id}`, category: "course", title: `${e.student_name} completed ${e.title}`, detail: "Lesson completed", at: e.occurred_at, to: e.student_id ? `/teacher/students/${e.student_id}` : "/teacher/students" });
      }
    }
    return list.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40);
  }, [activity.data, doubts.data, sessions.data]);

  const unread = notices.filter((n) => new Date(n.at).getTime() > seenAt).length;

  const markAllRead = useCallback(() => {
    const now = Date.now();
    setSeenAt(now);
    try {
      localStorage.setItem(storageKey, String(now));
    } catch {
      /* private mode: read state just won't persist */
    }
  }, [storageKey]);

  const loading = activity.isLoading || doubts.isLoading || sessions.isLoading;
  const failed = activity.isError && doubts.isError && sessions.isError;

  return (
    <>
      <TButton
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(true)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      >
        <Bell />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white" aria-hidden="true">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </TButton>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="flex-row items-center justify-between space-y-0 border-b border-border px-5 py-4 pr-12">
            <div>
              <SheetTitle className="text-base font-semibold">Notifications</SheetTitle>
              <SheetDescription className="text-[13px]">Activity across your courses and classes.</SheetDescription>
            </div>
            <TButton variant="link" size="sm" onClick={markAllRead} disabled={unread === 0}>
              Mark all as read
            </TButton>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <SkeletonRows rows={6} className="p-5" />
            ) : failed ? (
              <ErrorState message="We couldn't load your notifications." onRetry={() => { activity.refetch(); doubts.refetch(); sessions.refetch(); }} />
            ) : notices.length === 0 ? (
              <EmptyState icon={Bell} title="You're all caught up" description="Submissions, student questions and class reminders will show up here." />
            ) : (
              <ul className="divide-y divide-border">
                {notices.map((n) => {
                  const Icon = ICONS[n.category];
                  const isUnread = new Date(n.at).getTime() > seenAt;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          navigate(n.to);
                        }}
                        className={cn("tp-focus flex w-full gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/60", isUnread && "bg-accent/40")}
                      >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{CATEGORY_LABEL[n.category]}</span>
                          <span className="block text-[14px] font-medium text-foreground">{n.title}</span>
                          <span className="block truncate text-[13px] text-muted-foreground">{n.detail}</span>
                          <span className="mt-0.5 block text-[12px] text-muted-foreground">{n.category === "class" && n.title.includes("starts in") ? "Upcoming" : relativeTime(n.at)}</span>
                        </span>
                        {isUnread && (
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary">
                            <span className="sr-only">Unread</span>
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
