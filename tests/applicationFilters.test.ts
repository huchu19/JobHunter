import { describe, it, expect } from "vitest";
import {
  filterApplications,
  sortApplications,
} from "@/app/lib/applicationFilters";
import type { ApplicationDTO } from "@/app/types/application";

function app(overrides: Partial<ApplicationDTO> = {}): ApplicationDTO {
  return {
    id: Math.random().toString(36).slice(2),
    company: "Acme",
    role: "Engineer",
    url: null,
    location: "London",
    locationType: "london",
    jobType: "grad",
    status: "wishlist",
    appliedAt: null,
    notes: null,
    salary: null,
    source: "manual",
    sponsorVerified: false,
    priority: 0,
    deadline: null,
    followUpDate: null,
    interviewAt: null,
    offerAt: null,
    rejectedAt: null,
    rejectedReason: null,
    contactName: null,
    contactEmail: null,
    jobDescription: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("applicationFilters", () => {
  describe("filterApplications", () => {
    it("returns all applications with no filters", () => {
      const apps = [app(), app()];
      expect(filterApplications(apps)).toHaveLength(2);
    });

    it("matches search case-insensitively across company/role/location/notes", () => {
      const apps = [
        app({ company: "Monzo" }),
        app({ role: "Data Scientist" }),
        app({ notes: "Referred by Sam" }),
        app({ company: "Acme", role: "Engineer", notes: null }),
      ];
      expect(filterApplications(apps, { search: "monzo" })).toHaveLength(1);
      expect(filterApplications(apps, { search: "data" })).toHaveLength(1);
      expect(filterApplications(apps, { search: "sam" })).toHaveLength(1);
      expect(filterApplications(apps, { search: "zzz" })).toHaveLength(0);
    });

    it("filters by locationType and jobType", () => {
      const apps = [
        app({ locationType: "remote", jobType: "intern" }),
        app({ locationType: "london", jobType: "grad" }),
      ];
      expect(filterApplications(apps, { locationType: "remote" })).toHaveLength(
        1
      );
      expect(filterApplications(apps, { jobType: "grad" })).toHaveLength(1);
    });

    it("filters by minimum priority", () => {
      const apps = [app({ priority: 1 }), app({ priority: 4 })];
      expect(filterApplications(apps, { priorityMin: 3 })).toHaveLength(1);
    });

    it("filters verified-only", () => {
      const apps = [
        app({ sponsorVerified: true }),
        app({ sponsorVerified: false }),
      ];
      expect(filterApplications(apps, { verifiedOnly: true })).toHaveLength(1);
    });

    it("combines multiple filters (AND)", () => {
      const apps = [
        app({ company: "Monzo", sponsorVerified: true, priority: 5 }),
        app({ company: "Monzo", sponsorVerified: false, priority: 5 }),
      ];
      const result = filterApplications(apps, {
        search: "monzo",
        verifiedOnly: true,
        priorityMin: 4,
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("sortApplications", () => {
    it("sorts by updated desc (most recent first)", () => {
      const a = app({ id: "old", updatedAt: "2026-01-01T00:00:00.000Z" });
      const b = app({ id: "new", updatedAt: "2026-02-01T00:00:00.000Z" });
      const sorted = sortApplications([a, b], "updated");
      expect(sorted.map((x) => x.id)).toEqual(["new", "old"]);
    });

    it("sorts by deadline asc with nulls last", () => {
      const soon = app({ id: "soon", deadline: "2026-03-01T00:00:00.000Z" });
      const later = app({ id: "later", deadline: "2026-06-01T00:00:00.000Z" });
      const none = app({ id: "none", deadline: null });
      const sorted = sortApplications([none, later, soon], "deadline");
      expect(sorted.map((x) => x.id)).toEqual(["soon", "later", "none"]);
    });

    it("sorts by priority desc", () => {
      const lo = app({ id: "lo", priority: 1 });
      const hi = app({ id: "hi", priority: 5 });
      const sorted = sortApplications([lo, hi], "priority");
      expect(sorted.map((x) => x.id)).toEqual(["hi", "lo"]);
    });

    it("does not mutate the input array", () => {
      const apps = [app({ id: "a" }), app({ id: "b" })];
      const before = apps.map((x) => x.id);
      sortApplications(apps, "priority");
      expect(apps.map((x) => x.id)).toEqual(before);
    });
  });
});
