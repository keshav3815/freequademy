import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ClipboardCheck, FileText, FolderOpen, Search, User, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAssignments, useCourses, useLessonIndex, useResources, useStudents } from "@/hooks/useTeacher";
import { cn } from "@/lib/utils";

interface Result {
  id: string;
  group: "Students" | "Courses" | "Assignments" | "Lessons" | "Resources";
  title: string;
  meta: string;
  to: string;
  icon: LucideIcon;
}

const MAX_PER_GROUP = 5;

/** Search results. Mounted only while the dialog is open, so the queries it uses load on demand. */
function SearchResults({ query, onPick }: { query: string; onPick: (to: string) => void }) {
  const students = useStudents();
  const courses = useCourses();
  const assignments = useAssignments();
  const lessons = useLessonIndex();
  const resources = useResources();
  const [active, setActive] = useState(0);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const match = (s: string | null | undefined) => !!s && s.toLowerCase().includes(q);
    const take = <T,>(rows: T[] | undefined, fn: (r: T) => Result | null) => (rows ?? []).map(fn).filter((r): r is Result => !!r).slice(0, MAX_PER_GROUP);
    return [
      ...take(students.data, (s) => (match(s.full_name) ? { id: s.student_id, group: "Students", title: s.full_name, meta: s.subject_names.join(", ") || "Student", to: `/teacher/students/${s.student_id}`, icon: User } : null)),
      ...take(courses.data, (c) => (match(c.subject_name) ? { id: c.subject_id, group: "Courses", title: `${c.subject_name} — Class ${c.class_level}`, meta: `${c.lesson_count} lessons`, to: `/teacher/courses/${c.subject_id}`, icon: BookOpen } : null)),
      ...take(assignments.data, (a) => (match(a.title) ? { id: a.test_id, group: "Assignments", title: a.title, meta: `${a.subject_name} · ${a.submitted_count} submitted`, to: `/teacher/assignments/${a.test_id}/submissions`, icon: ClipboardCheck } : null)),
      ...take(lessons.data, (l) => (match(l.title) ? { id: l.id, group: "Lessons", title: l.title, meta: l.status === "published" ? "Published lesson" : "Draft lesson", to: `/teacher/lessons/${l.id}/edit`, icon: FileText } : null)),
      ...take(resources.data, (r) => (match(r.title) || r.tags.some(match) ? { id: r.id, group: "Resources", title: r.title, meta: r.folder, to: `/teacher/resources?q=${encodeURIComponent(r.title)}`, icon: FolderOpen } : null)),
    ];
  }, [query, students.data, courses.data, assignments.data, lessons.data, resources.data]);

  useEffect(() => setActive(0), [query]);

  const loading = [students, courses, assignments, lessons, resources].some((q) => q.isLoading);

  // Keyboard handling lives on the input (see parent) via a custom event.
  useEffect(() => {
    const handler = (e: Event) => {
      const key = (e as CustomEvent<string>).detail;
      if (key === "ArrowDown") setActive((a) => Math.min(results.length - 1, a + 1));
      if (key === "ArrowUp") setActive((a) => Math.max(0, a - 1));
      if (key === "Enter" && results[active]) onPick(results[active].to);
    };
    window.addEventListener("tp-search-key", handler);
    return () => window.removeEventListener("tp-search-key", handler);
  }, [results, active, onPick]);

  if (!query.trim()) {
    return <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">Search students, courses, assignments, lessons and resources.</p>;
  }
  if (results.length === 0) {
    return <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">{loading ? "Searching…" : `No results for “${query}”.`}</p>;
  }

  let lastGroup = "";
  return (
    <ul id="tp-search-results" role="listbox" aria-label="Search results" className="max-h-[60vh] overflow-y-auto p-2">
      {results.map((r, i) => {
        const header = r.group !== lastGroup ? r.group : null;
        lastGroup = r.group;
        const Icon = r.icon;
        return (
          <li key={`${r.group}-${r.id}`} role="presentation">
            {header && <div className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground first:pt-1">{header}</div>}
            <div
              id={`tp-search-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => onPick(r.to)}
              className={cn("flex cursor-pointer items-center gap-3 rounded-md px-2 py-2", i === active ? "bg-accent" : "hover:bg-muted")}
            >
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] text-foreground">{r.title}</span>
                <span className="block truncate text-[12px] text-muted-foreground">{r.meta}</span>
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pick = (to: string) => {
    setOpen(false);
    setQuery("");
    navigate(to);
  };

  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("tp-search-key", { detail: e.key }));
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tp-focus flex h-9 w-full items-center gap-2 rounded-md border border-input bg-card px-3 text-[13px] text-muted-foreground transition-colors hover:border-primary/40"
        aria-label="Search (Ctrl+K)"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="flex-1 truncate text-left">Search students, courses, assignments…</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[11px] sm:inline">Ctrl K</kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[15%] max-w-xl translate-y-0 gap-0 overflow-hidden rounded-lg p-0 data-[state=open]:slide-in-from-top-[10%] [&>button]:hidden">
          <DialogTitle className="sr-only">Search the teacher portal</DialogTitle>
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKey}
              placeholder="Search students, courses, assignments, lessons, resources"
              aria-label="Search"
              aria-controls="tp-search-results"
              className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            />
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">Esc</kbd>
          </div>
          {open && <SearchResults query={query} onPick={pick} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
