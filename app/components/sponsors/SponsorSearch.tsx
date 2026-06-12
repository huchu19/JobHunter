"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import Fuse from "fuse.js";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Search,
  Building2,
  MapPin,
  BadgeCheck,
  Plus,
  ExternalLink,
  Cpu,
} from "lucide-react";
import { LONDON_AREA_INFO, NEAR_EC1V_AREAS } from "@/app/lib/londonAreas";
import { linkedInJobsUrl, googleCareersUrl } from "@/app/lib/companyLinks";
import AddJobModal from "@/app/components/dashboard/AddJobModal";

interface Sponsor {
  name: string;
  city: string;
  rating: string;
  route: string;
  isTech?: boolean;
  techScore?: number;
}

export default function SponsorSearch() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [selectedArea, setSelectedArea] = useState("all");
  const [techOnly, setTechOnly] = useState(false);
  const [nearEC1V, setNearEC1V] = useState(false);
  const [modalSponsor, setModalSponsor] = useState<Sponsor | null>(null);

  useEffect(() => {
    const fetchSponsors = async () => {
      try {
        const response = await fetch("/api/sponsors");
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setSponsors(data.sponsors || []);
      } catch (error) {
        console.error("Error fetching sponsors:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSponsors();
  }, []);

  // Debounce the search term so we don't re-search on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedTerm(searchTerm), 200);
    return () => clearTimeout(id);
  }, [searchTerm]);

  // Build the Fuse index once per data load, not on every keystroke.
  const fuse = useMemo(
    () =>
      new Fuse(sponsors, {
        keys: ["name", "city"],
        threshold: 0.3,
      }),
    [sponsors]
  );

  const filteredSponsors = useMemo(() => {
    // Search first (uses the prebuilt index), then apply the cheap filters.
    let filtered = debouncedTerm.trim()
      ? fuse.search(debouncedTerm).map((result) => result.item)
      : sponsors;

    // Tech filter
    if (techOnly) {
      filtered = filtered.filter((s) => s.isTech);
    }

    // Area filter
    if (nearEC1V) {
      filtered = filtered.filter((s) => {
        const city = s.city.toLowerCase();
        return NEAR_EC1V_AREAS.some(
          (area) =>
            city.includes(area.toLowerCase()) ||
            city.startsWith(area.toLowerCase())
        );
      });
    } else if (selectedArea !== "all") {
      filtered = filtered.filter((s) => {
        const city = s.city.toLowerCase();
        return (
          city.includes(selectedArea.toLowerCase()) ||
          city.startsWith(selectedArea.toLowerCase())
        );
      });
    }

    return filtered;
  }, [sponsors, fuse, debouncedTerm, selectedArea, techOnly, nearEC1V]);

  // Virtualize the results: only the visible rows are mounted, so the list
  // stays responsive even with tens of thousands of sponsors.
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredSponsors.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 65,
    overscan: 8,
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 rounded-card border border-brand/20 bg-brand-soft/50 px-5 py-4 text-sm text-brand-strong">
          <Search size={18} className="shrink-0 animate-pulse" />
          <span>
            Fetching the live gov.uk sponsor register — finding ~35,000 London
            sponsors. This can take a few seconds the first time.
          </span>
        </div>

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
    );
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="card p-5">
        {/* Search bar */}
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2"
          />
          <input
            type="text"
            placeholder="Search by company or city — e.g. Monzo, Google, EC1…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface py-3 pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
          />
        </div>

        {/* Filter row */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <select
              value={selectedArea}
              onChange={(e) => {
                setSelectedArea(e.target.value);
                setNearEC1V(false);
              }}
              className="appearance-none rounded-full border border-border bg-surface py-2 pl-4 pr-9 text-sm font-medium text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
            >
              <option value="all">All London</option>
              {Object.entries(LONDON_AREA_INFO).map(([code, info]) => (
                <option key={code} value={code}>
                  {info.label} ({code})
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-2">
              ▾
            </span>
          </div>

          <FilterChip
            active={techOnly}
            onClick={() => setTechOnly((v) => !v)}
            icon={<Cpu size={14} />}
            label="Tech only"
          />
          <FilterChip
            active={nearEC1V}
            onClick={() => {
              setNearEC1V((v) => {
                const next = !v;
                if (next) setSelectedArea("all");
                return next;
              });
            }}
            icon={<MapPin size={14} />}
            label="Near EC1V"
          />
        </div>
      </div>

      {/* Results */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold text-foreground">
            <span className="text-brand-strong">{filteredSponsors.length}</span>{" "}
            sponsors found
          </h2>
          <span className="hidden items-center gap-1.5 text-xs text-muted sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Synced from gov.uk
          </span>
        </div>

        <div
          ref={scrollRef}
          className="thin-scroll max-h-[600px] overflow-y-auto"
        >
          {filteredSponsors.length === 0 ? (
            <div className="px-6 py-16 text-center text-muted">
              No sponsors found. Try adjusting your search criteria.
            </div>
          ) : (
            <div
              style={{
                height: rowVirtualizer.getTotalSize(),
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const sponsor = filteredSponsors[virtualRow.index];
                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="flex items-center gap-4 border-b border-border px-5 py-3.5 transition-colors hover:bg-surface-muted/60"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-strong">
                      <Building2 size={18} strokeWidth={2.1} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-foreground">
                          {sponsor.name}
                        </span>
                        <BadgeCheck
                          size={15}
                          className="shrink-0 text-brand"
                          strokeWidth={2.4}
                        />
                        {sponsor.isTech && (
                          <span className="hidden rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-muted ring-1 ring-inset ring-border sm:inline">
                            Tech
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted">
                        <MapPin size={12} className="shrink-0" />
                        <span className="truncate">{sponsor.city}</span>
                        <span className="text-muted-2">·</span>
                        <span className="text-brand-strong">A-rated</span>
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <Link
                        href={`/companies/${encodeURIComponent(sponsor.name)}`}
                        className="hidden items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-surface-muted hover:text-foreground md:inline-flex"
                      >
                        Research
                      </Link>
                      <a
                        href={linkedInJobsUrl(sponsor.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-surface-muted hover:text-foreground md:inline-flex"
                      >
                        LinkedIn <ExternalLink size={11} />
                      </a>
                      <a
                        href={googleCareersUrl(sponsor.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-surface-muted hover:text-foreground md:inline-flex"
                      >
                        Careers <ExternalLink size={11} />
                      </a>
                      <button
                        onClick={() => setModalSponsor(sponsor)}
                        className="btn-brand inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold"
                      >
                        <Plus size={14} strokeWidth={2.6} /> Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AddJobModal
        isOpen={modalSponsor !== null}
        onClose={() => setModalSponsor(null)}
        onSaved={() => setModalSponsor(null)}
        initialCompany={modalSponsor?.name ?? ""}
        sponsorVerified
      />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
        active
          ? "border-brand bg-brand-soft text-brand-strong"
          : "border-border bg-surface text-muted hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
