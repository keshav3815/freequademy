import { describe, expect, it, vi } from "vitest";
import { AIProviderError, generateWithFallback, openAICompatibleProvider, providersFromEnv, type AIProvider } from "./provider";

const request = { system: "sys", user: "What is 2+2?", maxTokens: 100 };
const noSleep = () => Promise.resolve();
const ok = (text: string) => new Response(JSON.stringify({ choices: [{ message: { content: text } }], usage: { total_tokens: 5 } }), { status: 200 });

describe("openAICompatibleProvider", () => {
  it("posts an OpenAI-style chat request and returns the answer", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok("4"));
    const provider = openAICompatibleProvider({ name: "primary", baseUrl: "https://ai.example/v1/", apiKey: "k", model: "m", fetchImpl });
    const result = await provider.generate(request, new AbortController().signal);
    expect(result).toEqual({ text: "4", provider: "primary", model: "m", usage: { total_tokens: 5 } });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://ai.example/v1/chat/completions");
    expect(JSON.parse(init.body)).toMatchObject({ model: "m", max_tokens: 100, messages: [{ role: "system" }, { role: "user", content: "What is 2+2?" }] });
    expect(init.headers.Authorization).toBe("Bearer k");
  });

  it.each([
    [new Response("", { status: 429 }), "rate_limited"],
    [new Response("", { status: 503 }), "unavailable"],
    [new Response(JSON.stringify({ choices: [] }), { status: 200 }), "bad_response"],
  ])("classifies failures", async (response, kind) => {
    const provider = openAICompatibleProvider({ name: "p", baseUrl: "https://x", apiKey: "k", model: "m", fetchImpl: vi.fn().mockResolvedValue(response) });
    await expect(provider.generate(request, new AbortController().signal)).rejects.toMatchObject({ kind });
  });
});

describe("generateWithFallback", () => {
  const failing = (kind: "rate_limited" | "bad_response", name = "a"): AIProvider => ({
    name, model: "m", generate: vi.fn().mockRejectedValue(new AIProviderError(kind, name)),
  });
  const working = (name = "b"): AIProvider => ({
    name, model: "m2", generate: vi.fn().mockResolvedValue({ text: "ok", provider: name, model: "m2", usage: null }),
  });

  it("retries a transient failure, then falls back to the next provider", async () => {
    const first = failing("rate_limited");
    const second = working();
    const result = await generateWithFallback([first, second], request, { timeoutMs: 1000, retries: 1, sleep: noSleep });
    expect(result.provider).toBe("b");
    expect(first.generate).toHaveBeenCalledTimes(2);
  });

  it("does not retry a non-transient failure on the same provider", async () => {
    const first = failing("bad_response");
    await generateWithFallback([first, working()], request, { timeoutMs: 1000, retries: 3, sleep: noSleep });
    expect(first.generate).toHaveBeenCalledTimes(1);
  });

  it("aborts a slow provider at the timeout", async () => {
    const slow: AIProvider = {
      name: "slow", model: "m",
      generate: (_req, signal) => new Promise((_, reject) => signal.addEventListener("abort", () => reject(new AIProviderError("timeout", "slow")))),
    };
    await expect(generateWithFallback([slow], request, { timeoutMs: 10, retries: 0, sleep: noSleep })).rejects.toMatchObject({ kind: "timeout" });
  });

  it("reports not_configured when no provider exists", async () => {
    await expect(generateWithFallback([], request, { timeoutMs: 10, retries: 0 })).rejects.toMatchObject({ kind: "not_configured" });
  });
});

describe("providersFromEnv", () => {
  it("orders primary, fallback, then the legacy gateway, and skips incomplete slots", () => {
    const env: Record<string, string> = {
      AI_PRIMARY_BASE_URL: "https://p", AI_PRIMARY_API_KEY: "k", AI_PRIMARY_MODEL: "m",
      AI_FALLBACK_BASE_URL: "https://f", AI_FALLBACK_MODEL: "m",
      LOVABLE_API_KEY: "legacy",
    };
    expect(providersFromEnv((k) => env[k]).map((p) => p.name)).toEqual(["primary", "lovable"]);
  });
});
