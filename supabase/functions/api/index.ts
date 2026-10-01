import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { providersFromEnv } from "../_shared/ai/provider.ts";
import { type ApiDb, createApp } from "./app.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const anon = createClient(url, anonKey);

const app = createApp({
  dbFor: (token, requestId) =>
    createClient(url, anonKey, {
      global: { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "x-request-id": requestId } },
    }) as unknown as ApiDb,
  verify: async (token) => {
    const { data, error } = await anon.auth.getClaims(token);
    return error ? null : (data?.claims?.sub ?? null);
  },
  providers: () => providersFromEnv((key) => Deno.env.get(key)),
  log: (event, data) => console.log(JSON.stringify({ event, ...data })),
});

Deno.serve(app.fetch);
