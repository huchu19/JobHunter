import { Sponsor, RawSponsorRow } from "@/app/types/sponsor";
import { buildPostcodeRegex } from "./londonAreas";

function normalizeString(str: string | undefined): string {
  return (str || "").trim();
}

export function isLondon(city: string | undefined): boolean {
  const normalized = normalizeString(city).toLowerCase();

  // Exact match: "London" (case-insensitive)
  if (normalized === "london") {
    return true;
  }

  // Postcode-based match: must start with the postcode code
  const postcodeRegex = /^(ec[1-4]|wc[1-2]|e[1-2]|n1|se1|sw1|w[1-2])/i;
  return postcodeRegex.test(normalized);
}

export function isARated(rating: string | undefined): boolean {
  const normalized = normalizeString(rating);
  // Exact values from CSV inspection: "Worker (A rating)" or "Worker (A (Premium))"
  return (
    normalized.includes("Worker (A") &&
    !normalized.includes("Temporary Worker")
  );
}

export function isSkilledWorker(route: string | undefined): boolean {
  const normalized = normalizeString(route);
  // Exact value from CSV: "Skilled Worker"
  return normalized === "Skilled Worker";
}

export function filterSponsors(rows: RawSponsorRow[]): Sponsor[] {
  const filtered = rows.filter((row) => {
    const name = normalizeString(row["Organisation Name"]);
    const city = normalizeString(row["Town/City"]);
    const rating = normalizeString(row["Type & Rating"]);
    const route = normalizeString(row["Route"]);

    // Skip empty names
    if (!name) return false;

    // Apply filters
    if (!isLondon(city)) return false;
    if (!isARated(rating)) return false;
    if (!isSkilledWorker(route)) return false;

    return true;
  });

  // Map to Sponsor and deduplicate by name + city
  const seen = new Set<string>();
  const sponsors: Sponsor[] = [];

  for (const row of filtered) {
    const name = normalizeString(row["Organisation Name"]);
    const city = normalizeString(row["Town/City"]);
    const key = `${name}|${city}`;

    if (seen.has(key)) continue;
    seen.add(key);

    sponsors.push({
      name,
      city,
      rating: normalizeString(row["Type & Rating"]),
      route: normalizeString(row["Route"]),
    });
  }

  // Sort alphabetically by name
  sponsors.sort((a, b) => a.name.localeCompare(b.name));

  return sponsors;
}
