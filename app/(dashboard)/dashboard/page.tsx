import { Suspense } from "react";
import PageHeader from "@/app/components/PageHeader";
import StatsBar from "@/app/components/dashboard/StatsBar";
import DashboardClient from "@/app/components/dashboard/DashboardClient";

function StripFallback() {
  return (
    <div className="border-b border-border bg-surface px-8 py-3 text-xs text-muted">
      Loading stats…
    </div>
  );
}

export default function DashboardPage() {
  // Fixed-height page: the header + metric strip + toolbar are fixed chrome,
  // and the Kanban fills the remaining height with its OWN scroll. The page
  // itself never scrolls, so there's no double-scroll fight.
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Dashboard"
        subtitle="Every application, auto-verified against the live gov.uk register."
      />

      {/* Slim metric strip — reference, not the star. */}
      <Suspense fallback={<StripFallback />}>
        <StatsBar />
      </Suspense>

      {/* Board region fills the rest of the viewport and owns its scroll. */}
      <DashboardClient />
    </div>
  );
}
