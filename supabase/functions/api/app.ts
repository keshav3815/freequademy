// Versioned service API (Architecture V1 Phase 3), served at
// /functions/v1/api/v1/* and, through the gateway, api.freequademy.com/v1/*.
//
// Rules: simple owner-scoped reads/writes stay on PostgREST (/rest/v1) under
// RLS; this API is for workflows that need secrets, external calls or a
// stable versioned contract for non-web clients. Database access always uses
// the caller's JWT, so RLS remains the final boundary. Contract:
// docs/architecture/api/v1.md.
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AIProvider } from "../_shared/ai/provider.ts";
import { type DoubtDb, answerDoubt } from "../_shared/doubt.ts";
import { bearerToken, corsHeaders, errorBody, requestIdFrom } from "../_shared/http.ts";

/** The slice of a Supabase client the routes use. */
export interface ApiDb extends DoubtDb {
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>;
  // PostgREST query builders are chained fluently; typing them here adds nothing.
  // deno-lint-ignore no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
}

export interface ApiDeps {
  /** Client running as the given user (JWT) or as anon when token is null. */
  dbFor(token: string | null, requestId: string): ApiDb;
  /** Verified user id for a JWT, or null. */
  verify(token: string): Promise<string | null>;
  providers(): AIProvider[];
  log(event: string, data: Record<string, unknown>): void;
}

type Env = { Variables: { requestId: string; userId: string; token: string } };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function createApp(deps: ApiDeps) {
  const app = new Hono<Env>().basePath("/api");

  app.use("*", async (c, next) => {
    const requestId = requestIdFrom(c.req.raw.headers);
    c.set("requestId", requestId);
    if (c.req.method === "OPTIONS") return c.body(null, 204, corsHeaders);
    await next();
    for (const [key, value] of Object.entries(corsHeaders)) c.header(key, value);
    c.header("x-request-id", requestId);
  });

  const requireUser = createMiddleware<Env>(async (c, next) => {
    const token = bearerToken(c.req.raw.headers);
    const userId = token ? await deps.verify(token) : null;
    if (!token || !userId) {
      return c.json(errorBody("unauthorized", "Sign in to use this endpoint.", c.get("requestId")), 401);
    }
    c.set("userId", userId);
    c.set("token", token);
    await next();
  });

  app.get("/v1/health", (c) => c.json({ status: "ok", request_id: c.get("requestId") }));

  // Public catalogue: identical for every visitor, so the gateway may cache it.
  app.get("/v1/public/subjects", async (c) => {
    const classLevel = Number(c.req.query("class_level"));
    if (!Number.isInteger(classLevel) || classLevel < 6 || classLevel > 12) {
      return c.json(errorBody("invalid_request", "class_level must be an integer from 6 to 12.", c.get("requestId")), 400);
    }
    const { data, error } = await deps.dbFor(null, c.get("requestId"))
      .from("subjects")
      .select("id, name, slug, class_level, sort_order")
      .eq("class_level", classLevel)
      .order("sort_order");
    if (error) {
      deps.log("subjects_failed", { request_id: c.get("requestId"), code: error.code });
      return c.json(errorBody("internal", "Could not load subjects.", c.get("requestId")), 500);
    }
    c.header("Cache-Control", "public, max-age=300");
    return c.json({ data });
  });

  app.get("/v1/student/dashboard", requireUser, async (c) => {
    const classLevel = Number(c.req.query("class_level"));
    const from = c.req.query("from") ?? "";
    const to = c.req.query("to") ?? "";
    if (!Number.isInteger(classLevel) || classLevel < 6 || classLevel > 12 || !DATE.test(from) || !DATE.test(to)) {
      return c.json(errorBody("invalid_request", "class_level (6–12), from and to (YYYY-MM-DD) are required.", c.get("requestId")), 400);
    }
    const { data, error } = await deps.dbFor(c.get("token"), c.get("requestId"))
      .rpc("get_student_dashboard", { _class_level: classLevel, _from: from, _to: to });
    c.header("Cache-Control", "private, no-store");
    if (error) {
      const invalid = error.code === "22023";
      return c.json(errorBody(invalid ? "invalid_request" : "internal", invalid ? "Invalid date range." : "Could not load the dashboard.", c.get("requestId")), invalid ? 400 : 500);
    }
    return c.json({ data });
  });

  app.post("/v1/ai/doubts", requireUser, async (c) => {
    const body = await c.req.json().catch(() => undefined);
    if (body === undefined) {
      return c.json(errorBody("invalid_request", "Request body must be valid JSON.", c.get("requestId")), 400);
    }
    const requestId = c.get("requestId");
    const outcome = await answerDoubt(
      {
        db: deps.dbFor(c.get("token"), requestId),
        userId: c.get("userId"),
        providers: deps.providers(),
        log: (event, data) => deps.log(event, { request_id: requestId, ...data }),
      },
      body,
    );
    c.header("Cache-Control", "private, no-store");
    if (!outcome.ok) {
      return c.json({ ...errorBody(outcome.code, outcome.message, requestId), ...(outcome.remaining !== undefined ? { remaining: outcome.remaining } : {}) },
        outcome.status as ContentfulStatusCode);
    }
    return c.json({ data: { answer: outcome.answer, doubt_id: outcome.doubtId, remaining: outcome.remaining, model: outcome.model } });
  });

  app.notFound((c) => c.json(errorBody("not_found", "No such endpoint.", c.get("requestId") ?? requestIdFrom(c.req.raw.headers)), 404));
  app.onError((error, c) => {
    const requestId = c.get("requestId") ?? requestIdFrom(c.req.raw.headers);
    deps.log("unhandled_error", { request_id: requestId, message: error.message });
    return c.json(errorBody("internal", "Something went wrong.", requestId), 500);
  });

  return app;
}
