/**
 * Server-side gathering of live roles for the feed and the (reworked) matcher.
 * Fetches the curated pool + the user's tracked companies, plus optional
 * on-demand expansion (resolve extra named companies and pull their roles).
 *
 * Pulled out of the feed route so both `/api/roles/feed` and `/api/match` build
 * roles the same way.
 */

import prisma from "@/app/lib/db";
import { fetchListings } from "@/app/lib/atsListings";
import { resolveCareers } from "@/app/lib/resolveCareers";
import {
  buildSources,
  mapPool,
  type FeedSource,
} from "@/app/lib/rolesFeed";
import type { FeedRole } from "@/app/types/careers";

const CONCURRENCY = 6;
const PER_COMPANY = 8;

/** Tracked companies (distinct board names) that resolve to a usable ATS feed. */
export async function trackedFeedSources(): Promise<FeedSource[]> {
  const apps = await prisma.application.findMany({
    select: { company: true },
    distinct: ["company"],
  });
  const names = apps
    .map((a) => a.company?.trim())
    .filter((n): n is string => !!n);
  return resolveSources(names, true);
}

/** Resolve named companies to ATS feed sources (skipping ones with no feed). */
export async function resolveSources(
  names: string[],
  tracked: boolean
): Promise<FeedSource[]> {
  const resolved = await mapPool<string, FeedSource | null>(
    names,
    CONCURRENCY,
    async (name) => {
      try {
        const r = await resolveCareers(name);
        if (r.atsType && r.atsToken && r.atsType !== "other") {
          return { name, atsType: r.atsType, token: r.atsToken, tracked };
        }
      } catch {
        /* ignore — company just won't contribute */
      }
      return null;
    }
  );
  return resolved.filter((s): s is FeedSource => s !== null);
}

/** Fetch live roles for a set of sources, tagged with company/ats/tracked. */
export async function fetchRolesForSources(
  sources: FeedSource[]
): Promise<FeedRole[]> {
  const listingsBySource = await mapPool(sources, CONCURRENCY, (src) =>
    fetchListings(src.atsType, src.token, PER_COMPANY).catch(() => [])
  );
  const roles: FeedRole[] = [];
  sources.forEach((src, i) => {
    for (const l of listingsBySource[i] ?? []) {
      roles.push({
        ...l,
        company: src.name,
        atsType: src.atsType,
        tracked: src.tracked,
      });
    }
  });
  return roles;
}

/**
 * The base sources for the feed/matcher: the curated pool + tracked companies,
 * deduped by ATS board.
 */
export async function baseSources(): Promise<FeedSource[]> {
  const tracked = await trackedFeedSources();
  return buildSources(tracked);
}
