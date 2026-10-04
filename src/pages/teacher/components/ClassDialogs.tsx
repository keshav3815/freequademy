import { useState } from "react";
import { format } from "date-fns";
import { Check, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { teacherApi, useRoster, useTeacherMutation } from "@/hooks/useTeacher";
import { classState } from "@/lib/teacher/format";
import type { TeacherSession } from "@/lib/teacher/types";
import type { NewSession } from "@/lib/teacher/api";
import { cn } from "@/lib/utils";
import { Avatar, EmptyState, Field, QueryView, SkeletonRows, StatusPill, TButton, inputClass, textareaClass } from "@/components/teacher/portal/ui";
import { ClassStatePill, EnterClassButton } from "./shared";

const DURATIONS = ["15", "30", "45", "60", "90", "120"];

function defaultStart() {
  const d = new Date(Date.now() + 60 * 60_000);
  d.setMinutes(0, 0, 0);
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function CreateClassDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const create = useTeacherMutation((input: NewSession) => teacherApi.createSession(user!.id, input), ["sessions"]);
  const [form, setForm] = useState({ title: "", description: "", session_type: "group" as "group" | "one-on-one", start: defaultStart(), duration: "60", capacity: "30", link: "" });
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.title.trim().length < 2) return setError("Add a title.");
    if (!form.start || Number.isNaN(new Date(form.start).getTime())) return setError("Choose a date and time.");
    if (form.link.trim() && !/^https:\/\/\S+$/i.test(form.link.trim())) return setError("Meeting links must start with https:// (Google Meet, Zoom, Jitsi…).");
    create.mutate(
      [
        {
          title: form.title,
          description: form.description,
          session_type: form.session_type,
          scheduled_at: new Date(form.start).toISOString(),
          duration_minutes: Number(form.duration),
          max_participants: Number(form.capacity) || 1,
          meeting_link: form.link,
        },
      ],
      {
        onSuccess: () => {
          toast.success("Class scheduled");
          onOpenChange(false);
          setForm((f) => ({ ...f, title: "", description: "", link: "", start: defaultStart() }));
        },
        onError: (err) => setError(err.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-lg">
        <DialogHeader>
          <DialogTitle>Schedule a class</DialogTitle>
          <DialogDescription>Students can find and register for it on the Mentorship page.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Title" htmlFor="c-title">
            <input id="c-title" className={inputClass} value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Quadratic equations — revision" autoFocus />
          </Field>
          <Field label="Description" htmlFor="c-desc">
            <textarea id="c-desc" className={cn(textareaClass, "min-h-[72px]")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts" htmlFor="c-start">
              <input id="c-start" type="datetime-local" className={inputClass} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            </Field>
            <Field label="Duration" htmlFor="c-duration">
              <Select value={form.duration} onValueChange={(v) => setForm({ ...form, duration: v })}>
                <SelectTrigger id="c-duration" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d} minutes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Type" htmlFor="c-type">
              <Select value={form.session_type} onValueChange={(v) => setForm({ ...form, session_type: v as "group" | "one-on-one" })}>
                <SelectTrigger id="c-type" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Group class</SelectItem>
                  <SelectItem value="one-on-one">1-on-1</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Capacity" htmlFor="c-capacity">
              <input id="c-capacity" type="number" min={1} max={500} className={inputClass} value={form.session_type === "one-on-one" ? "1" : form.capacity} disabled={form.session_type === "one-on-one"} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </Field>
          </div>
          <Field label="Meeting link" htmlFor="c-link" hint="Only you and registered students can see it.">
            <input id="c-link" type="url" className={inputClass} value={form.link} placeholder="https://meet.google.com/…" onChange={(e) => setForm({ ...form, link: e.target.value })} />
          </Field>
          {error && (
            <p role="alert" className="text-[13px] text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2">
            <TButton type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </TButton>
            <TButton type="submit" loading={create.isPending}>
              Schedule class
            </TButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const ATTENDANCE: Record<string, { label: string; tone: "success" | "danger" | "neutral" | "info" }> = {
  attended: { label: "Present", tone: "success" },
  absent: { label: "Absent", tone: "danger" },
  registered: { label: "Not marked", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

/** Drawer with a class's details, its roster, and attendance marking. */
export function ClassRosterSheet({ session, onOpenChange }: { session: TeacherSession | null; onOpenChange: (open: boolean) => void }) {
  const roster = useRoster(session?.id);
  const mark = useTeacherMutation(teacherApi.setAttendance, ["roster", "sessions", "students", "trend"]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const state = session ? classState(session) : null;
  const canMark = !!session && session.status !== "cancelled" && new Date(session.scheduled_at) <= new Date();

  const setStatus = (studentId: string, status: "attended" | "absent") => {
    if (!session) return;
    setPendingId(studentId);
    mark.mutate([session.id, studentId, status], {
      onError: (e) => toast.error("Could not record attendance", { description: e.message }),
      onSettled: () => setPendingId(null),
    });
  };

  return (
    <Sheet open={!!session} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {session && state && (
          <>
            <SheetHeader className="space-y-2 border-b border-border px-5 py-4 pr-12 text-left">
              <div className="flex items-center gap-2">
                <ClassStatePill state={state} />
                <span className="text-[12px] text-muted-foreground">{session.session_type === "one-on-one" ? "1-on-1" : "Group class"}</span>
              </div>
              <SheetTitle className="text-lg font-semibold">{session.title}</SheetTitle>
              <SheetDescription>
                {format(new Date(session.scheduled_at), "EEEE, d MMM yyyy · h:mm a")} · {session.duration_minutes} min
              </SheetDescription>
              {session.description && <p className="text-[13px] text-foreground">{session.description}</p>}
              <div className="pt-1">
                <EnterClassButton sessionId={session.id} state={state} />
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <h3 className="mb-1 text-[14px] font-semibold">Students</h3>
              <p className="mb-3 text-[12px] text-muted-foreground">{canMark ? "Mark who attended." : "Attendance can be marked once the class has started."}</p>
              <QueryView query={roster} what="the class roster" compact skeleton={<SkeletonRows rows={4} />}>
                {(rows) =>
                  rows.length === 0 ? (
                    <EmptyState compact icon={Users} title="No registrations yet" description="Students register from the Mentorship page." />
                  ) : (
                    <ul className="divide-y divide-border">
                      {rows.map((r) => {
                        const a = ATTENDANCE[r.status] ?? ATTENDANCE.registered;
                        return (
                          <li key={r.id} className="flex items-center gap-3 py-2.5">
                            <Avatar name={r.student_name} size={30} />
                            <span className="min-w-0 flex-1 truncate text-[14px]">{r.student_name}</span>
                            {canMark && r.status !== "cancelled" ? (
                              <div className="flex gap-1" role="group" aria-label={`Attendance for ${r.student_name}`}>
                                <TButton
                                  size="sm"
                                  variant={r.status === "attended" ? "primary" : "secondary"}
                                  aria-pressed={r.status === "attended"}
                                  onClick={() => setStatus(r.student_id, "attended")}
                                  disabled={pendingId === r.student_id}
                                >
                                  <Check />
                                  Present
                                </TButton>
                                <TButton
                                  size="sm"
                                  variant={r.status === "absent" ? "danger" : "secondary"}
                                  aria-pressed={r.status === "absent"}
                                  onClick={() => setStatus(r.student_id, "absent")}
                                  disabled={pendingId === r.student_id}
                                >
                                  <X />
                                  Absent
                                </TButton>
                              </div>
                            ) : (
                              <StatusPill tone={a.tone}>{a.label}</StatusPill>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )
                }
              </QueryView>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
