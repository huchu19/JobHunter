import { describe, it, expect } from "vitest";
import {
  scoreRole,
  scoreRoles,
  rankEmployers,
  type ScoredRole,
} from "../app/lib/roleMatcher";
import type { ProfileSignals } from "../app/lib/sponsorMatcher";
import type { FeedRole } from "../app/types/careers";

const signals: ProfileSignals = {
  keywords: ["python", "machine learning", "data"],
  salaryMin: 60000,
  isTechProfile: true,
};

const role = (
  title: string,
  company = "Acme",
  location: string | null = "London",
  tracked = false
): FeedRole => ({
  title,
  company,
  location,
  url: `https://example.com/${title.replace(/\s/g, "-")}-${company}`,
  postedAt: null,
  atsType: "greenhouse",
  tracked,
});

describe("scoreRole", () => {
  it("rewards direct skill hits in the title most", () => {
    const strong = scoreRole(signals, role("Machine Learning Engineer"));
    const weak = scoreRole(signals, role("Office Manager"));
    expect(strong.score).toBeGreaterThan(weak.score);
    expect(strong.reasons.join(" ")).toMatch(/machine learning/);
  });

  it("gives a generic tech role some credit even without a keyword", () => {
    const r = scoreRole(signals, role("Backend Engineer"));
    expect(r.score).toBeGreaterThan(0);
    expect(r.reasons.some((x) => /tech role|matches/.test(x))).toBe(true);
  });

  it("flags early-career roles", () => {
    const r = scoreRole(signals, role("Graduate Data Scientist"));
    expect(r.reasons).toContain("early-career");
  });

  it("a totally unrelated non-tech role scores ~0", () => {
    const plain: ProfileSignals = {
      keywords: ["python"],
      salaryMin: null,
      isTechProfile: false,
    };
    // Non-London so no location point; no keyword; not a tech profile.
    expect(scoreRole(plain, role("Barista", "Cafe", "Paris")).score).toBe(0);
  });

  it("adds a London/UK location point", () => {
    const london = scoreRole(signals, role("Data Engineer", "Acme", "London"));
    const remote = scoreRole(signals, role("Data Engineer", "Acme", "Tokyo"));
    expect(london.score).toBe(remote.score + 1);
  });
});

describe("scoreRoles", () => {
  it("filters below minScore and sorts best-first", () => {
    const roles = [
      role("Machine Learning Engineer"), // strong
      role("Receptionist", "Acme", "Paris"), // ~0 → filtered
      role("Data Analyst"), // medium
    ];
    const out = scoreRoles(signals, roles);
    expect(out.map((r) => r.role.title)).toEqual([
      "Machine Learning Engineer",
      "Data Analyst",
    ]);
    expect(out[0].score).toBeGreaterThanOrEqual(out[1].score);
  });
});

describe("rankEmployers", () => {
  it("sums role scores per company and ranks employers", () => {
    const scored: ScoredRole[] = scoreRoles(signals, [
      role("Machine Learning Engineer", "DataCo"),
      role("Data Scientist", "DataCo"),
      role("Backend Engineer", "WebCo"),
    ]);
    const employers = rankEmployers(scored);
    // DataCo has two strong roles → outranks WebCo's single role.
    expect(employers[0].company).toBe("DataCo");
    expect(employers[0].roles.length).toBe(2);
    expect(employers[0].score).toBeGreaterThan(employers[1].score);
  });

  it("sorts tracked companies first on a tie", () => {
    const scored: ScoredRole[] = scoreRoles(signals, [
      role("Data Engineer", "Untracked"),
      role("Data Engineer", "Tracked", "London", true),
    ]);
    const employers = rankEmployers(scored);
    expect(employers[0].company).toBe("Tracked");
    expect(employers[0].tracked).toBe(true);
  });

  it("caps roles per employer and limits employer count", () => {
    const many: FeedRole[] = Array.from({ length: 10 }, (_, i) =>
      role(`Data Engineer ${i}`, "BigCo")
    );
    const scored = scoreRoles(signals, many);
    const employers = rankEmployers(scored, { limit: 5, roleCap: 3 });
    expect(employers[0].roles.length).toBe(3);
    expect(employers.length).toBeLessThanOrEqual(5);
  });

  it("is empty-safe", () => {
    expect(rankEmployers([])).toEqual([]);
  });
});
