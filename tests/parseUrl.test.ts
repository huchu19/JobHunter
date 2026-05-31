import { describe, it, expect } from "vitest";
import { htmlToText, extractTitle } from "@/app/api/parse-url/route";

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
});
