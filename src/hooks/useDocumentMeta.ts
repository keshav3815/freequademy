import { useEffect } from "react";

interface DocumentMetaOptions {
  title: string;
  description?: string;
  /** Defaults to the current path; pass to override (e.g. strip query params). */
  path?: string;
}

const SITE_NAME = "Freequademy";
const ORIGIN = "https://freequademy.com";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Sets a per-route title, meta description and canonical URL.
 *
 * This is a client-side SPA: search crawlers that execute JavaScript
 * (Googlebot does) pick these up for indexing, so this genuinely helps
 * organic search. It does NOT help social-preview unfurls (Twitter/WhatsApp/
 * Facebook/Slack link previews) — those bots read the static HTML only and
 * will always show index.html's homepage title/image for every URL on this
 * site until the app has real prerendering or SSR for the routes that need
 * a distinct preview (see docs/remediation/phase-7-performance-a11y-seo.md).
 *
 * Restores the previous title/description on unmount so navigating to a page
 * that doesn't call this hook (or back to one that hasn't mounted yet) never
 * shows a stale title.
 */
export function useDocumentMeta({ title, description, path }: DocumentMetaOptions) {
  useEffect(() => {
    const prevTitle = document.title;
    const fullTitle = `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    const descEl = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevDescription = descEl?.getAttribute("content") ?? undefined;
    if (description) {
      upsertMeta("name", "description", description);
      upsertMeta("property", "og:description", description);
      upsertMeta("property", "twitter:description", description);
    }

    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "twitter:title", fullTitle);

    const url = `${ORIGIN}${path ?? window.location.pathname}`;
    upsertMeta("property", "og:url", url);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const prevCanonical = canonical?.getAttribute("href") ?? undefined;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);

    return () => {
      document.title = prevTitle;
      if (description && descEl) descEl.setAttribute("content", prevDescription ?? "");
      if (canonical && prevCanonical) canonical.setAttribute("href", prevCanonical);
    };
  }, [title, description, path]);
}
