import { Suspense } from "react";
import prisma from "@/app/lib/db";
import {
  computeAnalytics,
  type AnalyticsApplication,
} from "@/app/lib/applicationAnalytics";
import {
  FunnelChart,
  WeeklyTimeline,
  ConversionCards,
  StageGaps,
  StatusDistribution,
} from "@/app/components/analytics/AnalyticsCharts";
import { auth } from "@/app/auth";

async function getApplications(): Promise<AnalyticsApplication[]> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return [];
    return await prisma.application.findMany({
      where: { userId },
      select: {
        status: true,
        createdAt: true,
        appliedAt: true,
        interviewAt: true,
        offerAt: true,
        rejectedAt: true,
      },
    });
  } catch {
    return [];
  }
}

async function AnalyticsContent() {
  const apps = await getApplications();
  const stats = computeAnalytics(apps);

  if (stats.total === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-base font-medium text-foreground">
          No applications to analyse yet
        </p>
        <p className="mt-1 text-sm text-muted">
          Add jobs to your board and your funnel, timeline, and conversion rates
          will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConversionCards conv={stats.conversions} />
      <div className="grid gap-6 lg:grid-cols-2">
        <FunnelChart funnel={stats.funnel} />
        <StageGaps gaps={stats.stageGaps} />
      </div>
      <WeeklyTimeline weekly={stats.weekly} />
      <StatusDistribution dist={stats.statusDistribution} />
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border bg-surface px-8 py-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-strong">
            Analytics & Insights
          </p>
          <h1 className="display mt-2 text-3xl text-foreground">
            Your job search,{" "}
            <span className="text-gradient-brand">measured.</span>
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] text-muted">
            Funnel progression, weekly application pace, conversion rates, and how
            long each stage takes — all derived from your tracked applications.
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl p-8">
          <Suspense
            fallback={
              <div className="card p-8 text-sm text-muted">Loading insights…</div>
            }
          >
            <AnalyticsContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
