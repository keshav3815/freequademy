/**
 * Indian school academic year runs April–March. This is a calculated
 * calendar fact (not stored student data), so it's safe to derive rather
 * than fabricate: April 2026 → October 2026 is "2026–27"; January 2027 is
 * still "2026–27".
 */
export function currentAcademicYear(now: Date = new Date()): string {
  const year = now.getFullYear();
  const startYear = now.getMonth() >= 3 ? year : year - 1; // month is 0-indexed; April = 3
  return `${startYear}–${String(startYear + 1).slice(2)}`;
}
