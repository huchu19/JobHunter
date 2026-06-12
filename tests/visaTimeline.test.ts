import { describe, it, expect } from "vitest";
import {
  VISA_TIMELINE_STAGES,
  estimateVisaTimeline,
  formatWeeksRange,
} from "../app/lib/visaTimeline";

describe("VISA_TIMELINE_STAGES", () => {
  it("every stage has a sane non-negative range", () => {
    for (const stage of VISA_TIMELINE_STAGES) {
      expect(stage.minWeeks).toBeGreaterThanOrEqual(0);
      expect(stage.maxWeeks).toBeGreaterThanOrEqual(stage.minWeeks);
      expect(stage.label.length).toBeGreaterThan(0);
    }
  });
});

describe("estimateVisaTimeline", () => {
  it("sums stage ranges", () => {
    const est = estimateVisaTimeline([
      { key: "a", label: "A", description: "", minWeeks: 1, maxWeeks: 2 },
      { key: "b", label: "B", description: "", minWeeks: 3, maxWeeks: 8 },
    ]);
    expect(est).toEqual({ minWeeks: 4, maxWeeks: 10 });
  });

  it("defaults to the built-in stages", () => {
    const est = estimateVisaTimeline();
    const manual = VISA_TIMELINE_STAGES.reduce(
      (acc, s) => acc + s.minWeeks,
      0
    );
    expect(est.minWeeks).toBe(manual);
    expect(est.maxWeeks).toBeGreaterThan(est.minWeeks);
  });
});

describe("formatWeeksRange", () => {
  it("formats a range", () => {
    expect(formatWeeksRange(4, 15)).toBe("4–15 weeks");
  });

  it("collapses equal min/max and pluralises correctly", () => {
    expect(formatWeeksRange(1, 1)).toBe("1 week");
    expect(formatWeeksRange(3, 3)).toBe("3 weeks");
  });
});
