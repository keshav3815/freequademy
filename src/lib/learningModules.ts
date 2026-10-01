import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  BookmarkCheck,
  Brain,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  History,
  LayoutGrid,
  ListChecks,
  PlayCircle,
  RotateCcw,
  Sparkles,
  Target,
  Video,
} from "lucide-react";

export type LearningModuleId = "courses" | "notes" | "videos" | "animated" | "quizzes" | "test-series";

/** Status-style views shown in the contextual sidebar; each is computed from real rows. */
export type WorkspaceView =
  | "all"
  | "saved"
  | "recent"
  | "in_progress"
  | "completed"
  | "needs_revision"
  | "available"
  | "results"
  | "weak";

export type TestCategory = "chapter" | "full";

export interface SidebarLink {
  label: string;
  icon: LucideIcon;
  view?: WorkspaceView;
  category?: TestCategory;
}

export interface SidebarGroup {
  heading: string;
  links: SidebarLink[];
}

export interface LearningModuleConfig {
  id: LearningModuleId;
  title: string;
  basePath: string;
  icon: LucideIcon;
  kind: "lesson" | "test";
  itemNoun: { one: string; many: string };
  searchPlaceholder: string;
  overviewBlurb: string;
  emptyMessage: string;
  groups: SidebarGroup[];
  /** Whether subject → chapter navigation is useful for this module. */
  chapterNavigation: boolean;
}

export const TEST_CATEGORY_LABEL: Record<TestCategory, string> = {
  chapter: "Chapter Tests",
  full: "Full Syllabus",
};

export const VIEW_LABEL: Record<WorkspaceView, string> = {
  all: "All",
  saved: "Saved",
  recent: "Recent",
  in_progress: "In Progress",
  completed: "Completed",
  needs_revision: "Needs Revision",
  available: "Available",
  results: "My Results",
  weak: "Weak Areas",
};

export const LEARNING_MODULES: Record<LearningModuleId, LearningModuleConfig> = {
  courses: {
    id: "courses",
    title: "My Courses",
    basePath: "/my-courses",
    icon: BookOpen,
    kind: "lesson",
    itemNoun: { one: "lesson", many: "lessons" },
    searchPlaceholder: "Search lessons, chapters, topics...",
    overviewBlurb: "Every course for your class — subjects, chapters and lessons in one place.",
    emptyMessage: "No lessons published yet. New lessons will appear here as mentors add them.",
    chapterNavigation: true,
    groups: [
      {
        heading: "My Learning",
        links: [
          { label: "Continue Learning", icon: PlayCircle, view: "in_progress" },
          { label: "Completed", icon: CheckCircle2, view: "completed" },
          { label: "Saved", icon: BookmarkCheck, view: "saved" },
          { label: "Recently Viewed", icon: History, view: "recent" },
        ],
      },
    ],
  },
  notes: {
    id: "notes",
    title: "Study Notes",
    basePath: "/study-notes",
    icon: FileText,
    kind: "lesson",
    itemNoun: { one: "note", many: "notes" },
    searchPlaceholder: "Search notes, chapters, topics...",
    overviewBlurb: "Chapter notes written by mentors for your class.",
    emptyMessage: "No study notes available yet. New chapter notes will appear here.",
    chapterNavigation: true,
    groups: [
      {
        heading: "My Notes",
        links: [
          { label: "All Notes", icon: LayoutGrid, view: "all" },
          { label: "Saved Notes", icon: BookmarkCheck, view: "saved" },
          { label: "Recent Notes", icon: History, view: "recent" },
        ],
      },
    ],
  },
  videos: {
    id: "videos",
    title: "Videos",
    basePath: "/videos",
    icon: Video,
    kind: "lesson",
    itemNoun: { one: "video", many: "videos" },
    searchPlaceholder: "Search videos and topics...",
    overviewBlurb: "Video lessons for your class, organised by subject and chapter.",
    emptyMessage: "No video lessons available yet. New videos will appear here.",
    chapterNavigation: true,
    groups: [
      {
        heading: "My Learning",
        links: [
          { label: "Continue Watching", icon: PlayCircle, view: "in_progress" },
          { label: "Completed", icon: CheckCircle2, view: "completed" },
          { label: "Watch Later", icon: Clock, view: "saved" },
        ],
      },
    ],
  },
  animated: {
    id: "animated",
    title: "Animated",
    basePath: "/animated",
    icon: Sparkles,
    kind: "lesson",
    itemNoun: { one: "animated lesson", many: "animated lessons" },
    searchPlaceholder: "Search concepts and simulations...",
    overviewBlurb: "Visual and interactive lessons that show concepts in motion.",
    emptyMessage: "No animated lessons available yet. Interactive lessons will appear here.",
    chapterNavigation: true,
    groups: [
      {
        heading: "My Learning",
        links: [
          { label: "Recently Viewed", icon: History, view: "recent" },
          { label: "Favorites", icon: BookmarkCheck, view: "saved" },
          { label: "Completed", icon: CheckCircle2, view: "completed" },
        ],
      },
    ],
  },
  quizzes: {
    id: "quizzes",
    title: "Quizzes",
    basePath: "/quizzes",
    icon: Brain,
    kind: "test",
    itemNoun: { one: "quiz", many: "quizzes" },
    searchPlaceholder: "Search quizzes and topics...",
    overviewBlurb: "Short practice quizzes, scored instantly with explanations.",
    emptyMessage: "No quizzes available yet. New practice quizzes will appear here.",
    chapterNavigation: true,
    groups: [
      {
        heading: "My Activity",
        links: [
          { label: "In Progress", icon: PlayCircle, view: "in_progress" },
          { label: "Completed", icon: CheckCircle2, view: "completed" },
          { label: "Saved", icon: BookmarkCheck, view: "saved" },
          { label: "Needs Revision", icon: RotateCcw, view: "needs_revision" },
        ],
      },
    ],
  },
  "test-series": {
    id: "test-series",
    title: "Test Series",
    basePath: "/test-series",
    icon: ClipboardList,
    kind: "test",
    itemNoun: { one: "test", many: "tests" },
    searchPlaceholder: "Search tests and exams...",
    overviewBlurb: "Timed chapter and full-syllabus tests in a focused exam mode.",
    emptyMessage: "No tests available yet. Chapter and full-syllabus tests will appear here.",
    chapterNavigation: false,
    groups: [
      {
        heading: "My Tests",
        links: [
          { label: "Available", icon: ListChecks, view: "available" },
          { label: "In Progress", icon: PlayCircle, view: "in_progress" },
          { label: "Completed", icon: CheckCircle2, view: "completed" },
          { label: "Saved", icon: BookmarkCheck, view: "saved" },
        ],
      },
      {
        heading: "Test Categories",
        links: [
          { label: TEST_CATEGORY_LABEL.chapter, icon: FileText, category: "chapter" },
          { label: TEST_CATEGORY_LABEL.full, icon: Target, category: "full" },
        ],
      },
      {
        heading: "Performance",
        links: [
          { label: "My Results", icon: BarChart3, view: "results" },
          { label: "Weak Areas", icon: RotateCcw, view: "weak" },
        ],
      },
    ],
  },
};

export const LEARNING_MODULE_LIST = Object.values(LEARNING_MODULES);

export function parseView(value: string | null): WorkspaceView | null {
  return value && value in VIEW_LABEL ? (value as WorkspaceView) : null;
}

export function parseCategory(value: string | null): TestCategory | null {
  return value === "chapter" || value === "full" ? value : null;
}
