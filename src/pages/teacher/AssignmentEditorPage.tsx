import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Check, Circle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GRADE_OPTIONS, useCurriculum as useCurriculumOptions } from "@/hooks/useCurriculum";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ErrorState, Field, PageHeader, Panel, TButton, inputClass, textareaClass } from "@/components/teacher/portal/ui";
import { Skeleton } from "@/components/ui/skeleton";

interface DraftQuestion {
  id?: string;
  prompt: string;
  options: string[];
  correct_option: number;
  explanation: string;
  marks: number;
}

const emptyQuestion = (): DraftQuestion => ({ prompt: "", options: ["", "", "", ""], correct_option: 0, explanation: "", marks: 1 });
const TEST_TYPES = ["practice", "chapter", "full"];

/**
 * Create / edit an assignment (a test of auto-graded multiple-choice
 * questions). Same data model and save sequence as the previous TestEditor.
 */
export default function AssignmentEditorPage() {
  const { assignmentId: id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [classLevel, setClassLevel] = useState(params.get("class") ?? "10");
  const [subjectId, setSubjectId] = useState(params.get("subject") ?? "");
  const [chapterId, setChapterId] = useState(params.get("chapter") ?? "none");
  const [meta, setMeta] = useState({
    title: "",
    description: "",
    difficulty: "medium",
    test_type: TEST_TYPES.includes(params.get("type") ?? "") ? params.get("type")! : "practice",
    duration_minutes: "15",
    status: "draft",
  });
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(!!id);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"draft" | "published" | null>(null);
  const { subjects, chapters } = useCurriculumOptions(classLevel, subjectId);
  useDocumentMeta({ title: id ? "Edit assignment" : "New assignment" });

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: test, error } = await supabase
        .from("tests")
        .select("title, description, difficulty, test_type, duration_minutes, status, subject_id, chapter_id, subject:subjects(class_level)")
        .eq("id", id)
        .maybeSingle();
      if (error || !test) {
        setLoadError(error?.message ?? "This assignment doesn't exist or isn't yours.");
        setLoading(false);
        return;
      }
      const subject = test.subject as { class_level: number } | null;
      if (subject) setClassLevel(String(subject.class_level));
      setSubjectId(test.subject_id);
      setChapterId(test.chapter_id ?? "none");
      setMeta({
        title: test.title,
        description: test.description ?? "",
        difficulty: test.difficulty,
        test_type: test.test_type,
        duration_minutes: String(test.duration_minutes),
        status: test.status,
      });
      const { data: qs } = await supabase.rpc("get_test_questions_for_author", { _test_id: id });
      setQuestions(
        (qs ?? []).length
          ? (qs ?? []).map((q) => ({
              id: q.id,
              prompt: q.prompt,
              options: (q.options as string[]) ?? [],
              correct_option: q.correct_option,
              explanation: q.explanation ?? "",
              marks: q.marks,
            }))
          : [emptyQuestion()],
      );
      setLoading(false);
    })();
  }, [id]);

  const updateQuestion = (index: number, patch: Partial<DraftQuestion>) => setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...patch } : q)));

  const removeQuestion = (index: number) => {
    const q = questions[index];
    if (q.id) setRemovedIds((ids) => [...ids, q.id!]);
    setQuestions((qs) => qs.filter((_, i) => i !== index));
  };

  const moveQuestion = (index: number, delta: number) =>
    setQuestions((qs) => {
      const to = index + delta;
      if (to < 0 || to >= qs.length) return qs;
      const next = [...qs];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });

  const checks = useMemo(() => {
    const questionProblems = questions
      .map((q, i) => {
        const options = q.options.map((o) => o.trim()).filter(Boolean);
        if (!q.prompt.trim()) return `Question ${i + 1} has no text.`;
        if (options.length < 2) return `Question ${i + 1} needs at least two options.`;
        if (!q.options[q.correct_option]?.trim()) return `Question ${i + 1}: the correct option is empty.`;
        return null;
      })
      .filter((p): p is string => !!p);
    return [
      { ok: !!subjectId, label: "Subject chosen", problem: "Choose a subject." },
      { ok: meta.title.trim().length >= 2, label: "Title added", problem: "Add a title." },
      { ok: questions.length > 0, label: "At least one question", problem: "Add at least one question." },
      { ok: questionProblems.length === 0, label: "Every question complete", problem: questionProblems[0] ?? "" },
    ];
  }, [subjectId, meta.title, questions]);

  const totalMarks = questions.reduce((s, q) => s + Math.min(20, Math.max(1, q.marks || 1)), 0);

  const fail = (message?: string) => {
    setSaving(null);
    toast.error("Could not save assignment", { description: message });
  };

  const save = async (status: "draft" | "published") => {
    const problem = checks.find((c) => !c.ok);
    if (problem) {
      toast.error(problem.problem);
      return;
    }
    setSaving(status);
    const testPayload = {
      subject_id: subjectId,
      chapter_id: chapterId === "none" ? null : chapterId,
      title: meta.title.trim(),
      description: meta.description.trim() || null,
      difficulty: meta.difficulty,
      test_type: meta.test_type,
      duration_minutes: Math.min(300, Math.max(1, parseInt(meta.duration_minutes) || 15)),
      status,
    };

    let testId = id;
    if (id) {
      const { error } = await supabase.from("tests").update(testPayload).eq("id", id);
      if (error) return fail(error.message);
    } else {
      const { data, error } = await supabase.from("tests").insert(testPayload).select("id").single();
      if (error || !data) return fail(error?.message);
      testId = data.id;
    }

    if (removedIds.length) {
      const { error } = await supabase.from("test_questions").delete().in("id", removedIds);
      if (error) return fail(error.message);
    }

    for (const [index, q] of questions.entries()) {
      // drop blank options, remapping the correct answer index
      const kept = q.options.map((text, i) => ({ text: text.trim(), i })).filter((o) => o.text);
      const payload = {
        test_id: testId!,
        sort_order: index + 1,
        prompt: q.prompt.trim(),
        options: kept.map((o) => o.text),
        correct_option: kept.findIndex((o) => o.i === q.correct_option),
        explanation: q.explanation.trim() || null,
        marks: Math.min(20, Math.max(1, q.marks || 1)),
      };
      const { error } = q.id ? await supabase.from("test_questions").update(payload).eq("id", q.id) : await supabase.from("test_questions").insert(payload);
      if (error) return fail(error.message);
    }

    setSaving(null);
    await qc.invalidateQueries({ queryKey: ["teacher"] });
    toast.success(status === "published" ? "Assignment published" : "Draft saved");
    navigate("/teacher/assignments");
  };

  if (loadError) return <ErrorState message={loadError} />;

  return (
    <div>
      <PageHeader
        back={{ to: "/teacher/assignments", label: "Assignments" }}
        title={id ? "Edit assignment" : "New assignment"}
        description="Multiple-choice questions, graded automatically. Students see answers only after they submit."
      />

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]" role="status" aria-label="Loading assignment">
          <Skeleton className="h-[560px] rounded-lg" />
          <Skeleton className="h-[260px] rounded-lg" />
        </div>
      ) : (
        <div className="grid gap-6 pb-24 lg:grid-cols-[1fr_300px]">
          <div className="min-w-0 space-y-6">
            <Panel title="1. Details">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Class" htmlFor="a-class">
                    <Select
                      value={classLevel}
                      onValueChange={(v) => {
                        setClassLevel(v);
                        setSubjectId("");
                        setChapterId("none");
                      }}
                    >
                      <SelectTrigger id="a-class" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_OPTIONS.map((g) => (
                          <SelectItem key={g} value={g}>
                            Class {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Subject" htmlFor="a-subject">
                    <Select
                      value={subjectId}
                      onValueChange={(v) => {
                        setSubjectId(v);
                        setChapterId("none");
                      }}
                    >
                      <SelectTrigger id="a-subject" className="h-9">
                        <SelectValue placeholder="Choose" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Chapter" htmlFor="a-chapter">
                    <Select value={chapterId} onValueChange={setChapterId} disabled={!subjectId}>
                      <SelectTrigger id="a-chapter" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Whole subject</SelectItem>
                        {chapters.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Title" htmlFor="a-title">
                  <input id="a-title" className={cn(inputClass, "h-11 text-[16px] font-medium")} value={meta.title} maxLength={200} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
                </Field>
                <Field label="Instructions" htmlFor="a-description" hint="Shown to students before they start.">
                  <textarea id="a-description" className={textareaClass} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Type" htmlFor="a-type">
                    <Select value={meta.test_type} onValueChange={(v) => setMeta({ ...meta, test_type: v })}>
                      <SelectTrigger id="a-type" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="practice">Practice quiz</SelectItem>
                        <SelectItem value="chapter">Chapter test</SelectItem>
                        <SelectItem value="full">Full syllabus</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Difficulty" htmlFor="a-difficulty">
                    <Select value={meta.difficulty} onValueChange={(v) => setMeta({ ...meta, difficulty: v })}>
                      <SelectTrigger id="a-difficulty" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Time limit (minutes)" htmlFor="a-duration">
                    <input id="a-duration" type="number" min={1} max={300} className={inputClass} value={meta.duration_minutes} onChange={(e) => setMeta({ ...meta, duration_minutes: e.target.value })} />
                  </Field>
                </div>
              </div>
            </Panel>

            <section aria-labelledby="q-heading" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 id="q-heading" className="text-[18px] font-semibold">
                  2. Questions
                </h2>
                <span className="text-[13px] text-muted-foreground">
                  {questions.length} question{questions.length === 1 ? "" : "s"} · {totalMarks} marks
                </span>
              </div>
              {questions.map((q, index) => (
                <Panel
                  key={q.id ?? `new-${index}`}
                  title={`Question ${index + 1}`}
                  action={
                    <div className="flex items-center gap-0.5">
                      <TButton variant="ghost" size="iconSm" onClick={() => moveQuestion(index, -1)} disabled={index === 0} aria-label={`Move question ${index + 1} up`}>
                        <ArrowUp />
                      </TButton>
                      <TButton variant="ghost" size="iconSm" onClick={() => moveQuestion(index, 1)} disabled={index === questions.length - 1} aria-label={`Move question ${index + 1} down`}>
                        <ArrowDown />
                      </TButton>
                      <TButton variant="ghost" size="iconSm" onClick={() => removeQuestion(index)} disabled={questions.length === 1} aria-label={`Remove question ${index + 1}`}>
                        <Trash2 />
                      </TButton>
                    </div>
                  }
                >
                  <div className="space-y-4">
                    <Field label="Question" htmlFor={`q-${index}`}>
                      <textarea id={`q-${index}`} className={cn(textareaClass, "min-h-[72px]")} value={q.prompt} placeholder="Question text" onChange={(e) => updateQuestion(index, { prompt: e.target.value })} />
                    </Field>
                    <fieldset className="space-y-2">
                      <legend className="mb-1.5 text-[13px] font-medium">Options — select the correct one</legend>
                      {q.options.map((opt, i) => (
                        <div key={i} className={cn("flex items-center gap-2 rounded-md", q.correct_option === i && "ring-1 ring-success/40")}>
                          <input
                            type="radio"
                            name={`correct-${index}`}
                            checked={q.correct_option === i}
                            onChange={() => updateQuestion(index, { correct_option: i })}
                            aria-label={`Option ${String.fromCharCode(65 + i)} is correct`}
                            className="ml-2 h-4 w-4 accent-[hsl(var(--success))]"
                          />
                          <input
                            className={cn(inputClass, "border-0 shadow-none")}
                            value={opt}
                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                            aria-label={`Option ${String.fromCharCode(65 + i)}`}
                            onChange={(e) => updateQuestion(index, { options: q.options.map((o, j) => (j === i ? e.target.value : o)) })}
                          />
                        </div>
                      ))}
                    </fieldset>
                    <div className="grid gap-4 sm:grid-cols-4">
                      <Field label="Explanation (shown after submission)" htmlFor={`exp-${index}`} className="sm:col-span-3">
                        <input id={`exp-${index}`} className={inputClass} value={q.explanation} onChange={(e) => updateQuestion(index, { explanation: e.target.value })} />
                      </Field>
                      <Field label="Marks" htmlFor={`marks-${index}`}>
                        <input id={`marks-${index}`} type="number" min={1} max={20} className={inputClass} value={q.marks} onChange={(e) => updateQuestion(index, { marks: parseInt(e.target.value) || 1 })} />
                      </Field>
                    </div>
                  </div>
                </Panel>
              ))}
              <TButton variant="secondary" onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}>
                <Plus />
                Add question
              </TButton>
            </section>
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <Panel title="3. Review">
              <ul className="space-y-2 text-[13px]">
                {checks.map((c) => (
                  <li key={c.label} className="flex items-start gap-2">
                    {c.ok ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                    <span className={c.ok ? "text-foreground" : "text-muted-foreground"}>
                      <span className="sr-only">{c.ok ? "Done: " : "To do: "}</span>
                      {c.ok ? c.label : c.problem || c.label}
                    </span>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-[13px]">
                <div>
                  <dt className="text-muted-foreground">Questions</dt>
                  <dd className="tp-tabular text-[16px] font-semibold">{questions.length}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Total marks</dt>
                  <dd className="tp-tabular text-[16px] font-semibold">{totalMarks}</dd>
                </div>
              </dl>
              <p className="mt-4 text-[12px] text-muted-foreground">Published assignments are available to every student in this class and subject.</p>
            </Panel>
          </aside>

          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur lg:left-[var(--tp-content-left)]">
            <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:px-8">
              <span className="hidden text-[13px] text-muted-foreground sm:block">{id ? (meta.status === "published" ? "Published — visible to students" : "Draft — only you can see it") : "New assignment"}</span>
              <div className="ml-auto flex gap-2">
                <TButton variant="secondary" onClick={() => save("draft")} loading={saving === "draft"} disabled={!!saving}>
                  Save draft
                </TButton>
                <TButton onClick={() => save("published")} loading={saving === "published"} disabled={!!saving}>
                  {id && meta.status === "published" ? "Update" : "Publish"}
                </TButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
