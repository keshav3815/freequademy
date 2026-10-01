// Legacy AI doubt endpoint, kept for the current frontend. The workflow itself
// lives in ../_shared/doubt.ts and is also served as POST /v1/ai/doubts by the
// `api` function. Response shape is unchanged: { answer, doubtId, remaining }
// or { error }.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { type DoubtDb, answerDoubt } from "../_shared/doubt.ts";
import { providersFromEnv } from "../_shared/ai/provider.ts";
import { corsHeaders, requestIdFrom } from "../_shared/http.ts";

function json(body: unknown, status: number, requestId: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "x-request-id": requestId },
  });
}

Deno.serve(async (req) => {
  const requestId = requestIdFrom(req.headers);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, requestId);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized - Please log in to use the doubt solver" }, 401, requestId);
    }

    // User-scoped client: every database call runs under the caller's JWT and
    // is subject to RLS. No service-role key is used here.
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader, "x-request-id": requestId } },
    });
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(authHeader.slice(7));
    const userId = claims?.claims?.sub;
    if (claimsError || !userId) return json({ error: "Unauthorized - Invalid session" }, 401, requestId);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Request body must be valid JSON." }, 400, requestId);
    }

    const outcome = await answerDoubt(
      {
        db: supabase as unknown as DoubtDb,
        userId,
        providers: providersFromEnv((key) => Deno.env.get(key)),
        log: (event, data) => console.log(JSON.stringify({ event, request_id: requestId, user_id: userId, ...data })),
      },
      body,
    );
    if (!outcome.ok) {
      return json({ error: outcome.message, ...(outcome.remaining !== undefined ? { remaining: outcome.remaining } : {}) }, outcome.status, requestId);
    }
    return json({ answer: outcome.answer, doubtId: outcome.doubtId, remaining: outcome.remaining }, 200, requestId);
  } catch (error) {
    console.error(JSON.stringify({ event: "doubt_solver_error", request_id: requestId, message: error instanceof Error ? error.message : String(error) }));
    return json({ error: "An unexpected error occurred" }, 500, requestId);
  }
});
