import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// A deliberately small formatting grammar for the partner directory's
// About field — bold, bullet/numbered lists, links, and images. Not a
// general markdown parser: no headings, tables, nesting, or escaping, by
// design ("simple formatting" is what was asked for). Zero `db` (or any
// other server-only) dependency — safe to import from a "use client"
// component's live preview, same reasoning as src/lib/operating-hours.ts.

const SAFE_URL_PATTERN = /^https?:\/\//i;
// A root-relative path ("/api/directory-images/xyz") is same-origin and
// safe — this is how an uploaded image (see markdown-lite-editor.tsx's
// Image button, backed by uploadDirectoryListingImage) gets embedded.
// Deliberately excludes a protocol-relative path ("//evil.com/x"), which a
// browser resolves to that host's own https:// URL — not same-origin at all.
const SAFE_RELATIVE_PATTERN = /^\/(?!\/)/;

// Applies to both link and image targets — same http(s)-only rule the rest
// of the directory already uses for a partner's website (see
// normalizeWebsiteUrl in src/lib/directory.ts), plus same-origin relative
// paths. A `javascript:`/`data:` target is rendered as inert literal text
// instead of a live link/image rather than dropped, so a partner sees
// exactly what they typed.
function isSafeUrl(url: string): boolean {
  const trimmed = url.trim();
  return SAFE_URL_PATTERN.test(trimmed) || SAFE_RELATIVE_PATTERN.test(trimmed);
}

// Image before link (its leading "!" is what tells them apart — trying
// link first would still match an image's "[alt](url)" tail), bold last.
const INLINE_PATTERN = /!\[([^\]]*)\]\(([^)\s]+)\)|\[([^\]]*)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let count = 0;
  const pattern = new RegExp(INLINE_PATTERN.source, "g");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const [full, imageAlt, imageUrl, linkText, linkUrl, boldText] = match;
    const key = `${keyPrefix}-${count++}`;
    if (imageUrl !== undefined) {
      nodes.push(
        isSafeUrl(imageUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element -- an arbitrary partner-supplied external URL, not a domain next/image could be configured to optimize
          <img key={key} src={imageUrl} alt={imageAlt} loading="lazy" className="my-2 max-w-full rounded-md" />
        ) : (
          full
        ),
      );
    } else if (linkUrl !== undefined) {
      nodes.push(
        isSafeUrl(linkUrl) ? (
          <a
            key={key}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-petrol underline hover:text-petrol-light dark:text-petrol-light"
          >
            {linkText}
          </a>
        ) : (
          full
        ),
      );
    } else if (boldText !== undefined) {
      nodes.push(<strong key={key}>{boldText}</strong>);
    }
    lastIndex = match.index + full.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

type Block = { type: "paragraph" | "bullet-list" | "numbered-list"; lines: string[] };

// Exported for markdown-lite-editor.tsx's Enter-key handling, which needs to
// recognize "the cursor is on a list line" using the exact same grammar this
// parses with, rather than a second, potentially-drifting copy of it.
export const BULLET_RE = /^[-*]\s+(.*)$/;
export const NUMBERED_RE = /^\d+\.\s+(.*)$/;

// Blank lines separate paragraphs; a run of consecutive list-marker lines
// becomes one list. Everything else is a paragraph, with single line
// breaks kept as <br> (not collapsed) — the closest match to how this text
// rendered before (plain whitespace-pre-wrap) now that it's real markup.
function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const rawLines = text.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < rawLines.length) {
    if (rawLines[i].trim() === "") {
      i++;
      continue;
    }
    const bullet = BULLET_RE.exec(rawLines[i]);
    if (bullet) {
      const items: string[] = [];
      while (i < rawLines.length) {
        const m = BULLET_RE.exec(rawLines[i]);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      blocks.push({ type: "bullet-list", lines: items });
      continue;
    }
    const numbered = NUMBERED_RE.exec(rawLines[i]);
    if (numbered) {
      const items: string[] = [];
      while (i < rawLines.length) {
        const m = NUMBERED_RE.exec(rawLines[i]);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      blocks.push({ type: "numbered-list", lines: items });
      continue;
    }
    const lines: string[] = [];
    while (i < rawLines.length && rawLines[i].trim() !== "" && !BULLET_RE.test(rawLines[i]) && !NUMBERED_RE.test(rawLines[i])) {
      lines.push(rawLines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", lines });
  }
  return blocks;
}

// Renders **bold**, "- "/"* " and "1. " lists, [text](url) links, and
// ![alt](url) images as real React elements — never dangerouslySetInnerHTML,
// so there's no HTML-string XSS surface: everything but a validated
// http(s) href/src is plain escaped text by construction.
export function renderMarkdownLite(text: string | null | undefined, className?: string): ReactNode {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return null;
  const blocks = parseBlocks(trimmed);
  return (
    <div className={cn("space-y-3", className)}>
      {blocks.map((block, i) => {
        if (block.type === "bullet-list") {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {block.lines.map((item, j) => (
                <li key={j}>{renderInline(item, `${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "numbered-list") {
          return (
            <ol key={i} className="list-decimal space-y-1 pl-5">
              {block.lines.map((item, j) => (
                <li key={j}>{renderInline(item, `${i}-${j}`)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i}>
            {block.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {renderInline(line, `${i}-${j}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

// For contexts that need a single plain-text line — <meta name="description">
// and the JSON-LD description — where literal "**"/"[]()" syntax would
// otherwise leak into a search result snippet or AI answer-engine summary.
export function stripMarkdownLiteToPlainText(text: string | null | undefined): string {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return "";
  return trimmed
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, "$1")
    .replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\s*\n+\s*/g, " ")
    .trim();
}
