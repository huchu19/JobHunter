import { fetchListings } from "@/app/lib/atsListings";
import { baseSources } from "@/app/lib/gatherRoles";
import { assembleFeed, mapPool } from "@/app/lib/rolesFeed";
import type { RolesFeedResult } from "@/app/types/careers";

/**
 * Unified roles feed: live open roles aggregated across the curated scale-up
 * pool (verified ATS boards) plus the user's tracked companies that resolve to
 * a usable ATS feed. The assembled feed is cached in-memory (short TTL) so
 * navigating to /roles repeatedly is instant. Never 500s.
 */

const CONCURRENCY = 6;
const PER_COMPANY = 8;
const CACHE_TTL_MS = 5 * 60 * 1000;

let cached: { result: RolesFeedResult; at: number } | null = null;

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("refresh") === "1";

  if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return Response.json(cached.result);
  }

  try {
    const sources = await baseSources();
    const listingsBySource = await mapPool(sources, CONCURRENCY, (src) =>
      fetchListings(src.atsType, src.token, PER_COMPANY).catch(() => [])
    );

    const result = assembleFeed(sources, listingsBySource, PER_COMPANY);
    cached = { result, at: Date.now() };
    return Response.json(result);
  } catch (error) {
    console.error("Error building roles feed:", error);
    const empty: RolesFeedResult = {
      roles: [],
      companies: [],
      generatedAt: new Date().toISOString(),
    };
    return Response.json(empty);
  }
}
