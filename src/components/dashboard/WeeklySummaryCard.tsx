import { ArrowDown, ArrowUp, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { WeeklySummaryRow as WeekRow } from "@/hooks/dashboardTypes";

const METRICS: { key: keyof WeekRow; label: string; suffix?: string }[] = [
  { key: "lessons_completed", label: "Lessons completed" },
  { key: "tests_attempted", label: "Tests attempted" },
  { key: "average_score", label: "Average test score", suffix: "%" },
  { key: "doubts_asked", label: "Doubts asked" },
  { key: "doubts_resolved", label: "Doubts resolved" },
  { key: "sessions_attended", label: "Mentorship sessions" },
  { key: "xp_earned", label: "XP earned" },
  { key: "active_days", label: "Active days", suffix: " / 7" },
];

/**
 * "This Week" vs last week. No "study time" row: lessons have no duration
 * tracking in this schema, so a total study-time figure would be fabricated
 * for anything but tests — left out rather than guessed (see
 * docs/remediation/phase-9-analytics-dashboard.md).
 */
export default function WeeklySummaryCard({ thisWeek, lastWeek }: { thisWeek: WeekRow | null; lastWeek: WeekRow | null }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-primary/10"><CalendarDays className="h-5 w-5 text-primary" /></div>
        <h3 className="font-semibold">This Week</h3>
      </div>
      {!thisWeek ? (
        <p className="text-sm text-muted-foreground">Not available yet.</p>
      ) : (
        <dl className="space-y-2.5">
          {METRICS.map(({ key, label, suffix = "" }) => {
            const value = thisWeek[key];
            const prev = lastWeek?.[key];
            const numeric = typeof value === "number" ? value : value !== null ? Number(value) : null;
            const prevNumeric = typeof prev === "number" ? prev : prev !== null && prev !== undefined ? Number(prev) : null;
            // never show a % comparison against a zero or missing denominator
            const showDelta = prevNumeric !== null && prevNumeric > 0 && numeric !== null;
            const delta = showDelta ? Math.round(((numeric! - prevNumeric!) / prevNumeric!) * 100) : null;
            return (
              <div key={key} className="flex items-center justify-between text-sm">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="flex items-center gap-1.5 font-medium">
                  {numeric === null ? "—" : `${numeric}${suffix}`}
                  {delta !== null && delta !== 0 && (
                    <span className={`text-xs flex items-center ${delta > 0 ? "text-green-600" : "text-destructive"}`}>
                      {delta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {Math.abs(delta)}%
                    </span>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </Card>
  );
}
