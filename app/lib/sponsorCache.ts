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
