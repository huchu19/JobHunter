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

// Extract the page <title> (or og:title) from raw HTML.
export function extractTitle(html: string): string {
  const ogTitleMatch = html.match(
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
  );
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return ogTitleMatch?.[1] || titleMatch?.[1] || "";
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
  },
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You extract structured data from a job-posting web page to import it into a job tracker.
Return only the fields you can confidently determine — omit anything not present. Do not invent values.
- "role" is the job title. "company" is the hiring company (not the job board).
- "locationType": "remote", "hybrid", "relocation", or "london" (use "london" for any London-based office role).
- "jobType": "grad" (graduate/entry/full-time), "intern" (internship/placement), or "contract".
- "salary": the advertised compensation if any, e.g. "£60,000–£80,000".
- "notes": a 1–2 sentence summary of the role's key responsibilities or requirements.`;

async function aiExtract(
  pageText: string,
  url: string
): Promise<Partial<ParseResult> | null> {
  const anthropic = getAnthropic();
  if (!anthropic || !pageText.trim()) return null;

  try {
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1500,
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

      // Regex result is the always-available fallback.
      const result: ParseResult = { company, role, title, url };

      // Enrich with AI when a key is configured; merge over the regex result.
      const ai = await aiExtract(htmlToText(html), url);
      if (ai) {
        result.company = ai.company || result.company;
        result.role = ai.role || result.role;
        result.location = ai.location ?? null;
        result.locationType = ai.locationType ?? null;
        result.jobType = ai.jobType ?? null;
        result.salary = ai.salary ?? null;
        result.notes = ai.notes ?? null;
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
