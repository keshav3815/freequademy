import { sanitizeUrl } from "./sanitize";

/**
 * Real-user monitoring: Core Web Vitals from real devices (largely 4G phones
 * in India), sampled per page load, stored by report_web_vital. This is the
 * evidence for the Phase 2 target "student dashboard < 1 s on 4G". Disabled
 * unless VITE_APP_ENV is set.
 */
const SAMPLE_RATE = 0.1;

export function startWebVitals(sample: number = Math.random()): void {
  const environment = import.meta.env.VITE_APP_ENV as string | undefined;
  if (!environment || sample >= SAMPLE_RATE) return;

  void Promise.all([import("web-vitals"), import("@/integrations/supabase/client")]).then(([vitals, { supabase }]) => {
    const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType;
    const send = (metric: { name: string; value: number; rating: string }) => {
      void supabase.rpc("report_web_vital", {
        _metric: metric.name,
        _value: metric.value,
        _rating: metric.rating,
        _route: sanitizeUrl(window.location.pathname) ?? "/",
        _environment: environment,
        _release: import.meta.env.VITE_APP_RELEASE,
        _connection: connection,
      });
    };
    vitals.onLCP(send);
    vitals.onINP(send);
    vitals.onCLS(send);
    vitals.onTTFB(send);
    vitals.onFCP(send);
  }).catch(() => undefined);
}
