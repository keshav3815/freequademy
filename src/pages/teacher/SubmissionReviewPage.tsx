import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { Check, ChevronLeft, ChevronRight, ClipboardCheck, Inbox, X } from "lucide-react";
import { toast } from "sonner";
import { teacherApi, useAssignments, useAttemptAnswers, useSubmissions, useTeacherMutation } from "@/hooks/useTeacher";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { pct, relativeTime } from "@/lib/teacher/format";
import type { Submission } from "@/lib/teacher/types";
import { cn } from "@/lib/utils";
import { Avatar, EmptyState, ErrorState, PageHeader, QueryView, Segmented, SkeletonRows, StatusPill, TButton, textareaClass } from "@/components/teacher/portal/ui";

type Filter = "review" | "reviewed" | "all";

function submissionState(s: Submission): { label: string; tone: "warning" | "success" | "neutral" } {
  if (s.status !== "submitted") return { label: "In progress", tone: "neutral" };
  return s.reviewed_at ? { label: "Reviewed", tone: "success" } : { label: "To review", tone: "warning" };
}

function Answers({ attemptId }: { attemptId: string }) {
  const answers = useAttemptAnswers(attemptId);
  return (
    <QueryView query={answers} what="this submission" compact skeleton={<SkeletonRows rows={4} />}>
      {(rows) => (
        <ol className="space-y-4">
          {rows.map((q, i) => (
            <li key={q.question_id} className="rounded-lg border border-border p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <p className="text-[14px] font-medium">
                  <span className="text-muted-foreground">Q{i + 1}. </span>
                  {q.prompt}
                </p>
                {q.selected_option === null ? (
                  <StatusPill tone="neutral">Not answered</StatusPill>
                ) : q.is_correct ? (
                  <StatusPill tone="success">
                    <Check className="h-3 w-3" aria-hidden="true" /> Correct · {q.marks}/{q.marks}
                  </StatusPill>
                ) : (
                  <StatusPill tone="danger">
                    <X className="h-3 w-3" aria-hidden="true" /> Incorrect · 0/{q.marks}
                  </StatusPill>
                )}
              </div>
              <ul className="space-y-1.5">
                {q.options.map((opt, oi) => {
                  const chosen = q.selected_option === oi;
                  const correct = q.correct_option === oi;
                  return (
                    <li
                      key={oi}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-3 py-1.5 text-[13px]",
                        correct ? "border-success/40 bg-success/5" : chosen ? "border-destructive/40 bg-destructive/5" : "border-border",
                      )}
                    >
                      <span className="tp-tabular w-4 font-medium text-muted-foreground">{String.fromCharCode(65 + oi)}</span>
                      <span className="flex-1">{opt}</span>
                      {chosen && <span className="text-[12px] font-medium text-muted-foreground">Student's answer</span>}
                      {correct && <span className="text-[12px] font-medium text-success">Correct answer</span>}
                    </li>
                  );
                })}
              </ul>
              {q.explanation && <p className="mt-2 text-[13px] text-muted-foreground">Explanation: {q.explanation}</p>}
            </li>
          ))}
        </ol>
      )}
    </QueryView>
  );
}

