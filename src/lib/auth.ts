import type { AppRole } from "@/contexts/AuthContext";

/** Landing page for a signed-in user. */
export function homePathForRole(role: AppRole | null): string {
  switch (role) {
    case "admin":
    case "moderator":
      return "/admin";
    case "mentor":
      return "/teacher";
    default:
      return "/dashboard";
  }
}

/**
 * Only allow same-origin, app-relative redirect targets (blocks "//evil.com"
 * and absolute URLs).
 */
export function safeRedirectPath(target: unknown): string | null {
  if (typeof target !== "string") return null;
  if (!target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) return null;
  return target;
}
