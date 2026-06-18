"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  BadgeCheck,
  Check,
  ExternalLink,
  Loader2,
  MapPin,
  Plus,
  Search,
} from "lucide-react";
import type { RolesFeedResult, FeedRole } from "@/app/types/careers";

export default function RolesFeed() {
  const [data, setData] = useState<RolesFeedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState<string | null>(null);
  // Roles saved to the board this session (key: company|title) → "saving"|"saved".
  const [saved, setSaved] = useState<Record<string, "saving" | "saved">>({});

  useEffect(() => {
    fetch("/api/roles/feed")
      .then((res) => {
        if (!res.ok) throw new Error("feed failed");
        return res.json();
      })
      .then((d: RolesFeedResult) => setData(d))
      .catch(() => setErrored(true))
      .finally(() => setLoading(false));
  }, []);

  const roles = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.roles.filter((r) => {
      if (company && r.company !== company) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.company.toLowerCase().includes(q) ||
        (r.location ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, query, company]);

  const saveRole = async (r: FeedRole) => {
    const key = `${r.company}|${r.title}`;
    if (saved[key]) return;
    setSaved((s) => ({ ...s, [key]: "saving" }));
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: r.company,
          role: r.title,
          url: r.url,
          location: r.location || undefined,
          status: "wishlist",
          source: "roles-feed",
        }),
      });
      setSaved((s) => ({ ...s, [key]: res.ok ? "saved" : "saving" }));
      if (!res.ok) setSaved((s) => ({ ...s, [key]: undefined as never }));
    } catch {
      setSaved((s) => {
        const next = { ...s };
        delete next[key];
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="card flex items-center gap-2 p-8 text-sm text-muted">
        <Loader2 size={15} className="animate-spin" /> Pulling live roles from
        sponsor careers boards…
      </div>
    );
  }
  if (errored || !data) {
    return (
      <div className="card p-8 text-sm font-medium text-danger">
        Couldn&apos;t load the roles feed. Try again in a moment.
      </div>
    );
  }
  if (data.roles.length === 0) {
    return (
      <div className="card p-8 text-sm text-muted">
        No live roles right now — the sponsor boards may be temporarily
        unreachable. Try refreshing shortly.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search roles, companies, locations…"
          className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-brand/50"
        />
      </div>

      {/* Company filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setCompany(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            company === null
              ? "bg-brand-soft text-brand-strong ring-1 ring-inset ring-brand/20"
              : "bg-surface-muted text-muted hover:text-foreground"
          }`}
        >
          All · {data.roles.length}
        </button>
        {data.companies.map((c) => (
          <button
            key={c.name}
            onClick={() => setCompany(company === c.name ? null : c.name)}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition ${
              company === c.name
                ? "bg-brand-soft text-brand-strong ring-1 ring-inset ring-brand/20"
                : "bg-surface-muted text-muted hover:text-foreground"
            }`}
          >
            {c.tracked && <BadgeCheck size={11} className="text-brand" />}
            {c.name} · {c.count}
          </button>
        ))}
      </div>

      {/* Roles */}
      <p className="text-xs text-muted-2">
        {roles.length} role{roles.length === 1 ? "" : "s"}
        {company ? ` at ${company}` : ` across ${data.companies.length} companies`}
      </p>
      <ul className="space-y-2">
        {roles.map((r) => {
          const key = `${r.company}|${r.title}`;
          const state = saved[key];
          return (
            <li
              key={`${r.company}-${r.url}`}
              className="card flex items-center gap-4 p-4"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-strong">
                <Briefcase size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 truncate text-sm font-semibold text-foreground hover:text-brand-strong"
                >
                  {r.title} <ExternalLink size={11} className="shrink-0" />
                </a>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    {r.tracked && (
                      <BadgeCheck size={11} className="text-brand" />
                    )}
                    {r.company}
                  </span>
                  {r.location && (
                    <>
                      <span className="text-muted-2">·</span>
                      <MapPin size={10} className="shrink-0" />
                      <span className="truncate">{r.location}</span>
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => saveRole(r)}
                disabled={!!state}
                className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  state === "saved"
                    ? "bg-brand-soft text-brand-strong"
                    : "btn-brand"
                }`}
              >
                {state === "saving" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : state === "saved" ? (
                  <>
                    <Check size={13} /> Saved
                  </>
                ) : (
                  <>
                    <Plus size={13} strokeWidth={2.6} /> Save
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
