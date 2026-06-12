import { describe, it, expect } from "vitest";
import {
  linkedInJobsUrl,
  googleCareersUrl,
  glassdoorSearchUrl,
  googleSalaryUrl,
} from "@/app/lib/companyLinks";

describe("companyLinks", () => {
  describe("linkedInJobsUrl", () => {
    it("builds a LinkedIn jobs search URL", () => {
      expect(linkedInJobsUrl("Monzo")).toBe(
        "https://www.linkedin.com/jobs/search/?keywords=Monzo"
      );
    });

    it("encodes company names with spaces and special chars", () => {
      expect(linkedInJobsUrl("Google (UK) Limited")).toBe(
        "https://www.linkedin.com/jobs/search/?keywords=Google%20(UK)%20Limited"
      );
    });
  });

  describe("googleCareersUrl", () => {
    it("builds a Google careers search URL", () => {
      expect(googleCareersUrl("Monzo")).toBe(
        "https://www.google.com/search?q=Monzo%20careers"
      );
    });

    it("encodes company names with ampersands", () => {
      expect(googleCareersUrl("R&A Lee Holdings")).toBe(
        "https://www.google.com/search?q=R%26A%20Lee%20Holdings%20careers"
      );
    });
  });

  describe("glassdoorSearchUrl", () => {
    it("builds an encoded Glassdoor search URL", () => {
      expect(glassdoorSearchUrl("Monzo Bank")).toBe(
        "https://www.glassdoor.co.uk/Search/results.htm?keyword=Monzo%20Bank"
      );
    });
  });

  describe("googleSalaryUrl", () => {
    it("builds an encoded salary search URL", () => {
      expect(googleSalaryUrl("Monzo")).toBe(
        "https://www.google.com/search?q=Monzo%20salary%20benefits%20london"
      );
    });
  });
});
