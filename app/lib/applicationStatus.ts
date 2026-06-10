import type { ApplicationStatus } from "@/app/types/application";

/**
 * Single source of truth for the Kanban pipeline. Consumed by the board, the
 * card menu, the add-job modal, and the detail drawer so the status list never
 * drifts between components.
 */
export interface StatusMeta {
  status: ApplicationStatus;
  /** Display label. */
  label: string;
  /** Column accent colour (hex), used as the dot / pill tint. */
  accent: string;
  /** Left-to-right order on the board. */
  order: number;
}

export const STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  wishlist: { status: "wishlist", label: "Wishlist", accent: "#94a3b8", order: 0 },
  applied: { status: "applied", label: "Applied", accent: "#38bdf8", order: 1 },
  shortlisted: {
    status: "shortlisted",
    label: "Shortlisted",
    accent: "#a78bfa",
    order: 2,
  },
  interview: { status: "interview", label: "Interview", accent: "#2bd4c0", order: 3 },
  offer: { status: "offer", label: "Offer", accent: "#34d399", order: 4 },
  rejected: { status: "rejected", label: "Rejected", accent: "#fb7185", order: 5 },
};

/** Ordered list of statuses for rendering board columns / dropdowns. */
export const STATUSES: ApplicationStatus[] = (
  Object.values(STATUS_META) as StatusMeta[]
)
  .sort((a, b) => a.order - b.order)
  .map((m) => m.status);

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return typeof value === "string" && value in STATUS_META;
}

/**
 * The per-stage timestamp field that should be stamped when an application
 * enters `status`, or null for statuses that have no dedicated timestamp.
 */
export function stageTimestampField(
  status: string
): "appliedAt" | "interviewAt" | "offerAt" | "rejectedAt" | null {
  switch (status) {
    case "applied":
      return "appliedAt";
    case "interview":
      return "interviewAt";
    case "offer":
      return "offerAt";
    case "rejected":
      return "rejectedAt";
    default:
      return null;
  }
}

export interface TransitionActivity {
  type: "status_change";
  fromStatus: string;
  toStatus: string;
  title: string;
}

/**
 * Builds the activity-log payload for a status change, or null when the status
 * did not actually change.
 */
export function nextActivityForTransition(
  from: string,
  to: string
): TransitionActivity | null {
  if (from === to) return null;
  const toLabel = isApplicationStatus(to) ? STATUS_META[to].label : to;
  const fromLabel = isApplicationStatus(from) ? STATUS_META[from].label : from;
  return {
    type: "status_change",
    fromStatus: from,
    toStatus: to,
    title: `Moved from ${fromLabel} to ${toLabel}`,
  };
}
