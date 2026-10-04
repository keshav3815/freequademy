import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Check, ClipboardCheck, FileText, Info, Layers } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GRADE_OPTIONS } from "@/hooks/useCurriculum";
import { teacherApi, useCourses } from "@/hooks/useTeacher";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { cn } from "@/lib/utils";
import { EmptyState, ErrorState, Field, PageHeader, Panel, SkeletonRows, TButton } from "@/components/teacher/portal/ui";

const STEPS = ["Choose subject", "Structure", "Add content"] as const;

function Stepper({ step }: { step: number }) {
  return (
    <ol className="mb-6 flex items-center gap-2 text-[13px]" aria-label="Progress">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-2" aria-current={i === step ? "step" : undefined}>
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold",
              i < step ? "bg-primary text-primary-foreground" : i === step ? "border-2 border-primary text-primary" : "border border-border text-muted-foreground",
            )}
          >
            {i < step ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
          </span>
          <span className={cn("hidden sm:inline", i === step ? "font-medium text-foreground" : "text-muted-foreground")}>{label}</span>
          {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border sm:w-10" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

/**
 * Courses on Freequademy are the curriculum's subjects (Class N · Subject);
 * a teacher "creates a course" by adding their first lesson or assignment to
 * one. Chapters come from the curriculum, which admins manage.
 */
export default function CourseNewPage() {
  useDocumentMeta({ title: "Create course" });
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [classLevel, setClassLevel] = useState("10");
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const existing = useCourses();
  const subjects = useQuery({ queryKey: ["teacher", "subjects", classLevel], queryFn: () => teacherApi.fetchSubjectsForClass(Number(classLevel)) });
  const chapters = useQuery({ queryKey: ["teacher", "chapters", subjectId], queryFn: () => teacherApi.fetchChapters(subjectId!), enabled: !!subjectId });
  const subject = subjects.data?.find((s) => s.id === subjectId);
  const alreadyTeaching = new Set((existing.data ?? []).map((c) => c.subject_id));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back={{ to: "/teacher/courses", label: "My Courses" }} title="Create a course" description="Pick the class and subject you're teaching. You'll add lessons and assignments next." />
      <Stepper step={step} />

      {step === 0 && (
        <Panel title="Choose a subject">
          <div className="mb-5 max-w-xs">
            <Field label="Class" htmlFor="new-course-class">
              <Select
                value={classLevel}
                onValueChange={(v) => {
                  setClassLevel(v);
                  setSubjectId(null);
                }}
              >
                <SelectTrigger id="new-course-class" className="h-9">
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
          </div>
          {subjects.isLoading ? (
            <SkeletonRows rows={4} />
          ) : subjects.isError ? (
            <ErrorState compact message="We couldn't load subjects." onRetry={() => subjects.refetch()} />
          ) : (subjects.data ?? []).length === 0 ? (
            <EmptyState compact icon={BookOpen} title={`No subjects for Class ${classLevel} yet`} description="An administrator adds subjects from the Admin Panel → Curriculum." />
          ) : (
            <div role="radiogroup" aria-label="Subject" className="grid gap-3 sm:grid-cols-2">
              {subjects.data!.map((s) => {
                const active = s.id === subjectId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSubjectId(s.id)}
                    className={cn(
                      "tp-focus flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                      active ? "border-primary bg-accent/60" : "border-border hover:border-primary/40",
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
                      <BookOpen className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{s.name}</span>
                      <span className="block text-[13px] text-muted-foreground">{alreadyTeaching.has(s.id) ? "You already teach this course" : s.description || `Class ${s.class_level}`}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="mt-6 flex justify-end">
            <TButton disabled={!subjectId} onClick={() => setStep(1)}>
              Continue
            </TButton>
          </div>
        </Panel>
      )}

      {step === 1 && subject && (
        <Panel title={`${subject.name} — Class ${subject.class_level}`} description="Course structure from the curriculum">
          <div className="mb-4 flex gap-2 rounded-md bg-info/10 p-3 text-[13px] text-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
            <p>Chapters are shared across teachers and managed by the curriculum team. You add your own lessons and assignments inside them.</p>
          </div>
          {chapters.isLoading ? (
            <SkeletonRows rows={4} />
          ) : chapters.isError ? (
            <ErrorState compact message="We couldn't load chapters." onRetry={() => chapters.refetch()} />
          ) : (chapters.data ?? []).length === 0 ? (
            <EmptyState compact icon={Layers} title="No chapters yet" description="You can still add subject-wide assignments. Ask an admin to add chapters for lessons." />
          ) : (
            <ol className="divide-y divide-border rounded-md border border-border">
              {chapters.data!.map((c, i) => (
                <li key={c.id} className="flex items-center gap-3 px-4 py-2.5 text-[14px]">
                  <span className="tp-tabular w-6 text-muted-foreground">{i + 1}</span>
                  {c.title}
                </li>
              ))}
            </ol>
          )}
          <div className="mt-6 flex justify-between">
            <TButton variant="secondary" onClick={() => setStep(0)}>
              Back
            </TButton>
            <TButton onClick={() => setStep(2)}>Continue</TButton>
          </div>
        </Panel>
      )}

      {step === 2 && subject && (
        <Panel title="Add your first content" description="A course appears in My Courses as soon as it has a lesson or assignment from you.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              to={`/teacher/lessons/new?class=${subject.class_level}&subject=${subject.id}`}
              className="tp-focus flex items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/40"
            >
              <FileText className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
              <span>
                <span className="block font-semibold">Lesson</span>
                <span className="block text-[13px] text-muted-foreground">Notes, a video, or both</span>
              </span>
            </Link>
            <Link
              to={`/teacher/assignments/new?class=${subject.class_level}&subject=${subject.id}`}
              className="tp-focus flex items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/40"
            >
              <ClipboardCheck className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
              <span>
                <span className="block font-semibold">Assignment</span>
                <span className="block text-[13px] text-muted-foreground">An auto-graded quiz or test</span>
              </span>
            </Link>
          </div>
          <div className="mt-6 flex justify-between">
            <TButton variant="secondary" onClick={() => setStep(1)}>
              Back
            </TButton>
            {alreadyTeaching.has(subject.id) && (
              <TButton variant="secondary" onClick={() => navigate(`/teacher/courses/${subject.id}/content`)}>
                Open existing course
              </TButton>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
