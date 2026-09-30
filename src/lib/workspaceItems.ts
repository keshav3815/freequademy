import { WEAK_AREA_THRESHOLD } from "@/lib/testGrading";
import type { TestCategory, WorkspaceView } from "@/lib/learningModules";

export interface SubjectNode { id: string; name: string; slug: string; sort_order: number }
export interface ChapterNode { id: string; title: string; subject_id: string; sort_order: number }

interface ItemBase {
  id: string;
  title: string;
  subject_id: string;
  chapter_id: string | null;
  saved: boolean;
}

export interface LessonItem extends ItemBase {
  kind: "lesson";
  summary: string | null;
  duration_minutes: number;
  sort_order: number;
  progressStatus: "in_progress" | "completed" | null;
  lastViewedAt: string | null;
}

export interface TestItem extends ItemBase {
  kind: "test";
  description: string | null;
  difficulty: string;
  duration_minutes: number;
  test_type: string;
  bestPercentage: number | null;
  submittedCount: number;
  hasOpenAttempt: boolean;
  lastActivityAt: string | null;
}

export type WorkspaceItem = LessonItem | TestItem;

export interface ItemFilter {
  subjectId?: string | null;
  chapterId?: string | null;
  view?: WorkspaceView | null;
  category?: TestCategory | null;
  query?: string;
  status?: "all" | "not_started" | "in_progress" | "completed";
  difficulty?: "all" | "easy" | "medium" | "hard";
}

export function lessonStatus(item: LessonItem) {
  return item.progressStatus ?? "not_started";
}

function matchesView(item: WorkspaceItem, view: WorkspaceView): boolean {
  switch (view) {
    case "all":
    case "results":
    case "weak":
      return true;
    case "saved":
      return item.saved;
    case "recent":
      return item.kind === "lesson" ? item.lastViewedAt !== null : item.lastActivityAt !== null;
    case "in_progress":
      return item.kind === "lesson" ? item.progressStatus === "in_progress" : item.hasOpenAttempt;
    case "completed":
      return item.kind === "lesson" ? item.progressStatus === "completed" : item.submittedCount > 0;
    case "needs_revision":
      return item.kind === "test" && item.bestPercentage !== null && item.bestPercentage < WEAK_AREA_THRESHOLD;
    case "available":
      return item.kind === "test" && item.submittedCount === 0;
  }
}

/**
 * Applies the workspace's route state (subject / chapter / view / category)
 * and the in-page search + filter controls to real catalog rows. Pure, so the
 * same rules are unit-tested and shared by every module.
 */
export function filterItems<T extends WorkspaceItem>(
  items: T[],
  filter: ItemFilter,
  names: { subjects: Map<string, string>; chapters: Map<string, string> },
): T[] {
  const q = filter.query?.trim().toLowerCase() ?? "";
  const result = items.filter((item) => {
    if (filter.subjectId && item.subject_id !== filter.subjectId) return false;
    if (filter.chapterId && item.chapter_id !== filter.chapterId) return false;
    if (filter.view && !matchesView(item, filter.view)) return false;
    if (filter.category && (item.kind !== "test" || item.test_type !== filter.category)) return false;
    if (filter.status && filter.status !== "all" && (item.kind !== "lesson" || lessonStatus(item) !== filter.status)) return false;
    if (filter.difficulty && filter.difficulty !== "all" && (item.kind !== "test" || item.difficulty !== filter.difficulty)) return false;
    if (q) {
      const haystack = [
        item.title,
        item.kind === "lesson" ? item.summary : item.description,
        names.subjects.get(item.subject_id),
        item.chapter_id ? names.chapters.get(item.chapter_id) : null,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  if (filter.view === "recent") {
    const at = (i: WorkspaceItem) => (i.kind === "lesson" ? i.lastViewedAt : i.lastActivityAt) ?? "";
    return [...result].sort((a, b) => at(b).localeCompare(at(a)));
  }
  return result;
}

/** Real item counts per subject, for the overview grid (never estimated). */
export function countBySubject(items: WorkspaceItem[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.subject_id, (counts.get(item.subject_id) ?? 0) + 1);
  return counts;
}
