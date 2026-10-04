import type { TeacherStudent } from "./types";

/**
 * "Needs attention" signals for a student, derived only from measured data
 * (get_teacher_students). Each signal requires enough data to be meaningful:
 * one absence or one low quiz never flags a student on its own.
 */
export const ATTENTION_THRESHOLDS = {
  /** attendance below this % over at least minMarkedSessions marked sessions */
  attendancePct: 75,
  minMarkedSessions: 2,
  /** last-30-day average at least this many points below the previous 30 days */
  scoreDropPoints: 15,
  /** overall average below this % across at least minTestsForLowScore tests */
  lowScorePct: 50,
  minTestsForLowScore: 2,
  /** no activity on my content for this many days */
  inactiveDays: 14,
} as const;

export type SignalKind = "score_drop" | "low_score" | "attendance" | "inactive";
export type SignalSeverity = "high" | "medium";

export interface AttentionSignal {
  kind: SignalKind;
  severity: SignalSeverity;
  label: string;
}

const DAY_MS = 86_400_000;

export function studentSignals(s: TeacherStudent, now: Date = new Date()): AttentionSignal[] {
  const t = ATTENTION_THRESHOLDS;
  const signals: AttentionSignal[] = [];

  if (s.recent_avg !== null && s.previous_avg !== null) {
    const drop = s.previous_avg - s.recent_avg;
    if (drop >= t.scoreDropPoints) {
      signals.push({
        kind: "score_drop",
        severity: drop >= 25 ? "high" : "medium",
        label: `Average dropped ${Math.round(drop)} points this month`,
      });
    }
  }

  if (s.avg_score !== null && s.tests_submitted >= t.minTestsForLowScore && s.avg_score < t.lowScorePct) {
    signals.push({ kind: "low_score", severity: s.avg_score < 35 ? "high" : "medium", label: `Average score ${Math.round(s.avg_score)}%` });
  }

  const marked = s.sessions_attended + s.sessions_absent;
  if (s.attendance_pct !== null && marked >= t.minMarkedSessions && s.attendance_pct < t.attendancePct) {
    signals.push({
      kind: "attendance",
      severity: s.attendance_pct < 50 ? "high" : "medium",
      label: `Attendance ${Math.round(s.attendance_pct)}% (${s.sessions_attended} of ${marked} classes)`,
    });
  }

  if (s.last_active_at) {
    const days = Math.floor((now.getTime() - new Date(s.last_active_at).getTime()) / DAY_MS);
    if (days >= t.inactiveDays) {
      signals.push({ kind: "inactive", severity: days >= 30 ? "high" : "medium", label: `No activity for ${days} days` });
    }
  }

  return signals.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1));
}

export interface StudentWithSignals {
  student: TeacherStudent;
  signals: AttentionSignal[];
}

/** Students with at least one signal, most urgent first. */
export function studentsNeedingAttention(students: TeacherStudent[], now: Date = new Date()): StudentWithSignals[] {
  const weight = (signals: AttentionSignal[]) => signals.reduce((sum, s) => sum + (s.severity === "high" ? 3 : 1), 0);
  return students
    .map((student) => ({ student, signals: studentSignals(student, now) }))
    .filter((x) => x.signals.length > 0)
    .sort((a, b) => weight(b.signals) - weight(a.signals) || a.student.full_name.localeCompare(b.student.full_name));
}
