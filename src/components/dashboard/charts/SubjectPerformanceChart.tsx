import { useId, useState } from "react";

export interface SubjectPerformancePoint {
  subject_id: string;
  subject_name: string;
  completion_pct: number;
  average_score: number | null;
}

const ROW_HEIGHT = 40;
const BAR_HEIGHT = 12;
const CHART_WIDTH = 480;
const LABEL_WIDTH = 108;

/**
 * Horizontal grouped bar: completion % vs test average % per subject.
 * Two categorical colors only (validated: `node scripts/validate_palette.js
 * "#2a78d6,#eb6834" --mode light|dark`, worst adjacent CVD ΔE 24.7/26.8,
 * normal-vision ΔE 33.6/31.8 — both clear the >=8 / >=15 targets by a wide
 * margin). Subject identity comes from the Y-axis label, never from a
 * per-subject hue, so this stays exactly 2 colors no matter how many
 * subjects (6–9) a class has — the identity dimension here is "which
 * metric," not "which subject."
 */
export default function SubjectPerformanceChart({ data }: { data: SubjectPerformancePoint[] }) {
  const titleId = useId();
  const [showTable, setShowTable] = useState(false);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Not enough data yet.</p>;
  }

  const height = data.length * ROW_HEIGHT + 32;
  const scaleWidth = CHART_WIDTH - LABEL_WIDTH - 40;

  return (
    <div className="viz-subject-chart">
      <style>{`
        .viz-subject-chart {
          --surface-1: transparent;
          --text-primary: hsl(var(--foreground));
          --text-secondary: hsl(var(--muted-foreground));
          --grid-line: hsl(var(--border));
          --series-1: #2a78d6;
          --series-2: #eb6834;
        }
        .dark .viz-subject-chart {
          --series-1: #3987e5;
          --series-2: #d95926;
        }
      `}</style>

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 rounded-full" style={{ background: "var(--series-1)" }} aria-hidden="true" />
            <span className="text-muted-foreground">Completion</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 rounded-full" style={{ background: "var(--series-2)" }} aria-hidden="true" />
            <span className="text-muted-foreground">Test average</span>
          </span>
        </div>
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
          <caption className="sr-only">Subject performance: completion percentage and test average percentage</caption>
          <thead>
            <tr className="text-left text-muted-foreground text-xs">
              <th scope="col" className="font-medium py-1">Subject</th>
              <th scope="col" className="font-medium py-1">Completion</th>
              <th scope="col" className="font-medium py-1">Test average</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.subject_id} className="border-t border-border">
                <td className="py-1.5">{d.subject_name}</td>
                <td className="py-1.5">{d.completion_pct}%</td>
                <td className="py-1.5">{d.average_score === null ? "No tests yet" : `${d.average_score}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <svg
          role="img"
          aria-labelledby={titleId}
          viewBox={`0 0 ${CHART_WIDTH} ${height}`}
          width="100%"
          height={height}
          className="overflow-visible"
        >
          <title id={titleId}>
            Subject performance: completion and test average percentage for {data.map((d) => d.subject_name).join(", ")}
          </title>
          {/* hairline gridlines at 0/25/50/75/100% */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const x = LABEL_WIDTH + (tick / 100) * scaleWidth;
            return (
              <g key={tick}>
                <line x1={x} y1={8} x2={x} y2={height - 20} stroke="var(--grid-line)" strokeWidth={1} />
                <text x={x} y={height - 6} fontSize={10} fill="var(--text-secondary)" textAnchor="middle">
                  {tick}%
                </text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const y = 16 + i * ROW_HEIGHT;
            const completionW = (d.completion_pct / 100) * scaleWidth;
            const scoreW = d.average_score === null ? 0 : (d.average_score / 100) * scaleWidth;
            return (
              <g key={d.subject_id}>
                <text x={LABEL_WIDTH - 8} y={y + BAR_HEIGHT + 2} fontSize={12} fill="var(--text-primary)" textAnchor="end">
                  {d.subject_name}
                </text>
                <rect x={LABEL_WIDTH} y={y} width={Math.max(completionW, 1)} height={BAR_HEIGHT} rx={4} fill="var(--series-1)">
                  <title>{`${d.subject_name} — Completion: ${d.completion_pct}%`}</title>
                </rect>
                <text x={LABEL_WIDTH + completionW + 6} y={y + BAR_HEIGHT - 2} fontSize={10} fill="var(--text-secondary)">
                  {d.completion_pct}%
                </text>
                {d.average_score !== null ? (
                  <>
                    <rect x={LABEL_WIDTH} y={y + BAR_HEIGHT + 4} width={Math.max(scoreW, 1)} height={BAR_HEIGHT} rx={4} fill="var(--series-2)">
                      <title>{`${d.subject_name} — Test average: ${d.average_score}%`}</title>
                    </rect>
                    <text x={LABEL_WIDTH + scoreW + 6} y={y + 2 * BAR_HEIGHT + 2} fontSize={10} fill="var(--text-secondary)">
                      {d.average_score}%
                    </text>
                  </>
                ) : (
                  <text x={LABEL_WIDTH} y={y + 2 * BAR_HEIGHT + 2} fontSize={10} fill="var(--text-secondary)" fontStyle="italic">
                    No tests yet
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
