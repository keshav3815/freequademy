/**
 * Client-side error reporting (Architecture V1, zero-cost monitoring).
 *
 * Captures render errors (ErrorBoundary), uncaught errors and unhandled
 * promise rejections in one place. Reports are scrubbed in the browser
 * (src/lib/telemetry/sanitize.ts) and sent to the report_client_error RPC,
 * which scrubs again, caps fields and rate-limits — the data stays in our own
 * Supabase project. Nothing is sent unless VITE_APP_ENV is set (staging or
 * production), so local development only logs to the console.
 */

import { buildErrorReport } from "./telemetry/sanitize";

interface ErrorContext {
  componentStack?: string;
  [key: string]: unknown;
}

const environment = import.meta.env.VITE_APP_ENV as string | undefined;
let reportedThisSession = 0;
const MAX_REPORTS_PER_SESSION = 20;

export function reportError(error: unknown, context: ErrorContext = {}) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error("[freequademy]", err, context);

  if (!environment || reportedThisSession >= MAX_REPORTS_PER_SESSION) return;
  reportedThisSession++;

  const report = buildErrorReport(err, {
    environment,
    release: import.meta.env.VITE_APP_RELEASE,
    pathname: window.location.pathname,
    userAgent: navigator.userAgent,
    source: typeof context.source === "string" ? context.source : "react",
  });

  // The Supabase client is loaded on demand so reporting adds nothing to the
  // initial bundle; reporting must never throw.
  void import("@/integrations/supabase/client")
    .then(({ supabase }) => supabase.rpc("report_client_error", { _report: report as never }))
    .catch(() => undefined);
}

export function installGlobalErrorHandlers() {
  window.addEventListener("error", (event) => reportError(event.error ?? event.message, { source: "window.onerror" }));
  window.addEventListener("unhandledrejection", (event) => reportError(event.reason, { source: "unhandledrejection" }));
}
