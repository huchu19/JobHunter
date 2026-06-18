/**
 * Build the unified roles feed: live open roles aggregated across the curated
 * scale-up pool (verified ATS boards) plus the user's own tracked companies.
 *
 * The aggregation/merge/sort is pure and unit-tested; the per-company fetch and
 * the tracked-company resolution are injected so this runs without live HTTP.
 */

import type { AtsType, FeedRole, Listing, RolesFeedResult } from "@/app/types/careers";
import { ROLES_POOL } from "@/app/lib/rolesPool";

/** A company we know how to fetch roles for directly (ATS + token). */
export interface FeedSource {
  name: string;
  atsType: AtsType;
  token: string;
  tracked: boolean;
}

/** Run `task` over `items` with at most `concurrency` in flight. */
export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await task(items[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker)
  );
  return results;
}

/**
 * Merge the curated pool with resolved tracked companies into a deduped source
 * list. A tracked company that's also in the pool is marked `tracked: true`.
 * `trackedSources` are tracked companies that resolved to a usable ATS feed.
 */
export function buildSources(trackedSources: FeedSource[]): FeedSource[] {
  const byKey = new Map<string, FeedSource>();
  const key = (atsType: string, token: string) =>
    `${atsType}:${token.toLowerCase()}`;

  for (const c of ROLES_POOL) {
    byKey.set(key(c.atsType, c.token), { ...c, tracked: false });
  }
  for (const t of trackedSources) {
    const k = key(t.atsType, t.token);
    const existing = byKey.get(k);
    // Tracked companies win the name + tracked flag; dedupe by ATS board.
    byKey.set(k, { ...(existing ?? t), name: t.name, tracked: true });
  }
  return [...byKey.values()];
}

/**
 * Assemble the feed from each source's fetched listings. Roles are tagged with
 * their company, tracked companies are sorted first, then companies with more
 * roles, then role title. `perCompanyCap` bounds how many roles each company
 * contributes so one huge board can't dominate.
 */
export function assembleFeed(
  sources: FeedSource[],
  listingsBySource: Listing[][],
  perCompanyCap = 8
): RolesFeedResult {
  const roles: FeedRole[] = [];
  const companies: RolesFeedResult["companies"] = [];

  sources.forEach((src, i) => {
    const listings = (listingsBySource[i] ?? []).slice(0, perCompanyCap);
    if (listings.length === 0) return;
    companies.push({
      name: src.name,
      count: listings.length,
      tracked: src.tracked,
    });
    for (const l of listings) {
      roles.push({
        ...l,
        company: src.name,
        atsType: src.atsType,
        tracked: src.tracked,
      });
    }
  });

  roles.sort(
    (a, b) =>
      Number(b.tracked) - Number(a.tracked) ||
      a.company.localeCompare(b.company) ||
      a.title.localeCompare(b.title)
  );
  companies.sort(
    (a, b) =>
      Number(b.tracked) - Number(a.tracked) ||
      b.count - a.count ||
      a.name.localeCompare(b.name)
  );

  return { roles, companies, generatedAt: new Date().toISOString() };
}
