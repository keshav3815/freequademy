import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format, isToday, isTomorrow } from "date-fns";
import { Plus, Presentation, Users } from "lucide-react";
import { toast } from "sonner";
import { teacherApi, useSessions, useTeacherMutation } from "@/hooks/useTeacher";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { classState } from "@/lib/teacher/format";
import type { TeacherSession } from "@/lib/teacher/types";
import { ConfirmDialog, EmptyState, PageHeader, Panel, QueryView, Segmented, SkeletonRows, TButton } from "@/components/teacher/portal/ui";
import { ClassStatePill, EnterClassButton, MoreMenu, registeredCount } from "./components/shared";
import { ClassRosterSheet, CreateClassDialog } from "./components/ClassDialogs";

type Tab = "upcoming" | "past" | "cancelled";

function dayLabel(d: Date) {
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEEE, d MMMM");
}

export default function ClassesPage() {
  useDocumentMeta({ title: "Classes" });
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [openSession, setOpenSession] = useState<TeacherSession | null>(null);
  const [toCancel, setToCancel] = useState<TeacherSession | null>(null);
  const sessions = useSessions();
  const status = useTeacherMutation(teacherApi.updateSessionStatus, ["sessions"]);
  const creating = params.get("new") === "1";

  const buckets = useMemo(() => {
    const now = new Date();
    const rows = sessions.data ?? [];
    const upcoming = rows.filter((s) => ["live", "upcoming"].includes(classState(s, now)));
    const past = rows.filter((s) => classState(s, now) === "completed").reverse();
    const cancelled = rows.filter((s) => s.status === "cancelled").reverse();
    return { upcoming, past, cancelled };
  }, [sessions.data]);

  const visible = buckets[tab];
  const groups = useMemo(() => {
    const map = new Map<string, TeacherSession[]>();
    visible.forEach((s) => {
      const key = format(new Date(s.scheduled_at), "yyyy-MM-dd");
      map.set(key, [...(map.get(key) ?? []), s]);
    });
    return [...map.entries()];
  }, [visible]);

  return (
    <div>
      <PageHeader
        title="Classes"
        description="Live classes you run, with registrations and attendance."
        actions={
          <TButton onClick={() => setParams({ new: "1" })}>
            <Plus />
            Schedule class
          </TButton>
        }
      />

      <Segmented
        className="mb-5"
        label="Class status"
        value={tab}
        onChange={setTab}
        options={[
          { value: "upcoming", label: "Upcoming", count: buckets.upcoming.length },
          { value: "past", label: "Past", count: buckets.past.length },
          { value: "cancelled", label: "Cancelled", count: buckets.cancelled.length },
        ]}
      />

      <QueryView query={sessions} what="your classes" skeleton={<SkeletonRows rows={5} />}>
        {() =>
          visible.length === 0 ? (
            <Panel>
              <EmptyState
                icon={Presentation}
                title={tab === "upcoming" ? "No upcoming classes" : tab === "past" ? "No past classes yet" : "No cancelled classes"}
                description={tab === "upcoming" ? "Schedule a live class and your students can register for it." : undefined}
                action={
                  tab === "upcoming" ? (
                    <TButton onClick={() => setParams({ new: "1" })}>
                      <Plus />
                      Schedule class
                    </TButton>
                  ) : undefined
                }
              />
            </Panel>
          ) : (
            <div className="space-y-6">
              {groups.map(([day, list]) => (
                <section key={day} aria-label={dayLabel(new Date(`${day}T00:00:00`))}>
                  <h2 className="mb-2 text-[13px] font-semibold text-muted-foreground">{dayLabel(new Date(`${day}T00:00:00`))}</h2>
                  <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                    {list.map((s) => {
                      const state = classState(s);
                      return (
                        <li key={s.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                          <div className="w-24 shrink-0">
                            <div className="tp-tabular text-[15px] font-semibold">{format(new Date(s.scheduled_at), "h:mm a")}</div>
                            <div className="text-[12px] text-muted-foreground">{s.duration_minutes} min</div>
                          </div>
                          <button type="button" onClick={() => setOpenSession(s)} className="tp-focus min-w-0 flex-1 rounded text-left">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-[15px] font-semibold hover:underline">{s.title}</span>
                              <ClassStatePill state={state} />
                            </span>
                            <span className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">
                              <Users className="h-3.5 w-3.5" aria-hidden="true" />
                              {registeredCount(s)}
                              {s.max_participants ? ` / ${s.max_participants}` : ""} registered · {s.session_type === "one-on-one" ? "1-on-1" : "Group"}
                            </span>
                          </button>
                          <div className="flex items-center gap-1">
                            <EnterClassButton sessionId={s.id} state={state} />
                            <TButton size="sm" variant="ghost" onClick={() => setOpenSession(s)}>
                              {state === "completed" ? "Attendance" : "Roster"}
                            </TButton>
                            {state !== "cancelled" && (
                              <MoreMenu
                                label={`More actions for ${s.title}`}
                                items={[
                                  ...(state !== "completed"
                                    ? [{ label: "Mark as completed", onSelect: () => status.mutate([s.id, "completed"], { onSuccess: () => toast.success("Marked as completed"), onError: (e) => toast.error("Could not update", { description: e.message }) }) }]
                                    : []),
                                  { label: "Cancel class", danger: true, onSelect: () => setToCancel(s) },
                                ]}
                              />
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )
        }
      </QueryView>

      <CreateClassDialog open={creating} onOpenChange={(o) => !o && setParams({}, { replace: true })} />
      <ClassRosterSheet session={openSession} onOpenChange={(o) => !o && setOpenSession(null)} />
      <ConfirmDialog
        open={!!toCancel}
        onOpenChange={(o) => !o && setToCancel(null)}
        title="Cancel this class?"
        description={toCancel ? `“${toCancel.title}” has ${registeredCount(toCancel)} registered student(s). They'll see it as cancelled.` : ""}
        confirmLabel="Cancel class"
        destructive
        pending={status.isPending}
        onConfirm={() =>
          toCancel &&
          status.mutate([toCancel.id, "cancelled"], {
            onSuccess: () => {
              toast.success("Class cancelled");
              setToCancel(null);
            },
            onError: (e) => toast.error("Could not cancel", { description: e.message }),
          })
        }
      />
    </div>
  );
}
