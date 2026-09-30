import { addMinutes, formatDistanceToNowStrict, isAfter, isBefore } from "date-fns";

/** Time-of-day greeting in the viewer's local time. */
export function greetingFor(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function firstName(fullName: string | null | undefined): string {
  return fullName?.trim().split(/\s+/)[0] ?? "";
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** "82%" or an em dash when there is no data (never a fabricated 0%). */
export function pct(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function relativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "Never";
  const date = new Date(iso);
  if (Math.abs(now.getTime() - date.getTime()) < 60_000) return "Just now";
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

export function fileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type ClassState = "live" | "upcoming" | "completed" | "cancelled";

/**
 * Display state of a class: "live" from 15 minutes before the start until
 * the scheduled end (same window the old dashboard used for "Join Now").
 */
export function classState(
  session: { scheduled_at: string; duration_minutes: number; status: string },
  now: Date = new Date(),
): ClassState {
  if (session.status === "cancelled") return "cancelled";
  const start = new Date(session.scheduled_at);
  const end = addMinutes(start, session.duration_minutes);
  if (session.status === "completed" || isBefore(end, now)) return "completed";
  if (isAfter(now, addMinutes(start, -15))) return "live";
  return "upcoming";
}

/** Signed difference in points, e.g. "+6.2" / "−3.0"; null when either side is missing. */
export function pointDelta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  return Math.round((current - previous) * 10) / 10;
}
