# D7 — Sentry monitoring proposal (NOT ENABLED)

**Status:** D7 APPROVED 2026-10-01. Implemented in `src/lib/sentry.ts` (allow-list sanitizer, verified by `src/lib/sentry.test.ts`). **Not yet sending anything:** no `VITE_SENTRY_DSN` is configured in any environment.
Freequademy's users are school students (Class 6–12, mostly minors), so the default is: **collect the error, never the child.**

## What would be collected

| Data | Collected? | Why / how |
|---|---|---|
| Error message and stack trace | Yes | The point of monitoring. Messages are scrubbed (below) |
| Route path, e.g. `/courses/:subjectId` | Yes, **as the route pattern** | Real ids and query strings dropped (tokens can appear in `?` and `#`) |
| Release (git commit SHA) and environment (`staging` / `production`) | Yes | Know which deploy broke |
| Browser, OS, device type | Yes | Reproduce device-specific bugs (4G Android is the main audience) |
| `x-request-id` | Yes (Phase 1+) | Trace one failure across gateway, API, database, jobs |
| Portal role (`student` / `teacher` / `admin`) | Yes, as a tag | Triage by portal; not an identifier |
| Web Vitals (LCP, INP, CLS, TTFB) | Yes, 10% sample | Real-user performance in India |
| User id, email, name, grade | **No** | `sendDefaultPii: false`; no `setUser()` call |
| IP address | **No** | `sendDefaultPii: false` and the project setting "Prevent storing of IP addresses" on |
| Session replay / screen recording | **No** | Not initialised |
| Request / response bodies (doubt text, answers, uploaded images) | **No** | Stripped in `beforeSend`; fetch breadcrumbs keep method + path + status only |
| Console logs as breadcrumbs | **No** | Console integration disabled |
| Form input values | **No** | Never captured (no replay, no DOM text breadcrumbs) |
| Cookies, `Authorization` headers, JWTs, Supabase keys | **No** | Removed; plus a scrubber that redacts any `eyJ…` JWT, email address or 10-digit phone number found in any string |

## Frontend configuration (to apply after approval)

```ts
// src/lib/sentry.ts — loaded only when VITE_SENTRY_DSN is set (never in local dev)
import * as Sentry from "@sentry/react";

const REDACT = [
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // JWTs
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,                          // emails
  /(?<!\d)(?:\+?91[-\s]?)?[6-9]\d{4}[-\s]?\d{5}(?!\d)/g,              // Indian mobile numbers
];
const scrub = (s?: string) => REDACT.reduce((t, re) => t?.replace(re, "[redacted]"), s);
const stripUrl = (u?: string) => u?.split(/[?#]/)[0];

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_APP_ENV,           // "staging" | "production"
  release: import.meta.env.VITE_RELEASE,                // git SHA from CI
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  integrations: [Sentry.browserTracingIntegration()],  // no replayIntegration
  beforeBreadcrumb(b) {
    if (b.category === "console" || b.category === "ui.input") return null;
    if (b.data?.url) b.data = { method: b.data.method, url: stripUrl(b.data.url), status_code: b.data.status_code };
    return b;
  },
  beforeSend(event) {
    delete event.user;
    if (event.request) event.request = { url: stripUrl(event.request.url) };
    event.message = scrub(event.message);
    event.exception?.values?.forEach((v) => { v.value = scrub(v.value); });
    return event;
  },
});
```

Edge Functions (`doubt-solver`, later `api`/`worker`) use `@sentry/deno` with the same rules: no request bodies, no user id, error + status + request id only.

## Decisions attached to D7

- **Data region:** Sentry offers US and EU (Frankfurt) storage, not India. Recommended: **EU** (stronger default privacy regime). DPDP Act implications for minors' data leaving India: UNKNOWN — REQUIRES YOUR / LEGAL REVIEW; the table above keeps personal data out of Sentry entirely, which minimises that exposure.
- **Plan:** Sentry Developer (free, 5k errors/month) is enough for staging; production volume: UNKNOWN until real traffic.
- **Alternative with no third party:** the existing `VITE_ERROR_REPORTING_URL` hook in `src/lib/monitoring.ts` posting to our own `client_errors` table. Less capable (no grouping, alerting or performance), but no data leaves Supabase.

Enabling requires: your approval of D7, a Sentry project (EU region, IP storage off), and `VITE_SENTRY_DSN` set in the Vercel staging environment first.
