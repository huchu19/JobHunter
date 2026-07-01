/**
 * Resume → structured-profile extraction, provider-agnostic.
 *
 * Prefer Anthropic when ANTHROPIC_API_KEY is set, else Google Gemini when
 * GEMINI_API_KEY is set, else no AI (the route returns a helpful message and
 * the user fills the profile manually). Only `parseResumeWithGemini` knows
 * about Gemini; the route and pure shaping helpers stay provider-agnostic.
 */

import { GEMINI_MODEL, geminiGenerateUrl } from "@/app/lib/gemini";
import {
  PROFILE_TEXT_FIELDS,
  type ParsedProfile,
  type EducationEntry,
  type ExperienceEntry,
  type CertificationEntry,
  type LanguageEntry,
  type ProjectEntry,
} from "@/app/types/profile";

const FETCH_TIMEOUT_MS = 30000;

export type ResumeProvider = "anthropic" | "gemini";

// ---- Extraction schema -------------------------------------------------------

// JSON schema passed to the AI. Structured arrays make individual ATS fields
// copyable without splitting. All fields optional — model omits what it can't find.
export const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    // Flat fields
    fullName: { type: "string" },
    email: { type: "string" },
    phone: { type: "string" },
    location: { type: "string" },
    linkedinUrl: { type: "string" },
    githubUrl: { type: "string" },
    portfolioUrl: { type: "string" },
    websiteUrl: { type: "string" },
    workAuthorization: { type: "string" },
    needsSponsorship: { type: "boolean" },
    rightToWork: { type: "string" },
    noticePeriod: { type: "string" },
    salaryExpectation: { type: "string" },
    earliestStart: { type: "string" },
    yearsExperience: { type: "string" },
    currentTitle: { type: "string" },
    summary: { type: "string" },
    skills: { type: "string" },
    highestQualification: { type: "string" },
    // Structured arrays
    educationEntries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          institution: { type: "string" },
          degree: { type: "string" },
          field: { type: "string" },
          grade: { type: "string" },
          startYear: { type: "string" },
          endYear: { type: "string" },
        },
      },
    },
    experienceEntries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company: { type: "string" },
          title: { type: "string" },
          startDate: { type: "string" },
          endDate: { type: "string" },
          current: { type: "boolean" },
          location: { type: "string" },
          description: { type: "string" },
        },
      },
    },
    certifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          issuer: { type: "string" },
          date: { type: "string" },
          credentialUrl: { type: "string" },
        },
      },
    },
    languages: {
      type: "array",
      items: {
        type: "object",
        properties: {
          language: { type: "string" },
          proficiency: { type: "string" },
        },
      },
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          url: { type: "string" },
          technologies: { type: "string" },
        },
      },
    },
  },
  additionalProperties: false,
} as const;

// Gemini's responseSchema is a restricted OpenAPI 3.0 subset — strip
// `additionalProperties` so it doesn't 400.
const { additionalProperties: _drop, ...GEMINI_EXTRACTION_SCHEMA } =
  EXTRACTION_SCHEMA;

export const RESUME_SYSTEM_PROMPT = `You extract structured data from a candidate's resume to pre-fill a reusable job-application profile.

Rules:
- Only return fields you can confidently determine from the resume. Omit fields you cannot find — do not guess or invent values.
- "skills" is a comma-separated list of the candidate's key technical and professional skills.
- "summary" is a 1–3 sentence professional summary suitable for an application "about you" field.
- "yearsExperience" is an approximate total, e.g. "3 years".
- "highestQualification" is one of: "GCSE/A-level", "Bachelor's", "Master's", "PhD", "Other".
- Leave "needsSponsorship" and visa/work-authorization fields unset unless the resume explicitly states them.
- For "educationEntries": extract each degree as a separate object with institution, degree type, field of study, grade (if shown), and years.
- For "experienceEntries": extract each role as a separate object. Set "current" true if it's the candidate's present role. "description" should capture bullet points as a short paragraph.
- For "certifications": include professional certs, not degrees.
- For "languages": include only explicitly stated languages with proficiency. Omit if not mentioned.
- For "projects": include side-projects or portfolio work listed separately from employment.`;

// ---- Provider selection ------------------------------------------------------

export function selectResumeProvider(): ResumeProvider | null {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey && anthropicKey.trim()) return "anthropic";
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey.trim()) return "gemini";
  return null;
}

// ---- JSON helpers ------------------------------------------------------------

export function extractJsonObject(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  return body.slice(start, end + 1);
}

function coerceArray<T>(value: unknown, itemCheck: (v: unknown) => v is T): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter(itemCheck);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function isEducationEntry(v: unknown): v is EducationEntry {
  return isObject(v);
}
function isExperienceEntry(v: unknown): v is ExperienceEntry {
  return isObject(v);
}
function isCertificationEntry(v: unknown): v is CertificationEntry {
  return isObject(v);
}
function isLanguageEntry(v: unknown): v is LanguageEntry {
  return isObject(v);
}
function isProjectEntry(v: unknown): v is ProjectEntry {
  return isObject(v);
}

/**
 * Coerce raw model output into a validated ParsedProfile. Drops unknown keys
 * and wrong-typed values so neither provider can inject junk into the form.
 */
export function coerceParsedProfile(raw: unknown): ParsedProfile {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: ParsedProfile = {};

  for (const field of PROFILE_TEXT_FIELDS) {
    const v = o[field];
    if (typeof v === "string" && v.trim()) out[field] = v.trim();
  }

  if (typeof o.needsSponsorship === "boolean") {
    out.needsSponsorship = o.needsSponsorship;
  }

  const edu = coerceArray(o.educationEntries, isEducationEntry);
  if (edu.length) out.educationEntries = edu;

  const exp = coerceArray(o.experienceEntries, isExperienceEntry);
  if (exp.length) out.experienceEntries = exp;

  const certs = coerceArray(o.certifications, isCertificationEntry);
  if (certs.length) out.certifications = certs;

  const langs = coerceArray(o.languages, isLanguageEntry);
  if (langs.length) out.languages = langs;

  const projects = coerceArray(o.projects, isProjectEntry);
  if (projects.length) out.projects = projects;

  return out;
}

// ---- Gemini path -------------------------------------------------------------

function geminiText(data: unknown): string {
  const parts = (
    data as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  )?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((p) => p.text ?? "").join("");
}

export async function parseResumeWithGemini(input: {
  text?: string;
  pdfBase64?: string;
}): Promise<ParsedProfile> {
  const url = geminiGenerateUrl();
  if (!url) throw new Error("GEMINI_API_KEY not configured");

  const parts = input.pdfBase64
    ? [
        { text: "Extract the application profile from this resume." },
        { inlineData: { mimeType: "application/pdf", data: input.pdfBase64 } },
      ]
    : [{ text: `Extract the application profile from this resume:\n\n${input.text}` }];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: RESUME_SYSTEM_PROMPT }] },
        contents: [{ parts }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: GEMINI_EXTRACTION_SCHEMA,
        },
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Gemini resume parse failed: HTTP ${res.status} (model ${GEMINI_MODEL})${
          detail ? ` — ${detail.slice(0, 300)}` : ""
        }`
      );
    }
    const text = geminiText(await res.json());
    const json = extractJsonObject(text);
    if (!json) return {};
    try {
      return coerceParsedProfile(JSON.parse(json));
    } catch {
      return {};
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
