import { describe, it, expect } from "vitest";
import {
  parseSalaryNumber,
  parseSalaryRange,
  extractProfileSignals,
  scoreSponsor,
  topSponsorMatches,
  compareSalary,
  SKILLED_WORKER_THRESHOLD,
} from "../app/lib/sponsorMatcher";
import type { Sponsor } from "../app/types/sponsor";

const sponsor = (name: string): Sponsor => ({
  name,
  city: "London",
  rating: "A rating",
  route: "Skilled Worker",
});

describe("parseSalaryNumber", () => {
  it("parses common salary formats", () => {
    expect(parseSalaryNumber("£60k")).toBe(60000);
    expect(parseSalaryNumber("60,000")).toBe(60000);
    expect(parseSalaryNumber("£60k+")).toBe(60000);
    expect(parseSalaryNumber("£62.5k")).toBe(62500);
    expect(parseSalaryNumber("£40-60k")).toBe(40000); // range → lower bound
  });

  it("returns null for empty or non-salary text", () => {
    expect(parseSalaryNumber(null)).toBeNull();
    expect(parseSalaryNumber("")).toBeNull();
    expect(parseSalaryNumber("negotiable")).toBeNull();
    expect(parseSalaryNumber("2")).toBeNull(); // years, not money
  });
});

describe("parseSalaryRange", () => {
  it("parses a k-suffixed range, scaling the bare lower bound", () => {
    expect(parseSalaryRange("£60-80k")).toEqual({ min: 60000, max: 80000 });
    expect(parseSalaryRange("£60–80k")).toEqual({ min: 60000, max: 80000 });
  });

  it("parses a single figure as min == max", () => {
    expect(parseSalaryRange("£65,000")).toEqual({ min: 65000, max: 65000 });
  });

  it("returns null when there's nothing parseable", () => {
    expect(parseSalaryRange("competitive")).toBeNull();
    expect(parseSalaryRange(null)).toBeNull();
  });
});

describe("extractProfileSignals", () => {
  it("spec scenario: Python, 2 yrs, £60k+ produces tech signals", () => {
    const signals = extractProfileSignals({
      skills: "Python, SQL, Machine Learning",
      currentTitle: "Software Engineer",
      salaryExpectation: "£60k+",
    });
    expect(signals.keywords).toContain("python");
    expect(signals.keywords).toContain("machine learning");
    expect(signals.isTechProfile).toBe(true);
    expect(signals.salaryMin).toBe(60000);
  });

  it("finds known keywords in the title/summary prose", () => {
    const signals = extractProfileSignals({
      summary: "DevOps engineer working with AWS and Kubernetes",
    });
    expect(signals.keywords).toEqual(
      expect.arrayContaining(["devops", "aws", "kubernetes"])
    );
  });

  it("yields no signals for an empty profile", () => {
    const signals = extractProfileSignals({});
    expect(signals.keywords).toHaveLength(0);
    expect(signals.isTechProfile).toBe(false);
    expect(signals.salaryMin).toBeNull();
  });
});

describe("scoreSponsor / topSponsorMatches", () => {
  const pythonProfile = extractProfileSignals({
    skills: "Python, Machine Learning",
    currentTitle: "Software Engineer",
    salaryExpectation: "£60k+",
  });

  it("scores an AI/data company above an unrelated one", () => {
    const ai = scoreSponsor(pythonProfile, sponsor("DeepMind AI Technologies"));
    const cafe = scoreSponsor(pythonProfile, sponsor("Bella Roma Restaurants"));
    expect(ai.score).toBeGreaterThan(cafe.score);
    expect(cafe.score).toBe(0);
    expect(ai.reasons.length).toBeGreaterThan(0);
  });

  it("rewards the skill appearing directly in the company name", () => {
    const direct = scoreSponsor(
      extractProfileSignals({ skills: "robotics" }),
      sponsor("Acme Robotics Limited")
    );
    expect(direct.reasons.some((r) => r.includes("in company name"))).toBe(true);
  });

  it("spec scenario: matcher surfaces relevant sponsors, top-N, excluding tracked", () => {
    const sponsors = [
      sponsor("Bella Roma Restaurants"),
      sponsor("Quantum Data Analytics Ltd"),
      sponsor("London AI Labs"),
      sponsor("Smith & Sons Plumbing"),
      sponsor("CloudTech Software Limited"),
    ];
    const matches = topSponsorMatches(pythonProfile, sponsors, {
      limit: 2,
      exclude: new Set(["London AI Labs"]),
    });
    expect(matches).toHaveLength(2);
    const names = matches.map((m) => m.sponsor.name);
    expect(names).not.toContain("London AI Labs"); // excluded (tracked)
    expect(names).not.toContain("Bella Roma Restaurants");
    expect(names).not.toContain("Smith & Sons Plumbing");
    expect(matches[0].score).toBeGreaterThanOrEqual(matches[1].score);
  });

  it("returns nothing for a signal-less profile", () => {
    const empty = extractProfileSignals({});
    expect(
      topSponsorMatches(empty, [sponsor("London AI Labs")], { limit: 10 })
    ).toHaveLength(0);
  });
});

describe("compareSalary", () => {
  it("checks the expectation against the visa threshold", () => {
    const cmp = compareSalary(60000, ["£55-65k", "£70,000"]);
    expect(cmp.meetsThreshold).toBe(true);
    expect(cmp.threshold).toBe(SKILLED_WORKER_THRESHOLD);
    expect(cmp.trackedAvgMin).toBe(62500); // (55000 + 70000) / 2
    expect(cmp.trackedCount).toBe(2);
  });

  it("flags an expectation under the threshold", () => {
    expect(compareSalary(30000, []).meetsThreshold).toBe(false);
  });

  it("handles missing expectation and unparseable salaries", () => {
    const cmp = compareSalary(null, ["competitive", null]);
    expect(cmp.meetsThreshold).toBeNull();
    expect(cmp.trackedAvgMin).toBeNull();
    expect(cmp.trackedCount).toBe(0);
  });
});
