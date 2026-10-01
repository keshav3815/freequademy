// api.freequademy.com — the one API domain we own (Architecture V1 Phase 1).
//
// Indian ISPs DNS-blocked *.supabase.co for ~8 days in Feb–Mar 2026; clients
// that call our own domain are not affected by a block on the vendor's.
// Runs as a Cloudflare Worker (free plan). Responsibilities, deliberately few:
//   * route   /v1/*  → Edge Function `api`  (/functions/v1/api/v1/*)
//             /auth/v1, /rest/v1, /storage/v1, /functions/v1, /realtime/v1 → Supabase, unchanged
//   * request id: accept a well-formed x-request-id or mint one; forward it and
//     return it, so one failure can be traced from browser to Postgres logs
//   * cache:  only anonymous GETs to an allow-list of public resources;
//             anything carrying a user's token is never cached
// Authorization stays where it was: Supabase Auth + RLS.

export interface GatewayEnv {
  /** e.g. https://<project-ref>.supabase.co */
  SUPABASE_ORIGIN: string;
  /** The project's publishable/anon key: requests bearing only this are anonymous. */
  SUPABASE_ANON_KEY: string;
  /** Comma-separated browser origins allowed by CORS. */
  ALLOWED_ORIGINS: string;
}

export interface CacheLike {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

export interface GatewayDeps {
  fetch: (request: Request) => Promise<Response>;
  cache?: CacheLike;
  waitUntil?: (promise: Promise<unknown>) => void;
}

const PASSTHROUGH = ["/auth/v1/", "/rest/v1/", "/storage/v1/", "/functions/v1/", "/realtime/v1/"];
const PUBLIC_CACHE_TTL_SECONDS = 60;
// Anonymous reads that return the same rows for every visitor.
const PUBLIC_PATHS = [
  /^\/v1\/public\//,
  /^\/rest\/v1\/(subjects|chapters|forum_categories|blog_posts)$/,
  /^\/storage\/v1\/object\/public\//,
];
const REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/;

export function requestIdFor(request: Request): string {
  const incoming = request.headers.get("x-request-id");
  return incoming && REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();
}

/** Upstream URL for a gateway path, or null when the path is not served. */
export function upstreamUrl(url: URL, origin: string): string | null {
  const base = origin.replace(/\/+$/, "");
  if (url.pathname === "/v1" || url.pathname.startsWith("/v1/")) {
    return `${base}/functions/v1/api${url.pathname}${url.search}`;
  }
  if (PASSTHROUGH.some((prefix) => url.pathname.startsWith(prefix))) {
    return `${base}${url.pathname}${url.search}`;
  }
  return null;
}

/** True only for anonymous GETs of allow-listed public resources. */
export function isPublicCacheable(request: Request, url: URL, anonKey: string): boolean {
  if (request.method !== "GET") return false;
  if (!PUBLIC_PATHS.some((re) => re.test(url.pathname))) return false;
  const auth = request.headers.get("authorization");
  return auth === null || auth === `Bearer ${anonKey}`;
}

/** Exact origins, or "https://*.example.app" for any subdomain of example.app over HTTPS. */
export function originAllowed(origin: string, allowList: string): boolean {
  return allowList.split(",").map((o) => o.trim()).filter(Boolean).some((entry) => {
    if (!entry.includes("*")) return entry === origin;
    const match = /^https:\/\/\*\.([a-z0-9.-]+)$/i.exec(entry);
    return !!match && origin.startsWith("https://") && origin.endsWith(`.${match[1]}`)
      && !origin.slice("https://".length, origin.length - match[1].length - 1).includes("/");
  });
}

function corsHeaders(request: Request, env: GatewayEnv): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin || !originAllowed(origin, env.ALLOWED_ORIGINS)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": request.headers.get("access-control-request-headers")
      ?? "authorization, apikey, content-type, x-client-info, x-request-id, prefer, range, accept-profile, content-profile",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
    "Access-Control-Expose-Headers": "x-request-id, content-range, content-profile",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

function errorResponse(status: number, code: string, message: string, requestId: string, extra: Record<string, string>) {
  return new Response(JSON.stringify({ error: { code, message, request_id: requestId } }), {
    status,
    headers: { "Content-Type": "application/json", "x-request-id": requestId, ...extra },
  });
}

function withHeaders(response: Response, headers: Record<string, string>): Response {
  // WebSocket upgrades must be returned untouched.
  if (response.status === 101) return response;
  const copy = new Response(response.body, response);
  for (const [key, value] of Object.entries(headers)) copy.headers.set(key, value);
  return copy;
}

export async function handle(request: Request, env: GatewayEnv, deps: GatewayDeps): Promise<Response> {
  const url = new URL(request.url);
  const requestId = requestIdFor(request);
  const cors = corsHeaders(request, env);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...cors, "x-request-id": requestId } });
  }

  const target = upstreamUrl(url, env.SUPABASE_ORIGIN);
  if (!target) return errorResponse(404, "not_found", "No such endpoint.", requestId, cors);

  const upstreamRequest = new Request(target, request);
  upstreamRequest.headers.set("x-request-id", requestId);

  const cacheable = deps.cache !== undefined && isPublicCacheable(request, url, env.SUPABASE_ANON_KEY);
  const cacheKey = new Request(url.toString(), { method: "GET", headers: { accept: request.headers.get("accept") ?? "*/*" } });

  if (cacheable) {
    const hit = await deps.cache!.match(cacheKey);
    if (hit) return withHeaders(hit, { ...cors, "x-request-id": requestId, "x-cache": "HIT" });
  }

  let response: Response;
  try {
    response = await deps.fetch(upstreamRequest);
  } catch {
    return errorResponse(502, "upstream_unavailable", "The service is temporarily unavailable.", requestId, cors);
  }

  if (!cacheable) {
    return withHeaders(response, { ...cors, "x-request-id": requestId, ...(isUserScoped(request) ? { "Cache-Control": "private, no-store" } : {}) });
  }

  if (response.status === 200 && !response.headers.has("set-cookie")) {
    const stored = new Response(response.clone().body, response);
    stored.headers.set("Cache-Control", `public, max-age=${PUBLIC_CACHE_TTL_SECONDS}`);
    const put = deps.cache!.put(cacheKey, stored);
    if (deps.waitUntil) deps.waitUntil(put); else await put;
  }
  return withHeaders(response, { ...cors, "x-request-id": requestId, "x-cache": "MISS" });
}

function isUserScoped(request: Request): boolean {
  const auth = request.headers.get("authorization");
  return auth !== null && request.method === "GET";
}
