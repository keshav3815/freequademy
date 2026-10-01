import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Info, Megaphone } from "lucide-react";
import { useStudents } from "@/hooks/useTeacher";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { ATTENTION_THRESHOLDS as T, studentsNeedingAttention, type SignalKind } from "@/lib/teacher/signals";
import { pct, relativeTime } from "@/lib/teacher/format";
import { Avatar, EmptyState, PageHeader, Panel, QueryView, Segmented, SkeletonRows, StatusPill, TButton } from "@/components/teacher/portal/ui";

type Filter = "all" | SignalKind;

const KIND_LABEL: Record<SignalKind, string> = {
  score_drop: "Declining scores",
  low_score: "Low scores",
  attendance: "Low attendance",
  inactive: "Inactive",
};

export default function AttentionPage() {
  useDocumentMeta({ title: "Needs attention" });
  const navigate = useNavigate();
  const students = useStudents();
  const [filter, setFilter] = useState<Filter>("all");
  const flagged = useMemo(() => studentsNeedingAttention(students.data ?? []), [students.data]);
  const count = (k: SignalKind) => flagged.filter((f) => f.signals.some((s) => s.kind === k)).length;
  const visible = filter === "all" ? flagged : flagged.filter((f) => f.signals.some((s) => s.kind === filter));

  return (
    <div>
      <PageHeader
        title="Needs attention"
        description="Students whose recent data suggests a check-in could help."
        actions={
          visible.length > 0 && (
            <TButton variant="secondary" onClick={() => navigate(`/teacher/announcements?new=1&students=${visible.map((v) => v.student.student_id).join(",")}`)}>
              <Megaphone />
              Message these students
            </TButton>
          )
        }
      />

      <div className="mb-5 flex items-start gap-2 rounded-lg border border-border bg-card p-3 text-[13px] text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          Based only on your content and classes: attendance below {T.attendancePct}% (over {T.minMarkedSessions}+ marked classes), an average that dropped {T.scoreDropPoints}+ points versus the previous month, an average under {T.lowScorePct}% across {T.minTestsForLowScore}+ assignments, or no activity for {T.inactiveDays}+ days.
        </p>
      </div>

      <Segmented
        className="mb-4"
        label="Signal"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All", count: flagged.length },
          ...(Object.keys(KIND_LABEL) as SignalKind[]).map((k) => ({ value: k, label: KIND_LABEL[k], count: count(k) })),
        ]}
      />

      <Panel bodyClassName="p-0">
        <QueryView query={students} what="your students" skeleton={<SkeletonRows rows={6} className="p-5" />}>
          {() =>
            visible.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Nothing needs your attention right now" description="You're all caught up." />
            ) : (
              <ul className="divide-y divide-border">
                {visible.map(({ student, signals }) => (
                  <li key={student.student_id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <Avatar name={student.full_name} size={36} />
                      <div className="min-w-0">
                        <Link to={`/teacher/students/${student.student_id}`} className="tp-focus rounded text-[15px] font-semibold hover:underline">
                          {student.full_name}
                        </Link>
                        <p className="text-[13px] text-muted-foreground">
                          {student.subject_names.join(", ") || "Classes"} · Avg {pct(student.avg_score)} · Attendance {pct(student.attendance_pct)} · Active {relativeTime(student.last_active_at)}
                        </p>
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {signals.map((s) => (
                            <li key={s.kind}>
                              <StatusPill tone={s.severity === "high" ? "danger" : "warning"} dot>
                                {s.label}
                              </StatusPill>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="flex gap-2 md:justify-end">
                      <TButton size="sm" variant="secondary" asChild>
                        <Link to={`/teacher/students/${student.student_id}?tab=notes`}>Add note</Link>
                      </TButton>
                      <TButton size="sm" asChild>
                        <Link to={`/teacher/students/${student.student_id}`}>View profile</Link>
                      </TButton>
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </QueryView>
      </Panel>
    </div>
  );
}
