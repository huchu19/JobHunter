// Shared shape for the single application profile. Keeping the field list in one
// place keeps the API route, the resume parser, and the form in sync.

export interface Profile {
  id: string;
  // Contact
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  websiteUrl: string | null;
  // Common application answers
  workAuthorization: string | null;
  needsSponsorship: boolean | null;
  rightToWork: string | null;
  noticePeriod: string | null;
  salaryExpectation: string | null;
  earliestStart: string | null;
  yearsExperience: string | null;
  currentTitle: string | null;
  // Free-text blocks
  summary: string | null;
  skills: string | null;
  education: string | null;
  workHistory: string | null;
  // Resume bookkeeping
  resumeText: string | null;
  resumeFileName: string | null;
  resumeParsedAt: Date | string | null;
  updatedAt: Date | string;
}

// Editable fields the client may send on save (everything except server-managed bookkeeping).
export const PROFILE_TEXT_FIELDS = [
  "fullName",
  "email",
  "phone",
  "location",
  "linkedinUrl",
  "githubUrl",
  "portfolioUrl",
  "websiteUrl",
  "workAuthorization",
  "rightToWork",
  "noticePeriod",
  "salaryExpectation",
  "earliestStart",
  "yearsExperience",
  "currentTitle",
  "summary",
  "skills",
  "education",
  "workHistory",
] as const;

export type ProfileTextField = (typeof PROFILE_TEXT_FIELDS)[number];

// Fields the resume parser is asked to extract (text fields + the sponsorship boolean).
export type ParsedProfile = Partial<
  Record<ProfileTextField, string> & { needsSponsorship: boolean }
>;

export const SINGLETON_ID = "singleton";
