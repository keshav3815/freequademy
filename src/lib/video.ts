/**
 * Converts a YouTube watch/share URL into a privacy-enhanced embed URL.
 * Returns null for anything else (those links are opened in a new tab).
 */
export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    let id: string | null = null;
    if (parsed.hostname === "youtu.be") {
      id = parsed.pathname.slice(1);
    } else if (/(^|\.)youtube\.com$/.test(parsed.hostname)) {
      id = parsed.searchParams.get("v") ?? (parsed.pathname.startsWith("/embed/") ? parsed.pathname.split("/")[2] : null);
    }
    if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
    return `https://www.youtube-nocookie.com/embed/${id}`;
  } catch {
    return null;
  }
}
