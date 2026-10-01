/**
 * Client-side scrubbing for error reports and Web Vitals (D7, zero-cost
 * version). Freequademy's users are mostly minors, so the rule is an
 * allow-list: a report carries the error type, a scrubbed message, a scrubbed
 * stack, the route pattern, release and environment — never who the student
 * is or what they typed. The database scrubs again (private.scrub_text).
 */

const REDACTIONS: RegExp[] = [
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // JWTs / access tokens
  /\b(?:sb_secret|sb_publishable)_[A-Za-z0-9_-]+/g, // Supabase API keys
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, // email addresses
  /(?<!\d)(?:\+?91[-\s]?)?[6-9]\d{4}[-\s]?\d{5}(?!\d)/g, // Indian mobile numbers, with or without a space
  /\bBearer\s+[A-Za-z0-9._-]+/gi, // authorization header values
];

/** Redact tokens, emails and phone numbers; cap length so pasted content can't ride along. */
export function scrubText(text: string | undefined, max = 300): string | undefined {
  if (text === undefined) return undefined;
  const redacted = REDACTIONS.reduce((t, re) => t.replace(re, "[redacted]"), text);
  return redacted.length > max ? `${redacted.slice(0, max)}…` : redacted;
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

/** Stack traces: every URL reduced to its route pattern, then scrubbed. */
export function sanitizeStack(stack: string | undefined): string | undefined {
  if (!stack) return stack;
  const urls = stack.replace(/https?:\/\/[^\s)]+/g, (url) => {
    const lineCol = /(:\d+:\d+)$/.exec(url)?.[1] ?? "";
    return (sanitizeUrl(url.slice(0, url.length - lineCol.length)) ?? "") + lineCol;
  });
  return scrubText(urls, 4000);
}

/** Coarse browser and OS names only — never the full user-agent string. */
export function describeAgent(userAgent: string): { browser: string; os: string } {
  const os = /Android/i.test(userAgent) ? "Android"
    : /iPhone|iPad|iPod/i.test(userAgent) ? "iOS"
    : /Windows/i.test(userAgent) ? "Windows"
    : /Mac OS X/i.test(userAgent) ? "macOS"
    : /Linux/i.test(userAgent) ? "Linux"
    : "other";
  const browser = /Edg\//.test(userAgent) ? "Edge"
    : /SamsungBrowser/.test(userAgent) ? "Samsung Internet"
    : /OPR\//.test(userAgent) ? "Opera"
    : /Firefox\//.test(userAgent) ? "Firefox"
    : /Chrome\//.test(userAgent) ? "Chrome"
    : /Safari\//.test(userAgent) ? "Safari"
    : "other";
  return { browser, os };
}

export interface ErrorReport {
  environment: string;
  release?: string;
  route?: string;
  source?: string;
  error_type?: string;
  message?: string;
  stack?: string;
  browser: string;
  os: string;
}

/** The only shape that ever leaves the browser for an error. */
export function buildErrorReport(
  error: Error,
  env: { environment: string; release?: string; pathname: string; userAgent: string; source?: string },
): ErrorReport {
  return {
    environment: env.environment,
    release: env.release,
    route: sanitizeUrl(env.pathname),
    source: env.source,
    error_type: error.name?.slice(0, 80),
    message: scrubText(error.message),
    stack: sanitizeStack(error.stack),
    ...describeAgent(env.userAgent),
  };
}
