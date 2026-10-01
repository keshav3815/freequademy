// Shared HTTP conventions for Edge Functions (Architecture V1 Phase 3).
// Pure TypeScript so it runs in Deno and in Vitest.

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Expose-Headers": "x-request-id",
};

const REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/;

/** The gateway's x-request-id when it is well-formed, otherwise a new one. */
export function requestIdFrom(headers: Headers): string {
  const incoming = headers.get("x-request-id");
  return incoming && REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();
}

export interface ErrorBody {
  error: { code: string; message: string; request_id: string };
}

/** The one error format every /v1 endpoint returns. Never a stack trace. */
export function errorBody(code: string, message: string, requestId: string): ErrorBody {
  return { error: { code, message, request_id: requestId } };
}

export function bearerToken(headers: Headers): string | null {
  const value = headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice("Bearer ".length) : null;
}
