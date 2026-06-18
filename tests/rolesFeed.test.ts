import { describe, it, expect } from "vitest";
import {
  mapPool,
  buildSources,
  assembleFeed,
  type FeedSource,
} from "../app/lib/rolesFeed";
import { ROLES_POOL } from "../app/lib/rolesPool";
import type { Listing } from "../app/types/careers";

describe("mapPool", () => {
  it("preserves order and respects the concurrency cap", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const out = await mapPool([1, 2, 3, 4, 5], 2, async (n) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return n * 10;
    });
    expect(out).toEqual([10, 20, 30, 40, 50]);
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });

  it("handles an empty list", async () => {
    expect(await mapPool([], 4, async (x) => x)).toEqual([]);
  });
});

describe("buildSources", () => {
  it("includes the whole pool when there are no tracked companies", () => {
    const sources = buildSources([]);
    expect(sources.length).toBe(ROLES_POOL.length);
    expect(sources.every((s) => s.tracked === false)).toBe(true);
  });

  it("marks a tracked company that overlaps the pool as tracked (no dup)", () => {
    const tracked: FeedSource[] = [
      { name: "Monzo", atsType: "greenhouse", token: "monzo", tracked: true },
    ];
    const sources = buildSources(tracked);
    expect(sources.length).toBe(ROLES_POOL.length); // no new row — same board
    const monzo = sources.filter(
      (s) => s.atsType === "greenhouse" && s.token === "monzo"
    );
    expect(monzo).toHaveLength(1);
    expect(monzo[0].tracked).toBe(true);
  });

  it("adds a tracked company not in the pool", () => {
    const tracked: FeedSource[] = [
      { name: "Acme", atsType: "lever", token: "acme", tracked: true },
    ];
    const sources = buildSources(tracked);
    expect(sources.length).toBe(ROLES_POOL.length + 1);
    expect(sources.find((s) => s.token === "acme")?.tracked).toBe(true);
  });
});

describe("assembleFeed", () => {
  const L = (title: string, location: string | null = "London"): Listing => ({
    title,
    location,
    url: `https://example.com/${title.replace(/\s/g, "-")}`,
    postedAt: null,
  });

  const sources: FeedSource[] = [
    { name: "PoolCo", atsType: "greenhouse", token: "poolco", tracked: false },
    { name: "TrackedCo", atsType: "lever", token: "trackedco", tracked: true },
  ];

  it("tags roles with company + tracked, and sorts tracked first", () => {
    const feed = assembleFeed(sources, [
      [L("Backend Engineer")],
      [L("Data Scientist")],
    ]);
    expect(feed.roles[0].company).toBe("TrackedCo"); // tracked sorts first
    expect(feed.roles[0].tracked).toBe(true);
    expect(feed.roles[1].company).toBe("PoolCo");
    expect(feed.companies.map((c) => c.name)).toEqual(["TrackedCo", "PoolCo"]);
  });

  it("caps roles per company and skips empty companies", () => {
    const many = Array.from({ length: 20 }, (_, i) => L(`Role ${i}`));
    const feed = assembleFeed(sources, [many, []], 3);
    // PoolCo capped to 3; TrackedCo contributed nothing → excluded.
    expect(feed.roles).toHaveLength(3);
    expect(feed.companies).toEqual([
      { name: "PoolCo", count: 3, tracked: false },
    ]);
  });

  it("is safe when given no listings at all", () => {
    const feed = assembleFeed(sources, [[], []]);
    expect(feed.roles).toEqual([]);
    expect(feed.companies).toEqual([]);
    expect(typeof feed.generatedAt).toBe("string");
  });
});

describe("ROLES_POOL", () => {
  it("has no duplicate ATS boards and only known ATS types", () => {
    const keys = ROLES_POOL.map((c) => `${c.atsType}:${c.token}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(
      ROLES_POOL.every((c) =>
        ["greenhouse", "lever", "ashby"].includes(c.atsType)
      )
    ).toBe(true);
  });
});
