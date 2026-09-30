export const NOTES_PAGE_SIZE = 12;

export type NotesSort = "course" | "newest" | "title";
export type NotesStatus = "all" | "not_started" | "in_progress" | "completed";
export type NotesView = "all" | "saved" | "recent";

export const SORT_LABEL: Record<NotesSort, string> = {
  course: "Course order",
  newest: "Recently updated",
  title: "Title A–Z",
};

export const STATUS_TABS: { value: NotesStatus; label: string }[] = [
  { value: "all", label: "All Notes" },
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export interface NotesQueryState {
  view: NotesView;
  q: string;
  sort: NotesSort;
  status: NotesStatus;
  page: number;
}

export function parseNotesParams(params: URLSearchParams): NotesQueryState {
  const view = params.get("view");
  const sort = params.get("sort");
  const status = params.get("status");
  const page = Number.parseInt(params.get("page") ?? "1", 10);
  return {
    view: view === "saved" || view === "recent" || view === "all" ? view : "all",
    q: (params.get("q") ?? "").slice(0, 80),
    sort: sort === "newest" || sort === "title" || sort === "course" ? sort : "course",
    status: status === "not_started" || status === "in_progress" || status === "completed" ? status : "all",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/**
 * Makes free text safe to embed in a PostgREST `or=(…)` filter: the
 * characters that delimit filters or act as wildcards are removed, so a
 * search can never change which filters run.
 */
export function sanitizeSearch(raw: string): string {
  return raw.replace(/[,()*%\\:."']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function formatUpdated(iso: string | null, now: Date = new Date()): string | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(then)) / 86_400_000);
  if (days <= 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  if (days < 30) return `Updated ${days} days ago`;
  return `Updated ${then.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
}

/** Subtle per-subject accent, falling back to the brand primary. */
const ACCENTS: Record<string, string> = {
  mathematics: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  physics: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  chemistry: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  biology: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  science: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  english: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  hindi: "bg-orange-500/10 text-orange-800 dark:text-orange-300",
};

export function subjectAccent(slug: string | undefined): string {
  return (slug && ACCENTS[slug]) || "bg-primary/10 text-primary";
}
