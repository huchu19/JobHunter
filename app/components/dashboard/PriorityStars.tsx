"use client";

import { Star } from "lucide-react";

interface PriorityStarsProps {
  value: number; // 0..5
  onChange?: (value: number) => void;
  size?: number;
  /** Read-only display (no hover / click). */
  readOnly?: boolean;
}

/**
 * 5-star interest / priority picker. Clicking the active star again clears it
 * back to 0 (unset). Used in the add-job modal and the detail drawer.
 */
export default function PriorityStars({
  value,
  onChange,
  size = 18,
  readOnly = false,
}: PriorityStarsProps) {
  const interactive = !readOnly && !!onChange;

  return (
    <div className="inline-flex items-center gap-0.5" role="group" aria-label="Priority">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        return (
          <button
            key={n}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(value === n ? 0 : n)}
            aria-label={`Set priority ${n}`}
            className={`rounded p-0.5 transition ${
              interactive
                ? "cursor-pointer hover:scale-110"
                : "cursor-default"
            }`}
          >
            <Star
              size={size}
              className={
                filled ? "text-amber-400" : "text-muted-2/40"
              }
              fill={filled ? "currentColor" : "none"}
              strokeWidth={2}
            />
          </button>
        );
      })}
    </div>
  );
}
