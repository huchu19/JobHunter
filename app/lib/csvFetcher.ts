const FALLBACK_CSV_URL =
  "https://assets.publishing.service.gov.uk/media/6a422d3c7ac6fd9c6a94aab5/SP_-_Worker_and_Temporary_Worker_Web_Register_-_2026-06-29.csv";

async function extractCSVLinkFromGovUK(): Promise<{ url: string; date: string } | null> {
  try {
    const response = await fetch(
      "https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) return null;

    const html = await response.text();
    // Prefer the absolute assets URL; fall back to first CSV href
    const absoluteMatch = html.match(/href="(https:\/\/assets\.publishing\.service\.gov\.uk[^"]+\.csv[^"]*)"/);
    const csvUrl = absoluteMatch?.[1] || html.match(/href="([^"]*\.csv[^"]*)"/)?.[1];

    if (!csvUrl) return null;

    // Extract date from filename (e.g., "2026-06-29" from "...2026-06-29.csv")
    const dateMatch = csvUrl.match(/(\d{4}-\d{2}-\d{2})/);
    const csvDate = dateMatch?.[1] || new Date().toISOString().split("T")[0];

    return { url: csvUrl, date: csvDate };
  } catch {
    return null;
  }
}

function extractDateFromUrl(url: string): string {
  const dateMatch = url.match(/(\d{4}-\d{2}-\d{2})/);
  return dateMatch?.[1] || new Date().toISOString().split("T")[0];
}

async function fetchCSVFromURL(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.statusText}`);
  }

  return response.text();
}

export async function fetchSponsorCSV(): Promise<{ csv: string; date: string }> {
  let result = await extractCSVLinkFromGovUK();
  let csvLink = result?.url;
  let csvDate = result?.date;

  if (!csvLink) {
    csvLink = FALLBACK_CSV_URL;
    csvDate = extractDateFromUrl(FALLBACK_CSV_URL);
  }

  // Make sure the URL is absolute
  if (!csvLink.startsWith("http")) {
    csvLink = "https://www.gov.uk" + csvLink;
  }

  try {
    const csv = await fetchCSVFromURL(csvLink);
    return { csv, date: csvDate || extractDateFromUrl(csvLink) };
  } catch (error) {
    try {
      const csv = await fetchCSVFromURL(FALLBACK_CSV_URL);
      return {
        csv,
        date: extractDateFromUrl(FALLBACK_CSV_URL),
      };
    } catch {
      throw new Error(
        "Could not fetch sponsor CSV from GOV.UK or fallback URL"
      );
    }
  }
}
