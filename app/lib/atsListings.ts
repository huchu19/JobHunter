/**
 * Fetch and normalise open job listings from the public APIs of common
 * applicant-tracking systems (Greenhouse, Lever, Ashby, Workday). These are the
 * same JSON feeds an ATS's own embedded job board uses — no keys, no scraping.
 *
 * Pure helpers (URL builders, response normalisers) are exported and unit-tested;
 * the network fetchers wrap them behind a bounded timeout.
 */

import type { AtsType, Listing } from "@/app/types/careers";

const FETCH_TIMEOUT_MS = 6000;

/** Bounded JSON fetch — never hangs a request on a slow ATS. Mirrors the
 *  AbortController pattern used in app/api/parse-url/route.ts. */
async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Greenhouse — https://boards-api.greenhouse.io/v1/boards/<token>/jobs
// ---------------------------------------------------------------------------

export function greenhouseJobsUrl(token: string): string {
  return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(
    token
  )}/jobs`;
}

export function normalizeGreenhouse(data: unknown): Listing[] {
  const jobs = (data as { jobs?: unknown[] })?.jobs;
  if (!Array.isArray(jobs)) return [];
  return jobs
    .map((j): Listing | null => {
      const job = j as {
        title?: string;
        absolute_url?: string;
        location?: { name?: string };
        updated_at?: string;
      };
      if (!job.title || !job.absolute_url) return null;
      return {
        title: job.title,
        location: job.location?.name ?? null,
        url: job.absolute_url,
        postedAt: normalizeDate(job.updated_at),
      };
    })
    .filter((l): l is Listing => l !== null);
}

// ---------------------------------------------------------------------------
// Lever — https://api.lever.co/v0/postings/<token>?mode=json
// ---------------------------------------------------------------------------

export function leverJobsUrl(token: string): string {
  return `https://api.lever.co/v0/postings/${encodeURIComponent(
    token
  )}?mode=json`;
}

export function normalizeLever(data: unknown): Listing[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((p): Listing | null => {
      const post = p as {
        text?: string;
        hostedUrl?: string;
        categories?: { location?: string };
        createdAt?: number;
      };
      if (!post.text || !post.hostedUrl) return null;
      return {
        title: post.text,
        location: post.categories?.location ?? null,
        url: post.hostedUrl,
        postedAt:
          typeof post.createdAt === "number"
            ? new Date(post.createdAt).toISOString().slice(0, 10)
            : null,
      };
    })
    .filter((l): l is Listing => l !== null);
}

// ---------------------------------------------------------------------------
// Ashby — https://api.ashbyhq.com/posting-api/job-board/<token>
// ---------------------------------------------------------------------------

export function ashbyJobsUrl(token: string): string {
  return `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(
    token
  )}`;
}

export function normalizeAshby(data: unknown): Listing[] {
  const jobs = (data as { jobs?: unknown[] })?.jobs;
  if (!Array.isArray(jobs)) return [];
  return jobs
    .map((j): Listing | null => {
      const job = j as {
        title?: string;
        jobUrl?: string;
        location?: string;
        publishedAt?: string;
      };
      if (!job.title || !job.jobUrl) return null;
      return {
        title: job.title,
        location: job.location ?? null,
        url: job.jobUrl,
        postedAt: normalizeDate(job.publishedAt),
      };
    })
    .filter((l): l is Listing => l !== null);
}

// ---------------------------------------------------------------------------
// Workday — reuses the CXS endpoint transform shared with app/api/parse-url.
// Workday renders client-side, but its REST endpoints return structured JSON.
// `atsToken` for Workday is the full job-board URL (host + locale + site path);
// we POST to the CXS jobs endpoint to list postings.
// ---------------------------------------------------------------------------

/**
 * Build the Workday CXS *jobs-listing* endpoint from a job-board URL like
 *   https://{tenant}.{dc}.myworkdayjobs.com/{locale}/{site}
 *   → https://{tenant}.{dc}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
 * Returns null when the URL isn't a recognisable Workday board.
 */
export function workdayJobsUrl(boardUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(boardUrl);
  } catch {
    return null;
  }
  if (!/\.myworkdayjobs\.com$/i.test(parsed.hostname)) return null;
  const tenant = parsed.hostname.split(".")[0];
  if (!tenant || tenant === "www") return null;
  const segments = parsed.pathname.split("/").filter(Boolean);
  // Last path segment is the site id (locale precedes it when present).
  const site = segments[segments.length - 1];
  if (!site) return null;
  return `https://${parsed.hostname}/wday/cxs/${tenant}/${site}/jobs`;
}

