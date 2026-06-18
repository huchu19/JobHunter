import { NextRequest } from "next/server";
import { resolveCareers } from "@/app/lib/resolveCareers";
import { fetchListings } from "@/app/lib/atsListings";
import { googleCareersUrl } from "@/app/lib/companyLinks";
import type { ListingsResult } from "@/app/types/careers";

/**
 * Live open roles for a company, addressed by the (URL-encoded) registered name.
 * Resolves the careers page (cached), then pulls listings from the ATS's public
 * API when one was identified. When no ATS feed is available, returns an empty
 * list plus the best careers link (resolved URL, else a Google fallback) so the
 * UI can still send the user somewhere real.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const decoded = decodeURIComponent(name).trim();
  if (!decoded) {
    return Response.json({ error: "Company name required" }, { status: 400 });
  }

  try {
    const resolution = await resolveCareers(decoded);
    const listings = await fetchListings(
      resolution.atsType,
      resolution.atsToken
    );

    const result: ListingsResult = {
      listings,
      careersUrl: resolution.careersUrl ?? googleCareersUrl(decoded),
      atsType: resolution.atsType,
      fromAts: listings.length > 0,
    };
    return Response.json(result);
  } catch (error) {
    console.error("Error fetching listings:", error);
    // Never 500 — fall back to a careers search link.
    const result: ListingsResult = {
      listings: [],
      careersUrl: googleCareersUrl(decoded),
      atsType: null,
      fromAts: false,
    };
    return Response.json(result);
  }
}
