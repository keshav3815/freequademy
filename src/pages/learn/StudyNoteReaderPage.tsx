import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/lib/markdown";
import { extractHeadings } from "@/lib/markdownHeadings";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { useClassCurriculum } from "@/hooks/useLearningWorkspace";
import { useChapterNotes, useStudyNote } from "@/hooks/useStudyNotes";
import { formatUpdated, subjectAccent } from "@/lib/studyNotes";
import { cn } from "@/lib/utils";
import LearningWorkspaceLayout from "@/components/learn/workspace/LearningWorkspaceLayout";
import LearningBreadcrumbs from "@/components/learn/workspace/LearningBreadcrumbs";
import { SaveButton } from "@/components/learn/workspace/WorkspaceItemCard";
import NoteReaderSidebar from "@/components/learn/study-notes/NoteReaderSidebar";
import { NotesEmptyState, NotesErrorState } from "@/components/learn/study-notes/NotesStates";
import { Skeleton } from "@/components/ui/skeleton";

const GRADES = ["6", "7", "8", "9", "10", "11", "12"];

function useActiveHeading(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (ids.length === 0 || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -65% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    setActive(ids[0]);
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

export default function StudyNoteReaderPage() {
  const { subjectSlug, chapterId, itemId } = useParams();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const hasGrade = !!profile?.grade && GRADES.includes(profile.grade);
  const classLevel = Number(hasGrade ? profile!.grade : "10");

  const curriculum = useClassCurriculum(classLevel);
  const note = useStudyNote(itemId!);
  const chapterNotes = useChapterNotes(note.data?.chapter_id ?? chapterId);
  const saved = useQuery({
    queryKey: ["study-notes", "saved-one", itemId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("saved_items").select("id").eq("lesson_id", itemId!).maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  const subject = curriculum.data?.subjects.find((s) => s.slug === subjectSlug);
  const chapter = curriculum.data?.chapters.find((c) => c.id === (note.data?.chapter_id ?? chapterId));

  const published = note.data?.status === "published";
  useEffect(() => {
    if (!user || !published) return;
    supabase.rpc("record_lesson_progress", { _lesson_id: itemId! }).then(({ error }) => {
      if (!error) queryClient.invalidateQueries({ queryKey: ["study-notes"] });
    });
  }, [user, published, itemId, queryClient]);

  const headings = useMemo(() => extractHeadings(note.data?.content_md ?? ""), [note.data?.content_md]);
  const headingIds = useMemo(() => headings.map((h) => h.id), [headings]);
  const activeHeading = useActiveHeading(headingIds);

  useDocumentMeta({ title: note.data ? `${note.data.title} · Study Notes` : "Study Notes", description: note.data?.summary ?? undefined });

  const list = chapterNotes.data ?? [];
  const index = list.findIndex((n) => n.id === itemId);
  const prev = index > 0 ? list[index - 1] : null;
  const next = index >= 0 && index < list.length - 1 ? list[index + 1] : null;
  const status = list[index]?.status ?? null;
  const base = `/study-notes/${subjectSlug}`;
  const hrefFor = (id: string) => `${base}/${chapter?.id ?? chapterId}/${id}`;

  const markComplete = async () => {
    setSaving(true);
    const { error } = await supabase.rpc("record_lesson_progress", { _lesson_id: itemId!, _completed: true });
    setSaving(false);
    if (error) {
      toast({ title: "Could not save progress", variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["study-notes"] });
    queryClient.invalidateQueries({ queryKey: ["workspace", "lesson-progress", user?.id] });
    toast({ title: "Marked as complete", description: "+10 XP" });
  };

  const sidebar = (close: () => void) => (
    <NoteReaderSidebar
      backHref={chapter ? `${base}/${chapter.id}` : base}
      backLabel={subject ? `Back to ${subject.name}` : "Back to Study Notes"}
      chapterTitle={chapter?.title ?? "Chapter"}
      notes={list}
      currentId={itemId!}
      hrefFor={hrefFor}
      headings={headings}
      activeHeading={activeHeading}
      onNavigate={close}
    />
  );

  const body = () => {
    if (note.isLoading) {
      return (
        <div className="space-y-4" role="status" aria-label="Loading note">
          <Skeleton className="h-9 w-2/3 bg-muted/25" />
          <Skeleton className="h-4 w-1/2 bg-muted/25" />
          <Skeleton className="h-64 w-full rounded-2xl bg-muted/25" />
        </div>
      );
    }
    if (note.isError) return <NotesErrorState onRetry={() => note.refetch()} />;
    if (!note.data) {
      return (
        <NotesEmptyState
          title="This note could not be found"
          body="It may have been unpublished or moved."
          action={<Button asChild variant="outline" size="sm"><Link to="/study-notes">Back to Study Notes</Link></Button>}
        />
      );
    }
    const data = note.data;
    const updated = formatUpdated(data.updated_at);
    return (
      <article className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-3xl md:text-[2.25rem] font-bold tracking-tight leading-tight">{data.title}</h1>
            <SaveButton kind="lesson" id={data.id} saved={saved.data ?? false} title={data.title} />
          </div>
          {data.summary && <p className="text-foreground/70">{data.summary}</p>}
          <div className="flex flex-wrap gap-2 text-xs">
            {subject && <span className={cn("rounded-full px-2.5 py-1 font-medium", subjectAccent(subject.slug))}>{subject.name}</span>}
            {chapter && <span className="rounded-full border border-border/70 px-2.5 py-1">{chapter.title}</span>}
            <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2.5 py-1"><GraduationCap className="h-3.5 w-3.5" aria-hidden="true" /> Class {classLevel}</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2.5 py-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" /> {data.duration_minutes} min read</span>
            {updated && <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2.5 py-1"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> {updated}</span>}
          </div>
          {data.status !== "published" && <p className="text-sm text-orange-700">Draft — only you can see this note.</p>}
        </header>

        <div className="rounded-3xl border border-border/70 bg-card px-6 py-6 md:px-10 md:py-8 shadow-sm">
          <Markdown source={data.content_md} headingIds className="text-[15px] leading-relaxed" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4">
          {status === "completed" ? (
            <span className="inline-flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> Completed
            </span>
          ) : published ? (
            <Button onClick={markComplete} disabled={saving} className="rounded-full">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as complete
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            {prev && <Button asChild variant="outline" size="sm"><Link to={hrefFor(prev.id)}><ArrowLeft className="mr-1 h-4 w-4" /> Previous</Link></Button>}
            {next && <Button asChild size="sm" variant="outline"><Link to={hrefFor(next.id)}>Next note <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>}
          </div>
        </div>
      </article>
    );
  };

  return (
    <LearningWorkspaceLayout title="Study Notes" sidebar={sidebar}>
      <LearningBreadcrumbs
        crumbs={[
          { label: "Study Notes", to: "/study-notes" },
          ...(subject ? [{ label: subject.name, to: base }] : []),
          ...(chapter ? [{ label: chapter.title, to: `${base}/${chapter.id}` }] : []),
          { label: note.data?.title ?? "Note" },
        ]}
      />
      {body()}
    </LearningWorkspaceLayout>
  );
}
