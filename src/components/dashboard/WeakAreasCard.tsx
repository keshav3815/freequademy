import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WEAK_AREA_THRESHOLD } from "@/lib/testGrading";
import type { WeakAreaRow as WeakArea } from "@/hooks/dashboardTypes";

/**
 * "Needs Attention" — the student's own lowest-scoring subjects/chapters,
 * from real submitted test attempts only (get_weak_areas requires at least
 * one attempt per row; nothing is inferred without data).
 *
 * get_weak_areas() returns the lowest-scoring rows regardless of how high
 * they actually are — filtering to WEAK_AREA_THRESHOLD here is what stops a
 * subject a student is doing *well* in (e.g. their only test at 100%) from
 * being mislabelled as something needing attention just because it happens
 * to be their lowest score among very few attempts.
 */
export default function WeakAreasCard({ areas }: { areas: WeakArea[] }) {
  const attention = areas.filter((a) => a.average_score < WEAK_AREA_THRESHOLD);

  return (
    <Card className="p-5" role="region" aria-label="Needs Attention">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
        <h3 className="font-semibold">Needs Attention</h3>
      </div>

      {areas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Not enough test data yet. Complete a few tests to unlock performance insights.</p>
      ) : attention.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing below {WEAK_AREA_THRESHOLD}% right now — nice work.</p>
      ) : (
        <ul className="space-y-3">
          {attention.map((a) => (
            <li key={`${a.subject_id}-${a.chapter_id ?? "subject"}`} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{a.chapter_title ?? a.subject_name}</p>
                <p className="text-xs text-muted-foreground">
                  {a.chapter_title ? a.subject_name : "Overall"} • {a.attempts_count} attempt{a.attempts_count === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="destructive">{a.average_score}%</Badge>
                <Button asChild size="sm" variant="outline">
                  <Link to={`/my-courses/${a.subject_id}${a.chapter_id ? `/${a.chapter_id}` : ""}`}>Revise</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
