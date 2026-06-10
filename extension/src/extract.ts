// Pure, DOM-free logic for the browser extension (Milestone 2).
//
// Everything here is deterministic and testable without a browser: board
// detection, company/role parsing from a page title, and the profile→form-field
// mapping that powers autofill. The content script (content.ts) owns all DOM
// access and delegates the decisions to these functions, so the interesting
// logic gets unit-tested in tests/extract.test.ts (per the repo convention that
// new logic ships with a matching test).

// ---------------------------------------------------------------------------
// Profile shape — mirrors app/types/profile.ts. Re-declared (not imported) so
// the extension bundles standalone without pulling in the Next app's module
// graph. Keep these field names in sync with the Profile model.
// ---------------------------------------------------------------------------
export interface ExtensionProfile {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  websiteUrl: string | null;
  workAuthorization: string | null;
  needsSponsorship: boolean | null;
  rightToWork: string | null;
  noticePeriod: string | null;
  salaryExpectation: string | null;
  earliestStart: string | null;
  yearsExperience: string | null;
  currentTitle: string | null;
  summary: string | null;
  skills: string | null;
  education: string | null;
  workHistory: string | null;
}

// ---------------------------------------------------------------------------
// Board detection
// ---------------------------------------------------------------------------
export type Board =
  | "greenhouse"
  | "lever"
  | "linkedin"
  | "workday"
  | "workable"
  | "generic";

