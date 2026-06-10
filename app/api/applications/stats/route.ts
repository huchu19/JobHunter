import prisma from "@/app/lib/db";
import {
  computeAnalytics,
  type AnalyticsApplication,
} from "@/app/lib/applicationAnalytics";

/**
 * GET /api/applications/stats
 *
 * Returns the full analytics bundle (funnel, weekly timeline, stage gaps,
 * conversions, status distribution) for the Analytics page. Selects only the
 * fields the aggregations need, then defers all maths to the pure, unit-tested
 * `computeAnalytics`.
 */
export async function GET() {
  try {
    const apps: AnalyticsApplication[] = await prisma.application.findMany({
      select: {
        status: true,
        createdAt: true,
        appliedAt: true,
        interviewAt: true,
        offerAt: true,
        rejectedAt: true,
      },
    });

    return Response.json({ stats: computeAnalytics(apps) });
  } catch (error) {
    console.error("Error computing application stats:", error);
    return Response.json(
      { error: "Failed to compute stats" },
      { status: 500 }
    );
  }
}
