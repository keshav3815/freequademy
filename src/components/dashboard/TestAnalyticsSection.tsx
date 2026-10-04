import { Link } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ScoreTrendChart from "./charts/ScoreTrendChart";
import { SCORE_STATUS_LABEL, scoreStatus } from "@/lib/testGrading";
import type { RecentTestRow as RecentTest } from "@/hooks/dashboardTypes";

const STATUS_BADGE_VARIANT = {
  excellent: "default",
  good: "secondary",
  needs_revision: "destructive",
} as const;

/**
 * Test Performance: summary stats, score trend, and the recent-results
 * table — one component because they all come from the same
 * get_recent_test_results rows (10 most recent submitted attempts).
 * "Status" is never an arbitrary per-student label — it's computed from the
 * documented thresholds in src/lib/testGrading.ts.
 */
export default function TestAnalyticsSection({ results }: { results: RecentTest[] }) {
  if (results.length === 0) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-primary/10"><ClipboardCheck className="h-5 w-5 text-primary" /></div>
          <h3 className="font-semibold">Test Performance</h3>
        </div>
        <div className="text-sm text-muted-foreground text-center py-8 space-y-3">
          <p>No test history yet. Complete your first test to see performance insights.</p>
          <Button asChild size="sm"><Link to="/tests">Browse tests</Link></Button>
        </div>
      </Card>
    );
  }

  const percentages = results.map((r) => Number(r.percentage));
  const average = Math.round((percentages.reduce((a, b) => a + b, 0) / percentages.length) * 10) / 10;
  const highest = Math.max(...percentages);
  const lowest = Math.min(...percentages);
  const passRate = Math.round((percentages.filter((p) => p >= 50).length / percentages.length) * 100);
  // oldest-first for the trend line, most-recent-first for the table
  const trend = [...results].reverse().map((r) => ({
    attempt_id: r.attempt_id,
    test_title: r.test_title,
    submitted_at: r.submitted_at,
    percentage: Number(r.percentage),
  }));

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-primary/10"><ClipboardCheck className="h-5 w-5 text-primary" /></div>
        <h3 className="font-semibold">Test Performance</h3>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5 text-center">
        {[
          ["Attempted", results.length],
          ["Average", `${average}%`],
          ["Highest", `${highest}%`],
          ["Lowest", `${lowest}%`],
          ["Pass Rate", `${passRate}%`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-muted/40 p-2">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-lg font-bold">{value}</dd>
          </div>
        ))}
      </dl>

      <ScoreTrendChart data={trend} />

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Recent test results</caption>
          <thead>
            <tr className="text-left text-muted-foreground text-xs border-b">
              <th scope="col" className="font-medium py-2 pr-2">Test</th>
              <th scope="col" className="font-medium py-2 pr-2">Date</th>
              <th scope="col" className="font-medium py-2 pr-2">Score</th>
              <th scope="col" className="font-medium py-2 pr-2">Status</th>
              <th scope="col" className="font-medium py-2"><span className="sr-only">Review</span></th>
            </tr>
          </thead>
          <tbody>
            {results.slice(0, 5).map((r) => {
              const status = scoreStatus(Number(r.percentage));
              return (
                <tr key={r.attempt_id} className="border-b last:border-0">
                  <td className="py-2 pr-2">
                    <span className="font-medium">{r.test_title}</span>
                    <span className="block text-xs text-muted-foreground">{r.subject_name}</span>
                  </td>
                  <td className="py-2 pr-2 whitespace-nowrap">{new Date(r.submitted_at!).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</td>
                  <td className="py-2 pr-2 whitespace-nowrap">{r.score} / {r.max_score} ({r.percentage}%)</td>
                  <td className="py-2 pr-2"><Badge variant={STATUS_BADGE_VARIANT[status]}>{SCORE_STATUS_LABEL[status]}</Badge></td>
                  <td className="py-2">
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/tests/${r.test_id}/attempts/${r.attempt_id}`}>Review</Link>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
