/**
 * In-memory cache of sponsor names for fuzzy verification, shared across the
 * applications routes. Falls back to the last-known list on fetch failure so a
 * transient gov.uk/sponsor-route hiccup never blocks saving an application.
 */
let cachedSponsors: { name: string }[] = [];
let sponsorsCacheTime = 0;
const SPONSORS_CACHE_TTL = 3600000; // 1 hour

export async function fetchSponsorsFromCache(): Promise<{ name: string }[]> {
  const now = Date.now();
  if (
    cachedSponsors.length > 0 &&
    now - sponsorsCacheTime < SPONSORS_CACHE_TTL
  ) {
    return cachedSponsors;
  }

  try {
    const response = await fetch("http://localhost:3000/api/sponsors", {
      cache: "no-store",
    });
    const data = await response.json();
    cachedSponsors = (data.sponsors as { name: string }[]) || [];
    sponsorsCacheTime = now;
    return cachedSponsors;
  } catch {
    return cachedSponsors;
  }
}

// Full sponsor objects (name/city/isTech/techScore) for the matcher, cached
// separately so the lighter name-only cache keeps its small footprint.
import type { Sponsor } from "@/app/types/sponsor";

let cachedDetailed: Sponsor[] = [];
let detailedCacheTime = 0;

export async function fetchDetailedSponsorsFromCache(): Promise<Sponsor[]> {
  const now = Date.now();
  if (cachedDetailed.length > 0 && now - detailedCacheTime < SPONSORS_CACHE_TTL) {
    return cachedDetailed;
  }

  try {
    const response = await fetch("http://localhost:3000/api/sponsors", {
      cache: "no-store",
    });
    const data = await response.json();
    cachedDetailed = (data.sponsors as Sponsor[]) || [];
    detailedCacheTime = now;
    return cachedDetailed;
  } catch {
    return cachedDetailed;
  }
}
