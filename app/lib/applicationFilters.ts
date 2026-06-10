import type { ApplicationDTO } from "@/app/types/application";

export interface ApplicationFilters {
  /** Case-insensitive substring across company / role / location / notes. */
  search?: string;
  locationType?: string; // "" / undefined = any
  jobType?: string; // "" / undefined = any
  priorityMin?: number; // 0 = any
  verifiedOnly?: boolean;
}

export type SortKey = "updated" | "deadline" | "applied" | "priority";

/**
 * Filters applications by the active toolbar criteria. Pure — returns a new
 * array, never mutates the input.
 */
export function filterApplications<T extends ApplicationDTO>(
  apps: T[],
  filters: ApplicationFilters = {}
): T[] {
  const search = filters.search?.trim().toLowerCase() ?? "";

  return apps.filter((app) => {
    if (filters.locationType && app.locationType !== filters.locationType) {
      return false;
    }
    if (filters.jobType && app.jobType !== filters.jobType) {
      return false;
    }
    if (filters.priorityMin && app.priority < filters.priorityMin) {
      return false;
    }
    if (filters.verifiedOnly && !app.sponsorVerified) {
      return false;
    }
    if (search) {
      const haystack = [app.company, app.role, app.location, app.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

function timeOrNull(value: string | null): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Sorts applications by the chosen key. Pure — returns a new array.
 * For "deadline" and "applied", rows missing that date sort last.
 */
export function sortApplications<T extends ApplicationDTO>(
  apps: T[],
  sortKey: SortKey
): T[] {
  const copy = [...apps];

  switch (sortKey) {
    case "priority":
      return copy.sort(
        (a, b) =>
          b.priority - a.priority ||
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    case "deadline":
      return copy.sort((a, b) => nullsLastAsc(a.deadline, b.deadline));
    case "applied":
      return copy.sort((a, b) => nullsLastDesc(a.appliedAt, b.appliedAt));
    case "updated":
    default:
      return copy.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  }
}

/** Ascending (soonest first); nulls sink to the bottom. */
function nullsLastAsc(a: string | null, b: string | null): number {
  const ta = timeOrNull(a);
  const tb = timeOrNull(b);
  if (ta === null && tb === null) return 0;
  if (ta === null) return 1;
  if (tb === null) return -1;
  return ta - tb;
}

/** Descending (most recent first); nulls sink to the bottom. */
function nullsLastDesc(a: string | null, b: string | null): number {
  const ta = timeOrNull(a);
  const tb = timeOrNull(b);
  if (ta === null && tb === null) return 0;
  if (ta === null) return 1;
  if (tb === null) return -1;
  return tb - ta;
}
