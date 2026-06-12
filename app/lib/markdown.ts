/**
 * Minimal markdown parser for the /guides content. Supports exactly what the
 * guide files use — headings, paragraphs, ordered/unordered lists,
 * blockquotes, links, bold, and inline code — so we stay dependency-free
 * (same rationale as the inline-SVG analytics charts). Pure and unit-tested;
 * rendering lives in `app/components/guides/MarkdownContent.tsx`.
 */

export interface InlineToken {
  type: "text" | "bold" | "code" | "link";
  text: string;
  href?: string;
}

export type MarkdownBlock =
  | { type: "heading"; level: number; inline: InlineToken[] }
  | { type: "paragraph"; inline: InlineToken[] }
  | { type: "list"; ordered: boolean; items: InlineToken[][] }
  | { type: "blockquote"; inline: InlineToken[] };

const INLINE_PATTERN =
  /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;

/** Parse one line of text into inline tokens (links, bold, code, text). */
export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let last = 0;

  for (const match of text.matchAll(INLINE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) {
      tokens.push({ type: "text", text: text.slice(last, index) });
    }
    if (match[1] !== undefined) {
      tokens.push({ type: "link", text: match[1], href: match[2] });
    } else if (match[3] !== undefined) {
      tokens.push({ type: "bold", text: match[3] });
    } else {
      tokens.push({ type: "code", text: match[4] });
    }
    last = index + match[0].length;
  }

  if (last < text.length) {
    tokens.push({ type: "text", text: text.slice(last) });
  }
  return tokens;
}

/** Parse a markdown document into a flat list of blocks. */
export function parseMarkdown(md: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = md.split(/\r?\n/);

  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({
        type: "paragraph",
        inline: parseInline(paragraph.join(" ")),
      });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({
        type: "list",
        ordered: list.ordered,
        items: list.items.map(parseInline),
      });
      list = null;
    }
  };
  const flushQuote = () => {
    if (quote.length > 0) {
      blocks.push({ type: "blockquote", inline: parseInline(quote.join(" ")) });
      quote = [];
    }
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (trimmed === "") {
      flushAll();
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushAll();
      blocks.push({
        type: "heading",
        level: heading[1].length,
        inline: parseInline(heading[2]),
      });
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      flushQuote();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }

    const numbered = trimmed.match(/^\d+\.\s+(.*)$/);
    if (numbered) {
      flushParagraph();
      flushQuote();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushParagraph();
      flushList();
      quote.push(trimmed.replace(/^>\s?/, ""));
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(trimmed);
  }

  flushAll();
  return blocks;
}

/** Every link href in a markdown document (used to verify guide links). */
export function extractLinks(md: string): string[] {
  const links: string[] = [];
  for (const match of md.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g)) {
    links.push(match[1]);
  }
  return links;
}
