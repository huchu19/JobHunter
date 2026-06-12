import { Sponsor, RawSponsorRow } from "@/app/types/sponsor";

function normalizeString(str: string | undefined): string {
  return (str || "").trim();
}

export function isARated(rating: string | undefined): boolean {
  const normalized = normalizeString(rating);
  // New CSV format: "Worker (A rating)" — excludes Temporary Worker rows
  return normalized === "Worker (A rating)";
}

export function isSkilledWorker(classification: string | undefined): boolean {
  const normalized = normalizeString(classification);
  // New CSV column: "Migrant Classification" — value "Skilled Worker"
  return normalized === "Skilled Worker";
}

export function filterSponsors(rows: RawSponsorRow[]): Sponsor[] {
  const filtered = rows.filter((row) => {
    const name = normalizeString(row["Organisation Name"]);
    const rating = normalizeString(row["TierRating"]);
    const classification = normalizeString(row["Migrant Classification"]);

    if (!name) return false;
    if (!isARated(rating)) return false;
    if (!isSkilledWorker(classification)) return false;

    return true;
  });

  // Deduplicate by name (no city in new CSV)
  const seen = new Set<string>();
  const sponsors: Sponsor[] = [];

  for (const row of filtered) {
    const name = normalizeString(row["Organisation Name"]);

    if (seen.has(name)) continue;
    seen.add(name);

    sponsors.push({
      name,
      city: "",
      rating: normalizeString(row["TierRating"]),
      route: normalizeString(row["Migrant Classification"]),
    });
  }

  sponsors.sort((a, b) => a.name.localeCompare(b.name));

  return sponsors;
}
