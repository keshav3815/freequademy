import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChapterCardData {
  id: string;
  title: string;
  noteCount: number;
  completedCount: number;
}

function ProgressLine({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] text-foreground/60">
        <span>{done} of {total} completed</span>
        <span className="font-medium tabular-nums text-foreground/80">{pct}%</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted/25"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${done} of ${total} notes completed`}
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Real chapters of the subject; counts and completion come from get_study_note_stats. */
export function ChapterCards({ chapters, activeId, hrefFor, accent }: {
  chapters: ChapterCardData[];
  activeId: string | null;
  hrefFor: (id: string) => string;
  accent: string;
}) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {chapters.map((c, i) => {
        const active = c.id === activeId;
        const done = c.noteCount > 0 && c.completedCount === c.noteCount;
        return (
          <li key={c.id}>
            <Link
              to={hrefFor(c.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex h-full flex-col gap-3 rounded-2xl border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "border-primary ring-1 ring-primary/40" : "border-border/70 hover:border-primary/40",
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("rounded-lg px-2 py-0.5 text-xs font-semibold tabular-nums", accent)}>{String(i + 1).padStart(2, "0")}</span>
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="All notes completed" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-foreground/30 transition-colors group-hover:text-primary" aria-hidden="true" />
                )}
              </div>
              <p className="font-semibold leading-snug line-clamp-2">{c.title}</p>
              <p className="text-xs text-foreground/60">{c.noteCount} {c.noteCount === 1 ? "note" : "notes"}</p>
              {c.noteCount > 0 && <div className="mt-auto"><ProgressLine done={c.completedCount} total={c.noteCount} /></div>}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

export function SubjectCards({ subjects, hrefFor, accentFor }: {
  subjects: { id: string; name: string; slug: string; noteCount: number; chapterCount: number; completedCount: number }[];
  hrefFor: (slug: string) => string;
  accentFor: (slug: string) => string;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      {subjects.map((s) => (
        <li key={s.id}>
          <Link
            to={hrefFor(s.slug)}
            className="group flex h-full flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center gap-3">
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold", accentFor(s.slug))} aria-hidden="true">
                {s.name.charAt(0)}
              </span>
              <p className="font-semibold truncate">{s.name}</p>
            </div>
            <p className="text-xs text-foreground/60">
              {s.noteCount} {s.noteCount === 1 ? "note" : "notes"} · {s.chapterCount} {s.chapterCount === 1 ? "chapter" : "chapters"}
            </p>
            {s.noteCount > 0 && <div className="mt-auto"><ProgressLine done={s.completedCount} total={s.noteCount} /></div>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
