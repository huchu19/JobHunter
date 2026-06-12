import { NextRequest } from "next/server";
import prisma from "@/app/lib/db";
import {
  computeReminders,
  filterRemindersByPrefs,
  buildWeeklyDigest,
  renderDigestText,
} from "@/app/lib/reminders";
import { isEmailConfigured, sendEmail } from "@/app/lib/email";

/**
 * The "daily job" entrypoint. A scheduler (cron, GitHub Action, launchd —
 * ⏸️ not provisioned yet, see Milestone 6) POSTs here once a day; it computes
 * due reminders and emails them when email is enabled AND a transport key is
 * configured. Without a key it still returns the full payload with
 * `email.sent: false` and the reason, so the pipeline is verifiable
 * end-to-end minus actual delivery.
 *
 * Body (optional): { "digest": true } to send the weekly digest instead of
 * just due reminders.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const wantDigest = body?.digest === true;

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
          rejectedAt: true,
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

    let subject: string;
    let text: string;
    if (wantDigest && settings.weeklyDigest) {
      const digest = buildWeeklyDigest(apps);
      subject = "Your weekly job-search digest";
      text = renderDigestText(digest);
    } else {
      subject = `${reminders.length} reminder${
        reminders.length === 1 ? "" : "s"
      } from your job board`;
      text = reminders.map((r) => `- ${r.message}`).join("\n");
    }

    const shouldEmail =
      settings.emailEnabled &&
      !!settings.emailAddress &&
      (wantDigest ? settings.weeklyDigest : reminders.length > 0);

    const email = shouldEmail
      ? await sendEmail({ to: settings.emailAddress!, subject, text })
      : {
          sent: false,
          reason: settings.emailEnabled
            ? settings.emailAddress
              ? "nothing to send"
              : "no email address saved"
            : "email notifications disabled",
        };

    return Response.json({
      reminders,
      email: { ...email, attempted: shouldEmail },
      emailConfigured: isEmailConfigured(),
      preview: { subject, text },
    });
  } catch (error) {
    console.error("Error running notification job:", error);
    return Response.json(
      { error: "Failed to run notification job" },
      { status: 500 }
    );
  }
}
