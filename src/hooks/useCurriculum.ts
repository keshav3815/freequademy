import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SubjectOption { id: string; name: string; class_level: number }
export interface ChapterOption { id: string; title: string; subject_id: string; sort_order: number }

/** Subjects for a class and chapters for a subject, for authoring forms. */
export function useCurriculum(classLevel: string, subjectId: string) {
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);

  useEffect(() => {
    if (!classLevel) return;
    supabase
      .from("subjects")
      .select("id, name, class_level")
      .eq("class_level", Number(classLevel))
      .order("sort_order")
      .then(({ data }) => setSubjects(data ?? []));
  }, [classLevel]);

  useEffect(() => {
    if (!subjectId) {
      setChapters([]);
      return;
    }
    supabase
      .from("chapters")
      .select("id, title, subject_id, sort_order")
      .eq("subject_id", subjectId)
      .order("sort_order")
      .then(({ data }) => setChapters(data ?? []));
  }, [subjectId]);

  return { subjects, chapters, setChapters };
}

export const GRADE_OPTIONS = ["6", "7", "8", "9", "10", "11", "12"];
