import prisma from "@/app/lib/db";
import {
  computeReminders,
  filterRemindersByPrefs,
} from "@/app/lib/reminders";
import { isEmailConfigured } from "@/app/lib/email";
import { auth } from "@/app/auth";

/**
 * Everything due now, filtered by the saved notification preferences. Used by
 * the settings page preview and by the daily-job endpoint
 * (POST /api/notifications/run).
 */
export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [apps, settings] = await Promise.all([
      prisma.application.findMany({
        where: { userId },
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
        where: { userId },
        update: {},
        create: { userId },
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
