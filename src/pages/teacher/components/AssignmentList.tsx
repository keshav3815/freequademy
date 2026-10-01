import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { teacherApi, useTeacherMutation } from "@/hooks/useTeacher";
import { pct, relativeTime } from "@/lib/teacher/format";
import type { TeacherAssignment } from "@/lib/teacher/types";
import { ConfirmDialog, EmptyState, StatusPill, TButton } from "@/components/teacher/portal/ui";
import { MoreMenu } from "./shared";

const TYPE_LABEL: Record<string, string> = { practice: "Practice quiz", chapter: "Chapter test", full: "Full syllabus" };

function Metric({ label, value, emphasis }: { label: string; value: number | string; emphasis?: boolean }) {
  return (
    <div className="min-w-[72px]">
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className={emphasis ? "tp-tabular text-[15px] font-semibold text-destructive" : "tp-tabular text-[15px] font-semibold"}>{value}</dd>
    </div>
  );
}

export default function AssignmentList({ assignments, empty }: { assignments: TeacherAssignment[]; empty?: React.ReactNode }) {
  const navigate = useNavigate();
  const [toDelete, setToDelete] = useState<TeacherAssignment | null>(null);
  const publish = useTeacherMutation(teacherApi.setContentStatus, ["assignments", "overview", "courses", "curriculum"]);
  const remove = useTeacherMutation(teacherApi.deleteContent, ["assignments", "overview", "courses", "curriculum"]);

  if (assignments.length === 0) {
    return <>{empty ?? <EmptyState icon={ClipboardCheck} title="No assignments here" />}</>;
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {assignments.map((a) => (
          <li key={a.test_id} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/teacher/assignments/${a.test_id}/submissions`} className="tp-focus truncate rounded text-[15px] font-semibold hover:underline">
                  {a.title}
                </Link>
                {a.status === "published" ? (
                  <StatusPill tone="success" dot>
                    Published
                  </StatusPill>
                ) : (
                  <StatusPill tone="neutral" dot>
                    Draft
                  </StatusPill>
                )}
              </div>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {a.subject_name} · Class {a.class_level}
                {a.chapter_title ? ` · ${a.chapter_title}` : ""} · {TYPE_LABEL[a.test_type] ?? a.test_type} · {a.question_count} question{a.question_count === 1 ? "" : "s"} · Updated {relativeTime(a.updated_at)}
              </p>
            </div>
            <dl className="flex flex-wrap gap-x-6 gap-y-2">
              <Metric label="Submitted" value={a.submitted_count} />
              <Metric label="In progress" value={a.in_progress_count} />
              <Metric label="Reviewed" value={a.reviewed_count} />
              <Metric label="To review" value={a.awaiting_review_count} emphasis={a.awaiting_review_count > 0} />
              <Metric label="Average" value={pct(a.avg_score)} />
            </dl>
            <div className="flex items-center gap-1 lg:justify-end">
              <TButton size="sm" variant={a.awaiting_review_count > 0 ? "primary" : "secondary"} onClick={() => navigate(`/teacher/assignments/${a.test_id}/submissions`)}>
                Review
              </TButton>
              <MoreMenu
                label={`More actions for ${a.title}`}
                items={[
                  { label: "Edit", onSelect: () => navigate(`/teacher/assignments/${a.test_id}/edit`) },
                  {
                    label: a.status === "published" ? "Unpublish" : "Publish",
                    onSelect: () =>
                      publish.mutate(["test", a.test_id, a.status === "published" ? "draft" : "published"], {
                        onSuccess: () => toast.success(a.status === "published" ? "Moved to drafts" : "Assignment published"),
                        onError: (e) => toast.error("Could not update", { description: e.message }),
                      }),
                  },
                  { label: "Delete", danger: true, onSelect: () => setToDelete(a) },
                ]}
              />
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete assignment?"
        description={
          toDelete && toDelete.submitted_count > 0
            ? `“${toDelete.title}” has ${toDelete.submitted_count} submission(s). Deleting it also deletes those attempts and their reviews. This cannot be undone.`
            : "This action cannot be undone."
        }
        confirmLabel="Delete assignment"
        destructive
        pending={remove.isPending}
        onConfirm={() =>
          toDelete &&
          remove.mutate(["test", toDelete.test_id], {
            onSuccess: () => {
              toast.success("Assignment deleted");
              setToDelete(null);
            },
            onError: (e) => toast.error("Could not delete", { description: e.message }),
          })
        }
      />
    </>
  );
}
