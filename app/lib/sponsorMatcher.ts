import { classifyTech } from "@/app/lib/techClassifier";
import type { Sponsor } from "@/app/types/sponsor";

/**
 * Deterministic profile→sponsor matching for the "Top sponsors for your
 * profile" view. Scores how well a sponsor's company-name signals (via the
 * existing techClassifier) line up with the user's skills, title, and
 * summary. Pure and unit-tested; the optional AI re-rank layered on top in
 * the API route is exactly that — optional.
 */

export interface ProfileSignals {
  /** Normalised skill/title tokens, e.g. ["python", "machine learning"]. */
  keywords: string[];
  /** Minimum acceptable salary parsed from the profile, in GBP. */
  salaryMin: number | null;
  /** Whether the profile reads as a tech profile at all. */
  isTechProfile: boolean;
}

export interface SponsorMatch {
  sponsor: Sponsor;
  score: number;
  reasons: string[];
}

/**
 * Profile keyword → company-name classifier terms it has affinity with.
 * Terms must be ones `classifyTech` can actually surface in `matchedTerms`.
 */
const SKILL_AFFINITIES: Record<string, string[]> = {
  python: ["data", "analytics", "ai", "machine learning", "labs", "software"],
  "machine learning": ["ai", "machine learning", "deep learning", "data", "intelligence", "labs"],
  ml: ["ai", "machine learning", "deep learning", "data", "intelligence"],
  ai: ["ai", "machine learning", "deep learning", "intelligence", "labs"],
  "data science": ["data", "analytics", "ai", "intelligence", "machine learning"],
  data: ["data", "analytics", "intelligence", "platform"],
  sql: ["data", "analytics", "intelligence"],
  java: ["software", "systems", "technologies", "platform"],
  typescript: ["software", "digital", "tech", "platform"],
  javascript: ["software", "digital", "tech", "platform"],
  react: ["software", "digital", "tech", "platform"],
  frontend: ["digital", "tech", "platform", "software"],
  backend: ["software", "systems", "platform", "cloud", "api"],
  "node.js": ["software", "platform", "api", "tech"],
  go: ["cloud", "systems", "platform", "software"],
  rust: ["systems", "software", "labs"],
  "c++": ["systems", "software", "robotics", "labs"],
  devops: ["cloud", "devops", "computing", "systems", "platform"],
  cloud: ["cloud", "computing", "platform", "saas"],
  aws: ["cloud", "computing", "platform", "saas"],
  kubernetes: ["cloud", "devops", "platform", "computing"],
  security: ["cyber", "intelligence", "systems"],
  cybersecurity: ["cyber", "intelligence", "systems"],
  fintech: ["fintech", "platform", "digital"],
  finance: ["fintech", "analytics", "data"],
  blockchain: ["blockchain", "fintech", "labs"],
  web3: ["blockchain", "labs"],
  robotics: ["robotics", "iot", "systems", "ai"],
  embedded: ["iot", "robotics", "systems"],
  iot: ["iot", "systems", "cloud"],
  mobile: ["digital", "tech", "software"],
  saas: ["saas", "platform", "cloud", "software"],
};

/** Tokens that mark a profile as tech even without an affinity hit. */
const TECH_PROFILE_HINTS = [
  "engineer",
  "developer",
  "software",
  "programmer",
  "data",
  "devops",
  "full stack",
  "fullstack",
];

/**
 * Parse a salary figure from free text: "£60k", "60,000", "£40–60k" (lower
 * bound), "60k+". Returns GBP/year or null when nothing parses as money
 * ("2 yrs", "negotiable").
 */
export function parseSalaryNumber(text: string | null | undefined): number | null {
  const range = parseSalaryRange(text);
  return range ? Math.round(range.min) : null;
}

/** Min/max of a salary-range string like "£60–80k" or "£65,000". */
export function parseSalaryRange(
  text: string | null | undefined
): { min: number; max: number } | null {
  if (!text) return null;
  const normalized = text.toLowerCase().replace(/,/g, "");
  const matches = [...normalized.matchAll(/(\d+(?:\.\d+)?)\s*(k)?/g)].map(
    (m) => {
      let v = parseFloat(m[1]);
      if (m[2]) v *= 1000;
      return v;
    }
  );

  // "60-80k" leaves the 60 bare — scale any sub-1000 value that sits beside
  // a k-scaled one.
  const scaled = matches.map((v, _i, all) =>
    v < 1000 && all.some((x) => x >= 1000) ? v * 1000 : v
  );
  const valid = scaled.filter((v) => v >= 1000);
  if (valid.length === 0) return null;
  return { min: Math.min(...valid), max: Math.max(...valid) };
}

const SPLIT_PATTERN = /[,;/\n·|]+/;

