import { describe, it, expect } from "vitest";
import {
  isARated,
  isSkilledWorker,
  filterSponsors,
} from "@/app/lib/sponsorFilter";
import { RawSponsorRow } from "@/app/types/sponsor";

describe("sponsorFilter", () => {
  describe("isARated", () => {
    it("matches A-rated Worker entries", () => {
      expect(isARated("Worker (A rating)")).toBe(true);
    });

    it("rejects Temporary Worker and B-rated entries", () => {
      expect(isARated("Worker (B rating)")).toBe(false);
      expect(isARated("Temporary Worker (A rating)")).toBe(false);
      expect(isARated("Worker (A (Premium))")).toBe(false);
    });

    it("handles empty/undefined values", () => {
      expect(isARated("")).toBe(false);
      expect(isARated(undefined)).toBe(false);
    });
  });

  describe("isSkilledWorker", () => {
    it("matches exact Skilled Worker classification", () => {
      expect(isSkilledWorker("Skilled Worker")).toBe(true);
      expect(isSkilledWorker(" Skilled Worker ")).toBe(true);
    });

    it("rejects other classifications", () => {
      expect(isSkilledWorker("Global Business Mobility: Senior or Specialist Worker")).toBe(false);
      expect(isSkilledWorker("Global Business Mobility: Graduate Trainee")).toBe(false);
      expect(isSkilledWorker("International Agreement")).toBe(false);
    });

    it("handles empty/undefined values", () => {
      expect(isSkilledWorker("")).toBe(false);
      expect(isSkilledWorker(undefined)).toBe(false);
    });
  });

  describe("filterSponsors", () => {
    const mockRows: RawSponsorRow[] = [
      {
        "Sponsor Licence Number": "AAA111",
        "Organisation Name": " Monzo Bank Ltd",
        TierRating: "Worker (A rating)",
        "Migrant Classification": "Skilled Worker",
        "Sponsor Status": "Licensed and Fully Active",
      },
      {
        "Sponsor Licence Number": "BBB222",
        "Organisation Name": " Some Temp Agency Ltd",
        TierRating: "Temporary Worker (A rating)",
        "Migrant Classification": "Creative Worker",
        "Sponsor Status": "Licensed and Fully Active",
      },
      {
        "Sponsor Licence Number": "CCC333",
        "Organisation Name": " GBM Corp Ltd",
        TierRating: "Worker (A rating)",
        "Migrant Classification": "Global Business Mobility: Senior or Specialist Worker",
        "Sponsor Status": "Licensed and Fully Active",
      },
      {
        "Sponsor Licence Number": "DDD444",
        "Organisation Name": " Duplicate Ltd",
        TierRating: "Worker (A rating)",
        "Migrant Classification": "Skilled Worker",
        "Sponsor Status": "Licensed and Fully Active",
      },
      {
        "Sponsor Licence Number": "DDD444",
        "Organisation Name": " Duplicate Ltd",
        TierRating: "Worker (A rating)",
        "Migrant Classification": "Skilled Worker",
        "Sponsor Status": "Licensed and Fully Active",
      },
    ];

    it("filters to A-rated Skilled Worker sponsors only", () => {
      const result = filterSponsors(mockRows);
      expect(result.length).toBe(2);
      expect(result.map((r) => r.name)).toEqual(["Duplicate Ltd", "Monzo Bank Ltd"]);
    });

    it("deduplicates by name", () => {
      const result = filterSponsors(mockRows);
      const duplicateCount = result.filter((r) => r.name === "Duplicate Ltd").length;
      expect(duplicateCount).toBe(1);
    });

    it("returns sorted results", () => {
      const result = filterSponsors(mockRows);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].name.localeCompare(result[i - 1].name)).toBeGreaterThanOrEqual(0);
      }
    });

    it("handles empty input", () => {
      const result = filterSponsors([]);
      expect(result).toEqual([]);
    });
  });
});
