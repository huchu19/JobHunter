import { describe, it, expect } from "vitest";
import {
  htmlToText,
  extractTitle,
  normalizeDeadline,
  workdayApiUrl,
  titleCase,
  extractOgDescription,
  decodeEntities,
} from "@/app/api/parse-url/route";

describe("parse-url helpers", () => {
  describe("extractTitle", () => {
    it("prefers og:title over <title>", () => {
      const html = `
        <head>
          <title>Fallback Title</title>
          <meta property="og:title" content="Software Engineer at Monzo" />
        </head>`;
      expect(extractTitle(html)).toBe("Software Engineer at Monzo");
    });

    it("falls back to <title> when og:title is absent", () => {
      const html = `<head><title>Backend Engineer | Wise</title></head>`;
      expect(extractTitle(html)).toBe("Backend Engineer | Wise");
    });

    it("returns empty string when neither is present", () => {
      expect(extractTitle("<html><body>no title</body></html>")).toBe("");
    });
  });

  describe("htmlToText", () => {
    it("strips tags, scripts, and styles and collapses whitespace", () => {
      const html = `
        <html>
          <head><style>.a{color:red}</style></head>
          <body>
            <script>console.log('hi')</script>
            <h1>Senior   Engineer</h1>
            <p>Join   our team</p>
          </body>
        </html>`;
      const text = htmlToText(html);
      expect(text).toBe("Senior Engineer Join our team");
      expect(text).not.toContain("console.log");
      expect(text).not.toContain("color:red");
    });

    it("decodes common HTML entities", () => {
      expect(htmlToText("<p>R&amp;D &lt;team&gt;&nbsp;lead</p>")).toBe(
        "R&D <team> lead"
      );
    });

    it("bounds output to maxChars", () => {
      const long = "<p>" + "x".repeat(50000) + "</p>";
      expect(htmlToText(long, 100).length).toBe(100);
    });
  });

  describe("normalizeDeadline", () => {
    it("normalizes a valid ISO date to YYYY-MM-DD", () => {
      expect(normalizeDeadline("2026-07-01")).toBe("2026-07-01");
      expect(normalizeDeadline("2026-07-01T09:00:00Z")).toBe("2026-07-01");
    });

    it("returns null for missing or unparseable values", () => {
      expect(normalizeDeadline(null)).toBeNull();
      expect(normalizeDeadline(undefined)).toBeNull();
      expect(normalizeDeadline("")).toBeNull();
      expect(normalizeDeadline("not a date")).toBeNull();
      expect(normalizeDeadline(42)).toBeNull();
    });
  });

  describe("workdayApiUrl", () => {
    it("builds the CXS JSON endpoint for a Workday posting", () => {
      const url =
        "https://darktrace.wd3.myworkdayjobs.com/en-US/DarktaceExternal/job/Cambridge-Office-United-Kingdom/Machine-Learning-Integration-Engineer_JR101685-1?Country=x";
      expect(workdayApiUrl(url)).toBe(
        "https://darktrace.wd3.myworkdayjobs.com/wday/cxs/darktrace/DarktaceExternal/job/Cambridge-Office-United-Kingdom/Machine-Learning-Integration-Engineer_JR101685-1"
      );
    });

    it("returns null for non-Workday URLs", () => {
      expect(workdayApiUrl("https://boards.greenhouse.io/acme/jobs/123")).toBeNull();
      expect(workdayApiUrl("https://example.com/careers")).toBeNull();
      expect(workdayApiUrl("not a url")).toBeNull();
    });
  });

  describe("titleCase", () => {
    it("turns a tenant slug into a company name", () => {
      expect(titleCase("darktrace")).toBe("Darktrace");
      expect(titleCase("acme-corp")).toBe("Acme Corp");
      expect(titleCase("wise_eu")).toBe("Wise Eu");
    });
  });

  describe("extractOgDescription / decodeEntities", () => {
    it("extracts and decodes the og:description", () => {
      const html = `<meta property="og:description" content="R&amp;D team in London &#39;25" />`;
      expect(extractOgDescription(html)).toBe("R&D team in London '25");
    });

    it("returns empty string when absent", () => {
      expect(extractOgDescription("<html></html>")).toBe("");
    });

    it("decodes common entities", () => {
      expect(decodeEntities("A &amp; B &lt;x&gt; &quot;y&quot;")).toBe(
        'A & B <x> "y"'
      );
    });
  });
});
