import { describe, expect, it, vi } from "vitest";
import { type ClaimedJob, type JobQueue, runJobs, secretMatches, webhookHandler } from "./jobs";

const job = (id: number, payload: Record<string, unknown> = {}): ClaimedJob => ({ id, type: "webhook", payload, attempt_count: 1, request_id: "req-1" });

function queue(jobs: ClaimedJob[], failStatus = "retrying"): JobQueue & { completed: number[]; failed: number[] } {
  const completed: number[] = [];
  const failed: number[] = [];
  return {
    completed, failed,
    claim: vi.fn().mockResolvedValue(jobs),
    complete: async (id) => { completed.push(id); },
    fail: async (id) => { failed.push(id); return failStatus; },
  };
}

describe("runJobs", () => {
  it("claims only types it has handlers for, completes successes and fails errors", async () => {
    const q = queue([job(1), job(2, { boom: true })]);
    const handler = vi.fn(async (j: ClaimedJob) => { if (j.payload.boom) throw new Error("boom"); });
    const summary = await runJobs(q, { webhook: handler }, 5);
    expect(q.claim).toHaveBeenCalledWith(["webhook"], 5);
    expect(summary).toEqual({ claimed: 2, succeeded: 1, retrying: 1, dead: 0 });
    expect(q.completed).toEqual([1]);
    expect(q.failed).toEqual([2]);
  });

  it("counts dead-lettered jobs", async () => {
    const q = queue([job(3)], "dead");
    expect(await runJobs(q, { webhook: async () => { throw new Error("x"); } })).toMatchObject({ dead: 1 });
  });
});

describe("webhookHandler", () => {
  it("delivers to an allowed HTTPS host with an idempotency key", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("", { status: 200 }));
    await webhookHandler(["hooks.example.org"], fetchImpl)(job(7, { url: "https://hooks.example.org/x", body: { a: 1 } }));
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://hooks.example.org/x");
    expect(init.headers["Idempotency-Key"]).toBe("freequademy-job-7");
    expect(init.headers["x-request-id"]).toBe("req-1");
  });

  it.each([
    "http://hooks.example.org/x",
    "https://169.254.169.254/latest/meta-data",
    "https://evil.example.com/x",
    "not a url",
  ])("refuses %s (SSRF guard)", async (url) => {
    const fetchImpl = vi.fn();
    await expect(webhookHandler(["hooks.example.org"], fetchImpl)(job(1, { url }))).rejects.toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails the job on a non-2xx response so the queue retries it", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("", { status: 500 }));
    await expect(webhookHandler(["hooks.example.org"], fetchImpl)(job(1, { url: "https://hooks.example.org/x" }))).rejects.toThrow("500");
  });
});

describe("secretMatches", () => {
  it("accepts only the exact secret", () => {
    expect(secretMatches("s3cret-value", "s3cret-value")).toBe(true);
    expect(secretMatches("s3cret-valuE", "s3cret-value")).toBe(false);
    expect(secretMatches(null, "s3cret-value")).toBe(false);
    expect(secretMatches("x", undefined)).toBe(false);
  });
});
