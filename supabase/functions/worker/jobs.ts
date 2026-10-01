// External-job runner (Architecture V1 Phase 4). SQL-only jobs run inside
// Postgres (private.run_sql_jobs via pg_cron); jobs that call the outside
// world run here. Pure TypeScript with injected dependencies for Vitest.

export interface ClaimedJob {
  id: number;
  type: string;
  payload: Record<string, unknown>;
  attempt_count: number;
  request_id: string | null;
}

export interface JobQueue {
  claim(types: string[], limit: number): Promise<ClaimedJob[]>;
  complete(id: number): Promise<void>;
  /** Returns the job's new status: "retrying" or "dead". */
  fail(id: number, error: string): Promise<string | null>;
}

export type JobHandler = (job: ClaimedJob) => Promise<void>;

export interface RunSummary {
  claimed: number;
  succeeded: number;
  retrying: number;
  dead: number;
}

export async function runJobs(queue: JobQueue, handlers: Record<string, JobHandler>, limit = 10): Promise<RunSummary> {
  const jobs = await queue.claim(Object.keys(handlers), limit);
  const summary: RunSummary = { claimed: jobs.length, succeeded: 0, retrying: 0, dead: 0 };
  for (const job of jobs) {
    try {
      await handlers[job.type](job);
      await queue.complete(job.id);
      summary.succeeded++;
    } catch (error) {
      const status = await queue.fail(job.id, error instanceof Error ? error.message : String(error));
      if (status === "dead") summary.dead++;
      else summary.retrying++;
    }
  }
  return summary;
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/**
 * Webhook delivery with retries handled by the queue. Only HTTPS URLs on an
 * explicit host allow-list are called, so a job payload cannot be used to
 * reach internal or arbitrary addresses.
 */
export function webhookHandler(allowedHosts: string[], fetchImpl: FetchLike = (i, init) => fetch(i, init)): JobHandler {
  return async (job) => {
    const target = typeof job.payload.url === "string" ? job.payload.url : "";
    let url: URL;
    try {
      url = new URL(target);
    } catch {
      throw new Error("invalid webhook url");
    }
    if (url.protocol !== "https:" || !allowedHosts.includes(url.hostname)) {
      throw new Error(`webhook host not allowed: ${url.hostname}`);
    }
    const response = await fetchImpl(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": `freequademy-job-${job.id}`,
        ...(job.request_id ? { "x-request-id": job.request_id } : {}),
      },
      body: JSON.stringify(job.payload.body ?? {}),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`webhook responded ${response.status}`);
  };
}

/** Constant-time comparison for the shared worker secret. */
export function secretMatches(given: string | null, expected: string | undefined): boolean {
  if (!given || !expected || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
