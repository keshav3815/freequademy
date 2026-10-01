import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { NOTES_PAGE_SIZE, sanitizeSearch, type NotesQueryState } from "@/lib/studyNotes";

export interface NoteStat {
  subject_id: string;
  chapter_id: string;
  note_count: number;
  completed_count: number;
  last_updated_at: string | null;
}

export interface NoteCardData {
  id: string;
  title: string;
  summary: string | null;
  duration_minutes: number;
  chapter_id: string;
  sort_order: number;
  updated_at: string;
  progressStatus: "in_progress" | "completed" | null;
  saved: boolean;
}

/** Per-chapter note counts + own completion for one class (server-side aggregate). */
export function useStudyNoteStats(classLevel: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["study-notes", "stats", classLevel, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_study_note_stats", { _class_level: classLevel });
      if (error) throw error;
      return (data ?? []) as NoteStat[];
    },
  });
}

interface PageArgs {
  classLevel: number;
  /** Chapters in scope: the selected chapter, the selected subject's chapters, or the whole class. */
  scopeChapterIds: string[] | undefined;
  /** Chapters whose title (or subject name) matches the search text. */
  matchingChapterIds: string[];
  state: NotesQueryState;
}

const NOTE_COLUMNS = "id, title, summary, duration_minutes, chapter_id, sort_order, updated_at, chapters(sort_order)";

/**
 * One page of study notes. Scope, search, progress filter, sort and paging are
 * all applied in the database query — the browser only ever receives the
 * current page (plus the student's own small saved/progress id lists needed
 * to express "Saved", "Recent" and progress filters).
 */
export function useStudyNotesPage({ classLevel, scopeChapterIds, matchingChapterIds, state }: PageArgs) {
  const { user } = useAuth();
  const uid = user?.id;
  const q = sanitizeSearch(state.q);

  return useQuery({
    queryKey: ["study-notes", "page", classLevel, uid, scopeChapterIds, matchingChapterIds, { ...state, q }],
    enabled: !!uid && scopeChapterIds !== undefined,
    placeholderData: (previous) => previous,
    queryFn: async () => {
      if (!scopeChapterIds || scopeChapterIds.length === 0) return { rows: [] as NoteCardData[], total: 0 };

      // Own progress / saved rows, already narrowed to the chapters in scope by the database.
      const [{ data: progressRows, error: progressError }, { data: savedRows, error: savedError }] = await Promise.all([
        supabase
          .from("lesson_progress")
          .select("lesson_id, status, last_viewed_at, lessons!inner(chapter_id)")
          .in("lessons.chapter_id", scopeChapterIds)
          .order("last_viewed_at", { ascending: false })
          .limit(500),
        supabase
          .from("saved_items")
          .select("lesson_id, lessons!inner(chapter_id)")
          .in("lessons.chapter_id", scopeChapterIds)
          .limit(500),
      ]);
      if (progressError) throw progressError;
      if (savedError) throw savedError;
      const progress = new Map((progressRows ?? []).map((p) => [p.lesson_id, p]));
      const savedIds = new Set((savedRows ?? []).map((s) => s.lesson_id as string));

      let restrictTo: string[] | null = null;
      if (state.view === "saved") restrictTo = [...savedIds];
      if (state.view === "recent") restrictTo = (progressRows ?? []).slice(0, 50).map((p) => p.lesson_id);
      if (state.status === "in_progress" || state.status === "completed") {
        const withStatus = (progressRows ?? []).filter((p) => p.status === state.status).map((p) => p.lesson_id);
        restrictTo = restrictTo ? restrictTo.filter((id) => withStatus.includes(id)) : withStatus;
      }
      if (restrictTo && restrictTo.length === 0) return { rows: [], total: 0 };

      let query = supabase
        .from("lessons")
        .select(NOTE_COLUMNS, { count: "exact" })
        .eq("status", "published")
        .eq("content_format", "standard")
        .neq("content_md", "")
        .in("chapter_id", scopeChapterIds);
      if (restrictTo) query = query.in("id", restrictTo);
      if (state.status === "not_started" && progress.size > 0) query = query.not("id", "in", `(${[...progress.keys()].join(",")})`);
      if (q) {
        const clauses = [`title.ilike.*${q}*`, `summary.ilike.*${q}*`];
        if (matchingChapterIds.length) clauses.push(`chapter_id.in.(${matchingChapterIds.join(",")})`);
        query = query.or(clauses.join(","));
      }
      if (state.sort === "newest") query = query.order("updated_at", { ascending: false });
      else if (state.sort === "title") query = query.order("title");
      else query = query.order("chapters(sort_order)").order("sort_order");

      // "Recent" keeps the student's own viewing order, so it is a single bounded page.
      const from = state.view === "recent" ? 0 : (state.page - 1) * NOTES_PAGE_SIZE;
      const to = state.view === "recent" ? 49 : from + NOTES_PAGE_SIZE - 1;
      const { data, error, count } = await query.range(from, to);
      if (error) throw error;

      let rows: NoteCardData[] = (data ?? []).map((l) => ({
        id: l.id,
        title: l.title,
        summary: l.summary,
        duration_minutes: l.duration_minutes,
        chapter_id: l.chapter_id,
        sort_order: l.sort_order,
        updated_at: l.updated_at,
        progressStatus: (progress.get(l.id)?.status as NoteCardData["progressStatus"]) ?? null,
        saved: savedIds.has(l.id),
      }));
      if (state.view === "recent") {
        const order = new Map(restrictTo!.map((id, i) => [id, i]));
        rows = rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      }
      return { rows, total: count ?? rows.length };
    },
  });
}

/** One note with its full content, for the reader. */
export function useStudyNote(noteId: string) {
  return useQuery({
    queryKey: ["study-notes", "note", noteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, summary, content_md, duration_minutes, chapter_id, status, updated_at")
        .eq("id", noteId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** The notes of one chapter (titles only) with the student's own progress, for reader navigation. */
export function useChapterNotes(chapterId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["study-notes", "chapter", chapterId, user?.id],
    enabled: !!chapterId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, sort_order")
        .eq("chapter_id", chapterId!)
        .eq("status", "published")
        .eq("content_format", "standard")
        .neq("content_md", "")
        .order("sort_order");
      if (error) throw error;
      const ids = (data ?? []).map((l) => l.id);
      const { data: progress, error: progressError } = ids.length
        ? await supabase.from("lesson_progress").select("lesson_id, status").in("lesson_id", ids)
        : { data: [], error: null };
      if (progressError) throw progressError;
      const status = new Map((progress ?? []).map((p) => [p.lesson_id, p.status]));
      return (data ?? []).map((l) => ({ ...l, status: (status.get(l.id) as "in_progress" | "completed" | undefined) ?? null }));
    },
  });
}
