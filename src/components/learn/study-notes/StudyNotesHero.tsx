import { BookOpenText, CheckCircle2, FileText, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description: string;
  accent: string;
  stats: { notes: number; chapters: number; completed: number } | null;
}

/** Page header with a lightweight, icon-only visual (no image assets). */
export default function StudyNotesHero({ title, description, accent, stats }: Props) {
  return (
    <header className="relative overflow-hidden rounded-3xl border border-border/70 bg-card px-6 py-7 md:px-8">
      <div className="relative z-10 max-w-2xl">
        <h1 className="text-3xl md:text-[2.25rem] font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm md:text-[15px] text-foreground/70">{description}</p>
        {stats && (
          <dl className="mt-5 flex flex-wrap gap-2 text-xs">
            {[
              { icon: FileText, label: "notes", value: stats.notes },
              { icon: Layers, label: stats.chapters === 1 ? "chapter" : "chapters", value: stats.chapters },
              { icon: CheckCircle2, label: "completed", value: stats.completed },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 py-1.5">
                <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <dt className="sr-only">{label}</dt>
                <dd><span className="font-semibold tabular-nums">{value}</span> {label}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="pointer-events-none absolute -right-6 -top-6 hidden sm:block" aria-hidden="true">
        <div className={cn("relative h-44 w-44 rounded-[2.5rem] rotate-12", accent)}>
          <div className="absolute inset-6 rounded-[1.75rem] bg-card/70" />
          <BookOpenText className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 -rotate-12 opacity-80" />
        </div>
      </div>
    </header>
  );
}
