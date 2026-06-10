import { NextRequest } from "next/server";
import { getAnthropic, ANTHROPIC_MODEL } from "@/app/lib/anthropic";

interface ParseResult {
  company: string | null;
  role: string | null;
  title: string;
  location?: string | null;
  locationType?: string | null;
  jobType?: string | null;
  salary?: string | null;
  notes?: string | null;
  deadline?: string | null;
  jobDescription?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  url?: string | null;
}

function parseCompanyAndRole(title: string): {
  company: string | null;
  role: string | null;
} {
  if (!title) return { company: null, role: null };

  // Try common patterns: "Role at Company | Platform"
  const pattern1 = /^(.+?)\s+(?:at|@)\s+([^|]+)/i;
  const match1 = title.match(pattern1);
  if (match1) {
    return { role: match1[1].trim(), company: match1[2].trim() };
  }

  // Try: "Company | Role"
  const pattern2 = /^([^|]+)\s*\|\s*(.+)$/;
  const match2 = title.match(pattern2);
  if (match2) {
    return { company: match2[1].trim(), role: match2[2].trim() };
  }

  // Try: "Role - Company - Location"
  const pattern3 = /^(.+?)\s*-\s*([^-]+)\s*-\s*.+$/;
  const match3 = title.match(pattern3);
  if (match3) {
    return { role: match3[1].trim(), company: match3[2].trim() };
  }

  return { company: null, role: null };
}

// Validate a model-supplied deadline into a clean "YYYY-MM-DD" string, or null.
export function normalizeDeadline(value: unknown): string | null {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// Turn a tenant slug like "darktrace" or "acme-corp" into "Darktrace" /
// "Acme Corp" for a best-effort company name.
export function titleCase(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Decode the handful of HTML entities that show up in meta-tag content.
export function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#x2F;/gi, "/");
}

// Extract the page <title> (or og:title) from raw HTML.
export function extractTitle(html: string): string {
  const ogTitleMatch = html.match(
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
  );
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return decodeEntities(ogTitleMatch?.[1] || titleMatch?.[1] || "");
}

// Pull the og:description meta content (often the only readable text on a
// JS-rendered job page, e.g. Workday/Greenhouse/Lever shells).
export function extractOgDescription(html: string): string {
  const m = html.match(
    /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i
  );
  return m ? decodeEntities(m[1]) : "";
}

// Build the Workday CXS JSON endpoint for a job-posting page URL, or null when
// the URL isn't a Workday posting. Workday renders jobs client-side, so the
// plain HTML is an empty shell — but this REST endpoint returns clean,
// structured job data. Transform:
//   https://{tenant}.{dc}.myworkdayjobs.com/{locale}/{site}/job/{path}
//   → https://{tenant}.{dc}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/job/{path}
export function workdayApiUrl(rawUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!/\.myworkdayjobs\.com$/i.test(parsed.hostname)) return null;

  const tenant = parsed.hostname.split(".")[0];
  // Path segments after the leading locale, e.g. ["en-US","Site","job","a","b"].
  const segments = parsed.pathname.split("/").filter(Boolean);
  const jobIdx = segments.indexOf("job");
  if (jobIdx < 1 || tenant === "www") return null;

  const site = segments[jobIdx - 1];
  const jobPath = segments.slice(jobIdx).join("/"); // "job/.../..."
  return `https://${parsed.hostname}/wday/cxs/${tenant}/${site}/${jobPath}`;
}

interface WorkdayExtract {
  role: string | null;
  location: string | null;
  jobDescription: string | null;
  deadline: string | null;
}

// Fetch and shape a Workday posting from its CXS JSON endpoint.
async function fetchWorkday(apiUrl: string): Promise<WorkdayExtract | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(apiUrl, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;

    const data = await res.json();
    const info = data?.jobPostingInfo;
    if (!info) return null;

    const description = info.jobDescription
      ? htmlToText(String(info.jobDescription))
      : null;

    return {
      role: info.title ?? null,
      location: info.location ?? null,
      jobDescription: description,
      deadline: normalizeDeadline(info.endDate),
    };
  } catch {
    return null;
  }
}

// Strip scripts/styles/tags and collapse whitespace to a plain-text approximation
// of the page body. Bounded so we never send a huge payload to the model.
export function htmlToText(html: string, maxChars = 12000): string {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, maxChars);
}

