"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, MapPin, Briefcase } from "lucide-react";
import type { ListingsResult } from "@/app/types/careers";

/**
 * Fetches and renders a company's live open roles from `/api/companies/[name]/
 * listings`. Mounts → fetches (so it only fires when actually shown, e.g. an
 * expanded panel). Falls back to a "View careers site" link when no ATS feed is
 * available. Self-contained so it works both inline in the Matches list and on
 * the company research page.
 */
export default function CareersListings({
  companyName,
}: {
  companyName: string;
}) {
  const [data, setData] = useState<ListingsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrored(false);
    fetch(`/api/companies/${encodeURIComponent(companyName)}/listings`)
      .then((res) => {
        if (!res.ok) throw new Error("listings failed");
        return res.json();
      })
      .then((d: ListingsResult) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setErrored(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyName]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-1 py-3 text-xs text-muted">
        <Loader2 size={13} className="animate-spin" /> Finding live roles at{" "}
        {companyName}…
      </div>
    );
  }

  if (errored || !data) {
    return (
      <div className="px-1 py-3 text-xs text-muted">
        Couldn&apos;t load roles right now.
      </div>
    );
  }

  // No live feed — point the user at the resolved careers site (or fallback).
  if (!data.fromAts) {
    return (
      <div className="px-1 py-3 text-xs text-muted">
        Live roles aren&apos;t available in-app for this company.{" "}
        {data.careersUrl && (
          <a
            href={data.careersUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-brand-strong hover:underline"
          >
            View careers site <ExternalLink size={11} />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="py-2">
      <ul className="space-y-1.5">
        {data.listings.map((l) => (
          <li key={l.url}>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 transition hover:border-brand/40 hover:bg-surface-muted/60"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 truncate text-xs font-semibold text-foreground">
                  <Briefcase size={11} className="shrink-0 text-brand-strong" />
                  {l.title}
                </span>
                {l.location && (
                  <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted">
                    <MapPin size={10} className="shrink-0" />
                    {l.location}
                  </span>
                )}
              </span>
              <ExternalLink size={12} className="shrink-0 text-muted" />
            </a>
          </li>
        ))}
      </ul>
      {data.careersUrl && (
        <a
          href={data.careersUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 px-1 text-[11px] font-medium text-muted transition hover:text-brand-strong"
        >
          See all roles on the careers site <ExternalLink size={10} />
        </a>
      )}
    </div>
  );
}
