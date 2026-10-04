import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { useLearningWorkspace, type AttemptRow } from "@/hooks/useLearningWorkspace";
import type { WeakAreaRow } from "@/hooks/dashboardTypes";
import WeakAreasCard from "@/components/dashboard/WeakAreasCard";
import {
  LEARNING_MODULES,
  TEST_CATEGORY_LABEL,
  VIEW_LABEL,
  parseCategory,
  parseView,
  type LearningModuleConfig,
  type LearningModuleId,
} from "@/lib/learningModules";
import {
  countBySubject,
  filterItems,
  type ItemFilter,
  type LessonItem,
  type TestItem,
  type WorkspaceItem,
} from "@/lib/workspaceItems";
import LearningWorkspaceLayout from "@/components/learn/workspace/LearningWorkspaceLayout";
import LearningContextSidebar from "@/components/learn/workspace/LearningContextSidebar";
import LearningBreadcrumbs, { type Crumb } from "@/components/learn/workspace/LearningBreadcrumbs";
import LessonReader from "@/components/learn/workspace/LessonReader";
import { LessonItemCard, TestItemCard } from "@/components/learn/workspace/WorkspaceItemCard";
import { LearningEmptyState, LearningErrorState, LearningLoadingState } from "@/components/learn/workspace/LearningStates";

const GRADES = ["6", "7", "8", "9", "10", "11", "12"];

function viewLabel(module: LearningModuleConfig, view: NonNullable<ItemFilter["view"]>) {
  for (const group of module.groups) for (const link of group.links) if (link.view === view) return link.label;
  return VIEW_LABEL[view];
}

