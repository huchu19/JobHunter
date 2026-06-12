"use client";

import { useState } from "react";
import {
  MoreHorizontal,
  BadgeCheck,
  Calendar,
  CalendarClock,
  Bell,
  ExternalLink,
  Star,
} from "lucide-react";
import type { ApplicationDTO } from "@/app/types/application";
import { STATUSES, STATUS_META } from "@/app/lib/applicationStatus";

interface KanbanCardProps {
  card: ApplicationDTO;
  onMove: (newStatus: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onOpen: () => void;
  /** Visual-only variant for the drag overlay (no menu/handlers). */
  overlay?: boolean;
  selectMode?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

const locationColors: Record<string, string> = {
  london: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  remote: "bg-sky-50 text-sky-700 ring-sky-600/15",
  hybrid: "bg-violet-50 text-violet-700 ring-violet-600/15",
  relocation: "bg-amber-50 text-amber-700 ring-amber-600/15",
};

const jobTypeColors: Record<string, string> = {
  grad: "bg-indigo-50 text-indigo-700 ring-indigo-600/15",
  intern: "bg-pink-50 text-pink-700 ring-pink-600/15",
  contract: "bg-cyan-50 text-cyan-700 ring-cyan-600/15",
};

const badgeBase =
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset";

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  });
}

function isOverdue(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

export default function KanbanCard({
  card,
  onMove,
  onDelete,
  onOpen,
  overlay = false,
  selectMode = false,
  selected = false,
  onSelect,
}: KanbanCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleMove = async (newStatus: string) => {
    await onMove(newStatus);
    setShowMenu(false);
  };

  return (
    <div
      onClick={overlay ? undefined : selectMode ? onSelect : onOpen}
      className={`rounded-xl border p-3.5 shadow-sm transition-shadow hover:shadow-md ${
        overlay
          ? "rotate-2 cursor-grabbing border-border bg-surface shadow-lg"
          : selected
          ? "cursor-pointer border-brand bg-brand-soft"
          : "cursor-pointer border-border bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-2 text-sm font-semibold text-foreground">
            {card.company}
          </h4>
          <p className="mt-0.5 line-clamp-1 text-[13px] text-muted">
            {card.role}
          </p>
          {card.url && (
            <a
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-brand-strong hover:underline"
            >
              <ExternalLink size={11} /> View posting
            </a>
          )}
        </div>

        {!overlay && selectMode && (
          <div
            onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${
              selected ? "border-brand bg-brand text-white" : "border-border bg-surface"
            }`}
          >
            {selected && <span className="text-[10px] font-bold leading-none">✓</span>}
          </div>
        )}
        {!overlay && !selectMode && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              aria-label="Card actions"
              className="rounded-md p-1 text-muted-2 hover:bg-surface-muted hover:text-foreground"
            >
              <MoreHorizontal size={16} />
            </button>

            {showMenu && (
              <div
                className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    onOpen();
                    setShowMenu(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-[13px] text-foreground hover:bg-surface-muted"
                >
                  Open details
                </button>
                <div className="my-1 border-t border-border" />
                {STATUSES.filter((s) => s !== card.status).map((status) => (
                  <button
                    key={status}
                    onClick={() => handleMove(status)}
                    className="block w-full px-3 py-2 text-left text-[13px] text-muted hover:bg-surface-muted hover:text-foreground"
                  >
                    Move to {STATUS_META[status].label}
                  </button>
                ))}
                <div className="my-1 border-t border-border" />
                <button
                  onClick={async () => {
                    await onDelete();
                    setShowMenu(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-[13px] font-medium text-danger hover:bg-danger/5"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Priority */}
      {card.priority > 0 && (
        <div className="mt-2 flex items-center gap-0.5">
          {Array.from({ length: card.priority }).map((_, i) => (
            <Star
              key={i}
              size={12}
              className="text-amber-400"
              fill="currentColor"
              strokeWidth={2}
            />
          ))}
        </div>
      )}

      {(card.locationType || card.jobType || card.sponsorVerified) && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {card.locationType && (
            <span
              className={`${badgeBase} ${
                locationColors[card.locationType] ||
                "bg-surface-muted text-muted ring-border"
              }`}
            >
              {card.locationType}
            </span>
          )}
          {card.jobType && (
            <span
              className={`${badgeBase} ${
                jobTypeColors[card.jobType] ||
                "bg-surface-muted text-muted ring-border"
              }`}
            >
              {card.jobType}
            </span>
          )}
          {card.sponsorVerified && (
            <span
              className={`${badgeBase} bg-brand-soft text-brand-strong ring-brand/20`}
            >
              <BadgeCheck size={12} strokeWidth={2.4} /> Verified
            </span>
          )}
        </div>
      )}

      {/* Date pills */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        {card.appliedAt && (
          <span className="flex items-center gap-1 text-[11px] text-muted-2">
            <Calendar size={11} /> Applied {shortDate(card.appliedAt)}
          </span>
        )}
        {card.deadline && (
          <span
            className={`flex items-center gap-1 text-[11px] font-medium ${
              isOverdue(card.deadline) ? "text-danger" : "text-muted-2"
            }`}
          >
            <CalendarClock size={11} /> Due {shortDate(card.deadline)}
          </span>
        )}
        {card.followUpDate && (
          <span
            className={`flex items-center gap-1 text-[11px] font-medium ${
              isOverdue(card.followUpDate)
                ? "text-warning"
                : "text-muted-2"
            }`}
          >
            <Bell size={11} /> Follow up {shortDate(card.followUpDate)}
          </span>
        )}
      </div>
    </div>
  );
}
