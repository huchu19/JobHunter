import { NextRequest } from "next/server";
import prisma from "@/app/lib/db";
import { isEmailConfigured } from "@/app/lib/email";
import { getUserIdFromRequest } from "@/app/lib/auth";

/**
 * Per-user notification settings (one row per user). GET creates the row with
 * defaults on first read; PUT updates an explicit allow-list of fields.
 * `emailConfigured` is derived from the env, never stored.
 */

const BOOLEAN_FIELDS = [
  "emailEnabled",
  "weeklyDigest",
  "followUpReminders",
  "interviewAlerts",
  "offerCelebration",
  "browserEnabled",
] as const;

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.notificationSettings.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    return Response.json({
      settings: { ...settings, emailConfigured: isEmailConfigured() },
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return Response.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    for (const field of BOOLEAN_FIELDS) {
      if (field in body) updates[field] = Boolean(body[field]);
    }
    if ("emailAddress" in body) {
      const value = body.emailAddress;
      updates.emailAddress =
        typeof value === "string" && value.trim() ? value.trim() : null;
    }

    const settings = await prisma.notificationSettings.upsert({
      where: { userId },
      update: updates,
      create: { userId, ...updates },
    });

    return Response.json({
      settings: { ...settings, emailConfigured: isEmailConfigured() },
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return Response.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
