import type { ReactNode } from "react";
import { AlertCircle, BookOpen, SearchX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const bar = "bg-muted/25";

export function NoteCardsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" role="status" aria-label="Loading study notes">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border border-border/70 bg-card p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Skeleton className={`h-10 w-10 rounded-xl ${bar}`} />
            <div className="flex-1 space-y-2">
              <Skeleton className={`h-4 w-4/5 ${bar}`} />
              <Skeleton className={`h-3 w-1/3 ${bar}`} />
            </div>
          </div>
          <Skeleton className={`h-3 w-full ${bar}`} />
          <Skeleton className={`h-3 w-2/3 ${bar}`} />
          <div className="flex justify-between pt-2">
            <Skeleton className={`h-8 w-28 rounded-full ${bar}`} />
            <Skeleton className={`h-8 w-8 rounded-full ${bar}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChapterCardsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="rounded-2xl border border-border/70 bg-card p-4 space-y-3">
          <Skeleton className={`h-3 w-8 ${bar}`} />
          <Skeleton className={`h-4 w-3/4 ${bar}`} />
          <Skeleton className={`h-2 w-full rounded-full ${bar}`} />
        </div>
      ))}
    </div>
  );
}

function StateShell({ icon, title, body, action, role }: { icon: ReactNode; title: string; body: string; action?: ReactNode; role?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center" role={role}>
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">
        {icon}
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-foreground/65">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function NotesEmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <StateShell icon={<BookOpen className="h-6 w-6" />} title={title} body={body} action={action} />;
}

export function NotesSearchEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <StateShell
      icon={<SearchX className="h-6 w-6" />}
      title="No notes found"
      body="Try another topic, chapter or keyword."
      action={<Button variant="outline" size="sm" onClick={onClear}>Clear search</Button>}
    />
  );
}

/** A failed request is a failure with retry — never rendered as "0 notes". */
export function NotesErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-14 text-center" role="alert">
      <AlertCircle className="mx-auto mb-3 h-7 w-7 text-destructive" aria-hidden="true" />
      <h2 className="text-base font-semibold">Unable to load study notes</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-foreground/65">Something went wrong while loading your notes.</p>
      <Button className="mt-5" variant="outline" size="sm" onClick={onRetry}>Try again</Button>
    </div>
  );
}
