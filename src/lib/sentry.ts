import type { Breadcrumb, ErrorEvent } from "@sentry/react";

/**
 * Sentry for a platform used by minors (approved as D7, see
 * docs/architecture/sentry-d7-proposal.md). The rule is an allow-list: an event
 * keeps the error, stack, route pattern, release, environment and technical
 * context, and nothing that identifies or quotes a student.
 *
 * The SDK is imported only when VITE_SENTRY_DSN is set, so local dev and builds
 * without a DSN never load or contact Sentry.
 */

const REDACTIONS: RegExp[] = [
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // JWTs / access tokens
  /\b(?:sb_secret|sb_publishable)_[A-Za-z0-9_-]+/g, // Supabase API keys
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, // email addresses
  /(?<!\d)(?:\+?91[-\s]?)?[6-9]\d{4}[-\s]?\d{5}(?!\d)/g, // Indian mobile numbers, with or without a space
  /\bBearer\s+[A-Za-z0-9._-]+/gi, // authorization header values
];
const MAX_TEXT = 300;

/** Redact tokens, emails and phone numbers; cap length so pasted content can't ride along. */
export function scrubText(text: string | undefined): string | undefined {
  if (text === undefined) return undefined;
  const redacted = REDACTIONS.reduce((t, re) => t.replace(re, "[redacted]"), text);
  return redacted.length > MAX_TEXT ? `${redacted.slice(0, MAX_TEXT)}…` : redacted;
}

const ID_SEGMENT = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d+)$/i;

/**
 * Route pattern only: query string and hash dropped (signed URLs and auth
 * tokens live there), UUID and numeric segments replaced with ":id".
 */
export function sanitizeUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  let origin = "";
  let path = url.split(/[?#]/)[0];
  const match = /^(https?:\/\/[^/]+)(.*)$/i.exec(path);
  if (match) [, origin, path] = match;
  const pattern = path
    .split("/")
    .map((segment) => (ID_SEGMENT.test(segment) ? ":id" : segment))
    .join("/");
  return origin + pattern;
}

const KEPT_CONTEXTS = ["browser", "os", "device", "trace", "runtime"] as const;

export function sanitizeEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;
  delete event.extra;
  delete event.server_name;

  if (event.request) {
    // User-Agent only (browser/OS detection); Referer, cookies, body and query are dropped.
    const userAgent = event.request.headers?.["User-Agent"];
    event.request = { url: sanitizeUrl(event.request.url), ...(userAgent ? { headers: { "User-Agent": userAgent } } : {}) };
  }
  if (event.transaction) event.transaction = sanitizeUrl(event.transaction);
  event.message = scrubText(event.message);

  if (event.contexts) {
    const contexts = event.contexts;
    event.contexts = Object.fromEntries(
      KEPT_CONTEXTS.filter((key) => contexts[key]).map((key) => [key, contexts[key]]),
    ) as ErrorEvent["contexts"];
  }

  for (const exception of event.exception?.values ?? []) {
    exception.value = scrubText(exception.value);
    for (const frame of exception.stacktrace?.frames ?? []) delete frame.vars;
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs
      .map(sanitizeBreadcrumb)
      .filter((b): b is Breadcrumb => b !== null);
  }
  return event;
}

export function sanitizeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  const category = breadcrumb.category ?? "";
  // Console output and UI text/input can contain answers, doubts or names.
  if (category === "console" || category.startsWith("ui.")) return null;

  if (category === "fetch" || category === "xhr") {
    const data = breadcrumb.data ?? {};
    return {
      ...breadcrumb,
      message: undefined,
      data: { method: data.method, url: sanitizeUrl(data.url), status_code: data.status_code },
    };
  }
  if (category === "navigation") {
    const data = breadcrumb.data ?? {};
    return { ...breadcrumb, data: { from: sanitizeUrl(data.from), to: sanitizeUrl(data.to) } };
  }
  return { ...breadcrumb, message: scrubText(breadcrumb.message), data: undefined };
}

type SentryModule = typeof import("@sentry/react");
let sentry: SentryModule | null = null;

export async function initSentry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || sentry) return;

  const mod = await import("@sentry/react");
  mod.init({
    dsn,
    environment: import.meta.env.VITE_APP_ENV ?? "unknown",
    release: import.meta.env.VITE_APP_RELEASE,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    defaultIntegrations: false,
    // Uncaught errors reach Sentry through monitoring.ts (reportError), so the
    // SDK's own global handlers stay off to avoid double reports.
    integrations: [
      mod.linkedErrorsIntegration(),
      mod.dedupeIntegration(),
      mod.httpContextIntegration(),
      mod.breadcrumbsIntegration({ console: false, dom: false }),
      mod.browserTracingIntegration(),
    ],
    beforeBreadcrumb: (breadcrumb) => sanitizeBreadcrumb(breadcrumb),
    beforeSend: (event) => sanitizeEvent(event),
    beforeSendTransaction: (event) => {
      delete event.user;
      if (event.request) event.request = { url: sanitizeUrl(event.request.url) };
      if (event.transaction) event.transaction = sanitizeUrl(event.transaction);
      return event;
    },
  });
  sentry = mod;
}

/** Forward an error already scrubbed by the sanitizers above; no-op without a DSN. */
export function captureToSentry(error: Error, tags: Record<string, string> = {}): void {
  sentry?.captureException(error, { tags });
}
