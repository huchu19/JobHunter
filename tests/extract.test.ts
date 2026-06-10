import { describe, it, expect } from "vitest";
import {
  detectBoard,
  isApplicationLikeUrl,
  parseJobFromTitle,
  matchField,
  firstName,
  lastName,
  sponsorshipAnswer,
  normaliseDashboardUrl,
  DEFAULT_DASHBOARD_URL,
  type ExtensionProfile,
  type FieldHints,
} from "@/extension/src/extract";

const PROFILE: ExtensionProfile = {
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  phone: "+44 7000 000000",
  location: "London, UK",
  linkedinUrl: "https://linkedin.com/in/ada",
  githubUrl: "https://github.com/ada",
  portfolioUrl: "https://ada.dev/work",
  websiteUrl: "https://ada.dev",
  workAuthorization: "Requires Skilled Worker visa",
  needsSponsorship: true,
  rightToWork: "No (sponsorship required)",
  noticePeriod: "1 month",
  salaryExpectation: "£65,000",
  earliestStart: "Immediately",
  yearsExperience: "3",
  currentTitle: "Software Engineer",
  summary: "Backend engineer focused on data systems.",
  skills: "TypeScript, Python, PostgreSQL",
  education: "BSc Computer Science",
  workHistory: "Engineer at Foo (2022–present)",
};

describe("detectBoard", () => {
  it("identifies each supported board", () => {
    expect(detectBoard("boards.greenhouse.io")).toBe("greenhouse");
    expect(detectBoard("jobs.lever.co")).toBe("lever");
    expect(detectBoard("www.linkedin.com")).toBe("linkedin");
    expect(detectBoard("acme.wd5.myworkdayjobs.com")).toBe("workday");
    expect(detectBoard("apply.workable.com")).toBe("workable");
  });

  it("detects white-labelled Workday by path", () => {
    expect(detectBoard("careers.acme.com", "/en-US/wday/job/123")).toBe(
      "workday"
    );
  });

  it("falls back to generic for unknown hosts", () => {
    expect(detectBoard("careers.acme.com", "/jobs/123")).toBe("generic");
  });
});

describe("isApplicationLikeUrl", () => {
  it("matches job/career/apply style paths", () => {
    expect(isApplicationLikeUrl("/jobs/senior-engineer")).toBe(true);
    expect(isApplicationLikeUrl("/careers/123")).toBe(true);
    expect(isApplicationLikeUrl("/apply")).toBe(true);
    expect(isApplicationLikeUrl("/positions/eng")).toBe(true);
  });

  it("ignores unrelated paths", () => {
    expect(isApplicationLikeUrl("/about")).toBe(false);
    expect(isApplicationLikeUrl("/blog/hello")).toBe(false);
  });
});

describe("parseJobFromTitle", () => {
  it("parses Greenhouse 'Job Application for X at Y'", () => {
    expect(
      parseJobFromTitle("Job Application for Senior Engineer at Acme", "greenhouse")
    ).toEqual({ role: "Senior Engineer", company: "Acme" });
  });

  it("parses Lever 'Company - Role'", () => {
    expect(parseJobFromTitle("Acme - Senior Engineer", "lever")).toEqual({
      company: "Acme",
      role: "Senior Engineer",
    });
  });

  it("parses LinkedIn '(99+) Role | Company | LinkedIn'", () => {
    expect(
      parseJobFromTitle("(99+) Senior Engineer | Acme | LinkedIn", "linkedin")
    ).toEqual({ role: "Senior Engineer", company: "Acme" });
  });

  it("parses Workday 'Role | Company Careers'", () => {
    expect(
      parseJobFromTitle("Senior Engineer | Acme Careers", "workday")
    ).toEqual({ role: "Senior Engineer", company: "Acme" });
  });

  it("parses generic 'Role at Company'", () => {
    expect(parseJobFromTitle("Data Scientist at Globex", "generic")).toEqual({
      role: "Data Scientist",
      company: "Globex",
    });
  });

  it("handles a single-chunk title gracefully", () => {
    expect(parseJobFromTitle("Engineer", "generic")).toEqual({
      role: "Engineer",
      company: null,
    });
  });

  it("returns nulls for an empty title", () => {
    expect(parseJobFromTitle("", "generic")).toEqual({
      role: null,
      company: null,
    });
  });
});

