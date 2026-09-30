import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, Home } from "lucide-react";
import type { LearningModuleConfig, TestCategory, WorkspaceView } from "@/lib/learningModules";
import type { ChapterNode, SubjectNode } from "@/lib/workspaceItems";
import { cn } from "@/lib/utils";

export interface WorkspaceLocation {
  subjectSlug: string | null;
  chapterId: string | null;
  view: WorkspaceView | null;
  category: TestCategory | null;
}

interface Props {
  module: LearningModuleConfig;
  classLevel: number;
  subjects: SubjectNode[];
  chapters: ChapterNode[];
  subjectCounts: Map<string, number>;
  chapterCounts: Map<string, number>;
  location: WorkspaceLocation;
  onNavigate?: () => void;
}

const itemClass = (active: boolean) =>
  cn(
    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active ? "bg-primary/10 text-primary font-medium" : "text-foreground/75 hover:bg-muted/30 hover:text-foreground",
  );

function CountBadge({ value, label }: { value: number; label: string }) {
  return (
    <span
      className="ml-auto min-w-6 rounded-full bg-muted/25 px-1.5 py-0.5 text-center text-[11px] font-medium tabular-nums text-foreground/70"
      aria-label={label}
    >
      {value}
    </span>
  );
}

/**
 * The module-specific navigation column. Everything it lists is either a
 * config-defined view over the student's own real rows, or the real subjects
 * and chapters of their class — with real counts, never placeholders.
 */
export default function LearningContextSidebar({
  module,
  classLevel,
  subjects,
  chapters,
  subjectCounts,
  chapterCounts,
  location,
  onNavigate,
}: Props) {
  const base = module.basePath;
  const isOverview = !location.subjectSlug && !location.view && !location.category;
  const Icon = module.icon;

  return (
    <nav aria-label={`${module.title} navigation`} className="p-4 space-y-6">
      <div className="flex items-center gap-3 px-2 pt-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div>
          <p className="font-semibold leading-tight">{module.title}</p>
          <p className="text-xs text-foreground/60">Class {classLevel}</p>
        </div>
      </div>

      <div>
        <Link to={base} onClick={onNavigate} className={itemClass(isOverview)} aria-current={isOverview ? "page" : undefined}>
          <Home className="h-4 w-4" aria-hidden="true" /> Overview
        </Link>
      </div>

      {module.groups.map((group) => (
        <div key={group.heading}>
          <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group.heading}</p>
          <ul className="space-y-0.5">
            {group.links.map((link) => {
              const to = link.view ? `${base}?view=${link.view}` : `${base}?category=${link.category}`;
              const active = link.view ? location.view === link.view : location.category === link.category && !location.view;
              const LinkIcon = link.icon;
              return (
                <li key={link.label}>
                  <Link to={to} onClick={onNavigate} className={itemClass(active)} aria-current={active ? "page" : undefined}>
                    <LinkIcon className="h-4 w-4" aria-hidden="true" /> {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div>
        <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Subjects</p>
        {subjects.length === 0 ? (
          <p className="px-3 text-xs text-muted-foreground">No subjects for Class {classLevel} yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {subjects.map((subject) => {
              const open = location.subjectSlug === subject.slug;
              const subjectActive = open && !location.chapterId;
              const subjectChapters = module.chapterNavigation ? chapters.filter((c) => c.subject_id === subject.id) : [];
              const Chevron = open ? ChevronDown : ChevronRight;
              return (
                <li key={subject.id}>
                  <Link
                    to={`${base}/${subject.slug}`}
                    onClick={onNavigate}
                    className={itemClass(subjectActive)}
                    aria-current={subjectActive ? "page" : undefined}
                    aria-expanded={subjectChapters.length > 0 ? open : undefined}
                  >
                    {subjectChapters.length > 0 ? (
                      <Chevron className="h-4 w-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <span className="w-4 shrink-0" aria-hidden="true" />
                    )}
                    <span className="flex-1 truncate">{subject.name}</span>
                    <CountBadge value={subjectCounts.get(subject.id) ?? 0} label={`${subjectCounts.get(subject.id) ?? 0} ${module.itemNoun.many}`} />
                  </Link>
                  {open && subjectChapters.length > 0 && (
                    <ul className="ml-5 mt-0.5 border-l border-border pl-2 space-y-0.5">
                      {subjectChapters.map((chapter) => {
                        const active = location.chapterId === chapter.id;
                        return (
                          <li key={chapter.id}>
                            <Link
                              to={`${base}/${subject.slug}/${chapter.id}`}
                              onClick={onNavigate}
                              className={cn(itemClass(active), "py-1.5")}
                              aria-current={active ? "page" : undefined}
                            >
                              <span className="flex-1 truncate">{chapter.title}</span>
                              <CountBadge value={chapterCounts.get(chapter.id) ?? 0} label={`${chapterCounts.get(chapter.id) ?? 0} ${module.itemNoun.many}`} />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
}
