import { NextRequest } from "next/server";
import { resolveCareers } from "@/app/lib/resolveCareers";
import { mergeResolution } from "@/app/lib/careersResolver";

/**
 * Resolve a registered sponsor name → its real careers page, addressed by the
 * (URL-encoded) company name. Layers DB cache → deterministic domain probe →
 * optional AI web search (Gemini + Google Search), persisting the result so each
 * company resolves once. Degrades without GEMINI_API_KEY; never hard-fails (see
 * resolveCareers).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const decoded = decodeURIComponent(name).trim();
  if (!decoded) {
    return Response.json({ error: "Company name required" }, { status: 400 });
  }
  const force = request.nextUrl.searchParams.get("refresh") === "1";

  try {
    return Response.json(await resolveCareers(decoded, force));
  } catch (error) {
    console.error("Error resolving careers page:", error);
    // Last resort: a usable (unresolved) shape, not a 500.
    return Response.json(mergeResolution(decoded, null, null));
  }
}
