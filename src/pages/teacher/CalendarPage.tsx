import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Megaphone, Plus, Presentation } from "lucide-react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAnnouncements, useSessions } from "@/hooks/useTeacher";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import type { Announcement, TeacherSession } from "@/lib/teacher/types";
import { cn } from "@/lib/utils";
import { EmptyState, ErrorState, PageHeader, Segmented, TButton } from "@/components/teacher/portal/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { ClassRosterSheet } from "./components/ClassDialogs";

type View = "month" | "week" | "day";

type CalEvent =
  | { kind: "class"; id: string; at: Date; title: string; session: TeacherSession }
  | { kind: "announcement"; id: string; at: Date; title: string; announcement: Announcement };

const WEEK_OPTS = { weekStartsOn: 1 as const };

function EventChip({ event, onOpen, compact }: { event: CalEvent; onOpen: (e: CalEvent) => void; compact?: boolean }) {
  const cancelled = event.kind === "class" && event.session.status === "cancelled";
  const Icon = event.kind === "class" ? Presentation : Megaphone;
  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      className={cn(
        "tp-focus flex w-full items-center gap-1.5 rounded border-l-2 px-1.5 text-left transition-colors",
        compact ? "py-0.5 text-[11px]" : "py-1.5 text-[13px]",
        event.kind === "class" ? "border-primary bg-accent/70 hover:bg-accent" : "border-muted-foreground/50 bg-muted hover:bg-muted/70",
        cancelled && "line-through opacity-60",
      )}
    >
      {!compact && <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
      <span className="tp-tabular shrink-0 text-muted-foreground">{format(event.at, compact ? "h:mm" : "h:mm a")}</span>
      <span className="min-w-0 truncate font-medium text-foreground">{event.title}</span>
      <span className="sr-only">{event.kind === "class" ? "(class)" : "(announcement)"}</span>
    </button>
  );
}