// AI extraction schema for a job listing.
const LISTING_SCHEMA = {
  type: "object",
  properties: {
    company: { type: "string" },
    role: { type: "string" },
    location: { type: "string" },
    locationType: {
      type: "string",
      enum: ["london", "remote", "hybrid", "relocation"],
    },
    jobType: { type: "string", enum: ["grad", "intern", "contract"] },
    salary: { type: "string" },
    notes: { type: "string" },
    deadline: { type: "string" },
    jobDescription: { type: "string" },
    contactName: { type: "string" },
    contactEmail: { type: "string" },
  },
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You extract structured data from a job-posting web page to import it into a job tracker.
Return only the fields you can confidently determine — omit anything not present. Do not invent values.
- "role" is the job title. "company" is the hiring company (not the job board).
- "locationType": "remote", "hybrid", "relocation", or "london" (use "london" for any London-based office role).
- "jobType": "grad" (graduate/entry/full-time), "intern" (internship/placement), or "contract".
- "salary": the advertised compensation if any, e.g. "£60,000–£80,000".
- "notes": a 1–2 sentence summary of the role's key responsibilities or requirements.
- "deadline": the application closing date if stated, as an ISO date "YYYY-MM-DD". Omit if no closing date is given.
- "jobDescription": the full job-description text (responsibilities, requirements, about-the-role), cleaned of navigation/boilerplate. Omit if the page has no real description.
- "contactName" / "contactEmail": the named recruiter or hiring contact and their email, only if explicitly listed on the page.`;

async function aiExtract(
  pageText: string,
  url: string
): Promise<Partial<ParseResult> | null> {
  const anthropic = getAnthropic();
  if (!anthropic || !pageText.trim()) return null;

  try {
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: LISTING_SCHEMA } },
      messages: [
        {
          role: "user",
          content: `Job posting URL: ${url}\n\nPage content:\n${pageText}`,
        },
      ],
    });
    const block = response.content.find((b) => b.type === "text");
    return block?.type === "text" ? JSON.parse(block.text) : null;
  } catch (err) {
    console.error("AI listing extraction failed:", err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const emptyResult: ParseResult = { company: null, role: null, title: "" };
  try {
    const url = request.nextUrl.searchParams.get("url");
    if (!url) return Response.json(emptyResult, { status: 200 });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) return Response.json(emptyResult, { status: 200 });

      const html = await response.text();
      const title = extractTitle(html);
      const { company, role } = parseCompanyAndRole(title);
      const ogDescription = extractOgDescription(html);
      const bodyText = htmlToText(html);

      // Workday (and similar) render the job client-side, so the body is empty.
      // Fall back to the og:description meta — usually the full posting text —
      // as the material both the user and the AI can work from.
      const pageText = bodyText.length > 200 ? bodyText : ogDescription;

      // Regex result is the always-available fallback. Even without an API key
      // we hand back the og:title-derived role and a trimmed description so the
      // import fills more than the title alone. AI (below) refines this.
      const result: ParseResult = {
        company,
        // og:title on Workday/Greenhouse shells is usually just the role.
        role: role ?? (title || null),
        title,
        url,
        jobDescription: pageText ? pageText.slice(0, 4000) : null,
      };

      // Site-specific structured extraction (deterministic, no AI needed).
      const wdApi = workdayApiUrl(url);
      if (wdApi) {
        const wd = await fetchWorkday(wdApi);
        if (wd) {
          result.role = wd.role || result.role;
          result.location = wd.location ?? result.location ?? null;
          result.jobDescription = wd.jobDescription || result.jobDescription;
          result.deadline = wd.deadline ?? result.deadline ?? null;
          // Derive a company from the tenant when the title didn't yield one.
          if (!result.company) {
            const tenant = new URL(url).hostname.split(".")[0];
            result.company = titleCase(tenant);
          }
        }
      }

      // Enrich with AI when a key is configured; merge over the result. AI
      // fields override when present, but never clobber a value an earlier
      // step (regex / Workday) already resolved.
      const ai = await aiExtract(pageText, url);
      if (ai) {
        result.company = ai.company || result.company;
        result.role = ai.role || result.role;
        result.location = ai.location || result.location || null;
        result.locationType = ai.locationType ?? result.locationType ?? null;
        result.jobType = ai.jobType ?? result.jobType ?? null;
        result.salary = ai.salary ?? result.salary ?? null;
        result.notes = ai.notes ?? result.notes ?? null;
        result.deadline = normalizeDeadline(ai.deadline) ?? result.deadline ?? null;
        result.jobDescription = ai.jobDescription || result.jobDescription;
        result.contactName = ai.contactName ?? result.contactName ?? null;
        result.contactEmail = ai.contactEmail ?? result.contactEmail ?? null;
      }

      return Response.json(result, { status: 200 });
    } catch {
      clearTimeout(timeoutId);
      return Response.json(emptyResult, { status: 200 });
    }
  } catch (error) {
    console.error("Error parsing URL:", error);
    return Response.json(emptyResult, { status: 200 });
  }
}
