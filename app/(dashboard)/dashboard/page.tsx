import { Suspense } from "react";
import StatsBar from "@/app/components/dashboard/StatsBar";
import DashboardClient from "@/app/components/dashboard/DashboardClient";

function SectionFallback({ label }: { label: string }) {
  return (
    <div className="rounded-card border border-border bg-surface p-8 text-sm text-muted">
      {label}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border bg-surface px-8 py-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-strong">
            Job Dashboard
          </p>
          <h1 className="display mt-2 text-3xl text-foreground">
            Every application,{" "}
            <span className="text-gradient-brand">one calm board.</span>
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] text-muted">
            Track every job from wishlist to offer — stages, deadlines,
            contacts, interviews, and a full timeline. Each card is auto-verified
            against the live gov.uk sponsor register.
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl space-y-8 p-8">
          <Suspense fallback={<SectionFallback label="Loading stats…" />}>
            <StatsBar />
          </Suspense>

          <DashboardClient />
        </div>
      </div>
    </div>
  );
}