/** Identify the ATS/job board from a hostname (+ optional path for Workday). */
export function detectBoard(hostname: string, pathname = ""): Board {
  const host = hostname.toLowerCase();
  if (host.includes("greenhouse.io") || host.includes("boards.greenhouse"))
    return "greenhouse";
  if (host.includes("lever.co")) return "lever";
  if (host.includes("linkedin.com")) return "linkedin";
  if (host.includes("workday") || host.includes("myworkdayjobs.com"))
    return "workday";
  if (host.includes("workable.com")) return "workable";
  // Workday is sometimes white-labelled behind a customer domain; the path is
  // the reliable tell.
  if (/\/wday\//i.test(pathname)) return "workday";
  return "generic";
}

/**
 * Should the floating fallback badge be offered on this URL? Used only for the
 * "generic" board — application-ish paths get a manual Save/Autofill badge.
 */
export function isApplicationLikeUrl(pathname: string): boolean {
  return /\/(jobs?|careers?|apply|application|positions?|vacanc(?:y|ies))\b/i.test(
    pathname
  );
}

// ---------------------------------------------------------------------------
// Company + role extraction from a document title
// ---------------------------------------------------------------------------
export interface JobInfo {
  company: string | null;
  role: string | null;
}

/** Collapse whitespace and strip a leading/trailing separator. */
function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Parse "Role - Company" / "Role at Company" / "Company - Role" style page
 * titles into a best-effort {company, role}. Per-board ordering differs, so the
 * caller passes the detected board.
 *
 * Common real-world title shapes:
 *   Greenhouse: "Job Application for Senior Engineer at Acme"
 *   Lever:      "Acme - Senior Engineer"
 *   LinkedIn:   "(99+) Senior Engineer | Acme | LinkedIn"
 *   Workday:    "Senior Engineer | Acme Careers"
 *   Workable:   "Senior Engineer - Acme"
 */
export function parseJobFromTitle(title: string, board: Board): JobInfo {
  let t = clean(title);
  if (!t) return { company: null, role: null };

  // Strip trailing site-name noise.
  t = t.replace(/\s*[\|\-–—]\s*LinkedIn\s*$/i, "");
  t = t.replace(/^\(\d+\+?\)\s*/, ""); // LinkedIn unread-count prefix "(99+) "
  // Trailing "Careers" — whether separated ("… | Careers") or appended to the
  // company ("Acme Careers"). Run before splitting so the company comes out clean.
  t = t.replace(/\s*[\|\-–—]\s*Careers?\s*$/i, "");
  t = t.replace(/\s+Careers?\s*$/i, "");

  // Greenhouse: "Job Application for <Role> at <Company>"
  const ghMatch = t.match(/^job application for\s+(.+?)\s+at\s+(.+)$/i);
  if (ghMatch) {
    return { role: clean(ghMatch[1]), company: clean(ghMatch[2]) };
  }

  // "<Role> at <Company>"
  const atMatch = t.match(/^(.+?)\s+at\s+(.+)$/i);
  if (atMatch && board !== "lever") {
    return { role: clean(atMatch[1]), company: clean(atMatch[2]) };
  }

  // Separator-split forms.
  const parts = t.split(/\s*[\|\-–—]\s*/).map(clean).filter(Boolean);
  if (parts.length >= 2) {
    // Lever puts company first: "Company - Role".
    if (board === "lever") {
      return { company: parts[0], role: parts.slice(1).join(" - ") };
    }
    // LinkedIn/Workday/Workable/generic: role first, company second.
    return { role: parts[0], company: parts[1] };
  }

  // Single chunk — treat as the role, company unknown.
  return { role: parts[0] ?? null, company: null };
}

// ---------------------------------------------------------------------------
// Profile → form-field mapping (autofill core)
// ---------------------------------------------------------------------------
//
// A FieldHints object is whatever the content script can scrape about one input:
// its name/id/label/placeholder/autocomplete attributes, lowercased. matchField
// returns the profile value that should fill it, or null when nothing fits.

export interface FieldHints {
  name?: string;
  id?: string;
  label?: string;
  placeholder?: string;
  autocomplete?: string;
  type?: string; // input type, e.g. "email", "tel"
}

/**
 * True if any hint contains any of the given keywords. Underscores/hyphens in
 * attribute values (e.g. `last_name`, `first-name`) are normalised to spaces so
 * they match the human-phrased keywords ("last name").
 */
function hintHas(hints: FieldHints, keywords: string[]): boolean {
  const hay = [
    hints.name,
    hints.id,
    hints.label,
    hints.placeholder,
    hints.autocomplete,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[_-]+/g, " ");
  return keywords.some((k) => hay.includes(k));
}

/**
 * Given a form field's hints and the user's profile, return the string value to
 * fill, or null if the field isn't one we recognise. Order matters: most
 * specific checks first (a "LinkedIn URL" field also contains "url").
 */
export function matchField(
  hints: FieldHints,
  profile: ExtensionProfile
): string | null {
  // Strong signal: autocomplete / input type.
  if (hints.autocomplete === "email" || hints.type === "email")
    return profile.email;
  if (hints.autocomplete === "tel" || hints.type === "tel")
    return profile.phone;

  // URLs — check the specific platforms before the generic "website".
  if (hintHas(hints, ["linkedin"])) return profile.linkedinUrl;
  if (hintHas(hints, ["github"])) return profile.githubUrl;
  if (hintHas(hints, ["portfolio"])) return profile.portfolioUrl;
  if (hintHas(hints, ["website", "personal site", "blog"]))
    return profile.websiteUrl;

  // Name — split full name when the form wants first/last separately.
  if (hintHas(hints, ["first name", "firstname", "given name", "given-name"]))
    return firstName(profile.fullName);
  if (
    hintHas(hints, ["last name", "lastname", "surname", "family name", "family-name"])
  )
    return lastName(profile.fullName);
  if (hintHas(hints, ["full name", "fullname", "your name", "name"]) &&
      !hintHas(hints, ["company", "user", "file"]))
    return profile.fullName;

  if (hintHas(hints, ["email", "e-mail"])) return profile.email;
  if (hintHas(hints, ["phone", "mobile", "telephone"])) return profile.phone;

  if (hintHas(hints, ["city", "location", "address", "where are you based"]))
    return profile.location;

  if (hintHas(hints, ["current title", "job title", "current role", "position you", "headline"]))
    return profile.currentTitle;

  if (hintHas(hints, ["years of experience", "years experience", "yrs experience"]))
    return profile.yearsExperience;

  if (hintHas(hints, ["salary", "compensation", "expected pay", "rate expectation"]))
    return profile.salaryExpectation;

  if (hintHas(hints, ["notice period", "notice"])) return profile.noticePeriod;

  if (hintHas(hints, ["start date", "earliest start", "availability", "available from"]))
    return profile.earliestStart;

  if (hintHas(hints, ["work authorization", "work authorisation", "authorized to work", "authorised to work"]))
    return profile.workAuthorization;

  if (hintHas(hints, ["right to work", "eligible to work"]))
    return profile.rightToWork;

  // Free-text blocks.
  if (hintHas(hints, ["cover letter", "summary", "about you", "tell us about", "introduce yourself"]))
    return profile.summary;
  if (hintHas(hints, ["skills", "technolog", "tech stack"]))
    return profile.skills;
  if (hintHas(hints, ["education", "degree", "university", "school"]))
    return profile.education;
  if (hintHas(hints, ["work history", "experience", "employment history"]))
    return profile.workHistory;

  return null;
}

/** First token of a full name, or null. */
export function firstName(full: string | null): string | null {
  if (!full) return null;
  const parts = clean(full).split(" ");
  return parts[0] || null;
}

/** Everything after the first token of a full name, or null. */
export function lastName(full: string | null): string | null {
  if (!full) return null;
  const parts = clean(full).split(" ");
  return parts.length > 1 ? parts.slice(1).join(" ") : null;
}

/**
 * Yes/No answer for sponsorship questions. Job forms phrase this as "Do you now
 * or will you in the future require sponsorship?" — return the profile-derived
 * answer string, or null if unknown.
 */
export function sponsorshipAnswer(
  profile: ExtensionProfile
): "Yes" | "No" | null {
  if (profile.needsSponsorship === null) return null;
  return profile.needsSponsorship ? "Yes" : "No";
}

/** Default base URL of the running app, used when no setting is stored. */
export const DEFAULT_DASHBOARD_URL = "http://localhost:3000";

/** Normalise a dashboard URL: ensure scheme, strip trailing slashes. Pure. */
export function normaliseDashboardUrl(raw: string): string {
  let url = raw.trim();
  if (!url) return DEFAULT_DASHBOARD_URL;
  if (!/^https?:\/\//i.test(url)) url = "http://" + url;
  return url.replace(/\/+$/, "");
}
