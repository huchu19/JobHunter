import { describe, it, expect } from "vitest";
import { GUIDES, getGuide, loadGuideContent } from "../app/lib/guides";
import { parseMarkdown, extractLinks } from "../app/lib/markdown";

describe("guide registry", () => {
  it("has unique slugs and non-empty metadata", () => {
    const slugs = GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const g of GUIDES) {
      expect(g.title.length).toBeGreaterThan(0);
      expect(g.description.length).toBeGreaterThan(0);
    }
  });

  it("getGuide resolves registered slugs and rejects unknown ones", () => {
    expect(getGuide("faq")?.title).toBe("Sponsorship FAQ");
    expect(getGuide("nope")).toBeUndefined();
  });
});

describe("guide content", () => {
  it("every registered guide loads and parses to a titled document", () => {
    for (const g of GUIDES) {
      const content = loadGuideContent(g.slug);
      expect(content, `content/guides/${g.slug}.md missing`).toBeTruthy();
      const blocks = parseMarkdown(content!);
      expect(blocks.length).toBeGreaterThan(3);
      expect(blocks[0].type).toBe("heading");
    }
  });

  it("refuses to load unregistered slugs (no path traversal)", () => {
    expect(loadGuideContent("../../package")).toBeNull();
    expect(loadGuideContent("unknown")).toBeNull();
  });

  it("internal guide links point at registered slugs", () => {
    const slugs = new Set(GUIDES.map((g) => g.slug));
    for (const g of GUIDES) {
      const links = extractLinks(loadGuideContent(g.slug)!);
      for (const href of links) {
        if (href.startsWith("/guides/")) {
          expect(
            slugs.has(href.replace("/guides/", "")),
            `${g.slug} links to unknown guide ${href}`
          ).toBe(true);
        } else {
          // External links must be https gov.uk pages (checked live in DoD).
          expect(href.startsWith("https://www.gov.uk/")).toBe(true);
        }
      }
    }
  });
});
