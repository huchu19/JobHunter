/**
 * One-time recovery: copy applications + activities + profile from the old
 * single-user SQLite DB (prisma/prisma/dev.db) into the new per-user Postgres
 * DB, attaching everything to one user.
 *
 * Reads SQLite via the `sqlite3` CLI (JSON mode) so we don't need an extra dep,
 * and writes through the Prisma client (already pointed at Postgres). Original
 * ids and timestamps are preserved, so Activity → Application FKs stay valid and
 * your timeline dates are unchanged. Idempotent: uses upsert/skipDuplicates, so
 * re-running won't create duplicates.
 *
 * Usage:
 *   npx tsx scripts/recoverFromSqlite.ts <userEmail> [--dry-run]
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import prisma from "../app/lib/db";

const SQLITE_PATH = path.resolve(__dirname, "../prisma/prisma/dev.db");

function readTable<T>(table: string): T[] {
  const out = execFileSync(
    "sqlite3",
    [SQLITE_PATH, "-json", `SELECT * FROM ${table};`],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  ).trim();
  return out ? (JSON.parse(out) as T[]) : [];
}

/** SQLite stores datetimes as strings; coerce to Date | null for Prisma. */
function date(v: unknown): Date | null {
  if (v == null || v === "") return null;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? null : d;
}
function bool(v: unknown): boolean {
  return v === 1 || v === true || v === "1";
}
function nbool(v: unknown): boolean | null {
  if (v == null) return null;
  return bool(v);
}

async function main() {
  const email = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  if (!email) {
    console.error("Usage: npx tsx scripts/recoverFromSqlite.ts <userEmail> [--dry-run]");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user with email ${email} in Postgres. Sign in first.`);
    process.exit(1);
  }
  const userId = user.id;

  const apps = readTable<Record<string, unknown>>("Application");
  const activities = readTable<Record<string, unknown>>("Activity");
  const profiles = readTable<Record<string, unknown>>("Profile");

  console.log(
    `Source: ${apps.length} applications, ${activities.length} activities, ${profiles.length} profile(s)`
  );
  console.log(`Target user: ${email} (${userId})`);
  if (dryRun) {
    console.log("--dry-run: no writes performed.");
    await prisma.$disconnect();
    return;
  }

  // 1. Applications — preserve id/createdAt/updatedAt, attach userId.
  let createdApps = 0;
  for (const a of apps) {
    const res = await prisma.application.upsert({
      where: { id: a.id as string },
      update: {}, // never clobber an existing row on re-run
      create: {
        id: a.id as string,
        userId,
        company: a.company as string,
        role: a.role as string,
        url: (a.url as string) ?? null,
        location: (a.location as string) ?? null,
        locationType: (a.locationType as string) ?? "london",
        jobType: (a.jobType as string) ?? "grad",
        status: (a.status as string) ?? "wishlist",
        appliedAt: date(a.appliedAt),
        notes: (a.notes as string) ?? null,
        salary: (a.salary as string) ?? null,
        source: (a.source as string) ?? null,
        sponsorVerified: bool(a.sponsorVerified),
        priority: (a.priority as number) ?? 0,
        deadline: date(a.deadline),
        followUpDate: date(a.followUpDate),
        interviewAt: date(a.interviewAt),
        offerAt: date(a.offerAt),
        rejectedAt: date(a.rejectedAt),
        rejectedReason: (a.rejectedReason as string) ?? null,
        contactName: (a.contactName as string) ?? null,
        contactEmail: (a.contactEmail as string) ?? null,
        jobDescription: (a.jobDescription as string) ?? null,
        createdAt: date(a.createdAt) ?? new Date(),
        updatedAt: date(a.updatedAt) ?? new Date(),
      },
    });
    if (res) createdApps++;
  }

  // 2. Activities — FK to the now-restored applications.
  const appIds = new Set(apps.map((a) => a.id as string));
  const validActivities = activities.filter((act) =>
    appIds.has(act.applicationId as string)
  );
  const actResult = await prisma.activity.createMany({
    data: validActivities.map((act) => ({
      id: act.id as string,
      applicationId: act.applicationId as string,
      type: act.type as string,
      fromStatus: (act.fromStatus as string) ?? null,
      toStatus: (act.toStatus as string) ?? null,
      title: (act.title as string) ?? null,
      notes: (act.notes as string) ?? null,
      occurredAt: date(act.occurredAt) ?? new Date(),
      createdAt: date(act.createdAt) ?? new Date(),
    })),
    skipDuplicates: true,
  });

  // 3. Profile — the old singleton row becomes this user's profile.
  let profileRestored = false;
  const p = profiles[0];
  if (p) {
    await prisma.profile.upsert({
      where: { userId },
      update: {}, // don't overwrite a profile the user already re-filled
      create: {
        userId,
        fullName: (p.fullName as string) ?? null,
        email: (p.email as string) ?? null,
        phone: (p.phone as string) ?? null,
        location: (p.location as string) ?? null,
        linkedinUrl: (p.linkedinUrl as string) ?? null,
        githubUrl: (p.githubUrl as string) ?? null,
        portfolioUrl: (p.portfolioUrl as string) ?? null,
        websiteUrl: (p.websiteUrl as string) ?? null,
        workAuthorization: (p.workAuthorization as string) ?? null,
        needsSponsorship: nbool(p.needsSponsorship),
        rightToWork: (p.rightToWork as string) ?? null,
        noticePeriod: (p.noticePeriod as string) ?? null,
        salaryExpectation: (p.salaryExpectation as string) ?? null,
        earliestStart: (p.earliestStart as string) ?? null,
        yearsExperience: (p.yearsExperience as string) ?? null,
        currentTitle: (p.currentTitle as string) ?? null,
        summary: (p.summary as string) ?? null,
        skills: (p.skills as string) ?? null,
        resumeText: (p.resumeText as string) ?? null,
        resumeFileName: (p.resumeFileName as string) ?? null,
        resumeParsedAt: date(p.resumeParsedAt),
      },
    });
    profileRestored = true;
  }

  console.log(
    `Done. Applications now present: ${createdApps}; activities inserted: ${actResult.count}; profile restored: ${profileRestored}`
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
