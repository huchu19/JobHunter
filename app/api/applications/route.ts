import { NextRequest } from "next/server";
import prisma from "@/app/lib/db";
import { fuzzyMatchSponsor } from "@/app/lib/sponsorMatch";
import { fetchSponsorsFromCache } from "@/app/lib/sponsorCache";

/** Parses an incoming ISO date string into a Date, or null when absent/invalid. */
function parseDate(value: unknown): Date | null {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Clamps an incoming priority to the 0..5 range. */
function parsePriority(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, Math.round(n)));
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
    const status = body.status || "wishlist";

    const application = await prisma.application.create({
      data: {
        company: body.company,
        role: body.role,
        url: body.url || null,
        location: body.location || null,
        locationType: body.locationType || "london",
        jobType: body.jobType || "grad",
        status,
        notes: body.notes || null,
        salary: body.salary || null,
        source: body.source || "manual",
        sponsorVerified,
        priority: parsePriority(body.priority),
        deadline: parseDate(body.deadline),
        followUpDate: parseDate(body.followUpDate),
        contactName: body.contactName || null,
        contactEmail: body.contactEmail || null,
        jobDescription: body.jobDescription || null,
        appliedAt:
          status === "applied" ? new Date() : parseDate(body.appliedAt),
        // Seed the timeline with a creation event.
        activities: {
          create: {
            type: "created",
            title: "Application added",
            toStatus: status,
          },
        },
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
