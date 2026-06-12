import prisma from "@/app/lib/db";
import {
  computeReminders,
  filterRemindersByPrefs,
} from "@/app/lib/reminders";
import { isEmailConfigured } from "@/app/lib/email";

/**
 * Everything due now, filtered by the saved notification preferences. Used by
 * the settings page preview and by the daily-job endpoint
 * (POST /api/notifications/run).
 */
export async function GET() {
  try {
    const [apps, settings] = await Promise.all([
      prisma.application.findMany({
        select: {
          id: true,
          company: true,
          role: true,
          status: true,
          appliedAt: true,
          deadline: true,
          followUpDate: true,
          interviewAt: true,
          offerAt: true,
          activities: {
            select: { type: true, occurredAt: true, title: true },
          },
        },
      }),
      prisma.notificationSettings.upsert({
        where: { id: "singleton" },
        update: {},
        create: { id: "singleton" },
      }),
    ]);

    const reminders = filterRemindersByPrefs(computeReminders(apps), settings);

    return Response.json({
      reminders,
      emailConfigured: isEmailConfigured(),
    });
  } catch (error) {
    console.error("Error computing reminders:", error);
    return Response.json(
      { error: "Failed to compute reminders" },
      { status: 500 }
    );
  }
}
