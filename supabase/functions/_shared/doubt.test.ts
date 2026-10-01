import { describe, expect, it, vi } from "vitest";
import { type DoubtDb, answerDoubt, systemPrompt } from "./doubt";
import { AIProviderError, type AIProvider } from "./ai/provider";

function fakeDb(quota: unknown, quotaError: { code?: string } | null = null) {
  const inserted: Record<string, unknown>[] = [];
  const db: DoubtDb = {
    rpc: () => Promise.resolve({ data: quota, error: quotaError }),
    from: () => ({
      insert: (row) => {
        inserted.push(row);
        return { select: () => ({ single: () => Promise.resolve({ data: { id: "doubt-1" }, error: null }) }) };
      },
    }),
  };
  return { db, inserted };
}

const answering: AIProvider = { name: "primary", model: "free-model", generate: vi.fn().mockResolvedValue({ text: "x = 2 or 3", provider: "primary", model: "free-model", usage: null }) };
const body = { question: "Solve x^2 - 5x + 6 = 0", grade: "10", subject: "Mathematics" };

describe("answerDoubt", () => {
  it("validates, consumes quota, answers and saves the doubt under the caller", async () => {
    const { db, inserted } = fakeDb([{ allowed: true, remaining: 29, daily_limit: 30 }]);
    const outcome = await answerDoubt({ db, userId: "u1", providers: [answering] }, body);
    expect(outcome).toEqual({ ok: true, answer: "x = 2 or 3", doubtId: "doubt-1", remaining: 29, provider: "primary", model: "free-model" });
    expect(inserted[0]).toMatchObject({ user_id: "u1", subject: "Mathematics", grade: 10, model: "free-model", has_image: false });
  });

  it("rejects invalid input before spending quota", async () => {
    const rpc = vi.fn();
    const outcome = await answerDoubt({ db: { ...fakeDb([]).db, rpc }, userId: "u1", providers: [answering] }, { question: "" });
    expect(outcome).toMatchObject({ ok: false, status: 400, code: "invalid_request" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("stops at the daily quota with 429", async () => {
    const { db } = fakeDb([{ allowed: false, remaining: 0, daily_limit: 30 }]);
    expect(await answerDoubt({ db, userId: "u1", providers: [answering] }, body))
      .toMatchObject({ ok: false, status: 429, code: "ai_quota_exhausted", remaining: 0 });
  });

  it("maps provider timeouts to 504 without leaking provider details", async () => {
    const { db } = fakeDb([{ allowed: true, remaining: 3 }]);
    const slow: AIProvider = { name: "p", model: "m", generate: vi.fn().mockRejectedValue(new AIProviderError("timeout", "p")) };
    const outcome = await answerDoubt({ db, userId: "u1", providers: [slow], sleep: () => Promise.resolve() }, body);
    expect(outcome).toEqual({ ok: false, status: 504, code: "ai_timeout", message: "The AI took too long to respond. Please try again." });
  });

  it("returns 503 when no free or legacy provider is configured", async () => {
    const { db } = fakeDb([{ allowed: true }]);
    expect(await answerDoubt({ db, userId: "u1", providers: [] }, body)).toMatchObject({ ok: false, status: 503, code: "ai_not_configured" });
  });

  it("keeps the child-safety rules in the system prompt", () => {
    const prompt = systemPrompt("8", "Science");
    expect(prompt).toContain("class 8");
    expect(prompt).toContain("Tele-MANAS helpline 14416");
    expect(prompt).toContain("Never ask for personal information");
  });
});
