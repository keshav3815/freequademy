import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, CheckCircle2, CircleDot, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SaveButton } from "@/components/learn/workspace/WorkspaceItemCard";
import { formatUpdated } from "@/lib/studyNotes";
import type { NoteCardData } from "@/hooks/useStudyNotes";
import { cn } from "@/lib/utils";

interface Props {
  note: NoteCardData;
  href: string;
  chapterTitle?: string;
  subjectName?: string;
  accent: string;
}

export default function NoteCard({ note, href, chapterTitle, subjectName, accent }: Props) {
  const updated = formatUpdated(note.updated_at);
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", accent)} aria-hidden="true">
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug line-clamp-2">
            <Link to={href} className="hover:text-primary focus-visible:outline-none focus-visible:underline">{note.title}</Link>
          </h3>
          <p className="mt-0.5 truncate text-xs text-foreground/60">{[subjectName, chapterTitle].filter(Boolean).join(" · ")}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {note.progressStatus === "completed" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Completed
          </span>
        ) : note.progressStatus === "in_progress" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            <CircleDot className="h-3 w-3" aria-hidden="true" /> In progress
          </span>
        ) : (
          <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-foreground/65">Not started</span>
        )}
      </div>

      {note.summary && <p className="mt-3 text-sm text-foreground/70 line-clamp-2">{note.summary}</p>}

      <div className="mt-auto pt-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 pt-3 text-xs text-foreground/60">
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" /> {note.duration_minutes} min read</span>
          {updated && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> {updated}</span>}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Button asChild size="sm" className="rounded-full">
            <Link to={href} aria-label={`Open notes: ${note.title}`}>
              Open Notes <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <SaveButton kind="lesson" id={note.id} saved={note.saved} title={note.title} />
        </div>
      </div>
    </article>
  );
}
