import { Suspense } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import PageHeader from "@/app/components/PageHeader";
import SponsorSearch from "@/app/components/sponsors/SponsorSearch";

export default function SponsorsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Find Sponsors"
        subtitle="34,128 A-rated Skilled Worker sponsors, live from the gov.uk register."
        actions={
          <Link
            href="/guides"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted"
          >
            <BookOpen size={14} /> Visa guide
          </Link>
        }
      />

      <div className="min-h-0 flex-1 overflow-auto">
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
