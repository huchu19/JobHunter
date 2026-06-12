/** Rating categories a company can be scored on. */
export type RatingCategory = "work-culture" | "sponsorship" | "responsiveness";

export interface Company {
  id: string;
  name: string;
  createdAt: Date;
}

export interface Rating {
  id: string;
  companyId: string;
  rating: number; // 1..5 stars
  comment: string | null;
  category: string;
  createdAt: Date;
}

/** Client-side shape of a Rating. Dates arrive as ISO strings over JSON. */
export interface RatingDTO {
  id: string;
  companyId: string;
  rating: number;
  comment: string | null;
  category: string;
  createdAt: string;
}

/** Per-category aggregate. */
export interface CategoryAggregate {
  average: number | null; // null when no ratings in the category
  count: number;
}

/** Full aggregate over a company's ratings. */
export interface RatingAggregate {
  overall: number | null;
  count: number;
  /** Count of 1..5-star ratings, indexed [0]=1★ … [4]=5★. */
  distribution: [number, number, number, number, number];
  byCategory: Record<RatingCategory, CategoryAggregate>;
}
