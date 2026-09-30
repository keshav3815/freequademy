/**
 * Minimal client-side error reporting.
 *
 * Captures render errors (ErrorBoundary), uncaught errors and unhandled
 * promise rejections in one place. Without a configured endpoint it only logs
 * to the console. To forward events to an error tracker, set
 * VITE_ERROR_REPORTING_URL to an endpoint that accepts JSON POSTs (for example
 * a Sentry tunnel or a Supabase Edge Function) — see docs/observability.md.
 */

import { captureToSentry } from "./sentry";

interface ErrorContext {
  componentStack?: string;
  [key: string]: unknown;
}

const endpoint = import.meta.env.VITE_ERROR_REPORTING_URL as string | undefined;
let reportedThisSession = 0;
const MAX_REPORTS_PER_SESSION = 20;

export function reportError(error: unknown, context: ErrorContext = {}) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error("[freequademy]", err, context);
  captureToSentry(err, typeof context.source === "string" ? { source: context.source } : {});

  if (!endpoint || reportedThisSession >= MAX_REPORTS_PER_SESSION) return;
  reportedThisSession++;

  const payload = {
    message: err.message.slice(0, 1000),
    stack: err.stack?.slice(0, 4000),
    path: window.location.pathname, // no query string: it can contain tokens
    release: import.meta.env.VITE_APP_RELEASE ?? "dev",
    userAgent: navigator.userAgent,
    ...context,
  };

  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
    } else {
      void fetch(endpoint, { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch {
    // reporting must never throw
  }
}

export function installGlobalErrorHandlers() {
  window.addEventListener("error", (event) => reportError(event.error ?? event.message, { source: "window.onerror" }));
  window.addEventListener("unhandledrejection", (event) => reportError(event.reason, { source: "unhandledrejection" }));
}
