import { NextRequest } from "next/server";
import prisma from "@/app/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;

    const updates: Record<string, unknown> = { ...body };

    // If status is being changed to "applied" and appliedAt is not set, set it now
    if (body.status === "applied" && !body.appliedAt) {
      updates.appliedAt = new Date();
    }

    const application = await prisma.application.update({
      where: { id },
      data: updates,
    });

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
    const { id } = await params;

    await prisma.application.delete({
      where: { id },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting application:", error);
    return Response.json(
      { error: "Failed to delete application" },
      { status: 500 }
    );
  }
}
