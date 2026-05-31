import { NextRequest } from "next/server";

interface ParseResult {
  company: string | null;
  role: string | null;
  title: string;
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

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get("url");

    if (!url) {
      return Response.json(
        { company: null, role: null, title: "" },
        { status: 200 }
      );
    }

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

      if (!response.ok) {
        return Response.json(
          { company: null, role: null, title: "" },
          { status: 200 }
        );
      }

      const html = await response.text();

      // Try to extract from og:title or page title
      const titleMatch = html.match(
        /<title[^>]*>([^<]+)<\/title>/i
      );
      const ogTitleMatch = html.match(
        /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
      );

      const title = ogTitleMatch?.[1] || titleMatch?.[1] || "";
      const { company, role } = parseCompanyAndRole(title);

      return Response.json(
        { company, role, title },
        { status: 200 }
      );
    } catch {
      clearTimeout(timeoutId);
      return Response.json(
        { company: null, role: null, title: "" },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error parsing URL:", error);
    return Response.json(
      { company: null, role: null, title: "" },
      { status: 200 }
    );
  }
}
