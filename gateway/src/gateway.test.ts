// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { type CacheLike, type GatewayEnv, handle, isPublicCacheable, originAllowed, upstreamUrl } from "./gateway";

const env: GatewayEnv = {
  SUPABASE_ORIGIN: "https://ref.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  ALLOWED_ORIGINS: "https://freequademy.com,https://*.vercel.app",
};

function memoryCache(): CacheLike & { store: Map<string, Response> } {
  const store = new Map<string, Response>();
  return {
    store,
    match: async (req) => store.get(req.url)?.clone(),
    put: async (req, res) => { store.set(req.url, res); },
  };
}

const upstreamOk = (body = "[]") => vi.fn(async () => new Response(body, { status: 200, headers: { "Content-Type": "application/json" } }));

describe("routing", () => {
  it.each([
    ["/v1/student/dashboard?class_level=10", "https://ref.supabase.co/functions/v1/api/v1/student/dashboard?class_level=10"],
    ["/rest/v1/subjects?select=*", "https://ref.supabase.co/rest/v1/subjects?select=*"],
    ["/auth/v1/token?grant_type=password", "https://ref.supabase.co/auth/v1/token?grant_type=password"],
    ["/storage/v1/object/sign/x", "https://ref.supabase.co/storage/v1/object/sign/x"],
    ["/realtime/v1/websocket", "https://ref.supabase.co/realtime/v1/websocket"],
    ["/functions/v1/doubt-solver", "https://ref.supabase.co/functions/v1/doubt-solver"],
  ])("%s → %s", (path, expected) => {
    expect(upstreamUrl(new URL(`https://api.freequademy.com${path}`), env.SUPABASE_ORIGIN)).toBe(expected);
  });

  it("serves nothing else", async () => {
    for (const path of ["/", "/admin", "/pg/query", "/v2/x", "/rest/v10/x"]) {
      expect(upstreamUrl(new URL(`https://api.freequademy.com${path}`), env.SUPABASE_ORIGIN)).toBeNull();
    }
    const res = await handle(new Request("https://api.freequademy.com/pg/meta"), env, { fetch: upstreamOk() });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
  });
});

describe("request ids", () => {
  it("forwards a well-formed id upstream and echoes it back", async () => {
    const fetch = upstreamOk();
    const res = await handle(new Request("https://api.freequademy.com/rest/v1/doubts", { headers: { "x-request-id": "abc-12345678" } }), env, { fetch });
    expect(fetch.mock.calls[0][0].headers.get("x-request-id")).toBe("abc-12345678");
    expect(res.headers.get("x-request-id")).toBe("abc-12345678");
  });

  it("replaces a malformed id instead of trusting it", async () => {
    const fetch = upstreamOk();
    await handle(new Request("https://api.freequademy.com/rest/v1/doubts", { headers: { "x-request-id": "<script>" } }), env, { fetch });
    expect(fetch.mock.calls[0][0].headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("caching", () => {
  it("caches anonymous public reads", async () => {
    const cache = memoryCache();
    const fetch = upstreamOk('[{"id":1}]');
    const req = () => new Request("https://api.freequademy.com/rest/v1/subjects?class_level=eq.10", { headers: { authorization: "Bearer anon-key" } });
    const first = await handle(req(), env, { fetch, cache });
    const second = await handle(req(), env, { fetch, cache });
    expect(first.headers.get("x-cache")).toBe("MISS");
    expect(second.headers.get("x-cache")).toBe("HIT");
    expect(await second.text()).toBe('[{"id":1}]');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("never caches a request carrying a user's token, even on a public path", async () => {
    const cache = memoryCache();
    const fetch = upstreamOk();
    const res = await handle(new Request("https://api.freequademy.com/rest/v1/subjects", { headers: { authorization: "Bearer user-jwt" } }), env, { fetch, cache });
    expect(cache.store.size).toBe(0);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("never caches private paths, writes or errors", () => {
    const anon = { authorization: "Bearer anon-key" };
    expect(isPublicCacheable(new Request("https://a/rest/v1/doubts", { headers: anon }), new URL("https://a/rest/v1/doubts"), "anon-key")).toBe(false);
    expect(isPublicCacheable(new Request("https://a/v1/student/dashboard", { headers: anon }), new URL("https://a/v1/student/dashboard"), "anon-key")).toBe(false);
    expect(isPublicCacheable(new Request("https://a/rest/v1/subjects", { method: "POST", headers: anon }), new URL("https://a/rest/v1/subjects"), "anon-key")).toBe(false);
  });

  it("does not store upstream errors", async () => {
    const cache = memoryCache();
    await handle(new Request("https://api.freequademy.com/v1/public/subjects?class_level=10"), env,
      { fetch: vi.fn(async () => new Response("{}", { status: 500 })), cache });
    expect(cache.store.size).toBe(0);
  });
});

describe("CORS and failures", () => {
  it("allows listed origins and Vercel previews, nothing else", () => {
    expect(originAllowed("https://freequademy.com", env.ALLOWED_ORIGINS)).toBe(true);
    expect(originAllowed("https://edu-spark-game-abc.vercel.app", env.ALLOWED_ORIGINS)).toBe(true);
    expect(originAllowed("https://evil.com", env.ALLOWED_ORIGINS)).toBe(false);
    expect(originAllowed("http://x.vercel.app", env.ALLOWED_ORIGINS)).toBe(false);
    expect(originAllowed("https://vercel.app.evil.com", env.ALLOWED_ORIGINS)).toBe(false);
  });

  it("answers preflight without calling Supabase", async () => {
    const fetch = upstreamOk();
    const res = await handle(new Request("https://api.freequademy.com/rest/v1/x", { method: "OPTIONS", headers: { origin: "https://freequademy.com" } }), env, { fetch });
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://freequademy.com");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns a standard 502 when Supabase is unreachable", async () => {
    const res = await handle(new Request("https://api.freequademy.com/rest/v1/x"), env, { fetch: vi.fn(async () => { throw new Error("down"); }) });
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe("upstream_unavailable");
  });
});
