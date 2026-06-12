import {
  computeDashboardStats,
  type StatApplication,
} from "@/app/lib/applicationStats";
import type {
  Reminder,
  ReminderType,
  WeeklyDigest,
} from "@/app/types/notifications";

/**
 * Pure reminder computation for Smart Notifications. Runs over the same
 * structural application shape as `applicationStats` (Prisma rows or DTOs),
 * so the reminders API, the daily-job endpoint, and the settings-page
 * preview all share one implementation. No network, no AI.
 */

export interface ReminderApplication extends StatApplication {
  id: string;
  company: string;
  role: string;
  /** Future-dated interview rounds logged on the timeline. */
  activities?: {
    type: string;
    occurredAt: Date | string;
    title?: string | null;
  }[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toTime(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

function isClosed(status: string): boolean {
  return status === "rejected" || status === "offer";
}

/**
 * All reminders due now-ish:
 * - `follow_up`  — followUpDate due or overdue (open applications only)
 * - `deadline`   — application deadline within the next 48h (open only)
 * - `interview`  — an interview within the next 24h (from `interviewAt` or a
 *                  future-dated timeline activity) → prep alert
 * - `offer`      — offer landed within the last 24h → celebration
 * Sorted by dueAt ascending.
 */
export function computeReminders(
  apps: ReminderApplication[],
  now: Date = new Date()
): Reminder[] {
  const nowT = now.getTime();
  const reminders: Reminder[] = [];

  for (const app of apps) {
    const followUpT = toTime(app.followUpDate);
    if (followUpT !== null && followUpT <= nowT && !isClosed(app.status)) {
      reminders.push({
        type: "follow_up",
        applicationId: app.id,
        company: app.company,
        role: app.role,
        dueAt: new Date(followUpT).toISOString(),
        message: `Follow up with ${app.company} about ${app.role}`,
      });
    }

    const deadlineT = toTime(app.deadline);
    if (
      deadlineT !== null &&
      deadlineT >= nowT &&
      deadlineT <= nowT + 2 * DAY_MS &&
      !isClosed(app.status)
    ) {
      reminders.push({
        type: "deadline",
        applicationId: app.id,
        company: app.company,
        role: app.role,
        dueAt: new Date(deadlineT).toISOString(),
        message: `Deadline approaching: ${app.company} · ${app.role}`,
      });
    }

    // Interview prep alert: anything in the next 24h. A future-dated
    // timeline activity is the primary signal; `interviewAt` covers a
    // freshly scheduled first interview.
    const interviewTimes: number[] = [];
    const interviewAtT = toTime(app.interviewAt);
    if (interviewAtT !== null) interviewTimes.push(interviewAtT);
    for (const act of app.activities ?? []) {
      if (act.type !== "interview") continue;
      const t = toTime(act.occurredAt);
      if (t !== null) interviewTimes.push(t);
    }
    const upcoming = interviewTimes
      .filter((t) => t > nowT && t <= nowT + DAY_MS)
      .sort((a, b) => a - b)[0];
    if (upcoming !== undefined && app.status !== "rejected") {
      reminders.push({
        type: "interview",
        applicationId: app.id,
        company: app.company,
        role: app.role,
        dueAt: new Date(upcoming).toISOString(),
        message: `Interview prep: ${app.company} (${app.role}) in the next 24 hours`,
      });
    }

    const offerT = toTime(app.offerAt);
    if (
      app.status === "offer" &&
      offerT !== null &&
      nowT - offerT <= DAY_MS &&
      offerT <= nowT
    ) {
      reminders.push({
        type: "offer",
        applicationId: app.id,
        company: app.company,
        role: app.role,
        dueAt: new Date(offerT).toISOString(),
        message: `🎉 Offer from ${app.company} — congratulations!`,
      });
    }
  }

  return reminders.sort(
    (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
  );
}

/** Per-type toggles from notification settings → which reminders survive. */
export function filterRemindersByPrefs(
  reminders: Reminder[],
  prefs: {
    followUpReminders: boolean;
    interviewAlerts: boolean;
    offerCelebration: boolean;
  }
): Reminder[] {
  const allowed = new Set<ReminderType>();
  if (prefs.followUpReminders) {
    allowed.add("follow_up");
    allowed.add("deadline");
  }
  if (prefs.interviewAlerts) allowed.add("interview");
  if (prefs.offerCelebration) allowed.add("offer");
  return reminders.filter((r) => allowed.has(r.type));
}

/** Weekly digest = the dashboard stat set + everything currently due. */
export function buildWeeklyDigest(
  apps: ReminderApplication[],
  now: Date = new Date()
): WeeklyDigest {
  return {
    generatedAt: now.toISOString(),
    stats: computeDashboardStats(apps, now),
    reminders: computeReminders(apps, now),
  };
}

/** Plain-text email body for the weekly digest. */
export function renderDigestText(digest: WeeklyDigest): string {
  const { stats, reminders } = digest;
  const lines = [
    "Your week in the job hunt — UK Sponsor Finder",
    "",
    `Tracked applications: ${stats.total}`,
    `Applied this week: ${stats.appliedThisWeek}`,
    `Interview rate: ${stats.interviewRate}%  ·  Response rate: ${stats.responseRate}%`,
    `Offers: ${stats.offers}  ·  Possibly ghosted: ${stats.ghosted}`,
    `Deadlines in the next 7 days: ${stats.upcomingDeadlines}`,
    `Follow-ups due within 7 days: ${stats.upcomingFollowUps}`,
  ];
  if (reminders.length > 0) {
    lines.push("", "Due now:");
    for (const r of reminders) {
      lines.push(`- ${r.message}`);
    }
  }
  lines.push("", "Open your board: http://localhost:3000/dashboard");
  return lines.join("\n");
}

/**
 * Browser-notification payload for a status change (null when the move is
 * not worth notifying). Pure so it is testable; dispatch lives in
 * `browserNotify.ts`.
 */
export function statusChangeNotification(
  company: string,
  role: string,
  toStatus: string
): { title: string; body: string } | null {
  switch (toStatus) {
    case "offer":
      return {
        title: `🎉 Offer — ${company}`,
        body: `${role}: congratulations, you got an offer!`,
      };
    case "interview":
      return {
        title: `Interview stage — ${company}`,
        body: `${role} moved to interview. Time to prep.`,
      };
    case "shortlisted":
      return {
        title: `Shortlisted — ${company}`,
        body: `${role} made the shortlist.`,
      };
    case "rejected":
      return {
        title: `Closed — ${company}`,
        body: `${role} was marked rejected. Onwards.`,
      };
    default:
      return null;
  }
}
