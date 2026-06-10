"use client";

import { Search, LayoutGrid, List, BadgeCheck } from "lucide-react";
import type {
  ApplicationFilters,
  SortKey,
} from "@/app/lib/applicationFilters";

export type ViewMode = "board" | "list";

interface DashboardFiltersProps {
  filters: ApplicationFilters;
  onFiltersChange: (filters: ApplicationFilters) => void;
  sortKey: SortKey;
  onSortChange: (sort: SortKey) => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  resultCount: number;
}

const controlClass =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25";

export default function DashboardFilters({
  filters,
  onFiltersChange,
  sortKey,
  onSortChange,
  view,
  onViewChange,
  resultCount,
}: DashboardFiltersProps) {
  const set = (patch: Partial<ApplicationFilters>) =>
    onFiltersChange({ ...filters, ...patch });

  return (
    <div className="card flex flex-wrap items-center gap-2.5 p-3">
      {/* Search */}
      <div className="relative min-w-[200px] flex-1">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-2"
        />
        <input
          value={filters.search ?? ""}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Search company, role, location, notes…"
          className={`${controlClass} w-full pl-9`}
        />
      </div>

      <select
        value={filters.locationType ?? ""}
        onChange={(e) => set({ locationType: e.target.value || undefined })}
        className={`${controlClass} capitalize`}
        aria-label="Filter by location type"
      >
        <option value="">All locations</option>
        <option value="london">London</option>
        <option value="remote">Remote</option>
        <option value="hybrid">Hybrid</option>
        <option value="relocation">Relocation</option>
      </select>

      <select
        value={filters.jobType ?? ""}
        onChange={(e) => set({ jobType: e.target.value || undefined })}
        className={`${controlClass} capitalize`}
        aria-label="Filter by job type"
      >
        <option value="">All types</option>
        <option value="grad">Grad</option>
        <option value="intern">Intern</option>
        <option value="contract">Contract</option>
      </select>

      <select
        value={String(filters.priorityMin ?? 0)}
        onChange={(e) => set({ priorityMin: Number(e.target.value) })}
        className={controlClass}
        aria-label="Minimum priority"
      >
        <option value="0">Any priority</option>
        <option value="3">★★★ +</option>
        <option value="4">★★★★ +</option>
        <option value="5">★★★★★</option>
      </select>

      <button
        type="button"
        onClick={() => set({ verifiedOnly: !filters.verifiedOnly })}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
          filters.verifiedOnly
            ? "border-brand/30 bg-brand-soft text-brand-strong"
            : "border-border bg-surface text-muted hover:text-foreground"
        }`}
      >
        <BadgeCheck size={15} /> Verified
      </button>

      <select
        value={sortKey}
        onChange={(e) => onSortChange(e.target.value as SortKey)}
        className={controlClass}
        aria-label="Sort by"
      >
        <option value="updated">Recently updated</option>
        <option value="deadline">Deadline</option>
        <option value="applied">Date applied</option>
        <option value="priority">Priority</option>
      </select>

      <span className="text-xs font-medium text-muted-2">
        {resultCount} {resultCount === 1 ? "job" : "jobs"}
      </span>

      {/* View toggle */}
      <div className="ml-auto inline-flex overflow-hidden rounded-lg border border-border">
        <button
          type="button"
          onClick={() => onViewChange("board")}
          aria-label="Board view"
          className={`grid h-9 w-9 place-items-center transition ${
            view === "board"
              ? "bg-brand-soft text-brand-strong"
              : "bg-surface text-muted-2 hover:text-foreground"
          }`}
        >
          <LayoutGrid size={16} />
        </button>
        <button
          type="button"
          onClick={() => onViewChange("list")}
          aria-label="List view"
          className={`grid h-9 w-9 place-items-center border-l border-border transition ${
            view === "list"
              ? "bg-brand-soft text-brand-strong"
              : "bg-surface text-muted-2 hover:text-foreground"
          }`}
        >
          <List size={16} />
        </button>
      </div>
    </div>
  );
}