function ReviewPane({ submission, onReviewed, hasNext, onNext, onPrev, hasPrev }: { submission: Submission; onReviewed: () => void; hasNext: boolean; hasPrev: boolean; onNext: () => void; onPrev: () => void }) {
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const review = useTeacherMutation(teacherApi.reviewAttempt, ["submissions", "assignments", "overview", "student"]);
  useEffect(() => setFeedback(submission.feedback ?? ""), [submission.attempt_id, submission.feedback]);

  const submit = () =>
    review.mutate([submission.attempt_id, feedback], {
      onSuccess: () => {
        toast.success(`Returned to ${submission.student_name}`);
        onReviewed();
      },
      onError: (e) => toast.error("Could not save the review", { description: e.message }),
    });

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={submission.student_name} size={36} />
          <div>
            <Link to={`/teacher/students/${submission.student_id}`} className="tp-focus rounded text-[15px] font-semibold hover:underline">
              {submission.student_name}
            </Link>
            <p className="text-[12px] text-muted-foreground">
              {submission.submitted_at ? `Submitted ${format(new Date(submission.submitted_at), "d MMM, h:mm a")}` : `Started ${relativeTime(submission.started_at)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <TButton variant="ghost" size="iconSm" onClick={onPrev} disabled={!hasPrev} aria-label="Previous student (K)">
            <ChevronLeft />
          </TButton>
          <TButton variant="ghost" size="iconSm" onClick={onNext} disabled={!hasNext} aria-label="Next student (J)">
            <ChevronRight />
          </TButton>
        </div>
      </div>

      {submission.status !== "submitted" ? (
        <EmptyState icon={Inbox} title="Not submitted yet" description="This student has started the assignment but hasn't submitted it." />
      ) : (
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-muted/60 px-4 py-3">
            <div>
              <div className="text-[12px] text-muted-foreground">Marks</div>
              <div className="tp-tabular text-[20px] font-semibold">
                {submission.score ?? "—"} / {submission.max_score ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-[12px] text-muted-foreground">Score</div>
              <div className="tp-tabular text-[20px] font-semibold">{pct(submission.percentage)}</div>
            </div>
            <div>
              <div className="text-[12px] text-muted-foreground">Correct</div>
              <div className="tp-tabular text-[20px] font-semibold">
                {submission.correct_count ?? "—"} / {submission.question_count ?? "—"}
              </div>
            </div>
            <p className="basis-full text-[12px] text-muted-foreground sm:ml-auto sm:basis-auto">Auto-graded when submitted</p>
          </div>

          <Answers attemptId={submission.attempt_id} />

          <div className="space-y-2 border-t border-border pt-5">
            <label htmlFor="review-feedback" className="block text-[14px] font-semibold">
              Feedback
            </label>
            <textarea
              id="review-feedback"
              className={textareaClass}
              rows={4}
              maxLength={5000}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
              }}
              placeholder="What went well, and what to revisit…"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px] text-muted-foreground">
                {submission.reviewed_at ? `Reviewed ${relativeTime(submission.reviewed_at)}. ` : ""}The student sees this on their result page. Ctrl+Enter to send.
              </p>
              <TButton onClick={submit} loading={review.isPending}>
                {submission.reviewed_at ? "Update feedback" : "Return to student"}
              </TButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Focused grading workspace: student list on the left, the selected
 * submission with feedback on the right. J/K (or the arrows) move between
 * students; returning feedback advances to the next unreviewed submission.
 */
export default function SubmissionReviewPage() {
  const { assignmentId } = useParams();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>("review");
  const submissions = useSubmissions(assignmentId);
  const assignments = useAssignments();
  const assignment = assignments.data?.find((a) => a.test_id === assignmentId);
  useDocumentMeta({ title: assignment ? `Review: ${assignment.title}` : "Review submissions" });

  const all = useMemo(() => submissions.data ?? [], [submissions.data]);
  const visible = useMemo(
    () => all.filter((s) => (filter === "all" ? true : filter === "review" ? s.status === "submitted" && !s.reviewed_at : !!s.reviewed_at)),
    [all, filter],
  );
  const selectedId = params.get("attempt") ?? visible[0]?.attempt_id ?? null;
  const selected = all.find((s) => s.attempt_id === selectedId) ?? null;
  const index = visible.findIndex((s) => s.attempt_id === selectedId);

  const select = (id: string | undefined) => id && setParams({ attempt: id }, { replace: true });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "TEXTAREA" || t.tagName === "INPUT") return;
      if (e.key === "j") select(visible[index + 1]?.attempt_id);
      if (e.key === "k") select(visible[index - 1]?.attempt_id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const toReview = all.filter((s) => s.status === "submitted" && !s.reviewed_at).length;
  const reviewed = all.filter((s) => s.reviewed_at).length;

  return (
    <div>
      <PageHeader
        back={{ to: "/teacher/assignments", label: "Assignments" }}
        title={assignment?.title ?? "Submissions"}
        description={assignment ? `${assignment.subject_name} · Class ${assignment.class_level} · ${assignment.question_count} questions · ${assignment.total_marks} marks` : undefined}
        actions={
          <TButton variant="secondary" asChild>
            <Link to={`/teacher/assignments/${assignmentId}/edit`}>Edit assignment</Link>
          </TButton>
        }
      />

      {submissions.isError ? (
        <ErrorState message="We couldn't load the submissions." onRetry={() => submissions.refetch()} />
      ) : submissions.isLoading ? (
        <SkeletonRows rows={6} />
      ) : all.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <EmptyState icon={ClipboardCheck} title="No submissions yet" description={assignment?.status === "published" ? "Submissions appear here as students complete this assignment." : "Publish this assignment so students can take it."} />
        </div>
      ) : (
        <div className="grid overflow-hidden rounded-lg border border-border bg-card lg:h-[calc(100vh-13rem)] lg:min-h-[520px] lg:grid-cols-[300px_1fr]">
          <div className="flex flex-col border-b border-border lg:border-b-0 lg:border-r">
            <div className="border-b border-border p-3">
              <Segmented
                label="Filter submissions"
                value={filter}
                onChange={setFilter}
                className="w-full"
                options={[
                  { value: "review", label: "To review", count: toReview },
                  { value: "reviewed", label: "Reviewed", count: reviewed },
                  { value: "all", label: "All", count: all.length },
                ]}
              />
            </div>
            {visible.length === 0 ? (
              <EmptyState compact icon={Check} title={filter === "review" ? "All caught up" : "Nothing here"} description={filter === "review" ? "Every submission has been reviewed." : undefined} />
            ) : (
              <ul className="max-h-72 flex-1 overflow-y-auto lg:max-h-none" aria-label="Students">
                {visible.map((s) => {
                  const st = submissionState(s);
                  const active = s.attempt_id === selectedId;
                  return (
                    <li key={s.attempt_id}>
                      <button
                        type="button"
                        onClick={() => select(s.attempt_id)}
                        aria-current={active ? "true" : undefined}
                        className={cn("tp-focus flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left transition-colors", active ? "border-primary bg-accent/60" : "border-transparent hover:bg-muted/60")}
                      >
                        <Avatar name={s.student_name} size={30} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium">{s.student_name}</span>
                          <span className="block text-[12px] text-muted-foreground">{s.status === "submitted" ? pct(s.percentage) : "Not submitted"}</span>
                        </span>
                        <StatusPill tone={st.tone}>{st.label}</StatusPill>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="min-h-[400px] min-w-0">
            {selected ? (
              <ReviewPane
                key={selected.attempt_id}
                submission={selected}
                hasPrev={index > 0}
                hasNext={index >= 0 && index < visible.length - 1}
                onPrev={() => select(visible[index - 1]?.attempt_id)}
                onNext={() => select(visible[index + 1]?.attempt_id)}
                onReviewed={() => {
                  const next = visible.find((s, i) => i > index && s.status === "submitted" && !s.reviewed_at);
                  if (next) select(next.attempt_id);
                }}
              />
            ) : (
              <EmptyState icon={Inbox} title="Select a submission" description="Choose a student from the list." />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
