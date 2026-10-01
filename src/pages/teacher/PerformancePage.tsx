import { useMemo } from "react";
import { format } from "date-fns";
import { ClipboardCheck, MessageSquareText, Presentation, Star } from "lucide-react";
import { useAnsweredDoubts, useOverview, useSessionFeedback, useSessions } from "@/hooks/useTeacher";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { classState } from "@/lib/teacher/format";
import { ColumnChart } from "@/components/teacher/portal/charts";
import { EmptyState, PageHeader, Panel, QueryView, SkeletonRows, StatCard } from "@/components/teacher/portal/ui";
import { Skeleton } from "@/components/ui/skeleton";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={i <= rating ? "h-3.5 w-3.5 fill-warning text-warning" : "h-3.5 w-3.5 text-border"} aria-hidden="true" />
      ))}
    </span>
  );
}

/** Teaching performance: how students rate your classes, and your own review/answer throughput. */
export default function PerformancePage() {
  useDocumentMeta({ title: "Teaching performance" });
  const feedback = useSessionFeedback();
  const sessions = useSessions();
  const answered = useAnsweredDoubts();
  const overview = useOverview();

  const ratings = useMemo(() => (feedback.data ?? []).filter((f) => f.rating !== null), [feedback.data]);
  const avg = ratings.length ? Math.round((ratings.reduce((s, f) => s + (f.rating ?? 0), 0) / ratings.length) * 10) / 10 : null;
  const dist = [1, 2, 3, 4, 5].map((r) => ({ label: `${r}★`, value: ratings.filter((f) => f.rating === r).length }));
  const taught = (sessions.data ?? []).filter((s) => classState(s) === "completed").length;
  const loading = feedback.isLoading || sessions.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader title="Performance" description="How students experience your teaching." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[118px] rounded-lg" />)
        ) : (
          <>
            <StatCard icon={Star} label="Average rating" value={avg === null ? "—" : `${avg} / 5`} hint={`${ratings.length} rating${ratings.length === 1 ? "" : "s"}`} />
            <StatCard icon={Presentation} label="Classes taught" value={taught} hint="Completed classes" />
            <StatCard icon={MessageSquareText} label="Questions answered" value={answered.data?.length ?? "—"} hint="Student doubts you answered" />
            <StatCard icon={ClipboardCheck} label="Submissions (7 days)" value={overview.data?.submissions_7d ?? "—"} hint={`${overview.data?.awaiting_review ?? 0} awaiting review`} />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel title="Rating distribution" className="lg:col-span-2">
          {loading ? <Skeleton className="h-52 rounded" /> : <ColumnChart data={dist} title="Class ratings" valueLabel="Ratings" height={180} empty="No ratings yet. Students can rate a class after attending it." />}
        </Panel>
        <Panel title="Student feedback" description="From students who attended your classes" className="lg:col-span-3" bodyClassName="p-0">
          <QueryView query={feedback} what="feedback" compact skeleton={<SkeletonRows rows={4} className="p-5" />}>
            {(rows) =>
              rows.length === 0 ? (
                <EmptyState compact icon={MessageSquareText} title="No feedback yet" description="Feedback appears after students attend and rate your classes." />
              ) : (
                <ul className="max-h-[420px] divide-y divide-border overflow-y-auto">
                  {rows.map((f) => (
                    <li key={f.id} className="px-5 py-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[14px] font-medium">{f.session_title ?? "Class"}</span>
                        {f.rating !== null && <Stars rating={f.rating} />}
                      </div>
                      {f.feedback_text && <p className="mt-1 text-[14px] text-foreground">“{f.feedback_text}”</p>}
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        {f.is_anonymous ? "Anonymous" : "Student"} · {format(new Date(f.created_at), "d MMM yyyy")}
                      </p>
                    </li>
                  ))}
                </ul>
              )
            }
          </QueryView>
        </Panel>
      </div>
    </div>
  );
}
