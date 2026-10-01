import { useId, useMemo, useState } from "react";
import { Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { ActivityDay } from "@/hooks/dashboardTypes";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function level(total: number): 0 | 1 | 2 | 3 {
  if (total === 0) return 0;
  if (total === 1) return 1;
  if (total <= 3) return 2;
  return 3;
}

/**
 * GitHub-style activity heatmap. A "day" counts only real, already-defined
 * activity: a lesson completed, a test submitted, a doubt asked, or a
 * mentorship session attended (see get_activity_days) — opening the
 * dashboard itself is never counted.
 *
 * One sequential hue (blue), light→dark, per color-formula.md — a heatmap
 * cell is a magnitude encoding, not a categorical one. Light/dark step
 * values live as CSS custom properties (one grid, not a duplicated one).
 */
export default function LearningActivityHeatmap({ days }: { days: ActivityDay[] }) {
  const titleId = useId();
  const [showTable, setShowTable] = useState(false);

  // pad to a whole number of weeks starting on Monday
  const weeks = useMemo(() => {
    if (days.length === 0) return [];
    const first = new Date(days[0].activity_date + "T00:00:00");
    const leadingBlank = (first.getDay() + 6) % 7; // Mon=0..Sun=6
    const padded: (ActivityDay | null)[] = [...Array(leadingBlank).fill(null), ...days];
    const cols: (ActivityDay | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) cols.push(padded.slice(i, i + 7));
    return cols;
  }, [days]);

  const activeCount = days.filter((d) => d.total_count > 0).length;

  return (
    <Card className="p-5 viz-activity-heatmap">
      <style>{`
        .viz-activity-heatmap {
          --level-0: hsl(var(--muted));
          --level-1: #bcd6f5;
          --level-2: #6fa8e6;
          --level-3: #2a78d6;
        }
        .dark .viz-activity-heatmap {
          --level-1: #1d3a5c;
          --level-2: #2c5d94;
          --level-3: #3987e5;
        }
      `}</style>

      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10"><Activity className="h-5 w-5 text-primary" /></div>
          <div>
            <h3 className="font-semibold">Learning Activity</h3>
            <p className="text-xs text-muted-foreground">{activeCount} active day{activeCount === 1 ? "" : "s"} in the last {days.length} days</p>
          </div>
        </div>
        {days.length > 0 && (
          <button type="button" className="text-xs text-primary underline underline-offset-2 shrink-0" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable}>
            {showTable ? "Show heatmap" : "Show list"}
          </button>
        )}
      </div>

      {days.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
      ) : showTable ? (
        <table className="w-full text-sm">
          <caption className="sr-only">Daily learning activity</caption>
          <thead>
            <tr className="text-left text-muted-foreground text-xs">
              <th scope="col" className="font-medium py-1">Date</th>
              <th scope="col" className="font-medium py-1">Lessons</th>
              <th scope="col" className="font-medium py-1">Tests</th>
              <th scope="col" className="font-medium py-1">Doubts</th>
              <th scope="col" className="font-medium py-1">Sessions</th>
            </tr>
          </thead>
          <tbody>
            {days.filter((d) => d.total_count > 0).map((d) => (
              <tr key={d.activity_date} className="border-t border-border">
                <td className="py-1.5">{new Date(d.activity_date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</td>
                <td className="py-1.5">{d.lesson_count}</td>
                <td className="py-1.5">{d.test_count}</td>
                <td className="py-1.5">{d.doubt_count}</td>
                <td className="py-1.5">{d.session_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div role="img" aria-labelledby={titleId}>
          <p id={titleId} className="sr-only">
            Learning activity heatmap: {activeCount} active days out of {days.length}, darker squares mean more activity.
          </p>
          <div className="flex gap-2">
            <div className="flex flex-col gap-1 text-[10px] text-muted-foreground pt-4 shrink-0">
              {DAY_LABELS.map((d) => <span key={d} className="h-3 flex items-center">{d[0]}</span>)}
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((day, di) => (
                    <div
                      key={di}
                      tabIndex={day ? 0 : -1}
                      className="h-3 w-3 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                      style={{ background: day ? `var(--level-${level(day.total_count)})` : "transparent" }}
                      title={day ? `${day.activity_date}: ${day.total_count} activit${day.total_count === 1 ? "y" : "ies"}` : undefined}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground">
            <span>Less</span>
            {[0, 1, 2, 3].map((l) => (
              <span key={l} className="h-3 w-3 rounded-sm" style={{ background: `var(--level-${l})` }} />
            ))}
            <span>More</span>
          </div>
        </div>
      )}
    </Card>
  );
}
