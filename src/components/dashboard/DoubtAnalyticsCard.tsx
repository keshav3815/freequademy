import { Link } from "react-router-dom";
import { MessageCircleQuestion } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DoubtStats } from "@/hooks/useStudentDashboard";

interface RecentDoubt { id: string; question: string; subject: string; status: string; created_at: string }

const STATUS_LABEL: Record<string, string> = {
  answered: "AI answered",
  escalated: "Waiting for mentor",
  mentor_answered: "Mentor answered",
};

/** AI Doubts analytics — real counts from the persisted `doubts` table. */
export default function DoubtAnalyticsCard({ stats, recent }: { stats: DoubtStats; recent: RecentDoubt[] }) {
  return (
    <Card className="p-5" role="region" aria-label="AI Doubts">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10"><MessageCircleQuestion className="h-5 w-5 text-primary" /></div>
          <h3 className="font-semibold">AI Doubts</h3>
        </div>
        <Button asChild size="sm" variant="ghost"><Link to="/doubts">View all</Link></Button>
      </div>

      {stats.total === 0 ? (
        <p className="text-sm text-muted-foreground">No doubts yet. Ask the AI tutor whenever you're stuck.</p>
      ) : (
        <>
          <dl className="grid grid-cols-4 gap-2 text-center mb-4">
            {[
              ["Asked", stats.total],
              ["Resolved", stats.resolved],
              ["Waiting", stats.unresolved],
              ["Mentor-answered", stats.escalated],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-muted/40 p-2">
                <dt className="text-[10px] text-muted-foreground leading-tight">{label}</dt>
                <dd className="text-base font-bold">{value}</dd>
              </div>
            ))}
          </dl>

          {stats.topSubjects.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {stats.topSubjects.map((s) => (
                <Badge key={s.subject} variant="secondary">{s.subject} ({s.count})</Badge>
              ))}
            </div>
          )}

          <ul className="space-y-1.5">
            {recent.map((d) => (
              <li key={d.id} className="text-sm">
                <p className="truncate">{d.question}</p>
                <p className="text-xs text-muted-foreground">{d.subject} • {STATUS_LABEL[d.status] ?? d.status}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
