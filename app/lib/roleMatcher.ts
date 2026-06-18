/**
 * Score real open roles (from the careers feed) against the saved profile, then
 * aggregate them into ranked employers. This is what powers the reworked
 * Matches page: instead of scoring 35k sponsor *names* (which surfaces junk
 * consultancies), we rank the actual openings the user can apply to and group
 * them by company.
 *
 * Reuses the profile signals from `sponsorMatcher` (skills/title keywords,
 * salary). Pure and unit-tested; the API route feeds it live roles.
 */

import type { ProfileSignals } from "@/app/lib/sponsorMatcher";
import type { FeedRole, AtsType } from "@/app/types/careers";

/** A role scored against the profile, with human-readable reasons. */
export interface ScoredRole {
  role: FeedRole;
  score: number;
  reasons: string[];
}

/** An employer ranked by the strength + count of its matching roles. */
export interface EmployerMatch {
  company: string;
  atsType: AtsType;
  tracked: boolean;
  /** Sum of role scores — the employer's overall fit. */
  score: number;
  /** Matching roles, best-first. */
  roles: ScoredRole[];
}

/** Seniority cues in a role title and how they fit a profile. */
const SENIORITY = {
  junior: ["graduate", "grad", "junior", "entry", "intern", "placement", "apprentice", "trainee"],
  senior: ["senior", "staff", "principal", "lead", "head of", "director", "vp ", "chief"],
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Score one role against the profile. The title is the strongest signal — a
 * direct skill/keyword hit there means the job is literally about that skill.
 * Adds smaller signals for a generic tech-role match and London location.
 */
export function scoreRole(
  signals: ProfileSignals,
  role: FeedRole
): { score: number; reasons: string[] } {
  const title = role.title.toLowerCase();
  const loc = (role.location ?? "").toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  // Direct keyword hits in the title (the job function itself). A specific,
  // multi-word skill ("machine learning") is a stronger signal than a broad
  // single word ("data"), so weight by specificity: +6 for a multi-word skill,
  // +5 for a normal word, +4 for a short/generic one.
  const hitKeywords: string[] = [];
  for (const keyword of signals.keywords) {
    if (keyword.length < 2) continue;
    if (new RegExp(`\\b${escapeRegExp(keyword)}`).test(title)) {
      const weight = keyword.includes(" ") ? 6 : keyword.length <= 4 ? 4 : 5;
      score += weight;
      hitKeywords.push(keyword);
    }
  }
  if (hitKeywords.length > 0) {
    reasons.push(`matches ${hitKeywords.slice(0, 3).join(", ")}`);
  }

  // Generic engineering/tech role for a tech profile, even without a keyword hit.
  const TECH_ROLE = ["engineer", "developer", "scientist", "analyst", "data", "software", "machine learning", "ml", "ai", "devops", "platform", "backend", "frontend", "full stack", "research"];
  if (signals.isTechProfile && TECH_ROLE.some((t) => title.includes(t))) {
    score += 2;
    if (reasons.length === 0) reasons.push("tech role");
  }

  // Early-career fit: a grad/junior profile (no senior cues) likes grad roles.
  if (SENIORITY.junior.some((j) => title.includes(j))) {
    score += 1;
    reasons.push("early-career");
  }

  // London bias — the whole app is London-Skilled-Worker oriented.
  if (loc.includes("london") || loc.includes("uk") || loc.includes("united kingdom")) {
    score += 1;
  }

  return { score, reasons };
}

/**
 * Score every role and keep those above `minScore`. Best-first.
 */
export function scoreRoles(
  signals: ProfileSignals,
  roles: FeedRole[],
  minScore = 1
): ScoredRole[] {
  return roles
    .map((role) => {
      const { score, reasons } = scoreRole(signals, role);
      return { role, score, reasons };
    })
    .filter((r) => r.score >= minScore)
    .sort(
      (a, b) =>
        b.score - a.score || a.role.title.localeCompare(b.role.title)
    );
}

/**
 * Aggregate scored roles into ranked employers. An employer's score is the sum
 * of its matching role scores (so a company with several strong-fit roles
 * outranks one with a single weak match). Within an employer, roles are
 * best-first; `roleCap` bounds how many roles each employer carries.
 *
 * Ties: a company the user already tracks sorts first (you're already engaged),
 * then by score, then name.
 */
export function rankEmployers(
  scored: ScoredRole[],
  options: { limit?: number; roleCap?: number } = {}
): EmployerMatch[] {
  const limit = options.limit ?? 10;
  const roleCap = options.roleCap ?? 5;

  const byCompany = new Map<string, EmployerMatch>();
  for (const sr of scored) {
    const key = sr.role.company.toLowerCase();
    const existing = byCompany.get(key);
    if (existing) {
      existing.score += sr.score;
      existing.roles.push(sr);
    } else {
      byCompany.set(key, {
        company: sr.role.company,
        atsType: sr.role.atsType,
        tracked: sr.role.tracked,
        score: sr.score,
        roles: [sr],
      });
    }
  }

  const employers = [...byCompany.values()];
  for (const e of employers) {
    e.roles.sort((a, b) => b.score - a.score);
    e.roles = e.roles.slice(0, roleCap);
  }

  return employers
    .sort(
      (a, b) =>
        Number(b.tracked) - Number(a.tracked) ||
        b.score - a.score ||
        a.company.localeCompare(b.company)
    )
    .slice(0, limit);
}
