"use client";

import { useState } from "react";

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
  london: "bg-green-100 text-green-800",
  remote: "bg-blue-100 text-blue-800",
  hybrid: "bg-purple-100 text-purple-800",
  relocation: "bg-amber-100 text-amber-800",
};

const jobTypeColors: Record<string, string> = {
  grad: "bg-indigo-100 text-indigo-800",
  intern: "bg-pink-100 text-pink-800",
  contract: "bg-cyan-100 text-cyan-800",
};

export default function KanbanCard({
  card,
  onMove,
  onDelete,
}: KanbanCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleMove = async (newStatus: string) => {
    await onMove(newStatus);
    setShowMenu(false);
  };

  const statusOptions = [
    "wishlist",
    "applied",
    "interview",
    "offer",
    "rejected",
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 line-clamp-2">
            {card.company}
          </h4>
          <p className="text-sm text-gray-600 mt-1 line-clamp-1">{card.role}</p>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            ⋯
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                {expanded ? "Hide" : "Show"} notes
              </button>
              <div className="border-t">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleMove(status)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 capitalize"
                  >
                    Move to {status}
                  </button>
                ))}
              </div>
              <div className="border-t">
                <button
                  onClick={async () => {
                    await onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {card.locationType && (
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              locationColors[card.locationType] || "bg-gray-100 text-gray-800"
            }`}
          >
            {card.locationType}
          </span>
        )}
        {card.jobType && (
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              jobTypeColors[card.jobType] || "bg-gray-100 text-gray-800"
            }`}
          >
            {card.jobType}
          </span>
        )}
        {card.sponsorVerified && (
          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 flex items-center gap-1">
            ✓ Verified
          </span>
        )}
      </div>

      {card.appliedAt && (
        <p className="text-xs text-gray-500 mt-2">
          Applied:{" "}
          {new Date(card.appliedAt).toLocaleDateString("en-GB", {
            month: "short",
            day: "numeric",
          })}
        </p>
      )}

      {expanded && card.notes && (
        <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200">
          {card.notes}
        </p>
      )}
    </div>
  );
}
