import { describe, it, expect, vi } from "vitest";
import { fetchSponsorCSV } from "@/app/lib/csvFetcher";

describe("csvFetcher", () => {
  describe("fetchSponsorCSV", () => {
    it("returns CSV text on success from hardcoded fallback", async () => {
      const mockCSV =
        'Organisation Name,Town/City,County,"Type & Rating",Route\n" Test Ltd","London","","Worker (A rating)","Skilled Worker"';

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          text: async () => mockCSV,
        })
      );

      const result = await fetchSponsorCSV();
      expect(result).toBe(mockCSV);

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
