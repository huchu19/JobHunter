import { fetchSponsorCSV } from "@/app/lib/csvFetcher";
import { filterSponsors } from "@/app/lib/sponsorFilter";
import { classifyTech } from "@/app/lib/techClassifier";
import { Sponsor, RawSponsorRow } from "@/app/types/sponsor";
import Papa from "papaparse";

export const revalidate = 86400; // ISR: 24 hours

export async function GET() {
  try {
    const csvText = await fetchSponsorCSV();

    const parsed = Papa.parse<RawSponsorRow>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (!parsed.data) {
      throw new Error("Failed to parse CSV");
    }

    const sponsors = filterSponsors(parsed.data);

    // Classify tech companies
    const enriched: (Sponsor & { isTech?: boolean; techScore?: number })[] =
      sponsors.map((sponsor) => {
        const tech = classifyTech(sponsor.name);
        return {
          ...sponsor,
          isTech: tech.isTech,
          techScore: tech.score,
        };
      });

    return Response.json(
      {
        sponsors: enriched,
        total: enriched.length,
        lastFetched: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching sponsors:", error);
    return Response.json(
      { error: "Failed to fetch sponsors" },
      { status: 500 }
    );
  }
}
