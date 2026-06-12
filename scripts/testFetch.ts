import { fetchSponsorCSV } from "../app/lib/csvFetcher";
import { filterSponsors } from "../app/lib/sponsorFilter";
import { classifyTech } from "../app/lib/techClassifier";
import Papa from "papaparse";
import { RawSponsorRow } from "../app/types/sponsor";

async function runTests() {
  console.log("=== UK Sponsor CSV Fetch Test ===\n");

  try {
    console.log("Fetching GOV.UK CSV...");
    const csvText = await fetchSponsorCSV();
    console.log("✓ CSV fetched successfully\n");

    console.log("Parsing CSV...");
    const parsed = Papa.parse<RawSponsorRow>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (!parsed.data || parsed.data.length === 0) {
      throw new Error("CSV parsing returned empty data");
    }

    const rawRows = parsed.data.filter((row) => row["Organisation Name"]);
    console.log(`✓ Parsed ${rawRows.length} rows\n`);

    // Show column headers
    console.log("Column headers:");
    const firstRow = rawRows[0];
    if (firstRow) {
      Object.keys(firstRow).forEach((key) => {
        console.log(`  - ${key}`);
      });
    }
    console.log();

    // Count filters (new schema: no Town/City column)
    const aRated = rawRows.filter((r) =>
      r["TierRating"] === "Worker (A rating)"
    );
    console.log(`A-rated Worker: ${aRated.length} rows`);

    const skilledWorker = aRated.filter(
      (r) => r["Migrant Classification"]?.trim() === "Skilled Worker"
    );
    console.log(`A-rated + Skilled Worker: ${skilledWorker.length} rows\n`);

    // Apply filter
    console.log("Applying filterSponsors...");
    const sponsors = filterSponsors(rawRows);
    console.log(`✓ Filtered to ${sponsors.length} unique sponsors\n`);

    // Show sample
    console.log("Sample sponsors:");
    sponsors.slice(0, 5).forEach((s) => {
      console.log(`  - ${s.name} (${s.city})`);
    });
    console.log();

    // Tech classification
    console.log("=== Tech Classifier ===");
    const testCases = [
      { name: "Wayve Technologies Limited", expected: true },
      { name: "Faculty AI Limited", expected: true },
      { name: "Monzo Bank Ltd", expected: false },
      { name: "Google (UK) Limited", expected: true },
    ];

    for (const tc of testCases) {
      const result = classifyTech(tc.name);
      const status = result.isTech === tc.expected ? "✓" : "✗";
      console.log(
        `${status} "${tc.name}" → ${result.isTech} (score: ${result.score})`
      );
    }

    console.log("\n✓ All checks passed!");
  } catch (error) {
    console.error("✗ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

runTests();
