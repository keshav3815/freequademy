import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { LearningModuleConfig } from "@/lib/learningModules";
import type { ChapterNode, LessonItem, SubjectNode, TestItem } from "@/lib/workspaceItems";

export interface AttemptRow {
  id: string;
  test_id: string;
  status: string;
  percentage: number | null;
  score: number | null;
  max_score: number | null;
  started_at: string;
  submitted_at: string | null;
}

/** Subjects and chapters of one class — the navigation tree for every module. */
export function useClassCurriculum(classLevel: number) {
  return useQuery({
    queryKey: ["curriculum", classLevel],
    queryFn: async () => {
      const { data: subjects, error } = await supabase
        .from("subjects")
        .select("id, name, slug, sort_order")
        .eq("class_level", classLevel)
        .order("sort_order");
      if (error) throw error;
      const ids = (subjects ?? []).map((s) => s.id);
      if (ids.length === 0) return { subjects: [] as SubjectNode[], chapters: [] as ChapterNode[] };
      const { data: chapters, error: chapterError } = await supabase
        .from("chapters")
        .select("id, title, subject_id, sort_order")
        .in("subject_id", ids)
        .order("sort_order");
      if (chapterError) throw chapterError;
      return { subjects: (subjects ?? []) as SubjectNode[], chapters: (chapters ?? []) as ChapterNode[] };
    },
    staleTime: 5 * 60_000,
  });
}

/**
 * Catalog + the student's own progress for one learning module. Only the
 * queries that module needs are enabled (a Videos page never fetches tests),
 * and every read goes through RLS: published content is public, progress,
 * attempts and saved items are the signed-in student's own rows only.
 */
export function useLearningWorkspace(module: LearningModuleConfig, classLevel: number) {
  const { user } = useAuth();
  const uid = user?.id;
  const isLesson = module.kind === "lesson";
  const curriculum = useClassCurriculum(classLevel);
  const chapterIds = useMemo(() => (curriculum.data?.chapters ?? []).map((c) => c.id), [curriculum.data]);
  const subjectIds = useMemo(() => (curriculum.data?.subjects ?? []).map((s) => s.id), [curriculum.data]);
  const chapterSubject = useMemo(
    () => new Map((curriculum.data?.chapters ?? []).map((c) => [c.id, c.subject_id])),
    [curriculum.data],
  );

  const lessons = useQuery({
    queryKey: ["workspace", module.id, "lessons", classLevel],
    enabled: isLesson && !!curriculum.data,
    queryFn: async () => {
      if (chapterIds.length === 0) return [];
      let query = supabase
        .from("lessons")
        .select("id, title, summary, video_url, duration_minutes, chapter_id, sort_order")
        .eq("status", "published")
        .in("chapter_id", chapterIds);
      if (module.id === "notes") query = query.eq("content_format", "standard").neq("content_md", "");
      if (module.id === "videos") query = query.eq("content_format", "standard").not("video_url", "is", null);
      if (module.id === "animated") query = query.eq("content_format", "animated");
      const { data, error } = await query.order("sort_order").limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const progress = useQuery({
    queryKey: ["workspace", "lesson-progress", uid],
    enabled: isLesson && !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from("lesson_progress").select("lesson_id, status, last_viewed_at").limit(5000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const tests = useQuery({
    queryKey: ["workspace", module.id, "tests", classLevel],
    enabled: !isLesson && !!curriculum.data,
    queryFn: async () => {
      if (subjectIds.length === 0) return [];
      let query = supabase
        .from("tests")
        .select("id, title, description, difficulty, duration_minutes, test_type, subject_id, chapter_id")
        .eq("status", "published")
        .in("subject_id", subjectIds);
      query = module.id === "quizzes" ? query.eq("test_type", "practice") : query.in("test_type", ["chapter", "full"]);
      const { data, error } = await query.order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const attempts = useQuery({
    queryKey: ["workspace", "attempts", uid],
    enabled: !isLesson && !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_attempts")
        .select("id, test_id, status, percentage, score, max_score, started_at, submitted_at")
        .order("started_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as AttemptRow[];
    },
  });

  const saved = useQuery({
    queryKey: ["workspace", "saved", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from("saved_items").select("id, lesson_id, test_id");
      if (error) throw error;
      return data ?? [];
    },
  });

  const lessonItems = useMemo<LessonItem[]>(() => {
    if (!isLesson || !lessons.data) return [];
    const progressById = new Map((progress.data ?? []).map((p) => [p.lesson_id, p]));
    const savedIds = new Set((saved.data ?? []).map((s) => s.lesson_id));
    return lessons.data.map((l) => {
      const p = progressById.get(l.id);
      return {
        kind: "lesson",
        id: l.id,
        title: l.title,
        summary: l.summary,
        duration_minutes: l.duration_minutes,
        sort_order: l.sort_order,
        chapter_id: l.chapter_id,
        subject_id: chapterSubject.get(l.chapter_id) ?? "",
        saved: savedIds.has(l.id),
        progressStatus: (p?.status as LessonItem["progressStatus"]) ?? null,
        lastViewedAt: p?.last_viewed_at ?? null,
      };
    });
  }, [isLesson, lessons.data, progress.data, saved.data, chapterSubject]);

  const testItems = useMemo<TestItem[]>(() => {
    if (isLesson || !tests.data) return [];
    const savedIds = new Set((saved.data ?? []).map((s) => s.test_id));
    const byTest = new Map<string, AttemptRow[]>();
    for (const a of attempts.data ?? []) byTest.set(a.test_id, [...(byTest.get(a.test_id) ?? []), a]);
    return tests.data.map((t) => {
      const rows = byTest.get(t.id) ?? [];
      const submitted = rows.filter((a) => a.status === "submitted");
      return {
        kind: "test",
        id: t.id,
        title: t.title,
        description: t.description,
        difficulty: t.difficulty,
        duration_minutes: t.duration_minutes,
        test_type: t.test_type,
        subject_id: t.subject_id,
        chapter_id: t.chapter_id,
        saved: savedIds.has(t.id),
        bestPercentage: submitted.length ? Math.max(...submitted.map((a) => Number(a.percentage ?? 0))) : null,
        submittedCount: submitted.length,
        hasOpenAttempt: rows.some((a) => a.status === "in_progress" && !a.submitted_at),
        lastActivityAt: rows[0]?.submitted_at ?? rows[0]?.started_at ?? null,
      };
    });
  }, [isLesson, tests.data, attempts.data, saved.data]);

  const catalogQueries = isLesson ? [curriculum, lessons, progress, saved] : [curriculum, tests, attempts, saved];

  return {
    curriculum: curriculum.data,
    items: isLesson ? lessonItems : testItems,
    attempts: attempts.data ?? [],
    isLoading: catalogQueries.some((q) => q.isLoading),
    isError: catalogQueries.some((q) => q.isError),
    refetch: () => catalogQueries.forEach((q) => q.isError && q.refetch()),
  };
}

export function useToggleSaved() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ kind, id, saved }: { kind: "lesson" | "test"; id: string; saved: boolean }) => {
      const column = kind === "lesson" ? "lesson_id" : "test_id";
      const { error } = saved
        ? await supabase.from("saved_items").delete().eq(column, id)
        : await supabase.from("saved_items").insert({ [column]: id });
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", "saved", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["workspace", "course-tests"] });
      queryClient.invalidateQueries({ queryKey: ["study-notes"] });
    },
  });
}
