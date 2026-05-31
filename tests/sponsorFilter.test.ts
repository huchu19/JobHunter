import { describe, it, expect } from "vitest";
import {
  isLondon,
  isARated,
  isSkilledWorker,
  filterSponsors,
} from "@/app/lib/sponsorFilter";
import { RawSponsorRow } from "@/app/types/sponsor";

describe("sponsorFilter", () => {
  describe("isLondon", () => {
    it("matches 'London' (case-insensitive)", () => {
      expect(isLondon("London")).toBe(true);
      expect(isLondon("london")).toBe(true);
      expect(isLondon("LONDON")).toBe(true);
      expect(isLondon(" London ")).toBe(true);
    });

    it("matches London postcodes", () => {
      expect(isLondon("EC1N 8LE")).toBe(true);
      expect(isLondon("E2 6LT")).toBe(true);
      expect(isLondon("N1 9GU")).toBe(true);
      expect(isLondon("WC1A 1AA")).toBe(true);
    });

    it("rejects non-London cities", () => {
      expect(isLondon("Manchester")).toBe(false);
      expect(isLondon("Leeds")).toBe(false);
      expect(isLondon("Edinburgh")).toBe(false);
    });

    it("handles empty/undefined values", () => {
      expect(isLondon("")).toBe(false);
      expect(isLondon(undefined)).toBe(false);
    });
  });

  describe("isARated", () => {
    it("matches A-rated entries", () => {
      expect(isARated("Worker (A rating)")).toBe(true);
      expect(isARated("Worker (A (Premium))")).toBe(true);
    });

    it("rejects B-rated and Temporary Worker", () => {
      expect(isARated("Worker (B rating)")).toBe(false);
      expect(isARated("Temporary Worker (A rating)")).toBe(false);
    });

    it("handles empty/undefined values", () => {
      expect(isARated("")).toBe(false);
      expect(isARated(undefined)).toBe(false);
    });
  });

  describe("isSkilledWorker", () => {
    it("matches exact Skilled Worker route", () => {
      expect(isSkilledWorker("Skilled Worker")).toBe(true);
      expect(isSkilledWorker(" Skilled Worker ")).toBe(true);
    });

    it("rejects other routes", () => {
      expect(isSkilledWorker("Global Business Mobility: Senior or Specialist Worker")).toBe(false);
      expect(isSkilledWorker("Global Business Mobility: Graduate Trainee")).toBe(false);
    });

    it("handles empty/undefined values", () => {
      expect(isSkilledWorker("")).toBe(false);
      expect(isSkilledWorker(undefined)).toBe(false);
    });
  });

  describe("filterSponsors", () => {
    const mockRows: RawSponsorRow[] = [
      {
        "Organisation Name": " Monzo Bank Ltd",
        "Town/City": "London",
        County: "",
        "Type & Rating": "Worker (A rating)",
        Route: "Skilled Worker",
      },
      {
        "Organisation Name": " Google (UK) Limited",
        "Town/City": "London",
        County: "",
        "Type & Rating": "Worker (A (Premium))",
        Route: "Skilled Worker",
      },
      {
        "Organisation Name": " Some Ltd",
        "Town/City": "Manchester",
        County: "",
        "Type & Rating": "Worker (A rating)",
        Route: "Skilled Worker",
      },
      {
        "Organisation Name": " Duplicate Ltd",
        "Town/City": "London",
        County: "",
        "Type & Rating": "Worker (A rating)",
        Route: "Skilled Worker",
      },
      {
        "Organisation Name": " Duplicate Ltd",
        "Town/City": "London",
        County: "",
        "Type & Rating": "Worker (A rating)",
        Route: "Skilled Worker",
      },
    ];

    it("filters by London, A-rated, and Skilled Worker", () => {
      const result = filterSponsors(mockRows);
      expect(result.length).toBe(3);
      expect(result.map((r) => r.name)).toEqual([
        "Duplicate Ltd",
        "Google (UK) Limited",
        "Monzo Bank Ltd",
      ]);
    });

    it("deduplicates by name + city", () => {
      const result = filterSponsors(mockRows);
      const duplicateCount = result.filter(
        (r) => r.name === "Duplicate Ltd"
      ).length;
      expect(duplicateCount).toBe(1);
    });

    it("returns sorted results", () => {
      const result = filterSponsors(mockRows);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].name.localeCompare(result[i - 1].name)).toBeGreaterThan(
          -1
        );
      }
    });

    it("handles empty input", () => {
      const result = filterSponsors([]);
      expect(result).toEqual([]);
    });
  });
});
