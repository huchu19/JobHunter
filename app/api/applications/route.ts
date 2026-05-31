import { NextRequest } from "next/server";
import prisma from "@/app/lib/db";
import Fuse from "fuse.js";

// Cache sponsors in memory with TTL
let cachedSponsors: { name: string }[] = [];
let sponsorsCacheTime = 0;
const SPONSORS_CACHE_TTL = 3600000; // 1 hour

async function fetchSponsorsFromCache() {
  const now = Date.now();
  if (cachedSponsors.length > 0 && now - sponsorsCacheTime < SPONSORS_CACHE_TTL) {
    return cachedSponsors;
  }

  try {
    const response = await fetch("http://localhost:3000/api/sponsors", {
      cache: "no-store",
    });
    const data = await response.json();
    cachedSponsors = (data.sponsors as { name: string }[]) || [];
    sponsorsCacheTime = now;
    return cachedSponsors;
  } catch {
    return cachedSponsors;
  }
}

function fuzzyMatchSponsor(companyName: string, sponsors: { name: string }[]) {
  if (sponsors.length === 0) return false;

  const fuse = new Fuse(sponsors, {
    keys: ["name"],
    threshold: 0.3,
  });

  const results = fuse.search(companyName);
  return results.length > 0;
}

export async function GET() {
  try {
    const applications = await prisma.application.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return Response.json({ applications });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return Response.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.company || !body.role) {
      return Response.json(
        { error: "company and role are required" },
        { status: 400 }
      );
    }

    const sponsors = await fetchSponsorsFromCache();
    const sponsorVerified = fuzzyMatchSponsor(body.company, sponsors);

    const application = await prisma.application.create({
      data: {
        company: body.company,
        role: body.role,
        url: body.url || null,
        location: body.location || null,
        locationType: body.locationType || "london",
        jobType: body.jobType || "grad",
        status: body.status || "wishlist",
        notes: body.notes || null,
        salary: body.salary || null,
        source: body.source || "manual",
        sponsorVerified,
        appliedAt:
          body.status === "applied" ? new Date() : body.appliedAt || null,
      },
    });

    return Response.json({ application }, { status: 201 });
  } catch (error) {
    console.error("Error creating application:", error);
    return Response.json(
      { error: "Failed to create application" },
      { status: 500 }
    );
  }
}