export default function CalendarPage() {
  useDocumentMeta({ title: "Calendar" });
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [openClass, setOpenClass] = useState<TeacherSession | null>(null);
  const [openAnnouncement, setOpenAnnouncement] = useState<Announcement | null>(null);
  const sessions = useSessions();
  const announcements = useAnnouncements();

  const events = useMemo<CalEvent[]>(
    () =>
      [
        ...(sessions.data ?? []).map((s) => ({ kind: "class" as const, id: s.id, at: new Date(s.scheduled_at), title: s.title, session: s })),
        ...(announcements.data ?? [])
          .filter((a) => a.status === "published")
          .map((a) => ({ kind: "announcement" as const, id: a.id, at: new Date(a.publish_at), title: a.title, announcement: a })),
      ].sort((a, b) => a.at.getTime() - b.at.getTime()),
    [sessions.data, announcements.data],
  );
  const on = (d: Date) => events.filter((e) => isSameDay(e.at, d));
  const open = (e: CalEvent) => (e.kind === "class" ? setOpenClass(e.session) : setOpenAnnouncement(e.announcement));

  const step = (dir: 1 | -1) => setCursor((c) => (view === "month" ? addMonths(c, dir) : view === "week" ? addWeeks(c, dir) : addDays(c, dir)));
  const heading =
    view === "month"
      ? format(cursor, "MMMM yyyy")
      : view === "week"
        ? `${format(startOfWeek(cursor, WEEK_OPTS), "d MMM")} – ${format(endOfWeek(cursor, WEEK_OPTS), "d MMM yyyy")}`
        : format(cursor, "EEEE, d MMMM yyyy");

  const loading = sessions.isLoading || announcements.isLoading;
  const failed = sessions.isError;

  const monthDays = eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor), WEEK_OPTS), end: endOfWeek(endOfMonth(cursor), WEEK_OPTS) });
  const weekDays = eachDayOfInterval({ start: startOfWeek(cursor, WEEK_OPTS), end: endOfWeek(cursor, WEEK_OPTS) });

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Your classes and scheduled announcements."
        actions={
          <TButton asChild>
            <Link to="/teacher/classes?new=1">
              <Plus />
              Schedule class
            </Link>
          </TButton>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <TButton variant="secondary" size="sm" onClick={() => setCursor(new Date())}>
            Today
          </TButton>
          <TButton variant="ghost" size="iconSm" onClick={() => step(-1)} aria-label={`Previous ${view}`}>
            <ChevronLeft />
          </TButton>
          <TButton variant="ghost" size="iconSm" onClick={() => step(1)} aria-label={`Next ${view}`}>
            <ChevronRight />
          </TButton>
          <h2 className="ml-1 text-[18px] font-semibold" aria-live="polite">
            {heading}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-3 text-[12px] text-muted-foreground md:flex" aria-label="Legend">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-1 rounded-sm bg-primary" aria-hidden="true" /> Class
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-1 rounded-sm bg-muted-foreground/50" aria-hidden="true" /> Announcement
            </span>
          </div>
          <Segmented
            label="Calendar view"
            value={view}
            onChange={setView}
            options={[
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
          />
        </div>
      </div>

      {failed ? (
        <div className="rounded-lg border border-border bg-card">
          <ErrorState message="We couldn't load your calendar." onRetry={() => sessions.refetch()} />
        </div>
      ) : loading ? (
        <Skeleton className="h-[560px] rounded-lg" />
      ) : view === "month" ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-[12px] font-medium text-muted-foreground">
            {weekDays.map((d) => (
              <div key={d.toISOString()} className="px-2 py-2 text-center">
                <span className="hidden sm:inline">{format(d, "EEE")}</span>
                <span className="sm:hidden">{format(d, "EEEEE")}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((d) => {
              const list = on(d);
              return (
                <div key={d.toISOString()} className={cn("min-h-[64px] border-b border-r border-border p-1 sm:min-h-[108px] sm:p-1.5 [&:nth-child(7n)]:border-r-0", !isSameMonth(d, cursor) && "bg-muted/30")}>
                  <button
                    type="button"
                    onClick={() => {
                      setCursor(d);
                      setView("day");
                    }}
                    className={cn(
                      "tp-focus mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[12px]",
                      isToday(d) ? "bg-primary font-semibold text-primary-foreground" : isSameMonth(d, cursor) ? "text-foreground hover:bg-muted" : "text-muted-foreground",
                    )}
                    aria-label={`${format(d, "EEEE d MMMM")}, ${list.length} event${list.length === 1 ? "" : "s"}`}
                  >
                    {format(d, "d")}
                  </button>
                  <div className="hidden space-y-0.5 sm:block">
                    {list.slice(0, 3).map((e) => (
                      <EventChip key={`${e.kind}-${e.id}`} event={e} onOpen={open} compact />
                    ))}
                    {list.length > 3 && <p className="px-1 text-[11px] text-muted-foreground">+{list.length - 3} more</p>}
                  </div>
                  {list.length > 0 && (
                    <div className="flex gap-0.5 sm:hidden" aria-hidden="true">
                      {list.slice(0, 3).map((e) => (
                        <span key={e.id} className={cn("h-1.5 w-1.5 rounded-full", e.kind === "class" ? "bg-primary" : "bg-muted-foreground/60")} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : view === "week" ? (
        <div className="grid gap-3 md:grid-cols-7">
          {weekDays.map((d) => {
            const list = on(d);
            return (
              <section key={d.toISOString()} aria-label={format(d, "EEEE d MMMM")} className={cn("rounded-lg border bg-card p-2", isToday(d) ? "border-primary/50" : "border-border")}>
                <h3 className="mb-2 flex items-baseline justify-between px-1 text-[13px]">
                  <span className="font-medium text-muted-foreground">{format(d, "EEE")}</span>
                  <span className={cn("font-semibold", isToday(d) && "text-primary")}>{format(d, "d")}</span>
                </h3>
                {list.length === 0 ? (
                  <p className="px-1 py-2 text-[12px] text-muted-foreground md:py-6 md:text-center">—</p>
                ) : (
                  <div className="space-y-1">
                    {list.map((e) => (
                      <EventChip key={`${e.kind}-${e.id}`} event={e} onOpen={open} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-4">
          {on(cursor).length === 0 ? (
            <EmptyState icon={Presentation} title="Nothing scheduled" description="No classes or announcements on this day." />
          ) : (
            <div className="space-y-2">
              {on(cursor).map((e) => (
                <EventChip key={`${e.kind}-${e.id}`} event={e} onOpen={open} />
              ))}
            </div>
          )}
        </div>
      )}

      <ClassRosterSheet session={openClass} onOpenChange={(o) => !o && setOpenClass(null)} />
      <Sheet open={!!openAnnouncement} onOpenChange={(o) => !o && setOpenAnnouncement(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          {openAnnouncement && (
            <>
              <SheetHeader className="text-left">
                <SheetTitle>{openAnnouncement.title}</SheetTitle>
                <SheetDescription>
                  {new Date(openAnnouncement.publish_at) > new Date() ? "Scheduled for " : "Published "}
                  {format(new Date(openAnnouncement.publish_at), "d MMM yyyy, h:mm a")}
                </SheetDescription>
              </SheetHeader>
              <p className="mt-4 whitespace-pre-wrap text-[14px]">{openAnnouncement.body}</p>
              <TButton asChild variant="secondary" className="mt-6">
                <Link to="/teacher/announcements">Manage announcements</Link>
              </TButton>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