export default function LearningWorkspace({ moduleId }: { moduleId: LearningModuleId }) {
  const module = LEARNING_MODULES[moduleId];
  const { subjectSlug = null, chapterId = null, itemId = null } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const view = parseView(searchParams.get("view"));
  const category = parseCategory(searchParams.get("category"));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<NonNullable<ItemFilter["status"]>>("all");
  const [difficulty, setDifficulty] = useState<NonNullable<ItemFilter["difficulty"]>>("all");

  // The class comes from the student's academic profile; the workspace never changes it.
  const { profile } = useAuth();
  const hasGrade = !!profile?.grade && GRADES.includes(profile.grade);
  const classLevel = Number(hasGrade ? profile!.grade : "10");

  const ws = useLearningWorkspace(module, classLevel);
  const subjects = useMemo(() => ws.curriculum?.subjects ?? [], [ws.curriculum]);
  const chapters = useMemo(() => ws.curriculum?.chapters ?? [], [ws.curriculum]);
  // In-app links may carry a subject id (dashboard rows) or a placeholder chapter
  // ("/:subjectId/_/:lessonId"); both resolve to the canonical slug URL below.
  const subject = subjects.find((s) => s.slug === subjectSlug) ?? subjects.find((s) => s.id === subjectSlug) ?? null;
  const chapter = chapters.find((c) => c.id === chapterId && c.subject_id === subject?.id) ?? null;
  const canonicalPath = useMemo(() => {
    if (!subject || ws.isLoading) return null;
    const item = itemId ? ws.items.find((i) => i.id === itemId) : undefined;
    return [module.basePath, subject.slug, item?.chapter_id ?? chapterId, itemId].filter(Boolean).join("/");
  }, [subject, ws.isLoading, ws.items, itemId, chapterId, module.basePath]);
  const currentPath = [module.basePath, subjectSlug, chapterId, itemId].filter(Boolean).join("/");
  const needsRedirect = canonicalPath !== null && canonicalPath !== currentPath;
  useEffect(() => {
    if (needsRedirect) navigate({ pathname: canonicalPath!, search: location.search }, { replace: true });
  }, [needsRedirect, canonicalPath, navigate, location.search]);
  const names = useMemo(
    () => ({
      subjects: new Map(subjects.map((s) => [s.id, s.name])),
      chapters: new Map(chapters.map((c) => [c.id, c.title])),
    }),
    [subjects, chapters],
  );
  const subjectCounts = useMemo(() => countBySubject(ws.items), [ws.items]);
  const chapterCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of ws.items) if (i.chapter_id) m.set(i.chapter_id, (m.get(i.chapter_id) ?? 0) + 1);
    return m;
  }, [ws.items]);

  const isOverview = !subjectSlug && !view && !category;
  const scopeTitle = itemId
    ? module.title
    : chapter?.title ?? subject?.name ?? (view ? viewLabel(module, view) : category ? TEST_CATEGORY_LABEL[category] : module.title);

  useDocumentMeta({ title: `${scopeTitle === module.title ? module.title : `${scopeTitle} · ${module.title}`}`, description: module.overviewBlurb });

  const filtered = useMemo(
    () =>
      filterItems<WorkspaceItem>(
        ws.items,
        { subjectId: subject?.id, chapterId: chapter?.id, view, category, query, status, difficulty },
        names,
      ),
    [ws.items, subject, chapter, view, category, query, status, difficulty, names],
  );

  const crumbs: Crumb[] = [{ label: module.title, to: module.basePath }];
  if (view) crumbs.push({ label: viewLabel(module, view) });
  if (category) crumbs.push({ label: TEST_CATEGORY_LABEL[category] });
  if (subject) crumbs.push({ label: subject.name, to: `${module.basePath}/${subject.slug}` });
  if (chapter) crumbs.push({ label: chapter.title, to: `${module.basePath}/${subject!.slug}/${chapter.id}` });

  const lessonHref = (item: LessonItem) => {
    const s = subjects.find((x) => x.id === item.subject_id);
    return `${module.basePath}/${s?.slug ?? "subject"}/${item.chapter_id}/${item.id}`;
  };

  const sidebar = (close: () => void) => (
    <LearningContextSidebar
      module={module}
      classLevel={classLevel}
      subjects={subjects}
      chapters={chapters}
      subjectCounts={subjectCounts}
      chapterCounts={chapterCounts}
      location={{ subjectSlug, chapterId, view, category }}
      onNavigate={close}
    />
  );

  const renderBody = () => {
    if (ws.isLoading || needsRedirect) return <LearningLoadingState label={module.itemNoun.many} />;
    if (ws.isError) return <LearningErrorState label={module.itemNoun.many} onRetry={ws.refetch} />;

    if (subjectSlug && !subject) {
      return <LearningEmptyState message={`This subject isn't part of Class ${classLevel}.`} action={<Button asChild size="sm" variant="outline"><Link to={module.basePath}>Back to {module.title}</Link></Button>} />;
    }
    if (chapterId && !chapter) {
      return <LearningEmptyState message="This chapter could not be found." action={<Button asChild size="sm" variant="outline"><Link to={`${module.basePath}/${subject!.slug}`}>Back to {subject!.name}</Link></Button>} />;
    }

    if (itemId && module.kind === "lesson") {
      const siblings = (ws.items as LessonItem[]).filter((i) => i.chapter_id === chapter?.id).sort((a, b) => a.sort_order - b.sort_order);
      const index = siblings.findIndex((i) => i.id === itemId);
      const next = index >= 0 ? siblings[index + 1] : undefined;
      return <LessonReader module={module} lessonId={itemId} item={siblings[index]} nextHref={next ? lessonHref(next) : null} />;
    }

    if (view === "results") return <ResultsTable attempts={ws.attempts} tests={ws.items as TestItem[]} />;
    if (view === "weak") return <WeakAreasView />;

    const list =
      filtered.length === 0 ? (
        <LearningEmptyState message={ws.items.length === 0 ? module.emptyMessage : `No ${module.itemNoun.many} match this selection.`} />
      ) : (
        <ItemGrid module={module} items={filtered} lessonHref={lessonHref} names={names} />
      );

    if (module.id === "courses" && subject && !view && !query) {
      return (
        <>
          {list}
          <CourseTests subjectId={subject.id} chapterId={chapter?.id ?? null} />
        </>
      );
    }
    if (!isOverview || query) return list;
    if (ws.items.length === 0) return <LearningEmptyState message={module.emptyMessage} />;
    return (
      <>
        <OverviewPanel module={module} items={ws.items} subjects={subjects} subjectCounts={subjectCounts} lessonHref={lessonHref} names={names} />
        <section className="space-y-3">
          <h2 className="font-semibold">All {module.itemNoun.many}</h2>
          {list}
        </section>
      </>
    );
  };

  const showToolbar = !itemId && view !== "results" && view !== "weak";

  return (
    <LearningWorkspaceLayout title={module.title} sidebar={sidebar}>
      {(itemId || crumbs.length > 1) && <LearningBreadcrumbs crumbs={itemId ? [...crumbs, { label: "Reading" }] : crumbs} />}

      {!itemId && (
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{scopeTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isOverview ? module.overviewBlurb : `Class ${classLevel} ${module.itemNoun.many}`}
            {!hasGrade && " — your class isn't set, so Class 10 is shown."}
          </p>
        </div>
      )}

      {showToolbar && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={module.searchPlaceholder}
              aria-label={`Search ${module.title}`}
              className="pl-9"
            />
          </div>
          {module.kind === "lesson" ? (
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="sm:w-44" aria-label="Filter by progress"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All progress</SelectItem>
                <SelectItem value="not_started">Not started</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
              <SelectTrigger className="sm:w-44" aria-label="Filter by difficulty"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {renderBody()}
    </LearningWorkspaceLayout>
  );
}

interface Names { subjects: Map<string, string>; chapters: Map<string, string> }

function ItemGrid({ module, items, lessonHref, names }: { module: LearningModuleConfig; items: WorkspaceItem[]; lessonHref: (i: LessonItem) => string; names: Names }) {
  return (
    <div className="grid sm:grid-cols-2 2xl:grid-cols-3 gap-4">
      {items.map((item) => {
        const context = { subjectName: names.subjects.get(item.subject_id), chapterTitle: item.chapter_id ? names.chapters.get(item.chapter_id) : undefined };
        return item.kind === "lesson" ? (
          <LessonItemCard key={item.id} item={item} to={lessonHref(item)} context={context} />
        ) : (
          <TestItemCard key={item.id} item={item} context={context} showCategory={module.id === "test-series"} />
        );
      })}
    </div>
  );
}

function OverviewPanel({
  module,
  items,
  subjects,
  subjectCounts,
  lessonHref,
  names,
}: {
  module: LearningModuleConfig;
  items: WorkspaceItem[];
  subjects: { id: string; name: string; slug: string }[];
  subjectCounts: Map<string, number>;
  lessonHref: (i: LessonItem) => string;
  names: Names;
}) {
  const lessons = items.filter((i): i is LessonItem => i.kind === "lesson");
  const tests = items.filter((i): i is TestItem => i.kind === "test");
  const stats =
    module.kind === "lesson"
      ? [
          { label: `Available ${module.itemNoun.many}`, value: lessons.length },
          { label: "In progress", value: lessons.filter((i) => i.progressStatus === "in_progress").length },
          { label: "Completed", value: lessons.filter((i) => i.progressStatus === "completed").length },
          { label: "Saved", value: lessons.filter((i) => i.saved).length },
        ]
      : [
          { label: `Available ${module.itemNoun.many}`, value: tests.length },
          { label: "Attempted", value: tests.filter((i) => i.submittedCount > 0).length },
          { label: "In progress", value: tests.filter((i) => i.hasOpenAttempt).length },
          { label: "Saved", value: tests.filter((i) => i.saved).length },
        ];
  const resume = (
    module.kind === "lesson"
      ? lessons.filter((i) => i.progressStatus === "in_progress").sort((a, b) => (b.lastViewedAt ?? "").localeCompare(a.lastViewedAt ?? ""))
      : tests.filter((i) => i.hasOpenAttempt)
  ).slice(0, 3);

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className="text-2xl font-bold tabular-nums">{s.value}</dd>
          </Card>
        ))}
      </dl>

      {resume.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Pick up where you left off</h2>
          <ItemGrid module={module} items={resume} lessonHref={lessonHref} names={names} />
        </section>
      )}

      {subjects.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Browse by subject</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {subjects.map((s) => {
              const count = subjectCounts.get(s.id) ?? 0;
              return (
                <Link
                  key={s.id}
                  to={`${module.basePath}/${s.slug}`}
                  className="rounded-lg border border-border bg-card p-3 hover:border-primary/40 transition-colors"
                >
                  <p className="font-medium text-sm truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{count} {count === 1 ? module.itemNoun.one : module.itemNoun.many}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function ResultsTable({ attempts, tests }: { attempts: AttemptRow[]; tests: TestItem[] }) {
  const byId = new Map(tests.map((t) => [t.id, t]));
  const rows = attempts.filter((a) => a.status === "submitted" && byId.has(a.test_id));
  if (rows.length === 0) return <LearningEmptyState message="No submitted tests yet. Your results will appear here after your first test." />;
  return (
    <Card className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Test</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead><span className="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{byId.get(a.test_id)!.title}</TableCell>
              <TableCell className="text-muted-foreground">{a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{a.score}/{a.max_score} ({Number(a.percentage)}%)</TableCell>
              <TableCell className="text-right">
                <Button asChild size="sm" variant="ghost"><Link to={`/tests/${a.test_id}/attempts/${a.id}`}>Review</Link></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

/** Published tests of one course (optionally one chapter) with the student's own best scores. */
function CourseTests({ subjectId, chapterId }: { subjectId: string; chapterId: string | null }) {
  const { user } = useAuth();
  const tests = useQuery({
    queryKey: ["workspace", "course-tests", subjectId, chapterId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from("tests")
        .select("id, title, description, difficulty, duration_minutes, test_type, subject_id, chapter_id")
        .eq("status", "published")
        .eq("subject_id", subjectId);
      if (chapterId) query = query.eq("chapter_id", chapterId);
      const { data, error } = await query.order("created_at").limit(100);
      if (error) throw error;
      const ids = (data ?? []).map((t) => t.id);
      if (ids.length === 0) return [];
      const [{ data: attempts, error: attemptError }, { data: saved, error: savedError }] = await Promise.all([
        supabase.from("test_attempts").select("test_id, status, percentage").in("test_id", ids),
        supabase.from("saved_items").select("test_id").in("test_id", ids),
      ]);
      if (attemptError) throw attemptError;
      if (savedError) throw savedError;
      const savedIds = new Set((saved ?? []).map((s) => s.test_id));
      return (data ?? []).map<TestItem>((t) => {
        const rows = (attempts ?? []).filter((a) => a.test_id === t.id);
        const submitted = rows.filter((a) => a.status === "submitted");
        return {
          ...t,
          kind: "test",
          saved: savedIds.has(t.id),
          bestPercentage: submitted.length ? Math.max(...submitted.map((a) => Number(a.percentage ?? 0))) : null,
          submittedCount: submitted.length,
          hasOpenAttempt: rows.some((a) => a.status === "in_progress"),
          lastActivityAt: null,
        };
      });
    },
  });

  return (
    <section className="space-y-3" aria-labelledby="course-tests-heading">
      <h2 id="course-tests-heading" className="font-semibold">Tests in this {chapterId ? "chapter" : "course"}</h2>
      {tests.isLoading ? (
        <LearningLoadingState label="tests" />
      ) : tests.isError ? (
        <LearningErrorState label="tests" onRetry={() => tests.refetch()} />
      ) : (tests.data ?? []).length === 0 ? (
        <LearningEmptyState message="No tests published for this yet." />
      ) : (
        <div className="grid sm:grid-cols-2 2xl:grid-cols-3 gap-4">
          {tests.data!.map((t) => <TestItemCard key={t.id} item={t} context={{}} showCategory />)}
        </div>
      )}
    </section>
  );
}

function WeakAreasView() {
  const { user } = useAuth();
  const weak = useQuery({
    queryKey: ["workspace", "weak-areas", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_weak_areas", { _limit: 3 });
      if (error) throw error;
      return (data ?? []) as WeakAreaRow[];
    },
  });
  if (weak.isLoading) return <LearningLoadingState label="weak areas" />;
  if (weak.isError) return <LearningErrorState label="weak areas" onRetry={() => weak.refetch()} />;
  return <WeakAreasCard areas={weak.data ?? []} />;
}
