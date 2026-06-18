/**
 * Resolve a registered sponsor name (e.g. "MONZO BANK LIMITED") to its real
 * careers page. The gov.uk register has no website column, so we:
 *   1. probe public ATS boards (Greenhouse/Lever/Ashby) for the brand slug and
 *      keep the first that actually returns open roles — a *verified* feed,
 *   2. guess likely domains from the cleaned brand name and probe which resolve,
 *      detecting a known ATS on the live careers page,
 *   3. (in the route) let an AI web search resolve brand ≠ legal-name cases.
 *
 * The pure parts — name cleaning, candidate generation, ATS detection, and the
 * deterministic↔AI merge — live here and are unit-tested. The network probes
 * accept an injectable verifier so they're testable without live HTTP.
 */

import type {
  AtsType,
  CareersResolution,
  Confidence,
} from "@/app/types/careers";
import { countAtsJobs, SLUG_PROBE_ATS } from "@/app/lib/atsListings";

const PROBE_TIMEOUT_MS = 4000;

/** Default board verifier — the live ATS jobs-count call. */
const defaultVerify = (atsType: AtsType, token: string): Promise<number> =>
  countAtsJobs(atsType, token);

/** Legal-form and qualifier tokens to drop from a registered name before
 *  turning it into a brand slug. Order-independent; matched as whole words. */
const NOISE_WORDS = new Set([
  "limited",
  "ltd",
  "llp",
  "plc",
  "uk",
  "gb",
  "group",
  "holdings",
  "holding",
  "international",
  "global",
  "services",
  "solutions",
  "technologies",
  "technology",
  "the",
  "co",
  "company",
  "inc",
  "corporation",
  "corp",
]);

/**
 * Clean a registered legal name into a lowercase brand slug suitable for a
 * domain guess: drop parenthesised qualifiers and legal-form noise words, keep
 * the meaningful leading words. "BYTEDANCE (UK) LTD" → "bytedance";
 * "MONZO BANK LIMITED" → "monzobank".
 */
export function brandSlug(registeredName: string): string {
  const withoutParens = registeredName.replace(/\([^)]*\)/g, " ");
  const words = withoutParens
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !NOISE_WORDS.has(w));
  return words.join("");
}

/**
 * Candidate domains to probe, most-likely first. Uses the full cleaned slug and,
 * when the name has multiple meaningful words, the first word alone (companies
 * often own the short domain). Deduplicated, capped for a bounded probe budget.
 */
export function candidateDomains(registeredName: string): string[] {
  const withoutParens = registeredName.replace(/\([^)]*\)/g, " ");
  const words = withoutParens
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !NOISE_WORDS.has(w));

  const slug = words.join("");
  const stems = new Set<string>();
  if (slug) stems.add(slug);
  if (words.length > 1 && words[0].length >= 3) stems.add(words[0]);

  const tlds = [".com", ".co.uk", ".io", ".ai"];
  const domains: string[] = [];
  for (const stem of stems) {
    for (const tld of tlds) domains.push(`${stem}${tld}`);
  }
  // Bound the probe budget — first stem covers the common case.
  return domains.slice(0, 6);
}

/** Detect a known ATS (and its board token) from a careers/jobs URL. Pure. */
export function detectAts(
  url: string
): { atsType: AtsType; atsToken: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  const segments = parsed.pathname.split("/").filter(Boolean);

  // boards.greenhouse.io/<token> | <token>.greenhouse.io
  if (host.endsWith("greenhouse.io")) {
    const token = host === "boards.greenhouse.io" ? segments[0] : host.split(".")[0];
    if (token && token !== "boards") return { atsType: "greenhouse", atsToken: token };
  }
  // jobs.lever.co/<token>
  if (host.endsWith("lever.co") && segments[0]) {
    return { atsType: "lever", atsToken: segments[0] };
  }
  // jobs.ashbyhq.com/<token>
  if (host.endsWith("ashbyhq.com") && segments[0]) {
    return { atsType: "ashby", atsToken: segments[0] };
  }
  // <tenant>.<dc>.myworkdayjobs.com/... — token is the whole board URL
  if (host.endsWith("myworkdayjobs.com") && host.split(".")[0] !== "www") {
    return { atsType: "workday", atsToken: url };
  }
  // careers.smartrecruiters.com/<token> | <token> path
  if (host.endsWith("smartrecruiters.com") && segments[0]) {
    return { atsType: "smartrecruiters", atsToken: segments[0] };
  }
  return null;
}

/** A probe outcome for one candidate URL. */
interface Probe {
  url: string;
  ats: { atsType: AtsType; atsToken: string } | null;
}

/**
 * Deterministic resolution: first try the verified ATS-board probe (best — gives
 * live roles), then fall back to probing candidate homepages + their /careers
 * paths. Network-bound; returns null when nothing resolves (or when run offline).
 *
 * `verify` is injectable for tests; defaults to the live ATS jobs-count call.
 */