export function normalizeWorkday(data: unknown, boardUrl: string): Listing[] {
  const postings = (data as { jobPostings?: unknown[] })?.jobPostings;
  if (!Array.isArray(postings)) return [];
  let origin = "";
  try {
    origin = new URL(boardUrl).origin;
  } catch {
    origin = "";
  }
  return postings
    .map((p): Listing | null => {
      const post = p as {
        title?: string;
        externalPath?: string;
        locationsText?: string;
        postedOn?: string;
      };
      if (!post.title || !post.externalPath) return null;
      return {
        title: post.title,
        location: post.locationsText ?? null,
        url: origin ? `${origin}${post.externalPath}` : post.externalPath,
        postedAt: null, // Workday gives relative strings ("Posted 3 days ago")
      };
    })
    .filter((l): l is Listing => l !== null);
}

async function fetchWorkdayListings(boardUrl: string): Promise<Listing[]> {
  const apiUrl = workdayJobsUrl(boardUrl);
  if (!apiUrl) return [];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(apiUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
      },
      body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0 }),
    });
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    return normalizeWorkday(await res.json(), boardUrl);
  } catch {
    return [];
  }
}

/** ISO-date (YYYY-MM-DD) from an arbitrary date string, or null. */
function normalizeDate(value: unknown): string | null {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Fetch live listings for a resolved ATS. `token` is the board slug for
 * Greenhouse/Lever/Ashby, or the full board URL for Workday. Returns at most
 * `limit` roles (newest-ish first as the ATS returns them). Unknown / unsupported
 * ATS → empty array (caller falls back to a careers-site link).
 */
export async function fetchListings(
  atsType: AtsType | null,
  token: string | null,
  limit = 12
): Promise<Listing[]> {
  if (!atsType || !token) return [];
  let listings: Listing[] = [];
  switch (atsType) {
    case "greenhouse":
      listings = normalizeGreenhouse(await fetchJson(greenhouseJobsUrl(token)));
      break;
    case "lever":
      listings = normalizeLever(await fetchJson(leverJobsUrl(token)));
      break;
    case "ashby":
      listings = normalizeAshby(await fetchJson(ashbyJobsUrl(token)));
      break;
    case "workday":
      listings = await fetchWorkdayListings(token);
      break;
    default:
      return []; // smartrecruiters / other — no in-app feed yet
  }
  return listings.slice(0, limit);
}

/**
 * The JSON-API host families we can confirm a board against, keyed by ATS. Only
 * Greenhouse/Lever/Ashby have a cheap public "list jobs by token" endpoint we
 * can probe by slug; Workday needs the full board URL so it isn't slug-probable.
 */
export const SLUG_PROBE_ATS: Extract<
  AtsType,
  "greenhouse" | "lever" | "ashby"
>[] = ["greenhouse", "lever", "ashby"];

/**
 * Confirm a candidate ATS board actually exists and has open roles, by hitting
 * its public jobs API. Returns the role count (0 = board missing/empty). Used to
 * *verify* a guessed/AI-supplied token before we trust it — a 404 or empty board
 * means the token is wrong. Cheap: one JSON GET, bounded by FETCH_TIMEOUT_MS.
 */
export async function countAtsJobs(
  atsType: AtsType,
  token: string
): Promise<number> {
  switch (atsType) {
    case "greenhouse":
      return normalizeGreenhouse(await fetchJson(greenhouseJobsUrl(token)))
        .length;
    case "lever":
      return normalizeLever(await fetchJson(leverJobsUrl(token))).length;
    case "ashby":
      return normalizeAshby(await fetchJson(ashbyJobsUrl(token))).length;
    case "workday":
      return (await fetchWorkdayListings(token)).length;
    default:
      return 0;
  }
}
