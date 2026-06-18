/**
 * Server-side orchestration for careers resolution: DB cache → deterministic
 * domain probe → optional AI web search → persist. Shared by the careers and
 * listings API routes so the resolve-and-cache flow lives in one place.
 *
 * The AI layer uses Google Gemini with Google-Search grounding (chosen for its
 * free tier). Degrades gracefully without GEMINI_API_KEY (returns the
 * deterministic guess); never throws on a missing key. The provider lives only
 * in `aiResolve()` below — `mergeResolution`, the DB cache, the routes, and the
 * UI are provider-agnostic.
 */

import prisma from "@/app/lib/db";
import { GEMINI_MODEL, geminiGenerateUrl } from "@/app/lib/gemini";
import { countAtsJobs } from "@/app/lib/atsListings";
import {
  probeCandidates,
  mergeResolution,
  type AiCareers,
  type GuessCareers,
} from "@/app/lib/careersResolver";
import type { CareersResolution, AtsType, Confidence } from "@/app/types/careers";

const FETCH_TIMEOUT_MS = 20000;

const ATS_TYPES: AtsType[] = [
  "greenhouse",
  "lever",
  "ashby",
  "workday",
  "smartrecruiters",
  "other",
];

// Google-Search grounding and JSON response schema can't be combined reliably on
// Gemini, so we ground the request and ask for JSON in the prompt, then extract
// it leniently (parseAi tolerates prose / ```json fences around the object).
const PROMPT = (
  registeredName: string
) => `You find where a UK company actually posts its job openings, given its registered legal name. Use Google Search.

Registered company legal name: "${registeredName}".

Your PRIMARY goal is to identify the company's applicant-tracking system (ATS) and its board token, because that is where the live job listings are. Search for the company's careers page, then determine which ATS hosts its jobs:
- Greenhouse → board URL "boards.greenhouse.io/<token>" or "<token>.greenhouse.io"; atsToken is "<token>".
- Lever → "jobs.lever.co/<token>"; atsToken is "<token>".
- Ashby → "jobs.ashbyhq.com/<token>"; atsToken is "<token>".
- Workday → "<tenant>.<dc>.myworkdayjobs.com/<locale>/<site>"; atsToken is the FULL board URL.
- SmartRecruiters → "careers.smartrecruiters.com/<token>"; atsToken is "<token>".
Tip: the ATS link is often behind the "Open roles"/"View jobs"/"See all jobs" button on the company's own careers page, or findable via a search like "<company> greenhouse OR lever OR ashby jobs".

Then:
- "careersUrl": the best link to view the company's jobs (the ATS board URL if you found one, else the careers page).
- "homepageUrl": the company's main website.
- "atsType" + "atsToken": ONLY when you identified the ATS and its exact board token. If unsure of the token, set both to null rather than guessing.
- The legal name often differs from the brand (e.g. "BYTEDANCE (UK) LTD" trades as TikTok). Resolve to the real operating company.
- "confidence": "high" only when you are sure this is the right company's jobs page; otherwise "low".

Respond with ONLY a JSON object (no prose, no code fences), null for anything you can't determine:
{"careersUrl": string|null, "homepageUrl": string|null, "atsType": "greenhouse"|"lever"|"ashby"|"workday"|"smartrecruiters"|"other"|null, "atsToken": string|null, "confidence": "high"|"low"|null}`;

/** Pull the first JSON object out of model text (handles ```json fences / prose). */
function extractJsonObject(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  return body.slice(start, end + 1);
}

/** Coerce model JSON text into a validated AiCareers, or null. */
function parseAi(text: string): AiCareers | null {
  const json = extractJsonObject(text);
  if (!json) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const str = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim() : null;
  const atsType = ATS_TYPES.includes(o.atsType as AtsType)
    ? (o.atsType as AtsType)
    : null;
  const confidence =
    o.confidence === "high" || o.confidence === "low"
      ? (o.confidence as Confidence)
      : null;
  return {
    careersUrl: str(o.careersUrl),
    homepageUrl: str(o.homepageUrl),
    atsType,
    atsToken: str(o.atsToken),
    confidence,
  };
}

