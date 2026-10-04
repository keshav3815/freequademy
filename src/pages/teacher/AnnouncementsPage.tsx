import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { CalendarClock, Megaphone, Plus } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { teacherApi, useAnnouncements, useCourses, useSessions, useStudents, useTeacherMutation } from "@/hooks/useTeacher";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import type { AnnouncementInput } from "@/lib/teacher/api";
import type { Announcement, AnnouncementAudience } from "@/lib/teacher/types";
import { cn } from "@/lib/utils";
import { ConfirmDialog, EmptyState, Field, PageHeader, Panel, QueryView, SearchInput, Segmented, SkeletonRows, StatusPill, TButton, inputClass, textareaClass } from "@/components/teacher/portal/ui";
import { MoreMenu } from "./components/shared";

type Tab = "published" | "scheduled" | "draft";

function stateOf(a: Announcement): Tab {
  if (a.status === "draft") return "draft";
  return new Date(a.publish_at) > new Date() ? "scheduled" : "published";
}

interface Draft {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  subject_id: string;
  session_id: string;
  student_ids: string[];
  schedule: boolean;
  publish_at: string;
}

const blank = (students: string[] = []): Draft => ({
  title: "",
  body: "",
  audience: students.length ? "students" : "subject",
  subject_id: "",
  session_id: "",
  student_ids: students,
  schedule: false,
  publish_at: format(new Date(Date.now() + 24 * 3600_000), "yyyy-MM-dd'T'09:00"),
});

