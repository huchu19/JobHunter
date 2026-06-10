import { describe, it, expect } from "vitest";
import {
  STATUSES,
  STATUS_META,
  isApplicationStatus,
  stageTimestampField,
  nextActivityForTransition,
} from "@/app/lib/applicationStatus";

describe("applicationStatus", () => {
  describe("STATUSES", () => {
    it("is ordered wishlist → applied → shortlisted → interview → offer → rejected", () => {
      expect(STATUSES).toEqual([
        "wishlist",
        "applied",
        "shortlisted",
        "interview",
        "offer",
        "rejected",
      ]);
    });

    it("includes the shortlisted column", () => {
      expect(STATUSES).toContain("shortlisted");
      expect(STATUS_META.shortlisted.label).toBe("Shortlisted");
    });
  });

  describe("isApplicationStatus", () => {
    it("accepts known statuses", () => {
      expect(isApplicationStatus("interview")).toBe(true);
      expect(isApplicationStatus("shortlisted")).toBe(true);
    });

    it("rejects unknown values", () => {
      expect(isApplicationStatus("archived")).toBe(false);
      expect(isApplicationStatus("")).toBe(false);
      expect(isApplicationStatus(null)).toBe(false);
      expect(isApplicationStatus(42)).toBe(false);
    });
  });

  describe("stageTimestampField", () => {
    it("maps statuses to their per-stage timestamp field", () => {
      expect(stageTimestampField("applied")).toBe("appliedAt");
      expect(stageTimestampField("interview")).toBe("interviewAt");
      expect(stageTimestampField("offer")).toBe("offerAt");
      expect(stageTimestampField("rejected")).toBe("rejectedAt");
    });

    it("returns null for statuses without a dedicated timestamp", () => {
      expect(stageTimestampField("wishlist")).toBeNull();
      expect(stageTimestampField("shortlisted")).toBeNull();
    });
  });

  describe("nextActivityForTransition", () => {
    it("returns null when the status did not change", () => {
      expect(nextActivityForTransition("applied", "applied")).toBeNull();
    });

    it("builds a status_change activity with readable labels", () => {
      const activity = nextActivityForTransition("applied", "interview");
      expect(activity).toEqual({
        type: "status_change",
        fromStatus: "applied",
        toStatus: "interview",
        title: "Moved from Applied to Interview",
      });
    });

    it("falls back to raw values for unknown statuses", () => {
      const activity = nextActivityForTransition("applied", "weird");
      expect(activity?.title).toBe("Moved from Applied to weird");
    });
  });
});
