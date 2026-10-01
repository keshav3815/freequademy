import { useEffect, useState, type DragEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, ChevronDown, ClipboardCheck, FileText, GripVertical, Info, Layers, Link2, ListChecks, Plus, Video } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { teacherApi, useTeacherMutation } from "@/hooks/useTeacher";
import type { CourseCurriculum, CurriculumLesson, CurriculumTest } from "@/lib/teacher/types";
import { cn } from "@/lib/utils";
import { ConfirmDialog, EmptyState, StatusPill, TButton } from "@/components/teacher/portal/ui";
import { MoreMenu } from "./shared";

type Target = { kind: "lesson" | "test"; id: string; title: string };

function AddContentMenu({ classLevel, subjectId, chapterId, compact }: { classLevel: number; subjectId: string; chapterId?: string; compact?: boolean }) {
  const navigate = useNavigate();
  const q = `class=${classLevel}&subject=${subjectId}${chapterId ? `&chapter=${chapterId}` : ""}`;
  const items = [
    { label: "Lesson", hint: "Rich text notes", icon: FileText, to: `/teacher/lessons/new?${q}` },
    { label: "Video", hint: "YouTube or https link", icon: Video, to: `/teacher/lessons/new?${q}&type=video` },
    { label: "Quiz", hint: "Practice questions", icon: ListChecks, to: `/teacher/assignments/new?${q}&type=practice` },
    { label: "Assignment", hint: "Chapter or full test", icon: ClipboardCheck, to: `/teacher/assignments/new?${q}&type=chapter` },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <TButton size="sm" variant={compact ? "ghost" : "primary"}>
          <Plus />
          {compact ? "Add" : "Add content"}
          {!compact && <ChevronDown className="-mr-1 opacity-70" />}
        </TButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-lg p-1.5">
        {items.map((i) => (
          <DropdownMenuItem key={i.label} onSelect={() => navigate(i.to)} className="cursor-pointer gap-3 rounded-md py-2">
            <i.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span>
              <span className="block text-[14px] font-medium">{i.label}</span>
              <span className="block text-[12px] text-muted-foreground">{i.hint}</span>
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="px-2 text-[12px] font-normal text-muted-foreground">PDFs and external links</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => navigate(`/teacher/resources?new=1&subject=${subjectId}`)} className="cursor-pointer gap-3 rounded-md py-2">
          <Link2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-[14px] font-medium">PDF or link (Resource Library)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StatusBadge({ status }: { status: string }) {
  return status === "published" ? (
    <StatusPill tone="success">Published</StatusPill>
  ) : (
    <StatusPill tone="neutral">Draft</StatusPill>
  );
}

function TestRow({ test, onAction }: { test: CurriculumTest; onAction: (a: "toggle" | "delete", t: Target) => void }) {
  const navigate = useNavigate();
  const target: Target = { kind: "test", id: test.id, title: test.title };
  return (
    <li className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
      <span className="w-7" aria-hidden="true" />
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {test.test_type === "practice" ? <ListChecks className="h-4 w-4" aria-hidden="true" /> : <ClipboardCheck className="h-4 w-4" aria-hidden="true" />}
      </span>
      <div className="min-w-0 flex-1">
        <Link to={`/teacher/assignments/${test.id}/edit`} className="tp-focus block truncate rounded text-[14px] font-medium hover:underline">
          {test.title}
        </Link>
        <p className="text-[12px] text-muted-foreground">
          {test.test_type === "practice" ? "Quiz" : "Assignment"} · {test.duration_minutes} min
        </p>
      </div>
      <StatusBadge status={test.status} />
      <MoreMenu
        label={`Actions for ${test.title}`}
        items={[
          { label: "Edit", onSelect: () => navigate(`/teacher/assignments/${test.id}/edit`) },
          { label: "View submissions", onSelect: () => navigate(`/teacher/assignments/${test.id}/submissions`) },
          { label: test.status === "published" ? "Unpublish" : "Publish", onSelect: () => onAction("toggle", { ...target, title: test.status }) },
          { label: "Delete", danger: true, onSelect: () => onAction("delete", target) },
        ]}
      />
    </li>
  );
}

/**
 * The curriculum for one course, showing the teacher's own lessons and
 * assignments per chapter. Lessons can be reordered by drag and drop or with
 * the move buttons (keyboard / touch); the order is saved atomically through
 * reorder_teacher_lessons().
 */
export default function ContentBuilder({ curriculum }: { curriculum: CourseCurriculum }) {
  const navigate = useNavigate();
  const { subject } = curriculum;
  const [order, setOrder] = useState<Record<string, CurriculumLesson[]>>({});
  const [dragging, setDragging] = useState<{ chapterId: string; id: string } | null>(null);
  const [confirm, setConfirm] = useState<Target | null>(null);
  const reorder = useTeacherMutation(teacherApi.reorderLessons, ["curriculum"]);
  const toggle = useTeacherMutation(teacherApi.setContentStatus, ["curriculum", "courses", "assignments", "overview"]);
  const remove = useTeacherMutation(teacherApi.deleteContent, ["curriculum", "courses", "assignments", "overview", "lesson-index"]);

  useEffect(() => {
    setOrder(Object.fromEntries(curriculum.chapters.map((c) => [c.id, c.lessons])));
  }, [curriculum]);

  const commit = (chapterId: string, lessons: CurriculumLesson[]) => {
    const before = curriculum.chapters.find((c) => c.id === chapterId)?.lessons.map((l) => l.id).join();
    if (before === lessons.map((l) => l.id).join()) return;
    reorder.mutate([lessons.map((l) => l.id)], {
      onSuccess: () => toast.success("Order saved"),
      onError: (e) => {
        toast.error("Could not save the new order", { description: e.message });
        setOrder(Object.fromEntries(curriculum.chapters.map((c) => [c.id, c.lessons])));
      },
    });
  };

  const move = (chapterId: string, index: number, delta: number) => {
    const list = [...(order[chapterId] ?? [])];
    const to = index + delta;
    if (to < 0 || to >= list.length) return;
    [list[index], list[to]] = [list[to], list[index]];
    setOrder((o) => ({ ...o, [chapterId]: list }));
    commit(chapterId, list);
  };

  const onDragOver = (e: DragEvent, chapterId: string, overId: string) => {
    if (!dragging || dragging.chapterId !== chapterId || dragging.id === overId) return;
    e.preventDefault();
    setOrder((o) => {
      const list = [...(o[chapterId] ?? [])];
      const from = list.findIndex((l) => l.id === dragging.id);
      const to = list.findIndex((l) => l.id === overId);
      if (from < 0 || to < 0) return o;
      const [item] = list.splice(from, 1);
      list.splice(to, 0, item);
      return { ...o, [chapterId]: list };
    });
  };

  const onAction = (action: "toggle" | "delete", t: Target) => {
    if (action === "delete") {
      setConfirm(t);
      return;
    }
    const next = t.title === "published" ? "draft" : "published";
    toggle.mutate([t.kind, t.id, next], {
      onSuccess: () => toast.success(next === "published" ? "Published" : "Moved to drafts"),
      onError: (e) => toast.error("Could not update", { description: e.message }),
    });
  };

  const hasAny = curriculum.chapters.some((c) => c.lessons.length || c.tests.length) || curriculum.subjectTests.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-[13px] text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Showing your lessons and assignments. Chapters come from the shared curriculum; drag lessons to reorder them.
        </p>
        <AddContentMenu classLevel={subject.class_level} subjectId={subject.id} />
      </div>

      {!hasAny && (
        <div className="rounded-lg border border-dashed border-border bg-card">
          <EmptyState icon={Layers} title="This course has no content from you yet" description="Add a lesson, video or quiz to one of the chapters below." />
        </div>
      )}

      {curriculum.chapters.map((chapter, ci) => {
        const lessons = order[chapter.id] ?? chapter.lessons;
        return (
          <section key={chapter.id} aria-labelledby={`ch-${chapter.id}`} className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h3 id={`ch-${chapter.id}`} className="text-[15px] font-semibold">
                <span className="text-muted-foreground">Chapter {ci + 1} — </span>
                {chapter.title}
              </h3>
              <AddContentMenu classLevel={subject.class_level} subjectId={subject.id} chapterId={chapter.id} compact />
            </div>
            {lessons.length === 0 && chapter.tests.length === 0 ? (
              <p className="px-4 py-4 text-[13px] text-muted-foreground">No content from you in this chapter yet.</p>
            ) : (
              <ul className="p-2" aria-label={`${chapter.title} content`}>
                {lessons.map((lesson, i) => (
                  <li
                    key={lesson.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      setDragging({ chapterId: chapter.id, id: lesson.id });
                    }}
                    onDragOver={(e) => onDragOver(e, chapter.id, lesson.id)}
                    onDrop={(e) => e.preventDefault()}
                    onDragEnd={() => {
                      setDragging(null);
                      commit(chapter.id, order[chapter.id] ?? lessons);
                    }}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50",
                      dragging?.id === lesson.id && "bg-accent/60 opacity-70 ring-1 ring-primary/30",
                    )}
                  >
                    <span className="flex w-7 cursor-grab justify-center text-muted-foreground active:cursor-grabbing" aria-hidden="true">
                      <GripVertical className="h-4 w-4" />
                    </span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      {lesson.video_url ? <Video className="h-4 w-4" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link to={`/teacher/lessons/${lesson.id}/edit`} className="tp-focus block truncate rounded text-[14px] font-medium hover:underline">
                        {lesson.title}
                      </Link>
                      <p className="text-[12px] text-muted-foreground">
                        {lesson.video_url ? "Video" : "Lesson"} · {lesson.duration_minutes} min
                      </p>
                    </div>
                    <div className="flex opacity-100 transition-opacity focus-within:opacity-100 md:opacity-0 md:group-hover:opacity-100">
                      <TButton variant="ghost" size="iconSm" aria-label={`Move ${lesson.title} up`} disabled={i === 0 || reorder.isPending} onClick={() => move(chapter.id, i, -1)}>
                        <ArrowUp />
                      </TButton>
                      <TButton variant="ghost" size="iconSm" aria-label={`Move ${lesson.title} down`} disabled={i === lessons.length - 1 || reorder.isPending} onClick={() => move(chapter.id, i, 1)}>
                        <ArrowDown />
                      </TButton>
                    </div>
                    <StatusBadge status={lesson.status} />
                    <MoreMenu
                      label={`Actions for ${lesson.title}`}
                      items={[
                        { label: "Edit", onSelect: () => navigate(`/teacher/lessons/${lesson.id}/edit`) },
                        { label: "Preview", onSelect: () => window.open(`/lessons/${lesson.id}`, "_blank", "noopener") },
                        { label: lesson.status === "published" ? "Unpublish" : "Publish", onSelect: () => onAction("toggle", { kind: "lesson", id: lesson.id, title: lesson.status }) },
                        { label: "Delete", danger: true, onSelect: () => onAction("delete", { kind: "lesson", id: lesson.id, title: lesson.title }) },
                      ]}
                    />
                  </li>
                ))}
                {chapter.tests.map((t) => (
                  <TestRow key={t.id} test={t} onAction={onAction} />
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {curriculum.subjectTests.length > 0 && (
        <section aria-labelledby="subject-wide" className="rounded-lg border border-border bg-card">
          <h3 id="subject-wide" className="border-b border-border px-4 py-3 text-[15px] font-semibold">
            Whole-subject assignments
          </h3>
          <ul className="p-2">
            {curriculum.subjectTests.map((t) => (
              <TestRow key={t.id} test={t} onAction={onAction} />
            ))}
          </ul>
        </section>
      )}

      {curriculum.chapters.length === 0 && (
        <p className="text-[13px] text-muted-foreground">This subject has no chapters yet. An administrator adds chapters from the Admin Panel → Curriculum.</p>
      )}

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.kind === "lesson" ? "Delete lesson?" : "Delete assignment?"}
        description={`“${confirm?.title}” will be removed for all students, along with their progress on it. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        pending={remove.isPending}
        onConfirm={() =>
          confirm &&
          remove.mutate([confirm.kind, confirm.id], {
            onSuccess: () => {
              toast.success("Deleted");
              setConfirm(null);
            },
            onError: (e) => toast.error("Could not delete", { description: e.message }),
          })
        }
      />
    </div>
  );
}
