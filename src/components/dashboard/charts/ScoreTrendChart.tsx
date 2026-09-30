import { useId, useState } from "react";

export interface ScoreTrendPoint {
  attempt_id: string;
  test_title: string;
  submitted_at: string;
  percentage: number;
}

const WIDTH = 480;
const HEIGHT = 180;
const PAD_LEFT = 32;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

/**
 * A single series (this student's own score over time), so per
 * marks-and-anatomy.md no legend box is needed — the card title already
 * says what's plotted. Uses the app's own primary color (a single hue, not
 * a categorical assignment, so the shared 2-color validation for the bar
 * chart doesn't apply here — a lone series only needs sufficient contrast
 * against the surface, which hsl(var(--primary)) already provides as the
 * app's own accessibility-reviewed accent).
 */
export default function ScoreTrendChart({ data }: { data: ScoreTrendPoint[] }) {
  const titleId = useId();
  const [showTable, setShowTable] = useState(false);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Not enough test data yet.</p>;
  }
  if (data.length === 1) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Only one test so far ({data[0].percentage}%). Take another to see a trend.
      </p>
    );
  }

  const points = data.map((d, i) => ({
    x: PAD_LEFT + (i / (data.length - 1)) * (WIDTH - PAD_LEFT - PAD_RIGHT),
    y: PAD_TOP + (1 - d.percentage / 100) * (HEIGHT - PAD_TOP - PAD_BOTTOM),
    ...d,
  }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="viz-score-trend">
      <style>{`
        .viz-score-trend {
          --text-primary: hsl(var(--foreground));
          --text-secondary: hsl(var(--muted-foreground));
          --grid-line: hsl(var(--border));
          --series-1: hsl(var(--primary));
        }
      `}</style>

      <div className="flex justify-end mb-1">
        <button
          type="button"
          className="text-xs text-primary underline underline-offset-2"
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
        >
          {showTable ? "Show chart" : "Show table"}
        </button>
      </div>

      {showTable ? (
        <table className="w-full text-sm">
          <caption className="sr-only">Test score trend over time</caption>
          <thead>
            <tr className="text-left text-muted-foreground text-xs">
              <th scope="col" className="font-medium py-1">Test</th>
              <th scope="col" className="font-medium py-1">Date</th>
              <th scope="col" className="font-medium py-1">Score</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.attempt_id} className="border-t border-border">
                <td className="py-1.5">{d.test_title}</td>
                <td className="py-1.5">{new Date(d.submitted_at).toLocaleDateString()}</td>
                <td className="py-1.5">{d.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <svg role="img" aria-labelledby={titleId} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT}>
          <title id={titleId}>
            Score trend across the last {data.length} tests, from {data[0].percentage}% to {data[data.length - 1].percentage}%
          </title>
          {[0, 25, 50, 75, 100].map((tick) => {
            const y = PAD_TOP + (1 - tick / 100) * (HEIGHT - PAD_TOP - PAD_BOTTOM);
            return (
              <g key={tick}>
                <line x1={PAD_LEFT} y1={y} x2={WIDTH - PAD_RIGHT} y2={y} stroke="var(--grid-line)" strokeWidth={1} />
                <text x={PAD_LEFT - 6} y={y + 3} fontSize={9} fill="var(--text-secondary)" textAnchor="end">
                  {tick}
                </text>
              </g>
            );
          })}
          <path d={linePath} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => {
            const isEnd = i === points.length - 1;
            return (
              <g key={p.attempt_id}>
                <circle cx={p.x} cy={p.y} r={isEnd ? 5 : 4} fill="var(--series-1)" stroke="var(--surface-1, white)" strokeWidth={2}>
                  <title>{`${p.test_title} — ${new Date(p.submitted_at).toLocaleDateString()}: ${p.percentage}%`}</title>
                </circle>
                {isEnd && (
                  <text x={p.x} y={p.y - 10} fontSize={11} fontWeight={600} fill="var(--text-primary)" textAnchor="middle">
                    {p.percentage}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
