import { Compass } from "lucide-react";

export default function SponsorsLoading() {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border bg-surface px-8 py-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-strong">
          Sponsor Finder
        </p>
        <h1 className="display mt-2 text-3xl text-foreground">
          Searching the{" "}
          <span className="text-gradient-brand">live gov.uk register…</span>
        </h1>
        <p className="mt-2 flex items-center gap-2 text-[15px] text-muted">
          <Compass size={16} className="animate-spin text-brand" />
          Fetching ~35,000 London sponsors. This can take a few seconds on the
          first load.
        </p>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl space-y-6 p-8">
          {/* Filter bar skeleton */}
          <div className="space-y-4 rounded-card border border-border bg-surface p-6">
            <div className="h-10 w-full animate-pulse rounded-xl bg-surface-muted" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="h-10 animate-pulse rounded-xl bg-surface-muted" />
              <div className="h-10 animate-pulse rounded-xl bg-surface-muted" />
            </div>
          </div>

          {/* Results table skeleton */}
          <div className="rounded-card border border-border bg-surface">
            <div className="border-b border-border px-6 py-4">
              <div className="h-5 w-48 animate-pulse rounded bg-surface-muted" />
            </div>
            <div className="divide-y divide-border">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <div className="h-4 flex-1 animate-pulse rounded bg-surface-muted" />
                  <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
                  <div className="h-4 w-16 animate-pulse rounded bg-surface-muted" />
                  <div className="h-4 w-32 animate-pulse rounded bg-surface-muted" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
