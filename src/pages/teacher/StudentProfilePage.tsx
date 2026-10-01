import { useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { BookOpen, ClipboardCheck, GraduationCap, Lock, Megaphone, NotebookPen, Trash2, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { teacherApi, useNotes, useStudent, useStudentAttempts, useStudentCourses, useStudentSessions, useTeacherMutation } from "@/hooks/useTeacher";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { pct, pointDelta, relativeTime } from "@/lib/teacher/format";
import { studentSignals } from "@/lib/teacher/signals";
import { BarList, LineChart } from "@/components/teacher/portal/charts";
import { Avatar, ConfirmDialog, EmptyState, ErrorState, PageHeader, Panel, QueryView, SkeletonRows, StatCard, StatusPill, TButton, textareaClass } from "@/components/teacher/portal/ui";
import { Skeleton } from "@/components/ui/skeleton";

const ATTENDANCE_TONE = { attended: "success", absent: "danger", registered: "neutral", cancelled: "neutral" } as const;
const ATTENDANCE_LABEL: Record<string, string> = { attended: "Present", absent: "Absent", registered: "Registered", cancelled: "Cancelled" };

function Notes({ studentId, autoFocus }: { studentId: string; autoFocus: boolean }) {
  const notes = useNotes(studentId);
  const [draft, setDraft] = useState("");
  const [toDelete, setToDelete] = useState<string | null>(null);
  const add = useTeacherMutation(teacherApi.addNote, ["notes"]);
  const remove = useTeacherMutation(teacherApi.deleteNote, ["notes"]);
  const ref = useRef<HTMLTextAreaElement>(null);

  return (
    <Panel
      id="notes"
      title={
        <span className="inline-flex items-center gap-2">
          Teacher notes <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label="Private" />
        </span>
      }
      description="Private to you — students never see these."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          add.mutate([studentId, draft], {
            onSuccess: () => {
              setDraft("");
              toast.success("Note saved");
            },
            onError: (err) => toast.error("Could not save note", { description: err.message }),
          });
        }}
        className="space-y-2"
      >
        <label htmlFor="new-note" className="sr-only">
          New note
        </label>
        <textarea id="new-note" ref={ref} autoFocus={autoFocus} className={textareaClass} rows={3} maxLength={5000} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. Struggling with sign rules — suggested extra practice." />
        <div className="flex justify-end">
          <TButton type="submit" size="sm" loading={add.isPending} disabled={!draft.trim()}>
            Save note
          </TButton>
        </div>
      </form>
      <div className="mt-4">
        <QueryView query={notes} what="notes" compact skeleton={<SkeletonRows rows={2} />}>
          {(rows) =>
            rows.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No notes yet.</p>
            ) : (
              <ul className="space-y-3">
                {rows.map((n) => (
                  <li key={n.id} className="group rounded-md bg-muted/60 p-3">
                    <p className="whitespace-pre-wrap text-[14px]">{n.body}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[12px] text-muted-foreground">{format(new Date(n.created_at), "d MMM yyyy, h:mm a")}</span>
                      <TButton variant="ghost" size="iconSm" aria-label="Delete note" onClick={() => setToDelete(n.id)}>
                        <Trash2 />
                      </TButton>
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </QueryView>
      </div>
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete note?"
        description="This action cannot be undone."
        confirmLabel="Delete note"
        destructive
        pending={remove.isPending}
        onConfirm={() => toDelete && remove.mutate([toDelete], { onSuccess: () => setToDelete(null), onError: (e) => toast.error("Could not delete", { description: e.message }) })}
      />
    </Panel>
  );
}

export default function StudentProfilePage() {
  const { studentId } = useParams();
  const [params] = useSearchParams();
  const student = useStudent(studentId);
  const courses = useStudentCourses(studentId);
  const attempts = useStudentAttempts(studentId);
  const sessions = useStudentSessions(studentId);
  useDocumentMeta({ title: student.data?.full_name ?? "Student" });

  if (student.isError) return <ErrorState message="We couldn't load this student." onRetry={() => student.refetch()} />;
  if (!student.isLoading && !student.data) {
    return (
      <EmptyState
        icon={UserX}
        title="Student not found"
        description="This student isn't using any of your courses or classes."
        action={
          <TButton asChild>
            <Link to="/teacher/students">Back to students</Link>
          </TButton>
        }
      />
    );
  }

  const s = student.data;
  const signals = s ? studentSignals(s) : [];
  const submitted = (attempts.data ?? []).filter((a) => a.status === "submitted");
  const reviewed = submitted.filter((a) => a.reviewed_at).length;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ to: "/teacher/students", label: "Students" }}
        title={
          s ? (
            <span className="flex items-center gap-3">
              <Avatar name={s.full_name} size={44} />
              <span>{s.full_name}</span>
            </span>
          ) : (
            <Skeleton className="h-10 w-64 rounded" />
          )
        }
        description={
          s && (
            <span className="flex flex-wrap items-center gap-2">
              {s.grade ? `Class ${s.grade}` : "Class not set"}
              <span aria-hidden="true">·</span>
              {s.subject_names.join(", ") || "Classes only"}
              <span aria-hidden="true">·</span>
              {signals.length > 0 ? (
                <StatusPill tone={signals[0].severity === "high" ? "danger" : "warning"} dot>
                  Needs attention
                </StatusPill>
              ) : (
                <StatusPill tone="success" dot>
                  Active student
                </StatusPill>
              )}
            </span>
          )
        }
        actions={
          s && (
            <>
              <TButton variant="secondary" asChild>
                <a href="#notes">
                  <NotebookPen />
                  Add note
                </a>
              </TButton>
              <TButton asChild>
                <Link to={`/teacher/announcements?new=1&students=${s.student_id}`}>
                  <Megaphone />
                  Send announcement
                </Link>
              </TButton>
            </>
          )
        }
      />

      {signals.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
          <p className="text-[13px] font-semibold text-foreground">Why this student is flagged</p>
          <ul className="mt-1 list-disc pl-5 text-[13px] text-muted-foreground">
            {signals.map((sig) => (
              <li key={sig.kind}>{sig.label}</li>
            ))}
          </ul>
        </div>
      )}

      {s ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard icon={BookOpen} label="Lessons completed" value={s.lessons_completed} hint={`${s.lessons_started} started`} />
          <StatCard icon={GraduationCap} label="Average score" value={pct(s.avg_score)} delta={pointDelta(s.recent_avg, s.previous_avg)} hint="This month vs last" />
          <StatCard icon={UserCheck} label="Attendance" value={pct(s.attendance_pct)} hint={`${s.sessions_attended} of ${s.sessions_attended + s.sessions_absent} classes`} />
          <StatCard icon={ClipboardCheck} label="Assignments" value={s.tests_submitted} hint={`${reviewed} reviewed`} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[118px] rounded-lg" />
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Performance" description="Score on each submitted assignment, oldest to newest">
            <QueryView query={attempts} what="performance" compact skeleton={<Skeleton className="h-56 rounded" />}>
              {() => (
                <LineChart
                  title="Assignment scores"
                  valueLabel="Score"
                  yMax={100}
                  format={(v) => `${v}%`}
                  data={[...submitted].reverse().map((a) => ({
                    label: a.submitted_at ? format(new Date(a.submitted_at), "d MMM") : "",
                    value: a.percentage,
                    detail: a.test_title,
                  }))}
                  empty="No submitted assignments yet."
                />
              )}
            </QueryView>
          </Panel>

          <Panel title="Course progress" description="Lessons completed out of your published lessons">
            <QueryView query={courses} what="course progress" compact skeleton={<SkeletonRows rows={3} />}>
              {(rows) => (
                <BarList
                  title="Course progress"
                  valueLabel="Completion"
                  max={100}
                  format={(v) => `${v}%`}
                  data={rows.map((c) => ({
                    label: c.subject_name,
                    sublabel: `${c.lessons_completed}/${c.published_lessons} lessons · avg ${pct(c.avg_score)}`,
                    value: c.published_lessons > 0 ? Math.round((100 * c.lessons_completed) / c.published_lessons) : null,
                  }))}
                  empty="Not enrolled in any of your courses — known from classes only."
                />
              )}
            </QueryView>
          </Panel>

          <Panel title="Assignments" bodyClassName="p-0">
            <QueryView query={attempts} what="assignments" compact skeleton={<SkeletonRows rows={4} className="p-5" />}>
              {(rows) =>
                rows.length === 0 ? (
                  <EmptyState compact icon={ClipboardCheck} title="No assignments yet" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[14px]">
                      <caption className="sr-only">Assignment attempts</caption>
                      <thead className="text-left text-[12px] text-muted-foreground">
                        <tr className="border-b border-border">
                          <th scope="col" className="px-5 py-2.5 font-medium">Assignment</th>
                          <th scope="col" className="px-3 py-2.5 font-medium">Submitted</th>
                          <th scope="col" className="px-3 py-2.5 text-right font-medium">Score</th>
                          <th scope="col" className="px-5 py-2.5 font-medium">Review</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((a) => (
                          <tr key={a.attempt_id} className="border-b border-border last:border-0">
                            <td className="px-5 py-3">
                              <Link to={`/teacher/assignments/${a.test_id}/submissions?attempt=${a.attempt_id}`} className="tp-focus rounded font-medium hover:underline">
                                {a.test_title}
                              </Link>
                              <div className="text-[12px] text-muted-foreground">{a.subject_name}</div>
                            </td>
                            <td className="px-3 py-3 text-muted-foreground">{a.submitted_at ? relativeTime(a.submitted_at) : "In progress"}</td>
                            <td className="tp-tabular px-3 py-3 text-right">{pct(a.percentage)}</td>
                            <td className="px-5 py-3">
                              {a.status !== "submitted" ? (
                                <StatusPill>In progress</StatusPill>
                              ) : a.reviewed_at ? (
                                <StatusPill tone="success">Reviewed</StatusPill>
                              ) : (
                                <StatusPill tone="warning">To review</StatusPill>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </QueryView>
          </Panel>
        </div>

        <div className="space-y-6">
          {studentId && <Notes studentId={studentId} autoFocus={params.get("tab") === "notes"} />}

          <Panel title="Attendance" bodyClassName="p-0">
            <QueryView query={sessions} what="attendance" compact skeleton={<SkeletonRows rows={3} className="p-5" />}>
              {(rows) =>
                rows.length === 0 ? (
                  <EmptyState compact icon={UserCheck} title="No classes yet" description="This student hasn't registered for your classes." />
                ) : (
                  <ul className="divide-y divide-border">
                    {rows.slice(0, 12).map((r) => (
                      <li key={r.session_id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-[14px]">{r.title}</p>
                          <p className="text-[12px] text-muted-foreground">{format(new Date(r.scheduled_at), "d MMM yyyy")}</p>
                        </div>
                        <StatusPill tone={ATTENDANCE_TONE[r.attendance as keyof typeof ATTENDANCE_TONE] ?? "neutral"}>{ATTENDANCE_LABEL[r.attendance] ?? r.attendance}</StatusPill>
                      </li>
                    ))}
                  </ul>
                )
              }
            </QueryView>
          </Panel>

          {s && (
            <Panel title="Activity">
              <p className="text-[14px]">
                Last active <span className="font-medium">{relativeTime(s.last_active_at)}</span>
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">Counted from lessons, assignments and classes in your courses.</p>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
