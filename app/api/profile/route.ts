import { NextRequest } from "next/server";
import prisma from "@/app/lib/db";
import { PROFILE_TEXT_FIELDS, PROFILE_JSON_FIELDS } from "@/app/types/profile";
import { getUserIdFromRequest } from "@/app/lib/auth";

async function getOrCreateProfile(userId: string) {
  const existing = await prisma.profile.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.profile.create({ data: { userId } });
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const full = await getOrCreateProfile(userId);
    const { resumeData, ...profile } = full;
    return Response.json({
      profile: { ...profile, hasResume: !!resumeData },
    });
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
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const data: Record<string, string | boolean | null> = {};

    // Flat text fields — trim and coerce blanks to null.
    for (const field of PROFILE_TEXT_FIELDS) {
      if (field in body) {
        const value = body[field];
        data[field] =
          typeof value === "string" && value.trim() ? value.trim() : null;
      }
    }

    // Boolean field.
    if ("needsSponsorship" in body) {
      data.needsSponsorship =
        typeof body.needsSponsorship === "boolean"
          ? body.needsSponsorship
          : null;
    }

    // JSON array fields — accept either a pre-serialised string or a raw array/object.
    // Store as a JSON string; null when empty or missing.
    for (const field of PROFILE_JSON_FIELDS) {
      if (field in body) {
        const value = body[field];
        if (value === null || value === undefined) {
          data[field] = null;
        } else if (typeof value === "string") {
          // Already serialised — validate it's parseable, then store as-is.
          try {
            const parsed = JSON.parse(value);
            data[field] =
              Array.isArray(parsed) && parsed.length > 0 ? value : null;
          } catch {
            data[field] = null;
          }
        } else if (Array.isArray(value)) {
          data[field] = value.length > 0 ? JSON.stringify(value) : null;
        } else {
          data[field] = null;
        }
      }
    }

    // Editable resume text block.
    if ("resumeText" in body) {
      const value = body.resumeText;
      data.resumeText =
        typeof value === "string" && value.trim() ? value : null;
    }

    const full = await prisma.profile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });

    const { resumeData, ...profile } = full;
    return Response.json({
      profile: { ...profile, hasResume: !!resumeData },
    });
  } catch (error) {
    console.error("Error saving profile:", error);
    return Response.json(
      { error: "Failed to save profile" },
      { status: 500 }
    );
  }
}
