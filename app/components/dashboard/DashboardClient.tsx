"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import type { ApplicationDTO } from "@/app/types/application";
import {
  filterApplications,
  sortApplications,
  type ApplicationFilters,
  type SortKey,
} from "@/app/lib/applicationFilters";
import KanbanBoard from "./KanbanBoard";
import ApplicationList from "./ApplicationList";
import DashboardFilters, { type ViewMode } from "./DashboardFilters";
import ApplicationDetail from "./ApplicationDetail";
import AddJobModal from "./AddJobModal";

export default function DashboardClient() {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const [filters, setFilters] = useState<ApplicationFilters>({});
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [view, setView] = useState<ViewMode>("board");

  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const loadApplications = async () => {
    try {
      const res = await fetch("/api/applications");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setApplications((data.applications as ApplicationDTO[]) || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh the server StatsBar without re-suspending the board.
  const refreshStats = () => router.refresh();

  const handleMove = async (id: string, newStatus: string) => {
    let snapshot: ApplicationDTO[] = [];
    setApplications((prev) => {
      snapshot = prev;
      return prev.map((app) =>
        app.id === id ? { ...app, status: newStatus } : app
      );
    });

    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const data = await res.json();
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? data.application : app))
      );
      refreshStats();
    } catch {
      setApplications(snapshot);
      setBanner("Couldn't move that card — change reverted.");
    }
  };

  const handleDelete = async (id: string) => {
    let snapshot: ApplicationDTO[] = [];
    setApplications((prev) => {
      snapshot = prev;
      return prev.filter((app) => app.id !== id);
    });

    try {
      const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      refreshStats();
    } catch {
      setApplications(snapshot);
      setBanner("Couldn't delete that application — change reverted.");
    }
  };

  // A detail-drawer save returns the full updated record.
  const handleDetailSaved = (updated: ApplicationDTO) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === updated.id ? { ...app, ...updated } : app))
    );
    refreshStats();
  };

  const handleDetailDeleted = (id: string) => {
    setApplications((prev) => prev.filter((app) => app.id !== id));
    refreshStats();
  };

  const visible = useMemo(
    () => sortApplications(filterApplications(applications, filters), sortKey),
    [applications, filters, sortKey]
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <DashboardFilters
          filters={filters}
          onFiltersChange={setFilters}
          sortKey={sortKey}
          onSortChange={setSortKey}
          view={view}
          onViewChange={setView}
          resultCount={visible.length}
        />
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="btn-brand inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
        >
          <Plus size={16} strokeWidth={2.4} /> Add job
        </button>
      </div>

      {banner && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-2.5 text-sm font-medium text-warning">
          <span>{banner}</span>
          <button
            onClick={() => {
              setBanner(null);
              loadApplications();
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
          >
            <RefreshCw size={13} /> Reload
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-card border border-border bg-surface py-12 text-center text-muted">
          Loading applications…
        </div>
      ) : error ? (
        <div className="rounded-card border border-danger/30 bg-danger/5 py-12 text-center font-medium text-danger">
          Error: {error}
        </div>
      ) : view === "board" ? (
        <KanbanBoard
          applications={visible}
          onMove={handleMove}
          onDelete={handleDelete}
          onOpen={setDetailId}
        />
      ) : (
        <ApplicationList applications={visible} onOpen={setDetailId} />
      )}

      <AddJobModal
        isOpen={addOpen}
        showImport
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          loadApplications();
          refreshStats();
        }}
      />

      <ApplicationDetail
        applicationId={detailId}
        isOpen={detailId !== null}
        onClose={() => setDetailId(null)}
        onSaved={handleDetailSaved}
        onDeleted={handleDetailDeleted}
      />
    </div>
  );
}
