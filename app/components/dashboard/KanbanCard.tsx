"use client";

import { useState } from "react";
import { MoreHorizontal, BadgeCheck, Calendar, ExternalLink } from "lucide-react";

interface Application {
  id: string;
  company: string;
  role: string;
  status: string;
  location: string | null;
  locationType: string;
  jobType: string;
  sponsorVerified: boolean;
  appliedAt: string | null;
  notes: string | null;
  url: string | null;
}

interface KanbanCardProps {
  card: Application;
  onMove: (newStatus: string) => Promise<void>;
  onDelete: () => Promise<void>;
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

export default function KanbanCard({ card, onMove, onDelete }: KanbanCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleMove = async (newStatus: string) => {
    await onMove(newStatus);
    setShowMenu(false);
  };

  const statusOptions = ["wishlist", "applied", "interview", "offer", "rejected"];

  return (
    <div className="rounded-xl border border-border bg-surface p-3.5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-2 text-sm font-semibold text-foreground">
            {card.company}
          </h4>
          <p className="mt-0.5 line-clamp-1 text-[13px] text-muted">{card.role}</p>
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

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Card actions"
            className="rounded-md p-1 text-muted-2 hover:bg-surface-muted hover:text-foreground"
          >
            <MoreHorizontal size={16} />
          </button>

          {showMenu && (
            <div className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg">
              <button
                onClick={() => setExpanded(!expanded)}
                className="block w-full px-3 py-2 text-left text-[13px] text-foreground hover:bg-surface-muted"
              >
                {expanded ? "Hide" : "Show"} notes
              </button>
              <div className="my-1 border-t border-border" />
              {statusOptions.map((status) => (
                <button
                  key={status}
                  onClick={() => handleMove(status)}
                  className="block w-full px-3 py-2 text-left text-[13px] capitalize text-muted hover:bg-surface-muted hover:text-foreground"
                >
                  Move to {status}
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
      </div>

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

      {card.appliedAt && (
        <p className="mt-2.5 flex items-center gap-1 text-[11px] text-muted-2">
          <Calendar size={11} />
          Applied{" "}
          {new Date(card.appliedAt).toLocaleDateString("en-GB", {
            month: "short",
            day: "numeric",
          })}
        </p>
      )}

      {expanded && card.notes && (
        <p className="mt-2.5 border-t border-border pt-2.5 text-[13px] text-muted">
          {card.notes}
        </p>
      )}
    </div>
  );
}
