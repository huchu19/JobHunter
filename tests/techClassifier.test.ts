import { describe, it, expect } from "vitest";
import { classifyTech } from "@/app/lib/techClassifier";

describe("techClassifier", () => {
  describe("classifyTech", () => {
    it("identifies tech companies", () => {
      expect(classifyTech("Wayve Technologies Limited").isTech).toBe(true);
      expect(classifyTech("Faculty AI Limited").isTech).toBe(true);
      expect(classifyTech("PolyAI Limited").isTech).toBe(true);
      expect(classifyTech("NHS Digital").isTech).toBe(true);
      expect(classifyTech("DataCrumbs Solutions Ltd").isTech).toBe(true);
    });

    it("rejects non-tech companies", () => {
      expect(classifyTech("Monzo Bank Limited").isTech).toBe(false);
      expect(classifyTech("British Airways PLC").isTech).toBe(false);
      expect(classifyTech("Tesco Stores Limited").isTech).toBe(false);
    });

    it("scores companies correctly", () => {
      const wayve = classifyTech("Wayve Technologies Limited");
      expect(wayve.score).toBeGreaterThanOrEqual(3);
      expect(wayve.matchedTerms.length).toBeGreaterThan(0);
    });

    it("identifies matched terms", () => {
      const faculty = classifyTech("Faculty AI Limited");
      expect(faculty.matchedTerms).toContain("ai");
    });

    it("handles case-insensitivity", () => {
      expect(classifyTech("WAYVE TECHNOLOGIES").isTech).toBe(true);
      expect(classifyTech("wayve technologies").isTech).toBe(true);
    });

    it("handles whitespace", () => {
      expect(classifyTech("  Wayve Technologies  ").isTech).toBe(true);
    });
  });
});
