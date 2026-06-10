import { describe, it, expect } from "vitest";
import { fuzzyMatchSponsor } from "@/app/lib/sponsorMatch";

const SPONSORS = [
  { name: "Monzo Bank Ltd" },
  { name: "Revolut Ltd" },
  { name: "Deloitte LLP" },
];

describe("sponsorMatch", () => {
  describe("fuzzyMatchSponsor", () => {
    it("matches an exact sponsor name", () => {
      expect(fuzzyMatchSponsor("Monzo Bank Ltd", SPONSORS)).toBe(true);
    });

    it("matches a close fuzzy variant", () => {
      expect(fuzzyMatchSponsor("Monzo Bank", SPONSORS)).toBe(true);
      expect(fuzzyMatchSponsor("Revolut", SPONSORS)).toBe(true);
    });

    it("does not match an unrelated company", () => {
      expect(fuzzyMatchSponsor("Totally Unrelated Co", SPONSORS)).toBe(false);
    });

    it("returns false for empty company name or empty sponsor list", () => {
      expect(fuzzyMatchSponsor("", SPONSORS)).toBe(false);
      expect(fuzzyMatchSponsor("   ", SPONSORS)).toBe(false);
      expect(fuzzyMatchSponsor("Monzo", [])).toBe(false);
    });
  });
});
