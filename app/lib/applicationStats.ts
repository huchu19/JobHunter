/**
 * Pure stat derivations for the dashboard. Accepts a minimal structural shape
 * so it works with both the Prisma `Application` (Date fields) and the
 * client-side `ApplicationDTO` (ISO-string fields).
 */
export interface StatApplication {
  status: string;
  appliedAt: Date | string | null;
  interviewAt?: Date | string | null;
  offerAt?: Date | string | null;
  rejectedAt?: Date | string | null;
  deadline?: Date | string | null;
  followUpDate?: Date | string | null;
}

function toTime(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function totalCount(apps: StatApplication[]): number {
  return apps.length;
}

export function appliedThisWeek(
  apps: StatApplication[],
  now: Date = new Date()
): number {
  const weekAgo = now.getTime() - 7 * DAY_MS;
  return apps.filter((a) => {
    const t = toTime(a.appliedAt);
    return t !== null && t > weekAgo;
  }).length;
}

export function offersCount(apps: StatApplication[]): number {
  return apps.filter((a) => a.status === "offer").length;
}

/**
 * Interview rate: share of applied jobs that reached interview or beyond.
 * Counts anything that has progressed to interview/offer (or has an
 * interview/offer timestamp) over the number of applications that were
 * actually applied to.
 */
export function interviewRate(apps: StatApplication[]): number {
  const applied = apps.filter((a) => toTime(a.appliedAt) !== null);
  if (applied.length === 0) return 0;
  const reachedInterview = applied.filter(
    (a) =>
      a.status === "interview" ||
      a.status === "offer" ||
      toTime(a.interviewAt) !== null ||
      toTime(a.offerAt) !== null
  ).length;
  return Math.round((reachedInterview / applied.length) * 100);
}

/**
 * Response rate: share of applied jobs that got any kind of response —
 * advanced to shortlisted/interview/offer, or were explicitly rejected.
 * (A rejection is still a response; ghosting is not.)
 */
export function responseRate(apps: StatApplication[]): number {
  const applied = apps.filter((a) => toTime(a.appliedAt) !== null);
  if (applied.length === 0) return 0;
  const responded = applied.filter(
    (a) =>
      a.status === "shortlisted" ||
      a.status === "interview" ||
      a.status === "offer" ||
      a.status === "rejected" ||
      toTime(a.interviewAt) !== null ||
      toTime(a.offerAt) !== null ||
      toTime(a.rejectedAt) !== null
  ).length;
  return Math.round((responded / applied.length) * 100);
}

/**
 * Ghosted: applied more than `days` ago, still sitting in applied/shortlisted,
 * with no interview, offer, or rejection recorded.
 */
export function ghostedCount(
  apps: StatApplication[],
  days = 21,
  now: Date = new Date()
): number {
  const cutoff = now.getTime() - days * DAY_MS;
  return apps.filter((a) => {
    const appliedT = toTime(a.appliedAt);
    if (appliedT === null || appliedT > cutoff) return false;
    if (a.status !== "applied" && a.status !== "shortlisted") return false;
    return (
      toTime(a.interviewAt) === null &&
      toTime(a.offerAt) === null &&
      toTime(a.rejectedAt) === null
    );
  }).length;
}

/** Open applications with a deadline within the next `days` days. */
export function upcomingDeadlines(
  apps: StatApplication[],
  days = 7,
  now: Date = new Date()
): number {
  const from = now.getTime();
  const to = from + days * DAY_MS;
  return apps.filter((a) => {
    if (a.status === "rejected" || a.status === "offer") return false;
    const t = toTime(a.deadline);
    return t !== null && t >= from && t <= to;
  }).length;
}

/** Open applications with a follow-up due on or before `days` days from now. */
export function upcomingFollowUps(
  apps: StatApplication[],
  days = 7,
  now: Date = new Date()
): number {
  const to = now.getTime() + days * DAY_MS;
  return apps.filter((a) => {
    if (a.status === "rejected" || a.status === "offer") return false;
    const t = toTime(a.followUpDate);
    return t !== null && t <= to;
  }).length;
}

export interface DashboardStats {
  total: number;
  appliedThisWeek: number;
  interviewRate: number;
  offers: number;
  responseRate: number;
  ghosted: number;
  upcomingDeadlines: number;
  upcomingFollowUps: number;
}

/** Convenience: compute the full dashboard stat set in one pass. */
export function computeDashboardStats(
  apps: StatApplication[],
  now: Date = new Date()
): DashboardStats {
  return {
    total: totalCount(apps),
    appliedThisWeek: appliedThisWeek(apps, now),
    interviewRate: interviewRate(apps),
    offers: offersCount(apps),
    responseRate: responseRate(apps),
    ghosted: ghostedCount(apps, 21, now),
    upcomingDeadlines: upcomingDeadlines(apps, 7, now),
    upcomingFollowUps: upcomingFollowUps(apps, 7, now),
  };
}
