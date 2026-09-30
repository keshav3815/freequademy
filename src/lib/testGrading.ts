/**
 * Single source of truth for turning a raw test percentage into a status
 * label. Used by the recent-results table, the "needs attention"/weak-areas
 * card, and anywhere else a score needs a plain-language verdict — so the
 * thresholds are never invented ad hoc in a component.
 *
 * Thresholds are a product choice with no prior definition anywhere else in
 * the codebase; these are the ones this dashboard introduces and documents:
 *   >= 75%  Excellent
 *   50–74%  Good
 *   <  50%  Needs Revision
 */
export type ScoreStatus = "excellent" | "good" | "needs_revision";

export const SCORE_STATUS_LABEL: Record<ScoreStatus, string> = {
  excellent: "Excellent",
  good: "Good",
  needs_revision: "Needs Revision",
};

export function scoreStatus(percentage: number): ScoreStatus {
  if (percentage >= 75) return "excellent";
  if (percentage >= 50) return "good";
  return "needs_revision";
}

/** Below this, a subject/chapter is surfaced in "Needs Attention". */
export const WEAK_AREA_THRESHOLD = 60;
