import { useCallback, useMemo } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { useClassCurriculum } from "@/hooks/useLearningWorkspace";
import { useStudyNoteStats, useStudyNotesPage } from "@/hooks/useStudyNotes";
import { LEARNING_MODULES } from "@/lib/learningModules";
import { parseNotesParams, subjectAccent, type NotesSort, type NotesStatus } from "@/lib/studyNotes";
import LearningWorkspaceLayout from "@/components/learn/workspace/LearningWorkspaceLayout";
import LearningContextSidebar from "@/components/learn/workspace/LearningContextSidebar";
import LearningBreadcrumbs, { type Crumb } from "@/components/learn/workspace/LearningBreadcrumbs";
import StudyNotesHero from "@/components/learn/study-notes/StudyNotesHero";
import NotesToolbar from "@/components/learn/study-notes/NotesToolbar";
import { ChapterCards, SubjectCards } from "@/components/learn/study-notes/ChapterCards";
import NoteStatusTabs from "@/components/learn/study-notes/NoteStatusTabs";
import NoteCard from "@/components/learn/study-notes/NoteCard";
import NotesGrid from "@/components/learn/study-notes/NotesGrid";
import {
  ChapterCardsSkeleton,
  NoteCardsSkeleton,
  NotesEmptyState,
  NotesErrorState,
  NotesSearchEmptyState,
} from "@/components/learn/study-notes/NotesStates";

const GRADES = ["6", "7", "8", "9", "10", "11", "12"];
const notesModule = LEARNING_MODULES.notes;

