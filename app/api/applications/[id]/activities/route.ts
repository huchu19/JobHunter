import { NextRequest } from "next/server";
import prisma from "@/app/lib/db";

const ACTIVITY_TYPES = ["interview", "note", "follow_up"] as const;

function parseDate(value: unknown): Date | null {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Adds a user-authored timeline event (interview round, note, or follow-up)
 * to an application, with a user-chosen `occurredAt` so future interviews can
 * be scheduled ahead of time.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const type = ACTIVITY_TYPES.includes(body.type) ? body.type : "note";

    if (!body.title && !body.notes) {
      return Response.json(
        { error: "title or notes is required" },
        { status: 400 }
      );
    }

    const application = await prisma.application.findUnique({ where: { id } });
    if (!application) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const activity = await prisma.activity.create({
      data: {
        applicationId: id,
        type,
        title: body.title || null,
        notes: body.notes || null,
        occurredAt: parseDate(body.occurredAt) ?? new Date(),
      },
    });

    return Response.json({ activity }, { status: 201 });
  } catch (error) {
    console.error("Error creating activity:", error);
    return Response.json(
      { error: "Failed to create activity" },
      { status: 500 }
    );
  }
}
