import { Suspense } from "react";
import SponsorSearch from "@/app/components/sponsors/SponsorSearch";

export default function SponsorsPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border bg-surface px-8 py-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-strong">
          Sponsor Finder
        </p>
        <h1 className="display mt-2 text-3xl text-foreground">
          34,128 sponsors.{" "}
          <span className="text-gradient-brand">One search bar.</span>
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">
          Search every A-rated Skilled Worker sponsor with smart, fuzzy
          filtering — by area, sector, or company name. Live from the gov.uk
          register.
        </p>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-8">
          <Suspense
            fallback={
              <div className="rounded-card border border-border bg-surface p-8 text-sm text-muted">
                Loading sponsors…
              </div>
            }
          >
            <SponsorSearch />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
