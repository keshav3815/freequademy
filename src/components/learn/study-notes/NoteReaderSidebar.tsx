import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Circle, CircleDot } from "lucide-react";
import type { MarkdownHeading } from "@/lib/markdownHeadings";
import { cn } from "@/lib/utils";

interface Props {
  backHref: string;
  backLabel: string;
  chapterTitle: string;
  notes: { id: string; title: string; status: "in_progress" | "completed" | null }[];
  currentId: string;
  hrefFor: (id: string) => string;
  headings: MarkdownHeading[];
  activeHeading: string | null;
  onNavigate?: () => void;
}

/** In the reader the module sidebar becomes chapter navigation + "On this page". */
export default function NoteReaderSidebar({ backHref, backLabel, chapterTitle, notes, currentId, hrefFor, headings, activeHeading, onNavigate }: Props) {
  const completed = notes.filter((n) => n.status === "completed").length;
  const pct = notes.length ? Math.round((completed / notes.length) * 100) : 0;

  return (
    <nav aria-label="Chapter navigation" className="p-4 space-y-6">
      <Link
        to={backHref}
        onClick={onNavigate}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-foreground/70 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {backLabel}
      </Link>

      <div className="px-2 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/55">Chapter</p>
        <p className="font-semibold leading-snug">{chapterTitle}</p>
        {notes.length > 0 && (
          <div className="space-y-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted/25" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${completed} of ${notes.length} notes in this chapter completed`}>
              <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[11px] text-foreground/60">{completed} of {notes.length} completed</p>
          </div>
        )}
      </div>

      <div>
        <p className="px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/55">Notes in this chapter</p>
        <ol className="space-y-0.5">
          {notes.map((n) => {
            const active = n.id === currentId;
            const Icon = n.status === "completed" ? CheckCircle2 : n.status === "in_progress" ? CircleDot : Circle;
            return (
              <li key={n.id}>
                <Link
                  to={hrefFor(n.id)}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-start gap-2 rounded-lg px-2 py-2 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "bg-primary/10 text-primary font-medium" : "text-foreground/75 hover:bg-muted/30 hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn("mt-0.5 h-4 w-4 shrink-0", n.status === "completed" && "text-green-600")}
                    aria-label={n.status === "completed" ? "Completed" : n.status === "in_progress" ? "In progress" : "Not started"}
                  />
                  <span className="line-clamp-2">{n.title}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>

      {headings.length > 0 && (
        <div>
          <p className="px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/55">On this page</p>
          <ul className="space-y-0.5 border-l border-border/70 ml-2">
            {headings.map((h) => {
              const active = h.id === activeHeading;
              return (
                <li key={h.id}>
                  <a
                    href={`#${h.id}`}
                    onClick={onNavigate}
                    aria-current={active ? "location" : undefined}
                    className={cn(
                      "-ml-px block border-l-2 py-1.5 pr-2 text-[13px] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      h.level === 1 ? "pl-3" : h.level === 2 ? "pl-5" : "pl-7",
                      active ? "border-primary text-primary font-medium" : "border-transparent text-foreground/65 hover:text-foreground",
                    )}
                  >
                    {h.text}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </nav>
  );
}
