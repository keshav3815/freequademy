import { type GatewayEnv, handle } from "./gateway";

export default {
  fetch(request: Request, env: GatewayEnv, ctx: { waitUntil(promise: Promise<unknown>): void }): Promise<Response> {
    return handle(request, env, {
      fetch: (upstream) => fetch(upstream),
      cache: (caches as unknown as { default: Cache }).default,
      waitUntil: (promise) => ctx.waitUntil(promise),
    });
  },
};
