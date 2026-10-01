import { describe, expect, it, vi } from "vitest";
import { type ApiDb, type ApiDeps, createApp } from "./app";

function deps(overrides: Partial<ApiDeps> = {}) {
  const rpc = vi.fn().mockResolvedValue({ data: { summary: { data: {} } }, error: null });
  const order = vi.fn().mockResolvedValue({ data: [{ id: "s1", name: "Mathematics" }], error: null });
  const db = {
    rpc,
    from: vi.fn(() => ({ select: () => ({ eq: () => ({ order }) }) })),
  } as unknown as ApiDb;
  const dbFor = vi.fn(() => db);
  const base: ApiDeps = {
    dbFor,
    verify: vi.fn(async (token: string) => (token === "good" ? "user-1" : null)),
    providers: () => [],
    log: vi.fn(),
  };
  return { deps: { ...base, ...overrides }, rpc, dbFor };
}

const auth = { Authorization: "Bearer good" };

describe("api v1", () => {
  it("answers health checks with a request id echoed in the header", async () => {
    const res = await createApp(deps().deps).request("/api/v1/health", { headers: { "x-request-id": "req-12345678" } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", request_id: "req-12345678" });
    expect(res.headers.get("x-request-id")).toBe("req-12345678");
  });

  it("generates a request id when the client sends a malformed one", async () => {
    const res = await createApp(deps().deps).request("/api/v1/health", { headers: { "x-request-id": "bad id!" } });
    expect(res.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("uses one error format for unknown routes", async () => {
    const res = await createApp(deps().deps).request("/api/v1/nope");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "not_found", message: "No such endpoint.", request_id: expect.any(String) } });
  });

  it("requires a valid session for student data", async () => {
    const app = createApp(deps().deps);
    expect((await app.request("/api/v1/student/dashboard?class_level=10&from=2026-01-01&to=2026-01-31")).status).toBe(401);
    const bad = await app.request("/api/v1/student/dashboard?class_level=10&from=2026-01-01&to=2026-01-31", { headers: { Authorization: "Bearer forged" } });
    expect(bad.status).toBe(401);
    expect((await bad.json()).error.code).toBe("unauthorized");
  });

  it("serves the dashboard read model with the caller's own token, never cached", async () => {
    const { deps: d, rpc, dbFor } = deps();
    const res = await createApp(d).request("/api/v1/student/dashboard?class_level=10&from=2026-01-01&to=2026-01-31", { headers: auth });
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(dbFor).toHaveBeenCalledWith("good", expect.any(String));
    expect(rpc).toHaveBeenCalledWith("get_student_dashboard", { _class_level: 10, _from: "2026-01-01", _to: "2026-01-31" });
  });

  it("validates dashboard parameters", async () => {
    const res = await createApp(deps().deps).request("/api/v1/student/dashboard?class_level=99&from=x&to=y", { headers: auth });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_request");
  });

  it("serves the public catalogue as cacheable, via the anonymous client", async () => {
    const { deps: d, dbFor } = deps();
    const res = await createApp(d).request("/api/v1/public/subjects?class_level=10");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=300");
    expect(dbFor).toHaveBeenCalledWith(null, expect.any(String));
    expect(await res.json()).toEqual({ data: [{ id: "s1", name: "Mathematics" }] });
  });

  it("returns 503 in the standard format when AI is not configured", async () => {
    const { deps: d } = deps();
    (d.dbFor(null, "x").rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [{ allowed: true }], error: null });
    const res = await createApp(d).request("/api/v1/ai/doubts", {
      method: "POST", headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ question: "What is photosynthesis?", subject: "Science" }),
    });
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("ai_not_configured");
  });

  it("never exposes internal errors", async () => {
    const res = await createApp(deps({ verify: () => { throw new Error("db password is hunter2"); } }).deps)
      .request("/api/v1/student/dashboard?class_level=10&from=2026-01-01&to=2026-01-31", { headers: auth });
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain("hunter2");
    expect(JSON.parse(text).error.code).toBe("internal");
  });
});
