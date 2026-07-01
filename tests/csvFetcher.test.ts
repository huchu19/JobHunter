import { describe, it, expect, vi } from "vitest";
import { fetchSponsorCSV } from "@/app/lib/csvFetcher";

describe("csvFetcher", () => {
  describe("fetchSponsorCSV", () => {
    it("returns CSV text and date on success from hardcoded fallback", async () => {
      const mockCSV =
        'Sponsor Licence Number,Organisation Name,TierRating,Migrant Classification,Sponsor Status\nAAA111," Test Ltd",Worker (A rating),Skilled Worker,Licensed and Fully Active';

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          text: async () => mockCSV,
        })
      );

      const result = await fetchSponsorCSV();
      expect(result.csv).toBe(mockCSV);
      expect(result.date).toBe("2026-06-29");

      vi.unstubAllGlobals();
    });

    it("throws when both GOV.UK and fallback fail", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

      await expect(fetchSponsorCSV()).rejects.toThrow(
        "Could not fetch sponsor CSV"
      );

      vi.unstubAllGlobals();
    });
  });
});
