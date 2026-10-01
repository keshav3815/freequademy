// Invoked by pg_cron through pg_net with the x-worker-secret header (see
// docs/architecture/runbooks/jobs.md). Uses the service role only to call the
// service_role-only jobs_* RPCs; handlers never receive it.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { type ClaimedJob, runJobs, secretMatches, webhookHandler } from "./jobs.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!secretMatches(req.headers.get("x-worker-secret"), Deno.env.get("WORKER_SECRET"))) {
    return new Response("Forbidden", { status: 403 });
  }

  const allowedHosts = (Deno.env.get("WEBHOOK_ALLOWED_HOSTS") ?? "").split(",").map((h) => h.trim()).filter(Boolean);
  const summary = await runJobs(
    {
      claim: async (types, limit) => {
        const { data, error } = await admin.rpc("jobs_claim", { _types: types, _limit: limit });
        if (error) throw new Error(`claim failed: ${error.code}`);
        return (data ?? []) as ClaimedJob[];
      },
      complete: async (id) => {
        await admin.rpc("jobs_complete", { _id: id });
      },
      fail: async (id, message) => {
        const { data } = await admin.rpc("jobs_fail", { _id: id, _error: message });
        return (data as string | null) ?? null;
      },
    },
    { webhook: webhookHandler(allowedHosts) },
  );

  console.log(JSON.stringify({ event: "worker_run", ...summary }));
  return Response.json(summary);
});
