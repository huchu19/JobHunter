import type {
  RatingAggregate,
  RatingCategory,
} from "@/app/types/company";

/**
 * Rating aggregation for the company research pages. Pure functions shared by
 * the ratings API (validation) and the company page / ratings panel
 * (aggregates + category filtering) so the maths is never duplicated.
 */

export const RATING_CATEGORIES: RatingCategory[] = [
  "work-culture",
  "sponsorship",
  "responsiveness",
];

export const CATEGORY_LABELS: Record<RatingCategory, string> = {
  "work-culture": "Work culture",
  sponsorship: "Sponsorship",
  responsiveness: "Responsiveness",
};

/** Minimal shape both Prisma rows and DTOs satisfy. */
export interface RatingLike {
  rating: number;
  category: string;
}

export function isRatingCategory(value: unknown): value is RatingCategory {
  return (
    typeof value === "string" &&
    (RATING_CATEGORIES as string[]).includes(value)
  );
}

/** A valid star value is an integer 1..5. */
export function isValidStars(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5
  );
}

export function filterByCategory<T extends RatingLike>(
  ratings: T[],
  category: RatingCategory | "all"
): T[] {
  if (category === "all") return ratings;
  return ratings.filter((r) => r.category === category);
}

/** Mean star rating to one decimal place, or null for an empty list. */
export function averageRating(ratings: RatingLike[]): number | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

/** Count of 1..5-star ratings, indexed [0]=1★ … [4]=5★. */
export function ratingDistribution(
  ratings: RatingLike[]
): [number, number, number, number, number] {
  const dist: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const r of ratings) {
    if (isValidStars(r.rating)) dist[r.rating - 1] += 1;
  }
  return dist;
}

/** Overall + per-category aggregates in one pass-friendly structure. */
export function aggregateRatings(ratings: RatingLike[]): RatingAggregate {
  const byCategory = {} as RatingAggregate["byCategory"];
  for (const category of RATING_CATEGORIES) {
    const inCategory = filterByCategory(ratings, category);
    byCategory[category] = {
      average: averageRating(inCategory),
      count: inCategory.length,
    };
  }

  return {
    overall: averageRating(ratings),
    count: ratings.length,
    distribution: ratingDistribution(ratings),
    byCategory,
  };
}
