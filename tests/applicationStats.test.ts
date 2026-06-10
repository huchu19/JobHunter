import { describe, it, expect } from "vitest";
import {
  appliedThisWeek,
  offersCount,
  interviewRate,
  responseRate,
  ghostedCount,
  upcomingDeadlines,
  upcomingFollowUps,
  computeDashboardStats,
  type StatApplication,
} from "@/app/lib/applicationStats";

const NOW = new Date("2026-06-15T12:00:00.000Z");

function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
}
function daysFromNow(n: number): string {
  return new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000).toISOString();
}

function app(overrides: Partial<StatApplication> = {}): StatApplication {
  return {
    status: "wishlist",
    appliedAt: null,
    interviewAt: null,
    offerAt: null,
    rejectedAt: null,
    deadline: null,
    followUpDate: null,
    ...overrides,
  };
}

describe("applicationStats", () => {
  describe("appliedThisWeek", () => {
    it("counts applications applied within the last 7 days", () => {
      const apps = [
        app({ appliedAt: daysAgo(2) }),
        app({ appliedAt: daysAgo(10) }),
        app({ appliedAt: null }),
      ];
      expect(appliedThisWeek(apps, NOW)).toBe(1);
    });
  });

  describe("offersCount", () => {
    it("counts applications in offer status", () => {
      expect(
        offersCount([app({ status: "offer" }), app({ status: "applied" })])
      ).toBe(1);
    });
  });

  describe("interviewRate", () => {
    it("is 0 when nothing was applied to", () => {
      expect(interviewRate([app({ status: "wishlist" })])).toBe(0);
    });

    it("counts interview+offer over applied", () => {
      const apps = [
        app({ status: "interview", appliedAt: daysAgo(5) }),
        app({ status: "offer", appliedAt: daysAgo(5) }),
        app({ status: "applied", appliedAt: daysAgo(5) }),
        app({ status: "rejected", appliedAt: daysAgo(5) }),
      ];
      expect(interviewRate(apps)).toBe(50);
    });
  });

  describe("responseRate", () => {
    it("counts any response (incl. rejection) over applied", () => {
      const apps = [
        app({ status: "rejected", appliedAt: daysAgo(5) }),
        app({ status: "interview", appliedAt: daysAgo(5) }),
        app({ status: "applied", appliedAt: daysAgo(5) }),
        app({ status: "applied", appliedAt: daysAgo(5) }),
      ];
      expect(responseRate(apps)).toBe(50);
    });
  });

  describe("ghostedCount", () => {
    it("counts old applied/shortlisted jobs with no response", () => {
      const apps = [
        app({ status: "applied", appliedAt: daysAgo(30) }), // ghosted
        app({ status: "shortlisted", appliedAt: daysAgo(30) }), // ghosted
        app({ status: "applied", appliedAt: daysAgo(5) }), // too recent
        app({
          status: "applied",
          appliedAt: daysAgo(30),
          interviewAt: daysAgo(20),
        }), // got a response
        app({ status: "rejected", appliedAt: daysAgo(30) }), // resolved
      ];
      expect(ghostedCount(apps, 21, NOW)).toBe(2);
    });
  });

  describe("upcomingDeadlines", () => {
    it("counts open apps with a deadline in the next 7 days", () => {
      const apps = [
        app({ status: "applied", deadline: daysFromNow(3) }),
        app({ status: "applied", deadline: daysFromNow(30) }),
        app({ status: "offer", deadline: daysFromNow(2) }), // closed
        app({ status: "rejected", deadline: daysFromNow(2) }), // closed
      ];
      expect(upcomingDeadlines(apps, 7, NOW)).toBe(1);
    });
  });

  describe("upcomingFollowUps", () => {
    it("counts open apps with a follow-up due within the window", () => {
      const apps = [
        app({ status: "applied", followUpDate: daysAgo(1) }), // overdue counts
        app({ status: "applied", followUpDate: daysFromNow(3) }),
        app({ status: "applied", followUpDate: daysFromNow(30) }), // too far
        app({ status: "rejected", followUpDate: daysFromNow(1) }), // closed
      ];
      expect(upcomingFollowUps(apps, 7, NOW)).toBe(2);
    });
  });

  describe("computeDashboardStats", () => {
    it("returns the full stat set", () => {
      const stats = computeDashboardStats(
        [app({ status: "offer", appliedAt: daysAgo(2) })],
        NOW
      );
      expect(stats.total).toBe(1);
      expect(stats.offers).toBe(1);
      expect(stats.appliedThisWeek).toBe(1);
      expect(stats).toHaveProperty("responseRate");
      expect(stats).toHaveProperty("ghosted");
      expect(stats).toHaveProperty("upcomingDeadlines");
      expect(stats).toHaveProperty("upcomingFollowUps");
    });
  });
});
