"use client";

import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import type { RatingCategory, RatingDTO } from "@/app/types/company";
import {
  RATING_CATEGORIES,
  CATEGORY_LABELS,
  aggregateRatings,
  filterByCategory,
} from "@/app/lib/companyRatings";
import PriorityStars from "@/app/components/dashboard/PriorityStars";
import RatingForm from "./RatingForm";

interface CompanyRatingsPanelProps {
  companyName: string;
  initialRatings: RatingDTO[];
}

/**
 * Aggregated community ratings for a company: overall average, star
 * distribution, per-category averages (clickable as a filter), individual
 * comments, and an add-rating form. Aggregates always reflect every rating;
 * the category filter narrows the comment list.
 */
export default function CompanyRatingsPanel({
  companyName,
  initialRatings,
}: CompanyRatingsPanelProps) {
  const [ratings, setRatings] = useState<RatingDTO[]>(initialRatings);
  const [filter, setFilter] = useState<RatingCategory | "all">("all");

  const agg = useMemo(() => aggregateRatings(ratings), [ratings]);
  const visible = useMemo(
    () => filterByCategory(ratings, filter),
    [ratings, filter]
  );
  const maxBucket = Math.max(1, ...agg.distribution);

  return (
    <div className="card p-6">
      <h2 className="text-sm font-semibold text-foreground">
        Community ratings
      </h2>

      {agg.count === 0 ? (
        <p className="mt-2 text-sm text-muted">
          No ratings yet — be the first to rate this company below.
        </p>
      ) : (
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {/* Overall + distribution */}
          <div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-foreground">
                {agg.overall?.toFixed(1)}
              </span>
              <span className="pb-1 text-sm text-muted">
                / 5 · {agg.count} rating{agg.count === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-3 space-y-1.5">
              {[5, 4, 3, 2, 1].map((n) => (
                <div key={n} className="flex items-center gap-2 text-xs">
                  <span className="w-7 text-muted">{n}★</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{
                        width: `${(agg.distribution[n - 1] / maxBucket) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-5 text-right tabular-nums text-muted">
                    {agg.distribution[n - 1]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Per-category averages */}
          <div className="space-y-2">
            {RATING_CATEGORIES.map((c) => {
              const cat = agg.byCategory[c];
              return (
                <div
                  key={c}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2"
                >
                  <span className="text-sm font-medium text-foreground">
                    {CATEGORY_LABELS[c]}
                  </span>
                  {cat.count > 0 ? (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                      <Star
                        size={14}
                        className="text-amber-400"
                        fill="currentColor"
                      />
                      {cat.average?.toFixed(1)}
                      <span className="font-normal text-muted">
                        ({cat.count})
                      </span>
                    </span>
                  ) : (
                    <span className="text-sm text-muted-2">—</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category filter chips */}
      <div className="mt-5 flex flex-wrap gap-2">
        {(["all", ...RATING_CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              filter === c
                ? "bg-brand-soft text-brand-strong ring-1 ring-inset ring-brand/25"
                : "bg-surface-muted text-muted hover:text-foreground"
            }`}
          >
            {c === "all" ? "All" : CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Individual ratings */}
      {visible.length > 0 && (
        <ul className="mt-4 space-y-3">
          {visible.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-border bg-surface px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <PriorityStars value={r.rating} readOnly size={14} />
                <span className="text-xs text-muted">
                  {CATEGORY_LABELS[r.category as RatingCategory] ?? r.category}{" "}
                  · {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
              {r.comment && (
                <p className="mt-1.5 text-sm text-foreground">{r.comment}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      {visible.length === 0 && agg.count > 0 && (
        <p className="mt-4 text-sm text-muted">
          No ratings in this category yet.
        </p>
      )}

      {/* Add rating */}
      <div className="mt-5 border-t border-border pt-4">
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          Rate this company
        </h3>
        <RatingForm
          companyName={companyName}
          onSaved={(rating) => setRatings((prev) => [rating, ...prev])}
        />
      </div>
    </div>
  );
}
