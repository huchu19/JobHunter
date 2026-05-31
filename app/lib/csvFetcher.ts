const FALLBACK_CSV_URL =
  "https://assets.publishing.service.gov.uk/media/6a1965a6916cd732dcdaacf0/2026-05-29_-_Worker_and_Temporary_Worker.csv";

async function extractCSVLinkFromGovUK(): Promise<string | null> {
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
    const match = html.match(/href="([^"]+\.csv[^"]*)"/);
    return match?.[1] || null;
  } catch {
    return null;
  }
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

export async function fetchSponsorCSV(): Promise<string> {
  let csvLink = await extractCSVLinkFromGovUK();

  if (!csvLink) {
    csvLink = FALLBACK_CSV_URL;
  }

  // Make sure the URL is absolute
  if (!csvLink.startsWith("http")) {
    csvLink = "https://www.gov.uk" + csvLink;
  }

  try {
    return await fetchCSVFromURL(csvLink);
  } catch (error) {
    try {
      return await fetchCSVFromURL(FALLBACK_CSV_URL);
    } catch {
      throw new Error(
        "Could not fetch sponsor CSV from GOV.UK or fallback URL"
      );
    }
  }
}
