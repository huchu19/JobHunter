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
  cards: Application[];
  onCardMove: (id: string, newStatus: string) => Promise<void>;
  onCardDelete: (id: string) => Promise<void>;
}

function KanbanColumn({
  title,
  status,
  cards,
  onCardMove,
  onCardDelete,
}: ColumnProps) {
  return (
    <div className="flex flex-col bg-gray-100 rounded-lg p-4 min-w-[300px] max-h-[600px] overflow-y-auto">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-1">{cards.length} items</p>
      </div>
      <div className="space-y-3 flex-1">
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
          <p className="text-sm text-gray-400 text-center py-8">No items</p>
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

  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (error)
    return (
      <div className="text-center py-12 text-red-600">Error: {error}</div>
    );

  const columns = [
    { title: "Wishlist", status: "wishlist" },
    { title: "Applied", status: "applied" },
    { title: "Interview", status: "interview" },
    { title: "Offer", status: "offer" },
    { title: "Rejected", status: "rejected" },
  ];

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-4 pb-4">
        {columns.map((col) => (
          <KanbanColumn
            key={col.status}
            title={col.title}
            status={col.status}
            cards={applications.filter((app) => app.status === col.status)}
            onCardMove={handleCardMove}
            onCardDelete={handleCardDelete}
          />
        ))}
      </div>
    </div>
  );
}
