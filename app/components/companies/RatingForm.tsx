"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import type { RatingCategory, RatingDTO } from "@/app/types/company";
import {
  RATING_CATEGORIES,
  CATEGORY_LABELS,
} from "@/app/lib/companyRatings";
import { fieldClass, labelClass } from "@/app/components/dashboard/formClasses";
import PriorityStars from "@/app/components/dashboard/PriorityStars";

interface RatingFormProps {
  companyName: string;
  onSaved?: (rating: RatingDTO) => void;
}

/**
 * Anonymous star + comment rating form. Used on the company research page and
 * inside the application detail drawer. Posts to the ratings API, which
 * creates the Company row lazily.
 */
export default function RatingForm({ companyName, onSaved }: RatingFormProps) {
  const [stars, setStars] = useState(0);
  const [category, setCategory] = useState<RatingCategory>("work-culture");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async () => {
    if (stars < 1) {
      setError("Pick a star rating first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/companies/${encodeURIComponent(companyName)}/ratings`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rating: stars,
            category,
            comment: comment.trim() || null,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save rating");
      }
      const data = await res.json();
      onSaved?.(data.rating as RatingDTO);
      setStars(0);
      setComment("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save rating");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface-muted p-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>Category</label>
          <select
            className={fieldClass}
            value={category}
            onChange={(e) => setCategory(e.target.value as RatingCategory)}
          >
            {RATING_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Stars</label>
          <div className="py-1.5">
            <PriorityStars value={stars} onChange={setStars} />
          </div>
        </div>
      </div>
      <textarea
        className={`${fieldClass} mt-2`}
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comment (optional, anonymous)"
      />
      {error && (
        <p className="mt-2 text-sm font-medium text-danger">{error}</p>
      )}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="btn-brand mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {submitting ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Send size={15} />
        )}
        {saved ? "Saved ✓" : "Submit rating"}
      </button>
    </div>
  );
}
