"use client";

import { useEffect, useState } from "react";
import KanbanCard from "./KanbanCard";

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

interface ColumnProps {
  title: string;
  status: string;
  accent: string;
  cards: Application[];
  onCardMove: (id: string, newStatus: string) => Promise<void>;
  onCardDelete: (id: string) => Promise<void>;
}

function KanbanColumn({
  title,
  cards,
  accent,
  onCardMove,
  onCardDelete,
}: ColumnProps) {
  return (
    <div className="flex w-[280px] shrink-0 flex-col rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: accent }}
          />
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/80">
          {cards.length}
        </span>
      </div>
      <div className="thin-scroll flex-1 space-y-2.5 overflow-y-auto pr-0.5">
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            onMove={async (newStatus) => {
              await onCardMove(card.id, newStatus);
            }}
            onDelete={async () => {
              await onCardDelete(card.id);
            }}
          />
        ))}
        {cards.length === 0 && (
          <p className="py-8 text-center text-sm text-white/30">No items</p>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await fetch("/api/applications");
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setApplications(data.applications || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const handleCardMove = async (id: string, newStatus: string) => {
    const optimisticUpdate = applications.map((app) =>
      app.id === id ? { ...app, status: newStatus } : app
    );
    setApplications(optimisticUpdate);

    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update");
      const data = await response.json();
      setApplications((apps) =>
        apps.map((app) => (app.id === id ? data.application : app))
      );
    } catch (err) {
      setApplications(applications);
      console.error("Error updating application:", err);
    }
  };

  const handleCardDelete = async (id: string) => {
    const backup = applications;
    setApplications((apps) => apps.filter((app) => app.id !== id));

    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");
    } catch (err) {
      setApplications(backup);
      console.error("Error deleting application:", err);
    }
  };

  if (loading)
    return (
      <div className="rounded-card border border-border bg-surface py-12 text-center text-muted">
        Loading…
      </div>
    );
  if (error)
    return (
      <div className="rounded-card border border-danger/30 bg-danger/5 py-12 text-center font-medium text-danger">
        Error: {error}
      </div>
    );

  const columns = [
    { title: "Wishlist", status: "wishlist", accent: "#94a3b8" },
    { title: "Applied", status: "applied", accent: "#38bdf8" },
    { title: "Interview", status: "interview", accent: "#2bd4c0" },
    { title: "Offer", status: "offer", accent: "#34d399" },
    { title: "Rejected", status: "rejected", accent: "#fb7185" },
  ];

  return (
    <div className="panel-ink rounded-card p-5 shadow-[0_18px_48px_-12px_rgba(11,31,42,0.22)]">
      <div className="thin-scroll overflow-x-auto pb-1">
        <div className="flex gap-4">
          {columns.map((col) => (
            <KanbanColumn
              key={col.status}
              title={col.title}
              status={col.status}
              accent={col.accent}
              cards={applications.filter((app) => app.status === col.status)}
              onCardMove={handleCardMove}
              onCardDelete={handleCardDelete}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
