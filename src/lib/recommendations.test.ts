import { describe, expect, it } from "vitest";
import { buildRecommendations } from "./recommendations";
import type { SubjectProgressRow as SubjectRow, WeakAreaRow as WeakArea } from "@/hooks/dashboardTypes";

const subject = (over: Partial<SubjectRow> = {}): SubjectRow => ({
  subject_id: "s1", subject_name: "Physics", slug: "physics", sort_order: 1,
  chapter_count: 1, lesson_count: 5, lessons_completed: 2, test_count: 2,
  average_score: null, status: "in_progress", last_activity_at: null,
  ...over,
});

describe("buildRecommendations", () => {
  it("returns nothing for a brand-new student with no real signals", () => {
    const recs = buildRecommendations({ weakAreas: [], subjects: [], doubtStats: { total: 0, resolved: 0, unresolved: 0, escalated: 0, topSubjects: [] } });
    expect(recs).toHaveLength(0);
  });

  it("only recommends a weak area below the documented threshold", () => {
    const weak: WeakArea = { subject_id: "s1", subject_name: "Physics", chapter_id: null, chapter_title: null, average_score: 58, attempts_count: 2 };
    const strong: WeakArea = { ...weak, average_score: 90 };
    expect(buildRecommendations({ weakAreas: [weak], subjects: [], doubtStats: undefined })[0].id).toBe("weak-area");
    expect(buildRecommendations({ weakAreas: [strong], subjects: [], doubtStats: undefined })).toHaveLength(0);
  });

  it("suggests a test only for a subject with published tests but no attempts", () => {
    const recs = buildRecommendations({ weakAreas: [], subjects: [subject({ test_count: 3, average_score: null })], doubtStats: undefined });
    expect(recs[0].id).toBe("untested-subject");

    const recsWithAttempt = buildRecommendations({ weakAreas: [], subjects: [subject({ test_count: 3, average_score: 80 })], doubtStats: undefined });
    expect(recsWithAttempt).toHaveLength(0);
  });

  it("flags unresolved (escalated) doubts", () => {
    const recs = buildRecommendations({ weakAreas: [], subjects: [], doubtStats: { total: 3, resolved: 1, unresolved: 2, escalated: 0, topSubjects: [] } });
    expect(recs[0].id).toBe("unresolved-doubts");
    expect(recs[0].detail).toContain("2 doubts");
  });

  it("caps at 4 recommendations, in priority order", () => {
    const recs = buildRecommendations({
      weakAreas: [{ subject_id: "s2", subject_name: "Chem", chapter_id: null, chapter_title: null, average_score: 40, attempts_count: 1 }],
      subjects: [subject({ subject_id: "s3", subject_name: "Maths", test_count: 2, average_score: null })],
      doubtStats: { total: 1, resolved: 0, unresolved: 1, escalated: 0, topSubjects: [] },
    });
    expect(recs.map((r) => r.id)).toEqual(["weak-area", "untested-subject", "unresolved-doubts"]);
  });
});
