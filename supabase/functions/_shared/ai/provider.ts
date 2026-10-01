// One internal AI interface for every Edge Function (Architecture V1 Phase 3).
// Pure TypeScript (fetch only), so the same module runs in Deno and in Vitest.
//
// Every provider here speaks the OpenAI-compatible chat-completions API, which
// covers free options (Google Gemini API free tier, Groq, OpenRouter free
// models) and the legacy Lovable AI Gateway. Configuration comes from
// environment variables only — see providersFromEnv().

export type ChatContent =
  | string
  | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;

export interface GenerateRequest {
  system: string;
  user: ChatContent;
  maxTokens: number;
}

export interface GenerateResult {
  text: string;
  provider: string;
  model: string;
  usage: unknown;
}

export type AIFailure = "timeout" | "rate_limited" | "unavailable" | "bad_response" | "not_configured";

export class AIProviderError extends Error {
  constructor(public readonly kind: AIFailure, public readonly provider: string, public readonly status?: number) {
    super(`${provider}: ${kind}${status ? ` (${status})` : ""}`);
    this.name = "AIProviderError";
  }
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  generate(request: GenerateRequest, signal: AbortSignal): Promise<GenerateResult>;
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export function openAICompatibleProvider(options: {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  fetchImpl?: FetchLike;
}): AIProvider {
  const doFetch: FetchLike = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const url = `${options.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  return {
    name: options.name,
    model: options.model,
    async generate(request, signal) {
      let response: Response;
      try {
        response = await doFetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: options.model,
            max_tokens: request.maxTokens,
            messages: [
              { role: "system", content: request.system },
              { role: "user", content: request.user },
            ],
          }),
          signal,
        });
      } catch (error) {
        const aborted = (error as { name?: string })?.name === "AbortError";
        throw new AIProviderError(aborted ? "timeout" : "unavailable", options.name);
      }
      if (response.status === 429) throw new AIProviderError("rate_limited", options.name, 429);
      if (!response.ok) throw new AIProviderError("unavailable", options.name, response.status);

      const data = await response.json().catch(() => null) as
        | { choices?: Array<{ message?: { content?: unknown } }>; usage?: unknown }
        | null;
      const text = data?.choices?.[0]?.message?.content;
      if (typeof text !== "string" || text.trim().length === 0) {
        throw new AIProviderError("bad_response", options.name, response.status);
      }
      return { text, provider: options.name, model: options.model, usage: data?.usage ?? null };
    },
  };
}

export interface GenerateOptions {
  timeoutMs: number;
  /** Extra attempts per provider for transient failures (rate limit, 5xx, timeout). */
  retries: number;
  sleep?: (ms: number) => Promise<void>;
}

const RETRYABLE: AIFailure[] = ["timeout", "rate_limited", "unavailable"];

/**
 * Tries each provider in order; transient failures are retried with a short
 * backoff before falling back to the next provider. Throws the last error
 * when every provider fails.
 */
export async function generateWithFallback(
  providers: AIProvider[],
  request: GenerateRequest,
  options: GenerateOptions,
): Promise<GenerateResult> {
  if (providers.length === 0) throw new AIProviderError("not_configured", "none");
  const sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  let lastError: AIProviderError = new AIProviderError("unavailable", "none");

  for (const provider of providers) {
    for (let attempt = 0; attempt <= options.retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs);
      try {
        return await provider.generate(request, controller.signal);
      } catch (error) {
        lastError = error instanceof AIProviderError ? error : new AIProviderError("unavailable", provider.name);
        if (!RETRYABLE.includes(lastError.kind)) break;
        if (attempt < options.retries) await sleep(500 * 2 ** attempt);
      } finally {
        clearTimeout(timer);
      }
    }
  }
  throw lastError;
}

/**
 * AI_PRIMARY_BASE_URL / AI_PRIMARY_API_KEY / AI_PRIMARY_MODEL, then the same
 * with AI_FALLBACK_. LOVABLE_API_KEY (the original, paid gateway) is used only
 * as a last resort so existing deployments keep working until it is removed.
 */
export function providersFromEnv(env: (key: string) => string | undefined, fetchImpl?: FetchLike): AIProvider[] {
  const providers: AIProvider[] = [];
  for (const slot of ["PRIMARY", "FALLBACK"]) {
    const baseUrl = env(`AI_${slot}_BASE_URL`);
    const apiKey = env(`AI_${slot}_API_KEY`);
    const model = env(`AI_${slot}_MODEL`);
    if (baseUrl && apiKey && model) {
      providers.push(openAICompatibleProvider({ name: slot.toLowerCase(), baseUrl, apiKey, model, fetchImpl }));
    }
  }
  const lovableKey = env("LOVABLE_API_KEY");
  if (lovableKey) {
    providers.push(openAICompatibleProvider({
      name: "lovable",
      baseUrl: "https://ai.gateway.lovable.dev/v1",
      apiKey: lovableKey,
      model: "google/gemini-2.5-flash",
      fetchImpl,
    }));
  }
  return providers;
}
