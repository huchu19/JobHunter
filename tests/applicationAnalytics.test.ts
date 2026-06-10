import { describe, it, expect } from "vitest";
import {
  buildFunnel,
  appliedPerWeek,
  stageGaps,
  conversions,
  statusDistribution,
  computeAnalytics,
  type AnalyticsApplication,
} from "@/app/lib/applicationAnalytics";

// Fixed reference point so week bucketing is deterministic.
// 2026-06-10 is a Wednesday; its week starts Monday 2026-06-08.
const NOW = new Date("2026-06-10T12:00:00");

function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 86400000).toISOString();
}

describe("buildFunnel", () => {
  it("counts cumulative reach: an offer counts toward every earlier stage", () => {
    const apps: AnalyticsApplication[] = [
      { status: "applied", appliedAt: daysAgo(10) },
      { status: "interview", appliedAt: daysAgo(20), interviewAt: daysAgo(5) },
      {
        status: "offer",
        appliedAt: daysAgo(30),
        interviewAt: daysAgo(15),
        offerAt: daysAgo(2),
      },
    ];
    const f = buildFunnel(apps);
    const by = Object.fromEntries(f.map((s) => [s.status, s.count]));
    expect(by.applied).toBe(3);
    expect(by.interview).toBe(2);
    expect(by.offer).toBe(1);
  });

  it("counts a rejected-after-interview toward Interview via timestamp", () => {
    const apps: AnalyticsApplication[] = [
      {
        status: "rejected",
        appliedAt: daysAgo(30),
        interviewAt: daysAgo(10),
        rejectedAt: daysAgo(3),
      },
    ];
    const f = buildFunnel(apps);
    const by = Object.fromEntries(f.map((s) => [s.status, s.count]));
    expect(by.applied).toBe(1);
    expect(by.interview).toBe(1);
    expect(by.offer).toBe(0);
  });

  it("computes pctOfTop and pctOfPrev", () => {
    const apps: AnalyticsApplication[] = [
      { status: "applied", appliedAt: daysAgo(10) },
      { status: "applied", appliedAt: daysAgo(10) },
      { status: "applied", appliedAt: daysAgo(10) },
      { status: "applied", appliedAt: daysAgo(10) },
      { status: "interview", appliedAt: daysAgo(10), interviewAt: daysAgo(5) },
      { status: "interview", appliedAt: daysAgo(10), interviewAt: daysAgo(5) },
    ];
    const f = buildFunnel(apps);
    const applied = f.find((s) => s.status === "applied")!;
    const interview = f.find((s) => s.status === "interview")!;
    expect(applied.count).toBe(6);
    expect(applied.pctOfTop).toBe(100);
    expect(interview.count).toBe(2);
    expect(interview.pctOfTop).toBe(33); // 2/6
  });

  it("handles an empty list without dividing by zero", () => {
    const f = buildFunnel([]);
    expect(f.every((s) => s.count === 0 && s.pctOfTop === 0)).toBe(true);
  });
});

describe("appliedPerWeek", () => {
  it("buckets applications into the correct trailing weeks", () => {
    const apps: AnalyticsApplication[] = [
      { status: "applied", appliedAt: daysAgo(0) }, // this week
      { status: "applied", appliedAt: daysAgo(1) }, // this week
      { status: "applied", appliedAt: daysAgo(9) }, // last-ish week
      { status: "wishlist", appliedAt: null }, // ignored (never applied)
    ];
    const weeks = appliedPerWeek(apps, 4, NOW);
    expect(weeks).toHaveLength(4);
    // Oldest first, current week last.
    expect(weeks[weeks.length - 1].count).toBe(2);
    const total = weeks.reduce((s, w) => s + w.count, 0);
    expect(total).toBe(3);
  });

  it("fills empty weeks with zero and keeps a continuous axis", () => {
    const weeks = appliedPerWeek([], 6, NOW);
    expect(weeks).toHaveLength(6);
    expect(weeks.every((w) => w.count === 0)).toBe(true);
    // weekStart values are strictly increasing by 7 days.
    for (let i = 1; i < weeks.length; i++) {
      const prev = new Date(weeks[i - 1].weekStart).getTime();
      const cur = new Date(weeks[i].weekStart).getTime();
      expect(cur - prev).toBe(7 * 86400000);
    }
  });

  it("ignores applications older than the window", () => {
    const apps: AnalyticsApplication[] = [
      { status: "applied", appliedAt: daysAgo(100) },
    ];
    const weeks = appliedPerWeek(apps, 4, NOW);
    expect(weeks.reduce((s, w) => s + w.count, 0)).toBe(0);
  });
});

