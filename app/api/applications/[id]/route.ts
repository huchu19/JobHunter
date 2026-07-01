import { NextRequest } from "next/server";
import prisma from "@/app/lib/db";
import { fuzzyMatchSponsor } from "@/app/lib/sponsorMatch";
import { fetchSponsorsFromCache } from "@/app/lib/sponsorCache";
import {
  stageTimestampField,
  nextActivityForTransition,
} from "@/app/lib/applicationStatus";
import { getUserIdFromRequest } from "@/app/lib/auth";

const STRING_FIELDS = [
  "company",
  "role",
  "url",
  "location",
  "locationType",
  "jobType",
  "status",
  "notes",
  "salary",
  "source",
  "rejectedReason",
  "contactName",
  "contactEmail",
  "jobDescription",
] as const;

const DATE_FIELDS = [
  "appliedAt",
  "deadline",
  "followUpDate",
  "interviewAt",
  "offerAt",
  "rejectedAt",
] as const;

function parseDate(value: unknown): Date | null {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parsePriority(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, Math.round(n)));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const application = await prisma.application.findFirst({
      where: { id, userId },
      include: {
        activities: { orderBy: { occurredAt: "desc" } },
      },
    });

    if (!application) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return Response.json({ application });
  } catch (error) {
    console.error("Error fetching application:", error);
    return Response.json(
      { error: "Failed to fetch application" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id } = await params;

    const existing = await prisma.application.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // Build an explicit, allow-listed update payload (no blind spread — that
    // would let a client overwrite id / createdAt / sponsorVerified).
    const updates: Record<string, unknown> = {};

    for (const field of STRING_FIELDS) {
      if (field in body) {
        const value = body[field];
        updates[field] =
          typeof value === "string" && value.trim() === "" ? null : value;
      }
    }
    for (const field of DATE_FIELDS) {
      if (field in body) updates[field] = parseDate(body[field]);
    }
    if ("priority" in body) updates.priority = parsePriority(body.priority);

    const newStatus =
      typeof body.status === "string" ? body.status : existing.status;
    const statusChanged = newStatus !== existing.status;

    // Auto-stamp the per-stage timestamp on transition, but only if it is not
    // already set, so re-dragging a card never clobbers the original date.
    if (statusChanged) {
      const stampField = stageTimestampField(newStatus);
      if (stampField && !existing[stampField] && !(stampField in updates)) {
        updates[stampField] = new Date();
      }
    }

    // Re-verify sponsor only when the company actually changes.
    if (
      typeof body.company === "string" &&
      body.company.trim() &&
      body.company !== existing.company
    ) {
      const sponsors = await fetchSponsorsFromCache();
      updates.sponsorVerified = fuzzyMatchSponsor(body.company, sponsors);
    }

    const activity = statusChanged
      ? nextActivityForTransition(existing.status, newStatus)
      : null;

    const [application] = await prisma.$transaction([
      prisma.application.update({ where: { id }, data: updates }),
      ...(activity
        ? [
            prisma.activity.create({
              data: {
                applicationId: id,
                type: activity.type,
                fromStatus: activity.fromStatus,
                toStatus: activity.toStatus,
                title: activity.title,
              },
            }),
          ]
        : []),
    ]);

    return Response.json({ application });
  } catch (error) {
    console.error("Error updating application:", error);
    return Response.json(
      { error: "Failed to update application" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Scope the delete to the owner; deleteMany returns count so a non-owned id
    // is a clean 404 instead of a thrown "record not found".
    const result = await prisma.application.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting application:", error);
    return Response.json(
      { error: "Failed to delete application" },
      { status: 500 }
    );
  }
}
