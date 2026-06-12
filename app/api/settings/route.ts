import { NextRequest } from "next/server";
import prisma from "@/app/lib/db";
import { isEmailConfigured } from "@/app/lib/email";

/**
 * Singleton notification settings (same pattern as /api/profile). GET creates
 * the row with defaults on first read; PUT updates an explicit allow-list of
 * fields. `emailConfigured` is derived from the env, never stored.
 */

const BOOLEAN_FIELDS = [
  "emailEnabled",
  "weeklyDigest",
  "followUpReminders",
  "interviewAlerts",
  "offerCelebration",
  "browserEnabled",
] as const;

export async function GET() {
  try {
    const settings = await prisma.notificationSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
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
      where: { id: "singleton" },
      update: updates,
      create: { id: "singleton", ...updates },
    });

    return Response.json({
      settings: { ...settings, emailConfigured: isEmailConfigured() },
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return Response.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
