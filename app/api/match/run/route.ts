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
    // Multi-tenant daily job: compute matches per user against their own
    // profile + board, diff against their own snapshot, email each user
    // individually. Sponsor data is shared, so fetch it once.
    const [users, sponsors] = await Promise.all([
      prisma.user.findMany({ select: { id: true } }),
      fetchDetailedSponsorsFromCache(),
    ]);

    const results = [];
    for (const { id: userId } of users) {
      const [profile, applications, settings] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.application.findMany({
          where: { userId },
          select: { company: true },
        }),
        prisma.notificationSettings.upsert({
          where: { userId },
          update: {},
          create: { userId },
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
        where: { userId },
        data: {
          matchSnapshot: JSON.stringify(names),
          lastMatchRunAt: new Date(),
        },
      });

      results.push({
        userId,
        matches: names,
        newMatches: newNames,
        email: { ...email, attempted: shouldEmail },
      });
    }

    return Response.json({
      users: results.length,
      results,
      emailConfigured: isEmailConfigured(),
    });
  } catch (error) {
    console.error("Error running match job:", error);
    return Response.json({ error: "Failed to run match job" }, { status: 500 });
  }
}
