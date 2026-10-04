import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Hand-rolled SVG charts for the teacher portal (same approach as the student
 * dashboard's ScoreTrendChart — no chart library in the bundle).
 *
 * Every chart here plots ONE series in the brand primary, so no legend box is
 * needed (the panel title names the series). Marks: 2px line, r=4 end/hover
 * dot with a 2px surface ring, ≤24px bars with 4px rounded data-ends and a
 * square baseline, hairline solid gridlines. Missing data (NULL weeks) is a
 * gap in the line, never a dip to zero. Each chart has a hover/focus tooltip
 * and a "Show table" alternative.
 */

const TEXT_MUTED = "hsl(var(--muted-foreground))";
const GRID = "hsl(var(--border))";
const SERIES = "hsl(var(--primary))";
const SURFACE = "hsl(var(--card))";

/** Measures an element's width; a callback ref so it also works when the element mounts late. */
function useWidth<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    setWidth(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, [el]);
  return { ref: setEl, width };
}

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const n = max / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

function TableToggle({ showTable, onToggle }: { showTable: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-expanded={showTable} className="tp-focus rounded text-[12px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
      {showTable ? "Show chart" : "Show table"}
    </button>
  );
}

function DataTable({ caption, rows, valueHeader }: { caption: string; rows: { label: string; value: string }[]; valueHeader: string }) {
  return (
    <div className="max-h-72 overflow-auto">
      <table className="w-full text-[13px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-card">
          <tr className="text-left text-[12px] text-muted-foreground">
            <th scope="col" className="py-1.5 font-medium">Period</th>
            <th scope="col" className="py-1.5 text-right font-medium">{valueHeader}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-border">
              <td className="py-1.5">{r.label}</td>
              <td className="tp-tabular py-1.5 text-right">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface LinePoint {
  label: string; // x tick, e.g. "Sep 8"
  value: number | null;
  detail?: string; // extra tooltip line
}

export function LineChart({
  data,
  title,
  valueLabel,
  format = (v) => String(v),
  yMax,
  height = 220,
  empty,
}: {
  data: LinePoint[];
  title: string;
  valueLabel: string;
  format?: (v: number) => string;
  yMax?: number;
  height?: number;
  empty?: ReactNode;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const titleId = useId();

  const values = data.map((d) => d.value).filter((v): v is number => v !== null);
  if (values.length === 0) {
    return <div className="flex items-center justify-center text-center text-[13px] text-muted-foreground" style={{ height }}>{empty ?? "No data for this period yet."}</div>;
  }

  const PAD = { top: 16, right: 16, bottom: 28, left: 40 };
  const max = yMax ?? niceMax(Math.max(...values) * 1.1);
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => PAD.top + (1 - v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);

  // Split into runs so NULL weeks become gaps.
  const segments: string[] = [];
  let current = "";
  data.forEach((d, i) => {
    if (d.value === null) {
      if (current) segments.push(current);
      current = "";
      return;
    }
    current += `${current ? "L" : "M"}${x(i)},${y(d.value)}`;
  });
  if (current) segments.push(current);
  const area = segments.map((s) => {
    const pts = s.slice(1).split("L").map((p) => p.split(",").map(Number));
    return `M${pts[0][0]},${PAD.top + innerH} L${s.slice(1)} L${pts[pts.length - 1][0]},${PAD.top + innerH} Z`;
  });

  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(innerW / 64))));
  const lastIdx = data.map((d) => d.value).lastIndexOf(values[values.length - 1]);
  const activePoint = active !== null ? data[active] : null;

  const onPointer = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left - PAD.left;
    const i = data.length === 1 ? 0 : Math.round((px / innerW) * (data.length - 1));
    setActive(Math.max(0, Math.min(data.length - 1, i)));
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") setActive((a) => Math.min(data.length - 1, (a ?? -1) + 1));
    else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? data.length) - 1));
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  };

  return (
    <div>
      <div className="mb-1 flex justify-end">
        <TableToggle showTable={showTable} onToggle={() => setShowTable((v) => !v)} />
      </div>
      {showTable ? (
        <DataTable caption={title} valueHeader={valueLabel} rows={data.map((d) => ({ label: d.label, value: d.value === null ? "No data" : format(d.value) }))} />
      ) : (
        <div ref={ref} className="relative" style={{ height }}>
          {width > 0 && (
            <svg
              width={width}
              height={height}
              role="img"
              aria-labelledby={titleId}
              tabIndex={0}
              onKeyDown={onKey}
              onBlur={() => setActive(null)}
              className="tp-focus rounded"
              onPointerMove={(e) => onPointer(e.clientX, e.currentTarget.getBoundingClientRect())}
              onPointerLeave={() => setActive(null)}
            >
              <title id={titleId}>
                {`${title}: ${data.length} periods, latest ${format(values[values.length - 1])}. Use arrow keys to inspect values.`}
              </title>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
                  <text x={PAD.left - 8} y={y(t) + 4} fontSize={11} fill={TEXT_MUTED} textAnchor="end" className="tp-tabular">
                    {format(Math.round(t))}
                  </text>
                </g>
              ))}
              {data.map((d, i) => {
                const last = i === data.length - 1;
                // keep the last tick; drop a regular tick that would collide with it
                const show = last || (i % labelEvery === 0 && data.length - 1 - i >= labelEvery);
                return show ? (
                  <text key={d.label} x={x(i)} y={height - 8} fontSize={11} fill={TEXT_MUTED} textAnchor={last && data.length > 1 ? "end" : i === 0 && data.length > 1 ? "start" : "middle"}>
                    {d.label}
                  </text>
                ) : null;
              })}
              {area.map((a) => (
                <path key={a} d={a} fill={SERIES} opacity={0.08} />
              ))}
              {segments.map((s) => (
                <path key={s} d={s} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              ))}
              {/* isolated single points (a run of length one) still need a mark */}
              {data.map((d, i) =>
                d.value !== null && (data[i - 1]?.value ?? null) === null && (data[i + 1]?.value ?? null) === null ? (
                  <circle key={`iso-${i}`} cx={x(i)} cy={y(d.value)} r={3} fill={SERIES} />
                ) : null,
              )}
              {active === null && lastIdx >= 0 && (
                <>
                  <circle cx={x(lastIdx)} cy={y(values[values.length - 1])} r={4} fill={SERIES} stroke={SURFACE} strokeWidth={2} />
                  <text x={x(lastIdx)} y={y(values[values.length - 1]) - 10} fontSize={12} fontWeight={600} fill="hsl(var(--foreground))" textAnchor={lastIdx > data.length * 0.8 ? "end" : "middle"}>
                    {format(values[values.length - 1])}
                  </text>
                </>
              )}
              {active !== null && (
                <>
                  <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + innerH} stroke={TEXT_MUTED} strokeWidth={1} opacity={0.5} />
                  {data[active].value !== null && <circle cx={x(active)} cy={y(data[active].value!)} r={5} fill={SERIES} stroke={SURFACE} strokeWidth={2} />}
                </>
              )}
            </svg>
          )}
          {activePoint && (
            <div
              role="status"
              className="pointer-events-none absolute top-1 z-10 min-w-[120px] rounded-md border border-border bg-popover px-3 py-2 text-[12px] shadow-[var(--tp-shadow-md)]"
              style={{ left: Math.min(Math.max(0, x(active!) - 60), Math.max(0, width - 140)) }}
            >
              <div className="font-medium text-foreground">{activePoint.label}</div>
              <div className="text-muted-foreground">
                {valueLabel}: <span className="tp-tabular font-semibold text-foreground">{activePoint.value === null ? "No data" : format(activePoint.value)}</span>
              </div>
              {activePoint.detail && <div className="text-muted-foreground">{activePoint.detail}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export interface BarDatum {
  label: string;
  value: number | null;
  sublabel?: string;
  href?: string;
}

/** Horizontal bars, value at the tip. For ranked comparisons (assignments, courses). */
export function BarList({
  data,
  title,
  valueLabel,
  format = (v) => String(v),
  max,
  empty,
}: {
  data: BarDatum[];
  title: string;
  valueLabel: string;
  format?: (v: number) => string;
  max?: number;
  empty?: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  if (data.length === 0) return <p className="py-10 text-center text-[13px] text-muted-foreground">{empty ?? "Nothing to compare yet."}</p>;
  const top = max ?? niceMax(Math.max(1, ...data.map((d) => d.value ?? 0)));
  return (
    <div>
      <div className="mb-2 flex justify-end">
        <TableToggle showTable={showTable} onToggle={() => setShowTable((v) => !v)} />
      </div>
      {showTable ? (
        <DataTable caption={title} valueHeader={valueLabel} rows={data.map((d) => ({ label: d.label, value: d.value === null ? "No data" : format(d.value) }))} />
      ) : (
        <ul className="space-y-3" aria-label={title}>
          {data.map((d) => {
            const w = d.value === null ? 0 : Math.max(0, Math.min(100, (d.value / top) * 100));
            return (
              <li key={d.label} className="group" title={`${d.label}: ${d.value === null ? "No data" : format(d.value)}`}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="min-w-0 truncate text-foreground">
                    {d.label}
                    {d.sublabel && <span className="ml-2 text-[12px] text-muted-foreground">{d.sublabel}</span>}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative h-3 flex-1">
                    <div className="absolute inset-y-0 left-0 w-full rounded-sm bg-muted/60" aria-hidden="true" />
                    <div
                      className="absolute inset-y-0 left-0 rounded-r-[4px] bg-primary transition-[width,opacity] duration-500 group-hover:opacity-80"
                      style={{ width: `${w}%` }}
                      aria-hidden="true"
                    />
                  </div>
                  <span className="tp-tabular w-14 shrink-0 text-right text-[12px] font-medium text-foreground">{d.value === null ? "—" : format(d.value)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Vertical columns with a 2px surface gap; value on the cap. Used for distributions. */
export function ColumnChart({
  data,
  title,
  valueLabel,
  height = 200,
  empty,
}: {
  data: { label: string; value: number }[];
  title: string;
  valueLabel: string;
  height?: number;
  empty?: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="py-10 text-center text-[13px] text-muted-foreground">{empty ?? "No data yet."}</p>;
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div>
      <div className="mb-2 flex justify-end">
        <TableToggle showTable={showTable} onToggle={() => setShowTable((v) => !v)} />
      </div>
      {showTable ? (
        <DataTable caption={title} valueHeader={valueLabel} rows={data.map((d) => ({ label: d.label, value: String(d.value) }))} />
      ) : (
        <div>
          <div className="flex items-end gap-[2px] border-b border-border" style={{ height }} role="list" aria-label={title}>
            {data.map((d, i) => {
              const h = max === 0 ? 0 : (d.value / max) * (height - 22);
              return (
                <div
                  key={d.label}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${d.label}: ${d.value} ${valueLabel.toLowerCase()}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="tp-focus flex h-full flex-1 flex-col items-center justify-end rounded-t"
                >
                  <span className={cn("tp-tabular mb-1 text-[11px] font-medium", active === i ? "text-foreground" : "text-muted-foreground")}>
                    {d.value > 0 ? d.value : ""}
                  </span>
                  <div
                    className={cn("w-full max-w-[24px] rounded-t-[4px] bg-primary transition-opacity", active !== null && active !== i && "opacity-60")}
                    style={{ height: Math.max(d.value > 0 ? 2 : 0, h) }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 flex gap-[2px]">
            {data.map((d) => (
              <span key={d.label} className="flex-1 text-center text-[10px] text-muted-foreground sm:text-[11px]">
                {d.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
