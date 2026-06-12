import { describe, it, expect } from "vitest";
import {
  parseInline,
  parseMarkdown,
  extractLinks,
} from "../app/lib/markdown";

describe("parseInline", () => {
  it("passes plain text through", () => {
    expect(parseInline("hello world")).toEqual([
      { type: "text", text: "hello world" },
    ]);
  });

  it("parses links, bold, and code with surrounding text", () => {
    expect(parseInline("see **the** [docs](https://gov.uk) for `x`")).toEqual([
      { type: "text", text: "see " },
      { type: "bold", text: "the" },
      { type: "text", text: " " },
      { type: "link", text: "docs", href: "https://gov.uk" },
      { type: "text", text: " for " },
      { type: "code", text: "x" },
    ]);
  });
});

describe("parseMarkdown", () => {
  it("parses headings with levels", () => {
    const blocks = parseMarkdown("# Title\n\n## Section");
    expect(blocks).toEqual([
      { type: "heading", level: 1, inline: [{ type: "text", text: "Title" }] },
      {
        type: "heading",
        level: 2,
        inline: [{ type: "text", text: "Section" }],
      },
    ]);
  });

  it("joins consecutive lines into one paragraph", () => {
    const blocks = parseMarkdown("line one\nline two\n\nnext para");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({
      type: "paragraph",
      inline: [{ type: "text", text: "line one line two" }],
    });
  });

  it("groups bullet items into a single unordered list", () => {
    const blocks = parseMarkdown("- a\n- b\n- c");
    expect(blocks).toEqual([
      {
        type: "list",
        ordered: false,
        items: [
          [{ type: "text", text: "a" }],
          [{ type: "text", text: "b" }],
          [{ type: "text", text: "c" }],
        ],
      },
    ]);
  });

  it("parses ordered lists separately from bullets", () => {
    const blocks = parseMarkdown("1. first\n2. second\n\n- bullet");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ type: "list", ordered: true });
    expect(blocks[1]).toMatchObject({ type: "list", ordered: false });
  });

  it("merges consecutive quote lines into one blockquote", () => {
    const blocks = parseMarkdown("> wise words\n> continued");
    expect(blocks).toEqual([
      {
        type: "blockquote",
        inline: [{ type: "text", text: "wise words continued" }],
      },
    ]);
  });

  it("flushes a paragraph when a heading follows without a blank line", () => {
    const blocks = parseMarkdown("text\n## Head");
    expect(blocks.map((b) => b.type)).toEqual(["paragraph", "heading"]);
  });

  it("returns no blocks for empty input", () => {
    expect(parseMarkdown("")).toEqual([]);
    expect(parseMarkdown("\n\n  \n")).toEqual([]);
  });
});

describe("extractLinks", () => {
  it("finds every link href in a document", () => {
    const md = "[a](https://x.test) text\n- [b](/guides/faq)";
    expect(extractLinks(md)).toEqual(["https://x.test", "/guides/faq"]);
  });

  it("returns empty for documents without links", () => {
    expect(extractLinks("no links here")).toEqual([]);
  });
});
