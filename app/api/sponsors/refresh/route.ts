/**
 * Weekly refresh endpoint for the UK gov.uk sponsor register.
 * Called by a scheduled cron job to keep the sponsor list up-to-date.
 * Returns 200 on success, includes the count of sponsors fetched.
 */

import { fetchSponsorCSV } from "@/app/lib/csvFetcher";
import { filterSponsors } from "@/app/lib/sponsorFilter";
import Papa from "papaparse";
import { RawSponsorRow } from "@/app/types/sponsor";

export const revalidate = 0; // no caching for the refresh endpoint

export async function POST() {
  try {
    const { csv: csvText, date: csvDate } = await fetchSponsorCSV();
    const parsed = Papa.parse<RawSponsorRow>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (!parsed.data) {
      throw new Error("Failed to parse CSV");
    }

    const sponsors = filterSponsors(parsed.data);

    console.log(
      `[SPONSORS REFRESH] Fetched ${sponsors.length} sponsors from gov.uk (CSV date: ${csvDate}) at ${new Date().toISOString()}`
    );

    return Response.json({
      success: true,
      count: sponsors.length,
      csvDate,
      lastFetched: new Date().toISOString(),
      message: `Successfully refreshed ${sponsors.length} sponsors from CSV dated ${csvDate}`,
    });
  } catch (error) {
    console.error("[SPONSORS REFRESH ERROR]", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
