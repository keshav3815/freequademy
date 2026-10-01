import { describe, expect, it } from "vitest";
import { studentSignals, studentsNeedingAttention } from "./signals";
import { classState, greetingFor, initials, pct, pointDelta } from "./format";
import type { TeacherStudent } from "./types";

const NOW = new Date("2026-09-30T10:00:00Z");

const student = (patch: Partial<TeacherStudent> = {}): TeacherStudent => ({
  student_id: "s1",
  full_name: "Asha Verma",
  grade: "10",
  subject_ids: [],
  subject_names: [],
  lessons_started: 0,
  lessons_completed: 0,
  tests_submitted: 0,
  avg_score: null,
  recent_avg: null,
  previous_avg: null,
  sessions_attended: 0,
  sessions_absent: 0,
  attendance_pct: null,
  last_active_at: NOW.toISOString(),
  ...patch,
});

describe("studentSignals", () => {
  it("returns nothing for a student without data", () => {
    expect(studentSignals(student({ last_active_at: null }), NOW)).toEqual([]);
  });

  it("flags a score drop only when both months have data", () => {
    expect(studentSignals(student({ recent_avg: 60, previous_avg: 80 }), NOW).map((s) => s.kind)).toEqual(["score_drop"]);
    expect(studentSignals(student({ recent_avg: 60, previous_avg: null }), NOW)).toEqual([]);
    expect(studentSignals(student({ recent_avg: 70, previous_avg: 80 }), NOW)).toEqual([]);
  });

  it("does not flag a low score from a single test", () => {
    expect(studentSignals(student({ avg_score: 30, tests_submitted: 1 }), NOW)).toEqual([]);
    expect(studentSignals(student({ avg_score: 30, tests_submitted: 2 }), NOW)[0]).toMatchObject({ kind: "low_score", severity: "high" });
  });

  it("needs at least two marked classes before flagging attendance", () => {
    expect(studentSignals(student({ attendance_pct: 0, sessions_absent: 1 }), NOW)).toEqual([]);
    expect(studentSignals(student({ attendance_pct: 67, sessions_attended: 2, sessions_absent: 1 }), NOW)[0].label).toBe(
      "Attendance 67% (2 of 3 classes)",
    );
  });

  it("flags inactivity after 14 days", () => {
    expect(studentSignals(student({ last_active_at: "2026-09-20T10:00:00Z" }), NOW)).toEqual([]);
    expect(studentSignals(student({ last_active_at: "2026-09-10T10:00:00Z" }), NOW)[0]).toMatchObject({ kind: "inactive", label: "No activity for 20 days" });
  });

  it("orders high severity first", () => {
    const signals = studentSignals(student({ recent_avg: 70, previous_avg: 86, avg_score: 30, tests_submitted: 4 }), NOW);
    expect(signals.map((s) => s.severity)).toEqual(["high", "medium"]);
  });
});

describe("studentsNeedingAttention", () => {
  it("keeps only flagged students, most urgent first", () => {
    const rows = studentsNeedingAttention(
      [
        student({ student_id: "ok", full_name: "Fine" }),
        student({ student_id: "mild", full_name: "Mild", recent_avg: 60, previous_avg: 76 }),
        student({ student_id: "urgent", full_name: "Urgent", avg_score: 20, tests_submitted: 3, attendance_pct: 40, sessions_attended: 2, sessions_absent: 3 }),
      ],
      NOW,
    );
    expect(rows.map((r) => r.student.student_id)).toEqual(["urgent", "mild"]);
  });
});

describe("format helpers", () => {
  it("greets by local hour", () => {
    expect(greetingFor(new Date(2026, 8, 30, 9))).toBe("Good morning");
    expect(greetingFor(new Date(2026, 8, 30, 14))).toBe("Good afternoon");
    expect(greetingFor(new Date(2026, 8, 30, 20))).toBe("Good evening");
  });

  it("shows a dash instead of inventing 0%", () => {
    expect(pct(null)).toBe("—");
    expect(pct(81.44)).toBe("81%");
  });

  it("builds initials", () => {
    expect(initials("Rahul Kumar")).toBe("RK");
    expect(initials("Priya")).toBe("P");
    expect(initials("")).toBe("?");
  });

  it("computes point deltas only with both sides", () => {
    expect(pointDelta(82, 75.8)).toBe(6.2);
    expect(pointDelta(82, null)).toBeNull();
  });

  it("derives class state", () => {
    const base = { scheduled_at: "2026-09-30T10:00:00Z", duration_minutes: 60, status: "scheduled" };
    expect(classState(base, new Date("2026-09-30T09:00:00Z"))).toBe("upcoming");
    expect(classState(base, new Date("2026-09-30T09:50:00Z"))).toBe("live");
    expect(classState(base, new Date("2026-09-30T11:30:00Z"))).toBe("completed");
    expect(classState({ ...base, status: "cancelled" }, new Date("2026-09-30T09:50:00Z"))).toBe("cancelled");
  });
});
