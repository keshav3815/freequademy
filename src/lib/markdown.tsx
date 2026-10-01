import { Fragment, ReactNode } from "react";
import { extractHeadings } from "./markdownHeadings";

/**
 * Minimal, safe Markdown renderer for lesson content and AI answers.
 *
 * It builds React elements directly (never dangerouslySetInnerHTML), so text
 * from mentors or the model cannot inject HTML or scripts. Supported syntax:
 * headings (#–###), paragraphs, unordered/ordered lists, fenced code blocks,
 * block quotes, **bold**, *italic*, `inline code` and [links](https://…)
 * (https/http only).
 */

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^\s)]+)\))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  INLINE.lastIndex = 0;
  while ((match = INLINE.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(<code key={key} className="rounded bg-muted px-1 py-0.5 text-[0.9em]">{token.slice(1, -1)}</code>);
    } else if (token.startsWith("[")) {
      const label = token.slice(1, token.indexOf("]"));
      nodes.push(
        <a key={key} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-primary underline">
          {label}
        </a>,
      );
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ source, className, headingIds = false }: { source: string; className?: string; headingIds?: boolean }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  const anchors = headingIds ? extractHeadings(source) : [];
  let headingIndex = 0;
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={key++} className="overflow-x-auto rounded-md bg-muted p-3 text-sm"><code>{code.join("\n")}</code></pre>,
      );
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const content = renderInline(heading[2], `h${key}`);
      const base = level === 1 ? "text-2xl font-bold mt-6 mb-3" : level === 2 ? "text-xl font-semibold mt-5 mb-2" : "text-lg font-semibold mt-4 mb-2";
      const id = anchors[headingIndex++]?.id;
      const cls = id ? `${base} scroll-mt-24` : base;
      blocks.push(
        level === 1 ? <h2 key={key++} id={id} className={cls}>{content}</h2>
        : level === 2 ? <h3 key={key++} id={id} className={cls}>{content}</h3>
        : <h4 key={key++} id={id} className={cls}>{content}</h4>,
      );
      i++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      const itemPattern = ordered ? /^\s*\d+[.)]\s+(.*)$/ : /^\s*[-*]\s+(.*)$/;
      while (i < lines.length && itemPattern.test(lines[i])) {
        items.push(itemPattern.exec(lines[i])![1]);
        i++;
      }
      const children = items.map((item, idx) => <li key={idx}>{renderInline(item, `li${key}-${idx}`)}</li>);
      blocks.push(
        ordered
          ? <ol key={key++} className="list-decimal pl-6 space-y-1 my-3">{children}</ol>
          : <ul key={key++} className="list-disc pl-6 space-y-1 my-3">{children}</ul>,
      );
      continue;
    }

    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) quote.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push(
        <blockquote key={key++} className="border-l-4 border-primary/40 pl-4 italic text-muted-foreground my-3">
          {renderInline(quote.join(" "), `q${key}`)}
        </blockquote>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (
      i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("```") &&
      !/^(#{1,3})\s+/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\d+[.)]\s+/.test(lines[i]) && !lines[i].startsWith(">")
    ) {
      paragraph.push(lines[i++]);
    }
    blocks.push(
      <p key={key++} className="my-3 leading-relaxed">
        {paragraph.map((p, idx) => (
          <Fragment key={idx}>
            {idx > 0 && <br />}
            {renderInline(p, `p${key}-${idx}`)}
          </Fragment>
        ))}
      </p>,
    );
  }

  return <div className={className}>{blocks}</div>;
}