describe("name splitting", () => {
  it("splits first and last names", () => {
    expect(firstName("Ada Lovelace")).toBe("Ada");
    expect(lastName("Ada Lovelace")).toBe("Lovelace");
  });

  it("handles multi-part surnames", () => {
    expect(firstName("Ada King Lovelace")).toBe("Ada");
    expect(lastName("Ada King Lovelace")).toBe("King Lovelace");
  });

  it("handles a single name and null", () => {
    expect(firstName("Ada")).toBe("Ada");
    expect(lastName("Ada")).toBeNull();
    expect(firstName(null)).toBeNull();
    expect(lastName(null)).toBeNull();
  });
});

describe("matchField", () => {
  const m = (hints: FieldHints) => matchField(hints, PROFILE);

  it("maps email by input type and by label", () => {
    expect(m({ type: "email" })).toBe(PROFILE.email);
    expect(m({ label: "Email address" })).toBe(PROFILE.email);
  });

  it("maps phone by autocomplete and by label", () => {
    expect(m({ autocomplete: "tel" })).toBe(PROFILE.phone);
    expect(m({ label: "Mobile number" })).toBe(PROFILE.phone);
  });

  it("maps platform URLs to the right field", () => {
    expect(m({ label: "LinkedIn URL" })).toBe(PROFILE.linkedinUrl);
    expect(m({ label: "GitHub" })).toBe(PROFILE.githubUrl);
    expect(m({ label: "Portfolio link" })).toBe(PROFILE.portfolioUrl);
    expect(m({ label: "Personal website" })).toBe(PROFILE.websiteUrl);
  });

  it("splits full name into first/last fields", () => {
    expect(m({ label: "First Name" })).toBe("Ada");
    expect(m({ name: "last_name" })).toBe("Lovelace");
    expect(m({ label: "Full name" })).toBe(PROFILE.fullName);
  });

  it("does not treat company name as the applicant name", () => {
    expect(m({ label: "Company name" })).toBeNull();
  });

  it("maps common application answers", () => {
    expect(m({ label: "Current job title" })).toBe(PROFILE.currentTitle);
    expect(m({ label: "Years of experience" })).toBe(PROFILE.yearsExperience);
    expect(m({ label: "Salary expectation" })).toBe(PROFILE.salaryExpectation);
    expect(m({ label: "Notice period" })).toBe(PROFILE.noticePeriod);
    expect(m({ label: "Earliest start date" })).toBe(PROFILE.earliestStart);
    expect(m({ label: "Right to work in the UK" })).toBe(PROFILE.rightToWork);
  });

  it("maps free-text blocks", () => {
    expect(m({ label: "Cover letter" })).toBe(PROFILE.summary);
    expect(m({ label: "Key skills" })).toBe(PROFILE.skills);
  });

  it("returns null for unrecognised fields", () => {
    expect(m({ label: "Favourite colour" })).toBeNull();
  });
});

describe("normaliseDashboardUrl", () => {
  it("adds a scheme when missing and strips trailing slashes", () => {
    expect(normaliseDashboardUrl("localhost:3000")).toBe("http://localhost:3000");
    expect(normaliseDashboardUrl("http://localhost:3000/")).toBe(
      "http://localhost:3000"
    );
    expect(normaliseDashboardUrl("https://app.example.com//")).toBe(
      "https://app.example.com"
    );
  });

  it("falls back to the default for empty input", () => {
    expect(normaliseDashboardUrl("   ")).toBe(DEFAULT_DASHBOARD_URL);
  });
});

describe("sponsorshipAnswer", () => {
  it("returns Yes/No from the boolean", () => {
    expect(sponsorshipAnswer(PROFILE)).toBe("Yes");
    expect(sponsorshipAnswer({ ...PROFILE, needsSponsorship: false })).toBe("No");
  });

  it("returns null when unknown", () => {
    expect(sponsorshipAnswer({ ...PROFILE, needsSponsorship: null })).toBeNull();
  });
});
