/**
 * Pure analytics aggregations for the Analytics page (Milestone 4).
 *
 * Builds on the M3.5 per-stage timestamps (`appliedAt` / `interviewAt` /
 * `offerAt` / `rejectedAt`) and the same minimal structural input shape as
 * applicationStats.ts, so it works with both the Prisma `Application` (Date
 * fields) and the client `ApplicationDTO` (ISO-string fields). All functions are
 * deterministic and unit-tested; the API route and page just present the output.
 */
import { STATUS_META } from "@/app/lib/applicationStatus";
import type { ApplicationStatus } from "@/app/types/application";

export interface AnalyticsApplication {
  status: string;
  createdAt?: Date | string | null;
  appliedAt: Date | string | null;
  interviewAt?: Date | string | null;
  offerAt?: Date | string | null;
  rejectedAt?: Date | string | null;
}

function toTime(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Funnel
// ---------------------------------------------------------------------------
//
// A funnel stage counts every application that *reached at least* that stage,
// whether by current status or by a recorded stage timestamp. So an offer also
// counts toward Applied/Shortlisted/Interview. "Rejected" is an outcome, not a
// funnel stage, so it is excluded from the stage ladder (but a rejected-after-
// interview application still counts toward Interview via its timestamp).

const FUNNEL_ORDER: ApplicationStatus[] = [
  "applied",
  "shortlisted",
  "interview",
  "offer",
];

/** Rank of a status in the overall pipeline (wishlist=0 … rejected=5). */
function statusRank(status: string): number {
  return STATUS_META[status as ApplicationStatus]?.order ?? -1;
}

export interface FunnelStage {
  status: ApplicationStatus;
  label: string;
  accent: string;
  count: number;
  /** % of the first (Applied) stage; the first stage is always 100. */
  pctOfTop: number;
  /** % retained from the previous stage (drop-off complement). */
  pctOfPrev: number;
}

/** Did this application reach `target` stage, by status rank or timestamp? */
function reachedStage(
  app: AnalyticsApplication,
  target: ApplicationStatus
): boolean {
  const targetRank = STATUS_META[target].order;
  // By current status (rejected is rank 5 but is an outcome — exclude it from
  // implying it reached offer; only count status progression up to its own rank
  // when the status is itself a forward stage).
  if (app.status !== "rejected" && statusRank(app.status) >= targetRank) {
    return true;
  }
  // By recorded timestamp for the specific stage.
  switch (target) {
    case "applied":
      return toTime(app.appliedAt) !== null;
    case "interview":
      return toTime(app.interviewAt) !== null;
    case "offer":
      return toTime(app.offerAt) !== null;
    case "shortlisted":
      // No dedicated timestamp; rely on having reached interview/offer or the
      // current status being shortlisted-or-beyond (handled above).
      return toTime(app.interviewAt) !== null || toTime(app.offerAt) !== null;
    default:
      return false;
  }
}

export function buildFunnel(apps: AnalyticsApplication[]): FunnelStage[] {
  const counts = FUNNEL_ORDER.map(
    (status) => apps.filter((a) => reachedStage(a, status)).length
  );
  const top = counts[0] || 0;
  return FUNNEL_ORDER.map((status, i) => {
    const count = counts[i];
    const prev = i === 0 ? count : counts[i - 1];
    return {
      status,
      label: STATUS_META[status].label,
      accent: STATUS_META[status].accent,
      count,
      pctOfTop: top === 0 ? 0 : Math.round((count / top) * 100),
      pctOfPrev: prev === 0 ? 0 : Math.round((count / prev) * 100),
    };
  });
}

// ---------------------------------------------------------------------------
// Applied-per-week timeline
// ---------------------------------------------------------------------------

export interface WeekPoint {
  /** ISO date (yyyy-mm-dd) of the Monday that starts the week. */
  weekStart: string;
  /** Short human label, e.g. "12 May". */
  label: string;
  count: number;
}

/** Monday 00:00 (local) of the week containing `d`. */
function startOfWeek(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (date.getDay() + 6) % 7; // 0 = Monday
  date.setDate(date.getDate() - day);
  return date;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Applications applied-to per week over the trailing `weeks` weeks (inclusive of
 * the current week). Empty weeks are filled with zero so the chart has a
 * continuous x-axis.
 */
export function appliedPerWeek(
  apps: AnalyticsApplication[],
  weeks = 8,
  now: Date = new Date()
): WeekPoint[] {
  const currentWeek = startOfWeek(now);
  // Build the ordered list of week-starts, oldest first.
  const buckets: WeekPoint[] = [];
  const index = new Map<string, number>();
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = new Date(currentWeek);
    ws.setDate(ws.getDate() - i * 7);
    const key = isoDate(ws);
    index.set(key, buckets.length);
    buckets.push({
      weekStart: key,
      label: `${ws.getDate()} ${MONTHS[ws.getMonth()]}`,
      count: 0,
    });
  }
  const oldest = startOfWeek(
    new Date(currentWeek.getTime() - (weeks - 1) * 7 * DAY_MS)
  ).getTime();

  for (const a of apps) {
    const t = toTime(a.appliedAt);
    if (t === null || t < oldest) continue;
    const key = isoDate(startOfWeek(new Date(t)));
    const idx = index.get(key);
    if (idx !== undefined) buckets[idx].count++;
  }
  return buckets;
}

// ---------------------------------------------------------------------------
// Average days between stages
// ---------------------------------------------------------------------------

export interface StageGap {
  from: string;
  to: string;
  label: string;
  /** Average elapsed days, rounded to 1 dp, or null if no data. */
  avgDays: number | null;
  /** How many applications contributed to the average. */
  sampleSize: number;
}

function avgDaysBetween(
  apps: AnalyticsApplication[],
  fromField: keyof AnalyticsApplication,
  toField: keyof AnalyticsApplication
): { avg: number | null; n: number } {
  const gaps: number[] = [];
  for (const a of apps) {
    const from = toTime(a[fromField] as Date | string | null);
    const to = toTime(a[toField] as Date | string | null);
    if (from === null || to === null || to < from) continue;
    gaps.push((to - from) / DAY_MS);
  }
  if (gaps.length === 0) return { avg: null, n: 0 };
  const avg = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  return { avg: Math.round(avg * 10) / 10, n: gaps.length };
}

/** Average days applied→interview and interview→offer. */
export function stageGaps(apps: AnalyticsApplication[]): StageGap[] {
  const aToI = avgDaysBetween(apps, "appliedAt", "interviewAt");
  const iToO = avgDaysBetween(apps, "interviewAt", "offerAt");
  return [
    {
      from: "applied",
      to: "interview",
      label: "Applied → Interview",
      avgDays: aToI.avg,
      sampleSize: aToI.n,
    },
    {
      from: "interview",
      to: "offer",
      label: "Interview → Offer",
      avgDays: iToO.avg,
      sampleSize: iToO.n,
    },
  ];
}

// ---------------------------------------------------------------------------
// Conversion rates
// ---------------------------------------------------------------------------

export interface Conversions {
  /** Applications that were actually applied to. */
  applied: number;
  /** % of applied that reached interview. */
  appliedToInterview: number;
  /** % of interviewed that reached offer. */
  interviewToOffer: number;
  /** % of applied that reached offer (overall). */
  appliedToOffer: number;
}

export function conversions(apps: AnalyticsApplication[]): Conversions {
  const applied = apps.filter((a) => reachedStage(a, "applied")).length;
  const interviewed = apps.filter((a) => reachedStage(a, "interview")).length;
  const offered = apps.filter((a) => reachedStage(a, "offer")).length;
  const pct = (num: number, den: number) =>
    den === 0 ? 0 : Math.round((num / den) * 100);
  return {
    applied,
    appliedToInterview: pct(interviewed, applied),
    interviewToOffer: pct(offered, interviewed),
    appliedToOffer: pct(offered, applied),
  };
}

// ---------------------------------------------------------------------------
// Status distribution (current board snapshot)
// ---------------------------------------------------------------------------

export interface StatusSlice {
  status: ApplicationStatus;
  label: string;
  accent: string;
  count: number;
  pct: number;
}

/** Count of applications currently in each status (all six stages). */
export function statusDistribution(
  apps: AnalyticsApplication[]
): StatusSlice[] {
  const total = apps.length;
  return (Object.keys(STATUS_META) as ApplicationStatus[])
    .sort((a, b) => STATUS_META[a].order - STATUS_META[b].order)
    .map((status) => {
      const count = apps.filter((a) => a.status === status).length;
      return {
        status,
        label: STATUS_META[status].label,
        accent: STATUS_META[status].accent,
        count,
        pct: total === 0 ? 0 : Math.round((count / total) * 100),
      };
    });
}

// ---------------------------------------------------------------------------
// One-shot bundle
// ---------------------------------------------------------------------------

export interface AnalyticsBundle {
  total: number;
  funnel: FunnelStage[];
  weekly: WeekPoint[];
  stageGaps: StageGap[];
  conversions: Conversions;
  statusDistribution: StatusSlice[];
}

export function computeAnalytics(
  apps: AnalyticsApplication[],
  now: Date = new Date()
): AnalyticsBundle {
  return {
    total: apps.length,
    funnel: buildFunnel(apps),
    weekly: appliedPerWeek(apps, 8, now),
    stageGaps: stageGaps(apps),
    conversions: conversions(apps),
    statusDistribution: statusDistribution(apps),
  };
}
