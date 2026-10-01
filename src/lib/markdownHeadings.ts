export interface MarkdownHeading { id: string; text: string; level: number }

const plainText = (s: string) => s.replace(/\*\*|\*|`/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").trim();

/**
 * Headings (#–###) in document order with stable, de-duplicated anchor ids,
 * skipping fenced code — the same blocks <Markdown headingIds> renders.
 */
export function extractHeadings(source: string): MarkdownHeading[] {
  const seen = new Map<string, number>();
  const headings: MarkdownHeading[] = [];
  let inCode = false;
  for (const line of source.replace(/\r\n/g, "\n").split("\n")) {
    if (line.startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const m = /^(#{1,3})\s+(.*)$/.exec(line);
    if (!m) continue;
    const text = plainText(m[2]);
    const base = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "section";
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    headings.push({ id: n === 0 ? base : `${base}-${n}`, text, level: m[1].length });
  }
  return headings;
}