/** Derive matching signals from the saved profile. */
export function extractProfileSignals(profile: {
  skills?: string | null;
  currentTitle?: string | null;
  summary?: string | null;
  salaryExpectation?: string | null;
}): ProfileSignals {
  const keywords = new Set<string>();

  for (const token of (profile.skills ?? "").split(SPLIT_PATTERN)) {
    const t = token.trim().toLowerCase();
    if (t && t.length <= 40) keywords.add(t);
  }

  // Title + summary: scan for known affinity keys only (free text is noisy).
  const prose = `${profile.currentTitle ?? ""} ${profile.summary ?? ""}`.toLowerCase();
  for (const key of Object.keys(SKILL_AFFINITIES)) {
    if (key.length <= 2) {
      if (new RegExp(`\\b${key}\\b`).test(prose)) keywords.add(key);
    } else if (prose.includes(key)) {
      keywords.add(key);
    }
  }

  const isTechProfile =
    [...keywords].some((k) => k in SKILL_AFFINITIES) ||
    TECH_PROFILE_HINTS.some((hint) => prose.includes(hint));

  return {
    keywords: [...keywords],
    salaryMin: parseSalaryNumber(profile.salaryExpectation),
    isTechProfile,
  };
}

/** Score one sponsor against the profile signals. */
export function scoreSponsor(
  signals: ProfileSignals,
  sponsor: Sponsor
): { score: number; reasons: string[] } {
  if (signals.keywords.length === 0 && !signals.isTechProfile) {
    return { score: 0, reasons: [] };
  }

  const classification = classifyTech(sponsor.name);
  const matchedTerms = new Set(classification.matchedTerms);
  const name = sponsor.name.toLowerCase();

  let score = 0;
  const reasons: string[] = [];

  for (const keyword of signals.keywords) {
    // Direct hit: the skill itself appears in the company name.
    if (keyword.length > 2 && new RegExp(`\\b${escapeRegExp(keyword)}`).test(name)) {
      score += 4;
      reasons.push(`"${keyword}" in company name`);
      continue;
    }

    const affinities = SKILL_AFFINITIES[keyword];
    if (!affinities) continue;
    const hits = affinities.filter((term) => matchedTerms.has(term));
    if (hits.length > 0) {
      score += 2 * hits.length;
      reasons.push(`${keyword} ↔ ${hits.join(", ")}`);
    }
  }

  // Baseline: tech profile, tech company.
  if (signals.isTechProfile && classification.isTech) {
    score += 2;
    if (reasons.length === 0) reasons.push("tech company");
  }

  return { score, reasons };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Top N sponsor matches for a profile, highest score first (tech score, then
 * name, break ties). Companies in `exclude` (e.g. already on the board) are
 * skipped, compared case-insensitively.
 */
export function topSponsorMatches(
  signals: ProfileSignals,
  sponsors: Sponsor[],
  options: { limit?: number; exclude?: Set<string> } = {}
): SponsorMatch[] {
  const limit = options.limit ?? 10;
  const exclude = new Set(
    [...(options.exclude ?? [])].map((n) => n.toLowerCase())
  );

  const matches: SponsorMatch[] = [];
  for (const sponsor of sponsors) {
    if (exclude.has(sponsor.name.toLowerCase())) continue;
    const { score, reasons } = scoreSponsor(signals, sponsor);
    if (score > 0) matches.push({ sponsor, score, reasons });
  }

  return matches
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.sponsor.techScore ?? 0) - (a.sponsor.techScore ?? 0) ||
        a.sponsor.name.localeCompare(b.sponsor.name)
    )
    .slice(0, limit);
}

/** Skilled Worker general salary threshold (gov.uk, as of June 2026). */
export const SKILLED_WORKER_THRESHOLD = 41700;

export interface SalaryComparison {
  /** The user's parsed expectation, GBP/year (null if unparseable/unset). */
  expectation: number | null;
  /** Whether the expectation clears the general visa threshold. */
  meetsThreshold: boolean | null;
  threshold: number;
  /** Average lower-bound of salaries on the user's tracked applications. */
  trackedAvgMin: number | null;
  trackedCount: number;
}

/** Compare the profile salary expectation against the visa threshold and the
 *  salaries seen on tracked applications. */
export function compareSalary(
  salaryMin: number | null,
  trackedSalaries: (string | null | undefined)[]
): SalaryComparison {
  const mins = trackedSalaries
    .map((s) => parseSalaryRange(s)?.min)
    .filter((v): v is number => typeof v === "number");

  return {
    expectation: salaryMin,
    meetsThreshold: salaryMin === null ? null : salaryMin >= SKILLED_WORKER_THRESHOLD,
    threshold: SKILLED_WORKER_THRESHOLD,
    trackedAvgMin:
      mins.length > 0
        ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length)
        : null,
    trackedCount: mins.length,
  };
}
