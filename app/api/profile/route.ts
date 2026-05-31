import { NextRequest } from "next/server";
import prisma from "@/app/lib/db";
import { PROFILE_TEXT_FIELDS, SINGLETON_ID } from "@/app/types/profile";

// Return the single profile row, creating an empty one lazily on first access.
async function getOrCreateProfile() {
  const existing = await prisma.profile.findUnique({
    where: { id: SINGLETON_ID },
  });
  if (existing) return existing;
  return prisma.profile.create({ data: { id: SINGLETON_ID } });
}

export async function GET() {
  try {
    const profile = await getOrCreateProfile();
    return Response.json({ profile });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return Response.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Whitelist editable fields; trim strings and coerce blanks to null.
    const data: Record<string, string | boolean | null> = {};
    for (const field of PROFILE_TEXT_FIELDS) {
      if (field in body) {
        const value = body[field];
        data[field] =
          typeof value === "string" && value.trim() ? value.trim() : null;
      }
    }
    if ("needsSponsorship" in body) {
      data.needsSponsorship =
        typeof body.needsSponsorship === "boolean"
          ? body.needsSponsorship
          : null;
    }

    const profile = await prisma.profile.upsert({
      where: { id: SINGLETON_ID },
      update: data,
      create: { id: SINGLETON_ID, ...data },
    });

    return Response.json({ profile });
  } catch (error) {
    console.error("Error saving profile:", error);
    return Response.json(
      { error: "Failed to save profile" },
      { status: 500 }
    );
  }
}
