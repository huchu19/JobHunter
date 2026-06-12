import { describe, it, expect } from "vitest";
import {
  RATING_CATEGORIES,
  isRatingCategory,
  isValidStars,
  filterByCategory,
  averageRating,
  ratingDistribution,
  aggregateRatings,
} from "../app/lib/companyRatings";

const r = (rating: number, category: string) => ({ rating, category });

describe("isValidStars", () => {
  it("accepts integers 1..5", () => {
    for (const n of [1, 2, 3, 4, 5]) expect(isValidStars(n)).toBe(true);
  });

  it("rejects 0, 6, floats, and non-numbers", () => {
    expect(isValidStars(0)).toBe(false);
    expect(isValidStars(6)).toBe(false);
    expect(isValidStars(3.5)).toBe(false);
    expect(isValidStars("4")).toBe(false);
    expect(isValidStars(null)).toBe(false);
  });
});

describe("isRatingCategory", () => {
  it("accepts the three known categories", () => {
    for (const c of RATING_CATEGORIES) expect(isRatingCategory(c)).toBe(true);
  });

  it("rejects unknown values", () => {
    expect(isRatingCategory("salary")).toBe(false);
    expect(isRatingCategory("")).toBe(false);
    expect(isRatingCategory(undefined)).toBe(false);
  });
});

describe("filterByCategory", () => {
  const ratings = [
    r(5, "work-culture"),
    r(3, "sponsorship"),
    r(4, "sponsorship"),
  ];

  it("returns everything for 'all'", () => {
    expect(filterByCategory(ratings, "all")).toHaveLength(3);
  });

  it("filters to a single category", () => {
    const sponsorship = filterByCategory(ratings, "sponsorship");
    expect(sponsorship).toHaveLength(2);
    expect(sponsorship.every((x) => x.category === "sponsorship")).toBe(true);
  });
});

describe("averageRating", () => {
  it("returns null for an empty list", () => {
    expect(averageRating([])).toBeNull();
  });

  it("averages to one decimal place", () => {
    expect(averageRating([r(5, "sponsorship"), r(4, "sponsorship")])).toBe(4.5);
    expect(
      averageRating([r(5, "x"), r(4, "x"), r(4, "x")])
    ).toBe(4.3); // 13/3 = 4.333…
  });
});

describe("ratingDistribution", () => {
  it("counts stars into the right buckets", () => {
    const dist = ratingDistribution([
      r(1, "a"),
      r(5, "a"),
      r(5, "b"),
      r(3, "c"),
    ]);
    expect(dist).toEqual([1, 0, 1, 0, 2]);
  });

  it("ignores out-of-range values", () => {
    expect(ratingDistribution([r(0, "a"), r(6, "a")])).toEqual([
      0, 0, 0, 0, 0,
    ]);
  });
});

describe("aggregateRatings", () => {
  it("handles the spec scenario: three ratings, correct average", () => {
    const agg = aggregateRatings([
      r(5, "work-culture"),
      r(4, "sponsorship"),
      r(3, "responsiveness"),
    ]);
    expect(agg.overall).toBe(4);
    expect(agg.count).toBe(3);
    expect(agg.byCategory["work-culture"]).toEqual({ average: 5, count: 1 });
    expect(agg.byCategory.sponsorship).toEqual({ average: 4, count: 1 });
    expect(agg.byCategory.responsiveness).toEqual({ average: 3, count: 1 });
    expect(agg.distribution).toEqual([0, 0, 1, 1, 1]);
  });

  it("is safe on an empty list", () => {
    const agg = aggregateRatings([]);
    expect(agg.overall).toBeNull();
    expect(agg.count).toBe(0);
    expect(agg.distribution).toEqual([0, 0, 0, 0, 0]);
    for (const c of RATING_CATEGORIES) {
      expect(agg.byCategory[c]).toEqual({ average: null, count: 0 });
    }
  });
});