/** Concatenate the text parts of a Gemini generateContent response. */
function geminiText(data: unknown): string {
  const parts = (
    data as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    }
  )?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((p) => p.text ?? "").join("");
}

/**
 * Ask Gemini (with Google-Search grounding) to find the careers page. Returns
 * null on any failure / no key — the caller falls back to the deterministic
 * guess. Mirrors the env-gated, no-SDK fetch style of app/lib/email.ts.
 */
async function aiResolve(registeredName: string): Promise<AiCareers | null> {
  const url = geminiGenerateUrl();
  if (!url) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT(registeredName) }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0 },
      }),
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      console.error(
        `Gemini careers resolution failed: HTTP ${res.status} (model ${GEMINI_MODEL})`
      );
      return null;
    }
    return parseAi(geminiText(await res.json()));
  } catch (err) {
    console.error("Gemini careers resolution failed:", err);
    return null;
  }
}

/** Case-insensitive lookup of an existing resolution (SQLite has no `mode`). */
async function findCached(name: string) {
  const target = name.trim().toLowerCase();
  const rows = await prisma.companyCareers.findMany();
  return rows.find((r) => r.name.toLowerCase() === target) ?? null;
}

function rowToResolution(
  row: NonNullable<Awaited<ReturnType<typeof findCached>>>
): CareersResolution {
  return {
    name: row.name,
    careersUrl: row.careersUrl,
    homepageUrl: row.homepageUrl,
    atsType: (row.atsType as AtsType | null) ?? null,
    atsToken: row.atsToken,
    confidence: (row.confidence as Confidence | null) ?? null,
    status: row.status === "unresolved" ? "unresolved" : "ok",
    aiAssisted: false, // served from cache
  };
}

/**
 * Resolve `name` to a careers destination, using the DB cache when present and
 * persisting fresh resolutions. `force` re-resolves and overwrites the cache.
 */
export async function resolveCareers(
  name: string,
  force = false
): Promise<CareersResolution> {
  const decoded = name.trim();

  if (!force) {
    const cached = await findCached(decoded);
    if (cached) return rowToResolution(cached);
  }

  const probe = await probeCandidates(decoded);
  const guess: GuessCareers | null = probe
    ? {
        careersUrl: probe.careersUrl,
        homepageUrl: probe.homepageUrl,
        atsType: probe.ats?.atsType ?? null,
        atsToken: probe.ats?.atsToken ?? null,
      }
    : null;

  // The probe's ATS hit is already verified (it had open roles). Only spend a
  // Gemini call (cost + ~20s) when the probe did NOT find a live ATS feed —
  // that's exactly the brand≠legal / hidden-ATS case the AI is for.
  const probeHasAts = Boolean(guess?.atsType && guess?.atsToken);
  const ai = probeHasAts ? null : await aiResolve(decoded);
  const resolution = mergeResolution(decoded, guess, ai);

  // Verify the final ATS token actually returns roles. Gemini can hallucinate a
  // board slug; an unverified token would show an empty "live roles" feed. If it
  // doesn't check out, drop the ATS fields so the UI falls back to the link.
  if (!probeHasAts && resolution.atsType && resolution.atsToken) {
    const count = await countAtsJobs(
      resolution.atsType,
      resolution.atsToken
    ).catch(() => 0);
    if (count === 0) {
      resolution.atsType = null;
      resolution.atsToken = null;
    }
  }

  await prisma.companyCareers.upsert({
    where: { name: decoded },
    create: {
      name: decoded,
      careersUrl: resolution.careersUrl,
      homepageUrl: resolution.homepageUrl,
      atsType: resolution.atsType,
      atsToken: resolution.atsToken,
      confidence: resolution.confidence,
      status: resolution.status,
    },
    update: {
      careersUrl: resolution.careersUrl,
      homepageUrl: resolution.homepageUrl,
      atsType: resolution.atsType,
      atsToken: resolution.atsToken,
      confidence: resolution.confidence,
      status: resolution.status,
      resolvedAt: new Date(),
    },
  });

  return resolution;
}