export async function probeCandidates(
  registeredName: string,
  verify: (atsType: AtsType, token: string) => Promise<number> = defaultVerify
): Promise<{
  homepageUrl: string | null;
  careersUrl: string | null;
  ats: Probe["ats"];
} | null> {
  // 1. Verified ATS board (Greenhouse/Lever/Ashby by slug) — the strongest hit:
  //    a real feed with open roles, not a marketing page.
  const board = await probeAtsBoards(registeredName, verify);
  if (board) {
    return {
      homepageUrl: null,
      careersUrl: board.careersUrl,
      ats: { atsType: board.atsType, atsToken: board.atsToken },
    };
  }

  // 2. Homepage probe — find a live brand domain and its careers page.
  const domains = candidateDomains(registeredName);
  for (const domain of domains) {
    const homepage = `https://${domain}`;
    if (!(await resolves(homepage))) continue;

    for (const path of ["/careers", "/jobs", "/careers/jobs"]) {
      const careers = `https://${domain}${path}`;
      if (await resolves(careers)) {
        return { homepageUrl: homepage, careersUrl: careers, ats: detectAts(careers) };
      }
    }
    // Homepage resolved but no obvious careers path — still useful.
    return { homepageUrl: homepage, careersUrl: null, ats: null };
  }
  return null;
}

async function resolves(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

/** Token slugs to try for a brand: the full joined slug + the first word, plus
 *  hyphenated variants ATS boards commonly use. Deduped, order = most-likely. */
export function atsTokenCandidates(registeredName: string): string[] {
  const withoutParens = registeredName.replace(/\([^)]*\)/g, " ");
  const words = withoutParens
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !NOISE_WORDS.has(w));
  if (words.length === 0) return [];

  const tokens = new Set<string>();
  tokens.add(words.join("")); // "monzobank"
  tokens.add(words[0]); // "monzo"
  if (words.length > 1) tokens.add(words.join("-")); // "monzo-bank"
  return [...tokens].filter((t) => t.length >= 2).slice(0, 4);
}

/**
 * Probe the public ATS boards (Greenhouse/Lever/Ashby) for this company's likely
 * token slugs and return the first board that actually returns open roles —
 * a *verified* ATS hit (not a guess). This catches the very common case where
 * the company name is the board slug (e.g. "Monzo" → boards.greenhouse.io/monzo),
 * which the homepage probe alone misses. `verify` defaults to the live
 * `countAtsJobs`; injectable for tests.
 */
export async function probeAtsBoards(
  registeredName: string,
  verify: (atsType: AtsType, token: string) => Promise<number> = defaultVerify
): Promise<{ atsType: AtsType; atsToken: string; careersUrl: string } | null> {
  const tokens = atsTokenCandidates(registeredName);
  for (const token of tokens) {
    for (const atsType of SLUG_PROBE_ATS) {
      const count = await verify(atsType, token);
      if (count > 0) {
        return { atsType, atsToken: token, careersUrl: atsBoardUrl(atsType, token) };
      }
    }
  }
  return null;
}

/** Human-facing board URL for a verified ATS token (the "all roles" page). */
export function atsBoardUrl(atsType: AtsType, token: string): string {
  switch (atsType) {
    case "greenhouse":
      return `https://boards.greenhouse.io/${token}`;
    case "lever":
      return `https://jobs.lever.co/${token}`;
    case "ashby":
      return `https://jobs.ashbyhq.com/${token}`;
    case "smartrecruiters":
      return `https://careers.smartrecruiters.com/${token}`;
    default:
      return "";
  }
}

/** What the AI web-search layer is allowed to contribute. */
export interface AiCareers {
  careersUrl: string | null;
  homepageUrl: string | null;
  atsType: AtsType | null;
  atsToken: string | null;
  confidence: Confidence | null;
}

/** What the deterministic probe produced (subset of a resolution). */
export interface GuessCareers {
  careersUrl: string | null;
  homepageUrl: string | null;
  atsType: AtsType | null;
  atsToken: string | null;
}

/**
 * Merge the deterministic guess with the optional AI result into a final
 * resolution. AI overrides a field only when it actually supplies one — it never
 * clobbers a value the guess already resolved (same rule as app/api/parse-url).
 * `status` is "ok" if anything at all was found, else "unresolved".
 */
export function mergeResolution(
  name: string,
  guess: GuessCareers | null,
  ai: AiCareers | null
): CareersResolution {
  const careersUrl = ai?.careersUrl || guess?.careersUrl || null;
  const homepageUrl = ai?.homepageUrl || guess?.homepageUrl || null;
  // Keep ATS type/token together so the token always matches the type.
  let atsType = guess?.atsType ?? null;
  let atsToken = guess?.atsToken ?? null;
  if (ai?.atsType && ai.atsToken) {
    atsType = ai.atsType;
    atsToken = ai.atsToken;
  } else if (!atsType && ai?.atsType) {
    atsType = ai.atsType;
    atsToken = ai.atsToken ?? null;
  }

  const found = Boolean(careersUrl || homepageUrl);
  return {
    name,
    careersUrl,
    homepageUrl,
    atsType,
    atsToken,
    confidence: ai?.confidence ?? (guess?.careersUrl ? "high" : found ? "low" : null),
    status: found ? "ok" : "unresolved",
    aiAssisted: Boolean(ai),
  };
}