export default function StudyNotesPage() {
  const { subjectSlug = null, chapterId = null } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const state = parseNotesParams(searchParams);
  const rawView = searchParams.get("view");

  // Class comes from the student's academic profile; this page never changes it.
  const { profile } = useAuth();
  const hasGrade = !!profile?.grade && GRADES.includes(profile.grade);
  const classLevel = Number(hasGrade ? profile!.grade : "10");

  const curriculum = useClassCurriculum(classLevel);
  const stats = useStudyNoteStats(classLevel);
  const subjects = useMemo(() => curriculum.data?.subjects ?? [], [curriculum.data]);
  const chapters = useMemo(() => curriculum.data?.chapters ?? [], [curriculum.data]);
  const subject = subjects.find((s) => s.slug === subjectSlug) ?? null;
  const chapter = chapters.find((c) => c.id === chapterId && c.subject_id === subject?.id) ?? null;
  const subjectChapters = useMemo(() => (subject ? chapters.filter((c) => c.subject_id === subject.id) : []), [chapters, subject]);

  const { chapterNotes, chapterDone, subjectNotes, subjectDone } = useMemo(() => {
    const chapterNotes = new Map<string, number>();
    const chapterDone = new Map<string, number>();
    const subjectNotes = new Map<string, number>();
    const subjectDone = new Map<string, number>();
    for (const s of stats.data ?? []) {
      chapterNotes.set(s.chapter_id, s.note_count);
      chapterDone.set(s.chapter_id, s.completed_count);
      subjectNotes.set(s.subject_id, (subjectNotes.get(s.subject_id) ?? 0) + s.note_count);
      subjectDone.set(s.subject_id, (subjectDone.get(s.subject_id) ?? 0) + s.completed_count);
    }
    return { chapterNotes, chapterDone, subjectNotes, subjectDone };
  }, [stats.data]);

  const scopeChapterIds = useMemo(() => {
    if (!curriculum.data) return undefined;
    if (chapter) return [chapter.id];
    if (subject) return subjectChapters.map((c) => c.id);
    return chapters.map((c) => c.id);
  }, [curriculum.data, chapter, subject, subjectChapters, chapters]);

  const matchingChapterIds = useMemo(() => {
    const q = state.q.trim().toLowerCase();
    if (!q) return [];
    const names = new Map(subjects.map((s) => [s.id, s.name.toLowerCase()]));
    return chapters
      .filter((c) => scopeChapterIds?.includes(c.id))
      .filter((c) => c.title.toLowerCase().includes(q) || names.get(c.subject_id)?.includes(q))
      .slice(0, 50)
      .map((c) => c.id);
  }, [state.q, chapters, subjects, scopeChapterIds]);

  const notes = useStudyNotesPage({ classLevel, scopeChapterIds, matchingChapterIds, state });

  const update = useCallback(
    (changes: Record<string, string | null>, resetPage = true) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(changes)) {
            if (v === null || v === "" || (k === "sort" && v === "course") || (k === "status" && v === "all")) next.delete(k);
            else next.set(k, v);
          }
          if (resetPage) next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  const onQueryChange = useCallback((q: string) => update({ q }), [update]);

  const viewTitle = state.view === "saved" ? "Saved Notes" : state.view === "recent" ? "Recent Notes" : rawView === "all" ? "All Notes" : null;
  const title = chapter?.title ?? subject?.name ?? viewTitle ?? "Study Notes";
  const description = chapter
    ? `Notes for this chapter of ${subject!.name}, Class ${classLevel}.`
    : subject
      ? `Chapter notes and revision material for ${subject.name}, Class ${classLevel}.`
      : state.view === "saved"
        ? "Notes you bookmarked, in one place."
        : state.view === "recent"
          ? "Notes you opened most recently."
          : `Chapter notes, revision material and learning resources for Class ${classLevel}.`;
  useDocumentMeta({ title: title === "Study Notes" ? "Study Notes" : `${title} · Study Notes`, description });

  const heroStats = useMemo(() => {
    if (!stats.data) return null;
    const inScope = stats.data.filter((s) => (chapter ? s.chapter_id === chapter.id : subject ? s.subject_id === subject.id : true));
    return {
      notes: inScope.reduce((n, s) => n + s.note_count, 0),
      chapters: chapter ? 1 : subject ? subjectChapters.length : chapters.length,
      completed: inScope.reduce((n, s) => n + s.completed_count, 0),
    };
  }, [stats.data, chapter, subject, subjectChapters.length, chapters.length]);

  const crumbs: Crumb[] = [{ label: "Study Notes", to: notesModule.basePath }];
  if (viewTitle) crumbs.push({ label: viewTitle });
  if (subject) crumbs.push({ label: subject.name, to: `${notesModule.basePath}/${subject.slug}` });
  if (chapter) crumbs.push({ label: chapter.title });

  const chapterTitle = new Map(chapters.map((c) => [c.id, c.title]));
  const subjectOfChapter = new Map(chapters.map((c) => [c.id, subjects.find((s) => s.id === c.subject_id)]));
  const noteHref = (noteChapterId: string, id: string) =>
    `${notesModule.basePath}/${subjectOfChapter.get(noteChapterId)?.slug ?? "subject"}/${noteChapterId}/${id}`;

  const sidebar = (close: () => void) => (
    <LearningContextSidebar
      module={notesModule}
      classLevel={classLevel}
      subjects={subjects}
      chapters={chapters}
      subjectCounts={subjectNotes}
      chapterCounts={chapterNotes}
      location={{ subjectSlug, chapterId, view: rawView ? state.view : null, category: null }}
      onNavigate={close}
    />
  );

  const isError = curriculum.isError || stats.isError || notes.isError;
  const retry = () => {
    if (curriculum.isError) curriculum.refetch();
    if (stats.isError) stats.refetch();
    if (notes.isError) notes.refetch();
  };
  const classHasNotes = (stats.data ?? []).some((s) => s.note_count > 0);
  const isOverview = !subject && state.view === "all" && !rawView;

  const renderNotes = () => {
    if (notes.isLoading || !notes.data) return <NoteCardsSkeleton />;
    const { rows, total } = notes.data;
    if (rows.length === 0) {
      if (state.q) return <NotesSearchEmptyState onClear={() => update({ q: null })} />;
      if (state.status !== "all")
        return <NotesEmptyState title="No notes in this state" body="Try another progress filter." action={<Button variant="outline" size="sm" onClick={() => update({ status: null })}>Show all notes</Button>} />;
      if (state.view === "saved")
        return <NotesEmptyState title="No saved notes yet" body="Use the bookmark on any note to keep it here for revision." />;
      if (state.view === "recent")
        return <NotesEmptyState title="No recently viewed notes" body="Notes you open will appear here so you can pick up where you left off." />;
      if (!classHasNotes)
        return <NotesEmptyState title="No study notes available yet" body="New chapter notes and revision material will appear here." action={<Button asChild variant="outline" size="sm"><Link to="/my-courses">Browse Courses</Link></Button>} />;
      return <NotesEmptyState title={`No notes for ${chapter?.title ?? subject?.name ?? "this selection"} yet`} body="New chapter notes will appear here when mentors publish them." />;
    }
    return (
      <NotesGrid page={state.page} total={total} paged={state.view !== "recent"} onPageChange={(page) => update({ page: String(page) }, false)}>
        {rows.map((n) => {
          const s = subjectOfChapter.get(n.chapter_id);
          return (
            <NoteCard
              key={n.id}
              note={n}
              href={noteHref(n.chapter_id, n.id)}
              chapterTitle={chapterTitle.get(n.chapter_id)}
              subjectName={subject ? undefined : s?.name}
              accent={subjectAccent(s?.slug)}
            />
          );
        })}
      </NotesGrid>
    );
  };

  const notFound =
    curriculum.data && ((subjectSlug && !subject) || (chapterId && !chapter))
      ? subjectSlug && !subject
        ? `This subject isn't part of Class ${classLevel}.`
        : "This chapter could not be found."
      : null;

  return (
    <LearningWorkspaceLayout title="Study Notes" sidebar={sidebar}>
      {crumbs.length > 1 && <LearningBreadcrumbs crumbs={crumbs} />}

      <StudyNotesHero
        title={title}
        description={`${description}${hasGrade ? "" : " Your class isn't set, so Class 10 is shown."}`}
        accent={subjectAccent(subject?.slug)}
        stats={viewTitle ? null : heroStats}
      />

      {notFound ? (
        <NotesEmptyState title={notFound} body="Choose a subject from the Study Notes menu." action={<Button asChild variant="outline" size="sm"><Link to={notesModule.basePath}>Back to Study Notes</Link></Button>} />
      ) : isError ? (
        <NotesErrorState onRetry={retry} />
      ) : (
        <>
          <NotesToolbar
            query={state.q}
            onQueryChange={onQueryChange}
            sort={state.sort}
            onSortChange={(sort: NotesSort) => update({ sort })}
            chapters={subject ? subjectChapters : undefined}
            chapterId={chapter?.id ?? null}
            onChapterChange={subject ? (id) => navigate({ pathname: `${notesModule.basePath}/${subject.slug}${id ? `/${id}` : ""}`, search: searchParams.toString() }) : undefined}
          />

          {isOverview && !state.q && (
            <section className="space-y-3" aria-labelledby="subjects-heading">
              <h2 id="subjects-heading" className="text-xl font-semibold">Subjects</h2>
              {stats.isLoading || curriculum.isLoading ? (
                <ChapterCardsSkeleton />
              ) : (
                <SubjectCards
                  subjects={subjects.map((s) => ({
                    ...s,
                    noteCount: subjectNotes.get(s.id) ?? 0,
                    completedCount: subjectDone.get(s.id) ?? 0,
                    chapterCount: chapters.filter((c) => c.subject_id === s.id).length,
                  }))}
                  hrefFor={(slug) => `${notesModule.basePath}/${slug}`}
                  accentFor={subjectAccent}
                />
              )}
            </section>
          )}

          {subject && !state.q && (
            <section className="space-y-3" aria-labelledby="chapters-heading">
              <h2 id="chapters-heading" className="text-xl font-semibold">Chapters</h2>
              {stats.isLoading ? (
                <ChapterCardsSkeleton />
              ) : subjectChapters.length === 0 ? (
                <NotesEmptyState title={`No chapters for ${subject.name} yet`} body="Chapters are added by the Freequademy team; notes appear inside them." />
              ) : (
                <ChapterCards
                  chapters={subjectChapters.map((c) => ({ id: c.id, title: c.title, noteCount: chapterNotes.get(c.id) ?? 0, completedCount: chapterDone.get(c.id) ?? 0 }))}
                  activeId={chapter?.id ?? null}
                  hrefFor={(id) => `${notesModule.basePath}/${subject.slug}/${id}`}
                  accent={subjectAccent(subject.slug)}
                />
              )}
            </section>
          )}

          <section className="space-y-4" aria-labelledby="notes-heading">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="notes-heading" className="text-xl font-semibold">{state.q ? "Search results" : viewTitle ?? "Notes"}</h2>
              {notes.data && notes.data.total > 0 && (
                <span className="text-sm text-foreground/60">{notes.data.total} {notes.data.total === 1 ? "note" : "notes"}</span>
              )}
            </div>
            {state.view !== "recent" && <NoteStatusTabs value={state.status} onChange={(status: NotesStatus) => update({ status })} />}
            {renderNotes()}
          </section>
        </>
      )}
    </LearningWorkspaceLayout>
  );
}
