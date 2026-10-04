import { describe, expect, it } from "vitest";
import { countBySubject, filterItems, type LessonItem, type TestItem } from "./workspaceItems";

const lesson = (over: Partial<LessonItem>): LessonItem => ({
  kind: "lesson",
  id: "l",
  title: "Lesson",
  summary: null,
  duration_minutes: 10,
  sort_order: 0,
  subject_id: "maths",
  chapter_id: "algebra",
  saved: false,
  progressStatus: null,
  lastViewedAt: null,
  ...over,
});

const test_ = (over: Partial<TestItem>): TestItem => ({
  kind: "test",
  id: "t",
  title: "Test",
  description: null,
  difficulty: "medium",
  duration_minutes: 15,
  test_type: "practice",
  subject_id: "maths",
  chapter_id: null,
  saved: false,
  bestPercentage: null,
  submittedCount: 0,
  hasOpenAttempt: false,
  lastActivityAt: null,
  ...over,
});

const names = {
  subjects: new Map([["maths", "Mathematics"], ["science", "Science"]]),
  chapters: new Map([["algebra", "Quadratic Equations"], ["motion", "Motion"]]),
};

describe("filterItems", () => {
  const lessons = [
    lesson({ id: "a", title: "Roots", progressStatus: "completed", lastViewedAt: "2026-09-01" }),
    lesson({ id: "b", title: "Graphs", progressStatus: "in_progress", lastViewedAt: "2026-09-10", saved: true }),
    lesson({ id: "c", title: "Speed", subject_id: "science", chapter_id: "motion" }),
  ];

  it("scopes to a subject and chapter", () => {
    expect(filterItems(lessons, { subjectId: "science" }, names).map((i) => i.id)).toEqual(["c"]);
    expect(filterItems(lessons, { chapterId: "algebra" }, names).map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("applies lesson views from real progress and saved rows", () => {
    expect(filterItems(lessons, { view: "saved" }, names).map((i) => i.id)).toEqual(["b"]);
    expect(filterItems(lessons, { view: "completed" }, names).map((i) => i.id)).toEqual(["a"]);
    expect(filterItems(lessons, { view: "in_progress" }, names).map((i) => i.id)).toEqual(["b"]);
  });

  it("orders the recent view by last viewed, newest first, and excludes unviewed items", () => {
    expect(filterItems(lessons, { view: "recent" }, names).map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("searches titles, subject names and chapter names case-insensitively", () => {
    expect(filterItems(lessons, { query: "GRAPH" }, names).map((i) => i.id)).toEqual(["b"]);
    expect(filterItems(lessons, { query: "quadratic" }, names).map((i) => i.id)).toEqual(["a", "b"]);
    expect(filterItems(lessons, { query: "science" }, names).map((i) => i.id)).toEqual(["c"]);
  });

  it("filters lessons by progress status, treating no progress as not started", () => {
    expect(filterItems(lessons, { status: "not_started" }, names).map((i) => i.id)).toEqual(["c"]);
  });

  const tests = [
    test_({ id: "p", test_type: "chapter", difficulty: "easy" }),
    test_({ id: "q", test_type: "full", submittedCount: 2, bestPercentage: 40 }),
    test_({ id: "r", test_type: "full", submittedCount: 1, bestPercentage: 90, hasOpenAttempt: true }),
  ];

  it("filters tests by category and difficulty", () => {
    expect(filterItems(tests, { category: "full" }, names).map((i) => i.id)).toEqual(["q", "r"]);
    expect(filterItems(tests, { difficulty: "easy" }, names).map((i) => i.id)).toEqual(["p"]);
  });

  it("derives test views from real attempts", () => {
    expect(filterItems(tests, { view: "available" }, names).map((i) => i.id)).toEqual(["p"]);
    expect(filterItems(tests, { view: "completed" }, names).map((i) => i.id)).toEqual(["q", "r"]);
    expect(filterItems(tests, { view: "in_progress" }, names).map((i) => i.id)).toEqual(["r"]);
    expect(filterItems(tests, { view: "needs_revision" }, names).map((i) => i.id)).toEqual(["q"]);
  });
});

describe("countBySubject", () => {
  it("counts only real items per subject", () => {
    const counts = countBySubject([lesson({ id: "a" }), lesson({ id: "b" }), lesson({ id: "c", subject_id: "science" })]);
    expect(counts.get("maths")).toBe(2);
    expect(counts.get("science")).toBe(1);
    expect(counts.get("english")).toBeUndefined();
  });
});
