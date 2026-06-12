import prisma from "@/app/lib/db";
import { fetchDetailedSponsorsFromCache } from "@/app/lib/sponsorCache";
import {
  extractProfileSignals,
  topSponsorMatches,
} from "@/app/lib/sponsorMatcher";
import { isEmailConfigured, sendEmail } from "@/app/lib/email";

/**
 * Daily matching job (same contract as /api/notifications/run — point a
 * scheduler here; ⏸️ cron infra not provisioned). Computes the current top
 * matches, diffs them against the snapshot from the previous run, emails
 * "N new sponsors matched" when email is enabled + configured, and stores
 * the new snapshot. Email delivery no-ops without RESEND_API_KEY.
 */
export async function POST() {
  try {
    const [profile, applications, sponsors, settings] = await Promise.all([
      prisma.profile.findUnique({ where: { id: "singleton" } }),
      prisma.application.findMany({ select: { company: true } }),
      fetchDetailedSponsorsFromCache(),
      prisma.notificationSettings.upsert({
        where: { id: "singleton" },
        update: {},
        create: { id: "singleton" },
      }),
    ]);

    const signals = extractProfileSignals(profile ?? {});
    const matches = topSponsorMatches(signals, sponsors, {
      limit: 10,
      exclude: new Set(applications.map((a) => a.company)),
    });
    const names = matches.map((m) => m.sponsor.name);

    let previous: string[] = [];
    try {
      previous = settings.matchSnapshot
        ? (JSON.parse(settings.matchSnapshot) as string[])
        : [];
    } catch {
      previous = [];
    }
    const previousSet = new Set(previous.map((n) => n.toLowerCase()));
    const newNames = names.filter((n) => !previousSet.has(n.toLowerCase()));

    const shouldEmail =
      newNames.length > 0 && settings.emailEnabled && !!settings.emailAddress;

    const subject = `${newNames.length} new sponsor${
      newNames.length === 1 ? "" : "s"
    } matched your profile`;
    const text = [
      `${newNames.length} new licensed sponsor${
        newNames.length === 1 ? "" : "s"
      } now match your profile:`,
      "",
      ...newNames.map((n) => `- ${n}`),
      "",
      "See the full list: http://localhost:3000/matches",
    ].join("\n");

    const email = shouldEmail
      ? await sendEmail({ to: settings.emailAddress!, subject, text })
      : {
          sent: false,
          reason:
            newNames.length === 0
              ? "no new matches"
              : settings.emailEnabled
                ? "no email address saved"
                : "email notifications disabled",
        };

    await prisma.notificationSettings.update({
      where: { id: "singleton" },
      data: {
        matchSnapshot: JSON.stringify(names),
        lastMatchRunAt: new Date(),
      },
    });

    return Response.json({
      matches: names,
      newMatches: newNames,
      email: { ...email, attempted: shouldEmail },
      emailConfigured: isEmailConfigured(),
      preview: newNames.length > 0 ? { subject, text } : null,
    });
  } catch (error) {
    console.error("Error running match job:", error);
    return Response.json({ error: "Failed to run match job" }, { status: 500 });
  }
}
