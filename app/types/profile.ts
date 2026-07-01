// Shared shape for the single application profile. Keeping the field list in one
// place keeps the API route, the resume parser, and the form in sync.

// ---- Structured entry shapes ------------------------------------------------

export interface EducationEntry {
  institution: string;
  degree: string;
  field: string;
  grade: string;
  startYear: string;
  endYear: string;
}

export interface ExperienceEntry {
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  current: boolean;
  location: string;
  description: string;
}

export interface CertificationEntry {
  name: string;
  issuer: string;
  date: string;
  credentialUrl: string;
}

export interface LanguageEntry {
  language: string;
  proficiency: string; // "Native" | "Fluent" | "Conversational" | "Basic"
}

export interface ProjectEntry {
  name: string;
  description: string;
  url: string;
  technologies: string;
}

// ---- Main profile interface --------------------------------------------------

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
  // Structured entries (stored as JSON strings in DB)
  educationEntries: string | null;
  experienceEntries: string | null;
  certifications: string | null;
  languages: string | null;
  projects: string | null;
  // Misc quick-fill
  highestQualification: string | null;
  willingToRelocate: string | null;
  drivingLicence: string | null;
  securityClearance: string | null;
  // Resume bookkeeping
  resumeText: string | null;
  resumeFileName: string | null;
  resumeParsedAt: Date | string | null;
  updatedAt: Date | string;
}

// ---- Editable flat text fields (sent to PUT /api/profile) -------------------
// JSON-array fields are sent separately as serialised strings; structured-entry
// saves go through the same PUT but are handled as JSON fields (see route).

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
  "highestQualification",
  "willingToRelocate",
  "drivingLicence",
  "securityClearance",
] as const;

export type ProfileTextField = (typeof PROFILE_TEXT_FIELDS)[number];

// JSON-array field names — sent as serialised JSON strings in the PUT body.
export const PROFILE_JSON_FIELDS = [
  "educationEntries",
  "experienceEntries",
  "certifications",
  "languages",
  "projects",
] as const;

export type ProfileJsonField = (typeof PROFILE_JSON_FIELDS)[number];

// Fields the resume parser is asked to extract.
export type ParsedProfile = Partial<
  Record<ProfileTextField, string> & {
    needsSponsorship: boolean;
    educationEntries: EducationEntry[];
    experienceEntries: ExperienceEntry[];
    certifications: CertificationEntry[];
    languages: LanguageEntry[];
    projects: ProjectEntry[];
  }
>;
