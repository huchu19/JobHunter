import prisma from "@/app/lib/db";
import {
  computeDashboardStats,
  type StatApplication,
} from "@/app/lib/applicationStats";
import { auth } from "@/app/auth";

async function getApplications(): Promise<StatApplication[]> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return [];
    return await prisma.application.findMany({
      where: { userId },
      select: {
        status: true,
        appliedAt: true,
        interviewAt: true,
        offerAt: true,
        rejectedAt: true,
        deadline: true,
        followUpDate: true,
      },
    });
  } catch {
    return [];
  }
}

interface Metric {
  label: string;
  value: string | number;
  /** Optional accent on the value (used to draw the eye to time-sensitive items). */
  accent?: "default" | "warning";
}

function MetricItem({ label, value, accent = "default" }: Metric) {
  return (
    <div className="flex shrink-0 flex-col gap-0.5 px-5 first:pl-0">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-2">
        {label}
      </span>
      <span
        className={`figure text-xl font-semibold tabular-nums ${
          accent === "warning" ? "text-warning" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default async function StatsBar() {
  const applications = await getApplications();
  const stats = computeDashboardStats(applications);

  // Slim single-row strip. Time-sensitive metrics (deadlines / follow-ups) get a
  // warning accent only when there's actually something due, so the eye is drawn
  // to what needs action rather than to a wall of zeros.
  const metrics: Metric[] = [
    { label: "Tracked", value: stats.total },
    { label: "Applied / wk", value: stats.appliedThisWeek },
    { label: "Interview rate", value: `${stats.interviewRate}%` },
    { label: "Response", value: `${stats.responseRate}%` },
    { label: "Offers", value: stats.offers },
    { label: "Ghosted", value: stats.ghosted },
    {
      label: "Deadlines · 7d",
      value: stats.upcomingDeadlines,
      accent: stats.upcomingDeadlines > 0 ? "warning" : "default",
    },
    {
      label: "Follow-ups · 7d",
      value: stats.upcomingFollowUps,
      accent: stats.upcomingFollowUps > 0 ? "warning" : "default",
    },
  ];

  return (
    <div className="shrink-0 border-b border-border bg-surface">
      <div className="thin-scroll flex items-center divide-x divide-border overflow-x-auto px-8 py-3">
        {metrics.map((m) => (
          <MetricItem key={m.label} {...m} />
        ))}
      </div>
    </div>
  );
}
