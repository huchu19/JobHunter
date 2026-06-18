"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Briefcase,
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
  MapPin,
  Plus,
  Search,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { SalaryComparison } from "@/app/lib/sponsorMatcher";
import type { EmployerMatch, ScoredRole } from "@/app/lib/roleMatcher";

interface MatchResponse {
  employers: EmployerMatch[];
  salary: SalaryComparison;
  profileReady: boolean;
  expanded: boolean;
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
  const [open, setOpen] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, "saving" | "saved">>({});

  useEffect(() => {
    fetch("/api/match")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to compute matches");
        return res.json();
      })
      .then((d: MatchResponse) => {
        setData(d);
        // Expand the top employer by default so roles are visible immediately.
        if (d.employers?.[0]) setOpen(d.employers[0].company);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load")
      )
      .finally(() => setLoading(false));
  }, []);

  const saveRole = async (sr: ScoredRole) => {
    const key = sr.role.url;
    if (saved[key]) return;
    setSaved((s) => ({ ...s, [key]: "saving" }));
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: sr.role.company,
          role: sr.role.title,
          url: sr.role.url,
          location: sr.role.location || undefined,
          status: "wishlist",
          source: "matches",
        }),
      });
      if (res.ok) setSaved((s) => ({ ...s, [key]: "saved" }));
      else
        setSaved((s) => {
          const n = { ...s };
          delete n[key];
          return n;
        });
    } catch {
      setSaved((s) => {
        const n = { ...s };
        delete n[key];
        return n;
      });
    }
  };

  if (loading) {
    return (
      <div className="card flex items-center gap-2 p-8 text-sm text-muted">
        <Loader2 size={15} className="animate-spin" /> Finding the best open
        roles for your profile…
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
          Matching ranks real open roles against the skills and title on your
          application profile. Fill those in (or parse them from your resume) and
          your best-fit employers will appear here.
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
        <h2 className="text-sm font-semibold text-foreground">Salary check</h2>
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

      {/* Employers ranked by their matching roles */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Best-fit employers hiring now
        </h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-strong">
          <Sparkles size={12} /> Ranked by live roles
        </span>
      </div>

      {data.employers.length === 0 ? (
        <div className="card p-8 text-sm text-muted">
          No live roles matched your profile right now. Try adding more specific
          skills on your{" "}
          <Link href="/profile" className="font-medium text-brand-strong hover:underline">
            profile
          </Link>
          , or browse the{" "}
          <Link href="/roles" className="font-medium text-brand-strong hover:underline">
            full roles feed
          </Link>
          .
        </div>
      ) : (
        <ol className="space-y-3">
          {data.employers.map((emp, i) => {
            const isOpen = open === emp.company;
            return (
              <li key={emp.company} className="card p-4">
                <div className="flex items-center gap-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-sm font-bold text-brand-strong">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                      {emp.tracked && (
                        <BadgeCheck size={13} className="shrink-0 text-brand" />
                      )}
                      {emp.company}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {emp.roles.length} matching role
                      {emp.roles.length === 1 ? "" : "s"} ·{" "}
                      {emp.roles[0]?.reasons[0] ?? "good fit"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Link
                      href={`/companies/${encodeURIComponent(emp.company)}`}
                      className="hidden items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-surface-muted hover:text-foreground sm:inline-flex"
                    >
                      <Search size={11} /> Research
                    </Link>
                    <button
                      onClick={() =>
                        setOpen((cur) => (cur === emp.company ? null : emp.company))
                      }
                      aria-expanded={isOpen}
                      className="btn-brand inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                    >
                      {emp.roles.length} role{emp.roles.length === 1 ? "" : "s"}
                      <ChevronDown
                        size={13}
                        className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <ul className="mt-2 space-y-1.5 border-t border-border pt-2">
                    {emp.roles.map((sr) => {
                      const state = saved[sr.role.url];
                      return (
                        <li
                          key={sr.role.url}
                          className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                        >
                          <Briefcase
                            size={13}
                            className="shrink-0 text-brand-strong"
                          />
                          <div className="min-w-0 flex-1">
                            <a
                              href={sr.role.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 truncate text-xs font-semibold text-foreground hover:text-brand-strong"
                            >
                              {sr.role.title}
                              <ExternalLink size={10} className="shrink-0" />
                            </a>
                            {sr.role.location && (
                              <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted">
                                <MapPin size={9} className="shrink-0" />
                                {sr.role.location}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => saveRole(sr)}
                            disabled={!!state}
                            className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                              state === "saved"
                                ? "bg-brand-soft text-brand-strong"
                                : "btn-brand"
                            }`}
                          >
                            {state === "saving" ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : state === "saved" ? (
                              <>
                                <Check size={11} /> Saved
                              </>
                            ) : (
                              <>
                                <Plus size={11} strokeWidth={2.6} /> Save
                              </>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