function Composer({ editing, initialStudents, open, onClose }: { editing: Announcement | null; initialStudents: string[]; open: boolean; onClose: () => void }) {
  const courses = useCourses();
  const sessions = useSessions();
  const students = useStudents();
  const save = useTeacherMutation(teacherApi.saveAnnouncement, ["announcements"]);
  const [d, setD] = useState<Draft>(blank(initialStudents));
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFilter("");
    if (editing) {
      setD({
        title: editing.title,
        body: editing.body,
        audience: editing.audience,
        subject_id: editing.subject_id ?? "",
        session_id: editing.session_id ?? "",
        student_ids: editing.student_ids,
        schedule: editing.status === "published" && new Date(editing.publish_at) > new Date(),
        publish_at: format(new Date(editing.publish_at), "yyyy-MM-dd'T'HH:mm"),
      });
    } else {
      setD(blank(initialStudents));
    }
  }, [open, editing, initialStudents]);

  const upcomingSessions = (sessions.data ?? []).filter((s) => s.status !== "cancelled" && new Date(s.scheduled_at).getTime() > Date.now() - 14 * 86_400_000);
  const roster = (students.data ?? []).filter((s) => !filter || s.full_name.toLowerCase().includes(filter.toLowerCase()));

  const submit = (status: "draft" | "published") => {
    setError(null);
    if (d.title.trim().length < 2) return setError("Add a title.");
    if (!d.body.trim()) return setError("Write a message.");
    if (d.audience === "subject" && !d.subject_id) return setError("Choose a course.");
    if (d.audience === "session" && !d.session_id) return setError("Choose a class.");
    if (d.audience === "students" && d.student_ids.length === 0) return setError("Select at least one student.");
    const when = status === "published" && d.schedule ? new Date(d.publish_at) : new Date();
    if (status === "published" && d.schedule && (Number.isNaN(when.getTime()) || when <= new Date())) return setError("Pick a future time to schedule.");
    const input: AnnouncementInput = {
      title: d.title,
      body: d.body,
      audience: d.audience,
      subject_id: d.subject_id || null,
      session_id: d.session_id || null,
      student_ids: d.student_ids,
      status,
      publish_at: when.toISOString(),
    };
    save.mutate([input, editing?.id], {
      onSuccess: () => {
        toast.success(status === "draft" ? "Draft saved" : d.schedule ? `Scheduled for ${format(when, "d MMM, h:mm a")}` : "Announcement published");
        onClose();
      },
      onError: (e) => setError(e.message),
    });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border px-5 py-4 pr-12 text-left">
          <SheetTitle>{editing ? "Edit announcement" : "New announcement"}</SheetTitle>
          <SheetDescription>Students see it on their dashboard.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <Field label="Title" htmlFor="an-title">
            <input id="an-title" className={inputClass} value={d.title} maxLength={200} onChange={(e) => setD({ ...d, title: e.target.value })} />
          </Field>
          <Field label="Message" htmlFor="an-body">
            <textarea id="an-body" className={cn(textareaClass, "min-h-[140px]")} maxLength={5000} value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} />
          </Field>
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium">Audience</legend>
            <div role="radiogroup" className="space-y-2">
              {(
                [
                  { v: "subject", label: "A course", hint: "Students using your content in that course" },
                  { v: "session", label: "A class", hint: "Students registered for that class" },
                  { v: "students", label: "Selected students", hint: "Pick from your roster" },
                ] as const
              ).map((o) => (
                <label key={o.v} className={cn("flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors", d.audience === o.v ? "border-primary bg-accent/50" : "border-border hover:border-primary/40")}>
                  <input type="radio" name="audience" className="mt-1 accent-[hsl(var(--primary))]" checked={d.audience === o.v} onChange={() => setD({ ...d, audience: o.v })} />
                  <span>
                    <span className="block text-[14px] font-medium">{o.label}</span>
                    <span className="block text-[12px] text-muted-foreground">{o.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {d.audience === "subject" && (
            <Field label="Course" htmlFor="an-course">
              <Select value={d.subject_id} onValueChange={(v) => setD({ ...d, subject_id: v })}>
                <SelectTrigger id="an-course" className="h-9">
                  <SelectValue placeholder="Choose a course" />
                </SelectTrigger>
                <SelectContent>
                  {(courses.data ?? []).map((c) => (
                    <SelectItem key={c.subject_id} value={c.subject_id}>
                      {c.subject_name} · Class {c.class_level} ({c.student_count} students)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          {d.audience === "session" && (
            <Field label="Class" htmlFor="an-session" hint={upcomingSessions.length === 0 ? "No recent or upcoming classes." : undefined}>
              <Select value={d.session_id} onValueChange={(v) => setD({ ...d, session_id: v })}>
                <SelectTrigger id="an-session" className="h-9">
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent>
                  {upcomingSessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title} · {format(new Date(s.scheduled_at), "d MMM")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          {d.audience === "students" && (
            <div className="rounded-md border border-border">
              <div className="flex items-center justify-between gap-2 border-b border-border p-2">
                <SearchInput value={filter} onChange={setFilter} placeholder="Filter students…" label="Filter students" className="flex-1" delay={0} />
                <span className="shrink-0 px-1 text-[12px] text-muted-foreground">{d.student_ids.length} selected</span>
              </div>
              <ul className="max-h-56 overflow-y-auto p-1">
                {roster.map((s) => (
                  <li key={s.student_id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[14px] hover:bg-muted">
                      <Checkbox
                        checked={d.student_ids.includes(s.student_id)}
                        onCheckedChange={(v) => setD((x) => ({ ...x, student_ids: v ? [...x.student_ids, s.student_id] : x.student_ids.filter((id) => id !== s.student_id) }))}
                      />
                      {s.full_name}
                    </label>
                  </li>
                ))}
                {roster.length === 0 && <li className="px-2 py-3 text-[13px] text-muted-foreground">No students found.</li>}
              </ul>
            </div>
          )}
          <label className="flex items-center gap-2 text-[14px]">
            <Checkbox checked={d.schedule} onCheckedChange={(v) => setD({ ...d, schedule: !!v })} />
            Schedule for later
          </label>
          {d.schedule && (
            <Field label="Publish at" htmlFor="an-when">
              <input id="an-when" type="datetime-local" className={inputClass} value={d.publish_at} onChange={(e) => setD({ ...d, publish_at: e.target.value })} />
            </Field>
          )}
          {error && (
            <p role="alert" className="text-[13px] text-destructive">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <TButton variant="ghost" onClick={() => submit("draft")} disabled={save.isPending}>
            Save draft
          </TButton>
          <TButton onClick={() => submit("published")} loading={save.isPending}>
            {d.schedule ? (
              <>
                <CalendarClock />
                Schedule
              </>
            ) : (
              "Publish"
            )}
          </TButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function AnnouncementsPage() {
  useDocumentMeta({ title: "Announcements" });
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>("published");
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [composing, setComposing] = useState(params.get("new") === "1");
  const [toDelete, setToDelete] = useState<Announcement | null>(null);
  const announcements = useAnnouncements();
  const courses = useCourses();
  const sessions = useSessions();
  const remove = useTeacherMutation(teacherApi.deleteAnnouncement, ["announcements"]);
  const initialStudents = useMemo(() => (params.get("students") ?? "").split(",").filter(Boolean), [params]);

  const counts = useMemo(() => {
    const rows = announcements.data ?? [];
    return { published: rows.filter((a) => stateOf(a) === "published").length, scheduled: rows.filter((a) => stateOf(a) === "scheduled").length, draft: rows.filter((a) => stateOf(a) === "draft").length };
  }, [announcements.data]);

  const audienceLabel = (a: Announcement) => {
    if (a.audience === "students") return `${a.student_ids.length} selected student${a.student_ids.length === 1 ? "" : "s"}`;
    if (a.audience === "subject") {
      const c = courses.data?.find((x) => x.subject_id === a.subject_id);
      return c ? `${c.subject_name} · Class ${c.class_level}` : "A course";
    }
    const s = sessions.data?.find((x) => x.id === a.session_id);
    return s ? `Class: ${s.title}` : "A class";
  };

  const close = () => {
    setComposing(false);
    setEditing(null);
    if (params.get("new")) setParams({}, { replace: true });
  };

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Send updates to a course, a class, or selected students."
        actions={
          <TButton onClick={() => setComposing(true)}>
            <Plus />
            New announcement
          </TButton>
        }
      />
      <Segmented
        className="mb-4"
        label="Announcement status"
        value={tab}
        onChange={setTab}
        options={[
          { value: "published", label: "Published", count: counts.published },
          { value: "scheduled", label: "Scheduled", count: counts.scheduled },
          { value: "draft", label: "Drafts", count: counts.draft },
        ]}
      />
      <Panel bodyClassName="p-0">
        <QueryView query={announcements} what="announcements" skeleton={<SkeletonRows rows={4} className="p-5" />}>
          {(rows) => {
            const visible = rows.filter((a) => stateOf(a) === tab);
            return visible.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title={tab === "published" ? "No announcements yet" : tab === "scheduled" ? "Nothing scheduled" : "No drafts"}
                description={tab === "published" ? "Keep your students informed about quizzes, classes and new lessons." : undefined}
                action={
                  tab === "published" ? (
                    <TButton onClick={() => setComposing(true)}>
                      <Plus />
                      New announcement
                    </TButton>
                  ) : undefined
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {visible.map((a) => {
                  const st = stateOf(a);
                  return (
                    <li key={a.id} className="flex gap-3 px-5 py-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[15px] font-semibold">{a.title}</p>
                          {st === "scheduled" && <StatusPill tone="info">Scheduled · {format(new Date(a.publish_at), "d MMM, h:mm a")}</StatusPill>}
                          {st === "draft" && <StatusPill>Draft</StatusPill>}
                        </div>
                        <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-[14px] text-muted-foreground">{a.body}</p>
                        <p className="mt-1.5 text-[12px] text-muted-foreground">
                          To {audienceLabel(a)}
                          {st === "published" && ` · ${format(new Date(a.publish_at), "d MMM yyyy, h:mm a")}`}
                        </p>
                      </div>
                      <MoreMenu
                        label={`Actions for ${a.title}`}
                        items={[
                          { label: "Edit", onSelect: () => setEditing(a) },
                          { label: "Delete", danger: true, onSelect: () => setToDelete(a) },
                        ]}
                      />
                    </li>
                  );
                })}
              </ul>
            );
          }}
        </QueryView>
      </Panel>

      <Composer open={composing || !!editing} editing={editing} initialStudents={initialStudents} onClose={close} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete announcement?"
        description="Students will no longer see it. This cannot be undone."
        confirmLabel="Delete"
        destructive
        pending={remove.isPending}
        onConfirm={() =>
          toDelete &&
          remove.mutate([toDelete.id], {
            onSuccess: () => {
              toast.success("Announcement deleted");
              setToDelete(null);
            },
            onError: (e) => toast.error("Could not delete", { description: e.message }),
          })
        }
      />
    </div>
  );
}
