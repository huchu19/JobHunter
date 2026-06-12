"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  ExternalLink,
  Loader2,
  Search,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { SponsorMatch, SalaryComparison } from "@/app/lib/sponsorMatcher";
import { linkedInJobsUrl } from "@/app/lib/companyLinks";

interface MatchResponse {
  matches: SponsorMatch[];
  salary: SalaryComparison;
  profileReady: boolean;
  sponsorsAvailable: boolean;
  aiEnhanced: boolean;
  error?: string;
}

const gbp = (n: number) =>
  n.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  });

export default function MatchesClient() {
  const [data, setData] = useState<MatchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/match")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to compute matches");
        return res.json();
      })
      .then((d: MatchResponse) => setData(d))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load")
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card flex items-center gap-2 p-8 text-sm text-muted">
        <Loader2 size={15} className="animate-spin" /> Scoring 34k sponsors
        against your profile…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="card p-8 text-sm font-medium text-danger">
        {error ?? "Failed to load matches"}
      </div>
    );
  }

  if (!data.profileReady) {
    return (
      <div className="card p-10 text-center">
        <p className="text-base font-medium text-foreground">
          Tell us what you do first
        </p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">
          Matching works off the skills, title, and salary on your application
          profile. Fill those in (or parse them from your resume) and your top
          sponsors will appear here.
        </p>
        <Link
          href="/profile"
          className="btn-brand mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold"
        >
          Complete your profile
        </Link>
      </div>
    );
  }

  const { salary } = data;

  return (
    <div className="space-y-6">
      {/* Salary comparison */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-foreground">
          Salary check
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Your expectation
            </p>
            <p className="mt-1 text-xl font-bold text-foreground">
              {salary.expectation !== null ? gbp(salary.expectation) : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Visa threshold
            </p>
            <p className="mt-1 text-xl font-bold text-foreground">
              {gbp(salary.threshold)}
            </p>
            {salary.meetsThreshold !== null && (
              <p
                className={`mt-0.5 inline-flex items-center gap-1 text-xs font-semibold ${
                  salary.meetsThreshold ? "text-brand-strong" : "text-danger"
                }`}
              >
                {salary.meetsThreshold ? (
                  <>
                    <BadgeCheck size={12} /> Expectation clears it
                  </>
                ) : (
                  <>
                    <TriangleAlert size={12} /> Below the general threshold
                  </>
                )}
              </p>
            )}
          </div>
          <div className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Your tracked roles (avg min)
            </p>
            <p className="mt-1 text-xl font-bold text-foreground">
              {salary.trackedAvgMin !== null ? gbp(salary.trackedAvgMin) : "—"}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              from {salary.trackedCount} salaried listing
              {salary.trackedCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-2">
          General Skilled Worker threshold as of June 2026 — occupation going
          rates can be higher. See the{" "}
          <Link
            href="/guides/eligibility-checklist"
            className="font-medium text-brand-strong hover:underline"
          >
            eligibility guide
          </Link>
          .
        </p>
      </div>

      {/* Matches */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Top {data.matches.length} sponsors for your profile
        </h2>
        {data.aiEnhanced && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-strong">
            <Sparkles size={12} /> AI-ranked
          </span>
        )}
      </div>

      {data.matches.length === 0 ? (
        <div className="card p-8 text-sm text-muted">
          {data.sponsorsAvailable
            ? "No sponsors matched your profile signals yet — try adding more specific skills on your profile."
            : "Couldn't load the sponsor register right now — try again in a minute."}
        </div>
      ) : (
        <ol className="space-y-3">
          {data.matches.map((m, i) => (
            <li
              key={m.sponsor.name}
              className="card flex items-center gap-4 p-4"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-sm font-bold text-brand-strong">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {m.sponsor.name}
                </p>
                <p className="truncate text-xs text-muted">
                  {m.sponsor.city} · A-rated sponsor
                </p>
                {m.reasons.length > 0 && (
                  <p className="mt-1 truncate text-xs text-brand-strong">
                    {m.reasons.slice(0, 2).join(" · ")}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Link
                  href={`/companies/${encodeURIComponent(m.sponsor.name)}`}
                  className="hidden items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-surface-muted hover:text-foreground sm:inline-flex"
                >
                  <Search size={11} /> Research
                </Link>
                <a
                  href={linkedInJobsUrl(m.sponsor.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-surface-muted hover:text-foreground"
                >
                  Jobs <ExternalLink size={11} />
                </a>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