describe("stageGaps", () => {
  it("averages days between stages over applications with both timestamps", () => {
    const apps: AnalyticsApplication[] = [
      { status: "interview", appliedAt: daysAgo(20), interviewAt: daysAgo(10) }, // 10d
      { status: "offer", appliedAt: daysAgo(30), interviewAt: daysAgo(10), offerAt: daysAgo(5) }, // 20d, then 5d
    ];
    const gaps = stageGaps(apps);
    const aToI = gaps.find((g) => g.to === "interview")!;
    const iToO = gaps.find((g) => g.to === "offer")!;
    expect(aToI.avgDays).toBe(15); // (10 + 20) / 2
    expect(aToI.sampleSize).toBe(2);
    expect(iToO.avgDays).toBe(5);
    expect(iToO.sampleSize).toBe(1);
  });

  it("returns null avg with zero sample when no data", () => {
    const gaps = stageGaps([{ status: "applied", appliedAt: daysAgo(5) }]);
    expect(gaps.every((g) => g.avgDays === null && g.sampleSize === 0)).toBe(
      true
    );
  });

  it("ignores negative gaps (out-of-order timestamps)", () => {
    const apps: AnalyticsApplication[] = [
      { status: "interview", appliedAt: daysAgo(5), interviewAt: daysAgo(10) },
    ];
    const gaps = stageGaps(apps);
    expect(gaps.find((g) => g.to === "interview")!.avgDays).toBeNull();
  });
});

describe("conversions", () => {
  it("computes stage-to-stage and overall conversion percentages", () => {
    const apps: AnalyticsApplication[] = [
      { status: "applied", appliedAt: daysAgo(10) },
      { status: "applied", appliedAt: daysAgo(10) },
      { status: "interview", appliedAt: daysAgo(10), interviewAt: daysAgo(5) },
      { status: "offer", appliedAt: daysAgo(10), interviewAt: daysAgo(5), offerAt: daysAgo(1) },
    ];
    const c = conversions(apps);
    expect(c.applied).toBe(4);
    expect(c.appliedToInterview).toBe(50); // 2 of 4 reached interview
    expect(c.interviewToOffer).toBe(50); // 1 of 2 reached offer
    expect(c.appliedToOffer).toBe(25); // 1 of 4
  });

  it("is zero across the board for an empty list", () => {
    const c = conversions([]);
    expect(c).toEqual({
      applied: 0,
      appliedToInterview: 0,
      interviewToOffer: 0,
      appliedToOffer: 0,
    });
  });
});

describe("statusDistribution", () => {
  it("counts current status across all six stages with percentages", () => {
    const apps: AnalyticsApplication[] = [
      { status: "wishlist", appliedAt: null },
      { status: "applied", appliedAt: daysAgo(3) },
      { status: "applied", appliedAt: daysAgo(3) },
      { status: "rejected", appliedAt: daysAgo(30), rejectedAt: daysAgo(2) },
    ];
    const dist = statusDistribution(apps);
    expect(dist).toHaveLength(6);
    const by = Object.fromEntries(dist.map((d) => [d.status, d]));
    expect(by.applied.count).toBe(2);
    expect(by.applied.pct).toBe(50);
    expect(by.wishlist.count).toBe(1);
    expect(by.offer.count).toBe(0);
    // Ordered by pipeline order.
    expect(dist.map((d) => d.status)).toEqual([
      "wishlist", "applied", "shortlisted", "interview", "offer", "rejected",
    ]);
  });
});

describe("computeAnalytics", () => {
  it("bundles every metric in one pass", () => {
    const apps: AnalyticsApplication[] = [
      { status: "applied", appliedAt: daysAgo(2) },
      { status: "offer", appliedAt: daysAgo(20), interviewAt: daysAgo(10), offerAt: daysAgo(2) },
    ];
    const b = computeAnalytics(apps, NOW);
    expect(b.total).toBe(2);
    expect(b.funnel).toHaveLength(4);
    expect(b.weekly).toHaveLength(8);
    expect(b.stageGaps).toHaveLength(2);
    expect(b.conversions.applied).toBe(2);
    expect(b.statusDistribution).toHaveLength(6);
  });
});
