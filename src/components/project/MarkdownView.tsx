import { Fragment } from "react";
import { cn } from "@/lib/utils";

// Lightweight markdown renderer — no external deps. Handles:
//   # / ## / ### headings, **bold**, *italic*, `inline code`, ```code blocks```,
//   - bullet lists, [text](url), --- hr, blank-line paragraphs.
// Anything more exotic (tables, footnotes, html) renders as plain text.

interface Props {
  source: string;
  className?: string;
}

const MD_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
const BOLD_RE = /\*\*([^*]+)\*\*/g;
const ITAL_RE = /(^|\W)\*([^*\n]+)\*/g;
const CODE_RE = /`([^`]+)`/g;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineToHtml(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(MD_LINK_RE, (_m, label, url) =>
    `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-2 hover:opacity-80">${label}</a>`
  );
  out = out.replace(BOLD_RE, "<strong>$1</strong>");
  out = out.replace(ITAL_RE, "$1<em>$2</em>");
  out = out.replace(
    CODE_RE,
    '<code class="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">$1</code>'
  );
  return out;
}

type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "code"; lang: string; text: string }
  | { kind: "hr" }
  | { kind: "empty" };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Code fence
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ kind: "code", lang, text: buf.join("\n") });
      continue;
    }

    // HR
    if (/^---+\s*$/.test(line)) {
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }

    // Headings
    const h = /^(#{1,3})\s+(.+)$/.exec(line);
    if (h) {
      blocks.push({ kind: "heading", level: h[1].length as 1 | 2 | 3, text: h[2] });
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      blocks.push({ kind: "empty" });
      i++;
      continue;
    }

    // Paragraph (combine adjacent non-empty lines)
    const buf = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("```") &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^---+\s*$/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ kind: "p", text: buf.join(" ") });
  }
  return blocks;
}

export default function MarkdownView({ source, className }: Props) {
  if (!source || !source.trim()) {
    return (
      <p className={cn("text-sm italic text-muted-foreground", className)}>
        Nothing here yet.
      </p>
    );
  }

  const blocks = parseBlocks(source);

  return (
    <div className={cn("space-y-3 text-sm leading-relaxed", className)}>
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "heading": {
            const sizes = { 1: "text-2xl font-bold", 2: "text-xl font-semibold", 3: "text-base font-semibold" };
            const Tag = (`h${b.level}` as "h1" | "h2" | "h3");
            return (
              <Tag key={i} className={cn(sizes[b.level], "mt-2")}>
                <span dangerouslySetInnerHTML={{ __html: inlineToHtml(b.text) }} />
              </Tag>
            );
          }
          case "p":
            return (
              <p key={i} dangerouslySetInnerHTML={{ __html: inlineToHtml(b.text) }} />
            );
          case "ul":
            return (
              <ul key={i} className="list-disc space-y-1 pl-5">
                {b.items.map((item, j) => (
                  <li key={j} dangerouslySetInnerHTML={{ __html: inlineToHtml(item) }} />
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="list-decimal space-y-1 pl-5">
                {b.items.map((item, j) => (
                  <li key={j} dangerouslySetInnerHTML={{ __html: inlineToHtml(item) }} />
                ))}
              </ol>
            );
          case "code":
            return (
              <pre
                key={i}
                className="overflow-x-auto rounded-lg border border-border/40 bg-muted/40 p-3 font-mono text-xs"
              >
                <code>{b.text}</code>
              </pre>
            );
          case "hr":
            return <hr key={i} className="border-border/30" />;
          case "empty":
            return <Fragment key={i} />;
        }
      })}
    </div>
  );
}
