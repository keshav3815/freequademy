import { Flame, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { XpBreakdownRow as XpRow } from "@/hooks/dashboardTypes";

const SOURCE_LABEL: Record<string, string> = {
  lesson_completed: "Lessons",
  test_submitted: "Tests",
  doubt_asked: "Doubts",
};

interface Props {
  breakdown: XpRow[];
  streakDays: number;
  bestStreakDays: number;
  activeDaysThisWeek: number;
}

/** XP breakdown (only categories that actually have events — see the
 * migration comment for why "doubt_asked" only recently became real) and
 * streak detail (current vs. best, and this week's active days). */
export default function XpStreakCard({ breakdown, streakDays, bestStreakDays, activeDaysThisWeek }: Props) {
  const total = breakdown.reduce((sum, b) => sum + b.total_points, 0);

  return (
    <Card className="p-5 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-lg bg-yellow-500/10"><Zap className="h-5 w-5 text-yellow-600" /></div>
          <h3 className="font-semibold">XP Breakdown</h3>
        </div>
        {breakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground">Complete a lesson, take a test, or ask a doubt to start earning XP.</p>
        ) : (
          <ul className="space-y-1.5">
            {breakdown.map((b) => (
              <li key={b.source_type} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{SOURCE_LABEL[b.source_type] ?? b.source_type}</span>
                <span className="font-medium">
                  +{b.total_points} <span className="text-xs text-muted-foreground">({b.event_count})</span>
                </span>
              </li>
            ))}
            <li className="flex items-center justify-between text-sm border-t pt-1.5 font-semibold">
              <span>Total</span>
              <span>{total} XP</span>
            </li>
          </ul>
        )}
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-lg bg-orange-500/10"><Flame className="h-5 w-5 text-orange-600" /></div>
          <h3 className="font-semibold">Streak</h3>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xl font-bold">{streakDays}</p>
            <p className="text-xs text-muted-foreground">Current</p>
          </div>
          <div>
            <p className="text-xl font-bold">{bestStreakDays}</p>
            <p className="text-xs text-muted-foreground">Best</p>
          </div>
          <div>
            <p className="text-xl font-bold">{activeDaysThisWeek}/7</p>
            <p className="text-xs text-muted-foreground">This week</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
