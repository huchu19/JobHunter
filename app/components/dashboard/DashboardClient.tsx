"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Layers, CheckSquare, X, Loader2 } from "lucide-react";
import type { ApplicationDTO } from "@/app/types/application";
import {
  filterApplications,
  sortApplications,
  type ApplicationFilters,
  type SortKey,
} from "@/app/lib/applicationFilters";
import { statusChangeNotification } from "@/app/lib/reminders";
import { showNotification } from "@/app/lib/browserNotify";
import KanbanBoard from "./KanbanBoard";
import ApplicationList from "./ApplicationList";
import DashboardFilters, { type ViewMode } from "./DashboardFilters";
import ApplicationDetail from "./ApplicationDetail";
import AddJobModal from "./AddJobModal";
import BulkImportModal from "./BulkImportModal";

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
  const [bulkOpen, setBulkOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Browser notifications on status change (opt-in via /settings).
  const [browserNotify, setBrowserNotify] = useState(false);
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setBrowserNotify(!!data?.settings?.browserEnabled))
      .catch(() => {});
  }, []);

  const notifyMove = (app: ApplicationDTO | undefined, newStatus: string) => {
    if (!browserNotify || !app || app.status === newStatus) return;
    const n = statusChangeNotification(app.company, app.role, newStatus);
    if (n) showNotification(n.title, n.body);
  };

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
    notifyMove(snapshot.find((app) => app.id === id), newStatus);

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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkStatus = async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    const ids = Array.from(selectedIds);
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/applications/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        })
      )
    );
    await loadApplications();
    refreshStats();
    setBulkUpdating(false);
    exitSelectMode();
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
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface-muted"
          >
            <Layers size={15} strokeWidth={2.2} /> Bulk import
          </button>
          <button
            type="button"
            onClick={() => { setSelectMode((v) => !v); setSelectedIds(new Set()); }}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
              selectMode
                ? "border-brand/30 bg-brand-soft text-brand-strong"
                : "border-border bg-surface text-foreground hover:bg-surface-muted"
            }`}
          >
            <CheckSquare size={15} strokeWidth={2.2} /> Select
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="btn-brand inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
          >
            <Plus size={16} strokeWidth={2.4} /> Add job
          </button>
        </div>
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

      {/* Bulk action bar */}
      {selectMode && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-brand/30 bg-brand-soft px-4 py-2.5 text-sm">
          <span className="font-medium text-brand-strong">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <span className="text-xs text-brand-strong/70 mr-1">Move to:</span>
                {["wishlist", "applied", "shortlisted", "interview", "offer", "rejected"].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleBulkStatus(s)}
                    disabled={bulkUpdating}
                    className="rounded-lg border border-brand/20 bg-white/40 px-3 py-1.5 text-xs font-semibold capitalize text-brand-strong transition hover:bg-white/60 disabled:opacity-50"
                  >
                    {s === "shortlisted" ? "Shortlist" : s === "wishlist" ? "Wishlist" : s === "applied" ? "Applied" : s === "interview" ? "Interview" : s === "offer" ? "Offer" : "Rejected"}
                  </button>
                ))}
                {bulkUpdating && <Loader2 size={14} className="animate-spin text-brand-strong" />}
              </>
            )}
            <button onClick={exitSelectMode} className="ml-1 rounded-lg p-1.5 text-brand-strong/60 hover:text-brand-strong">
              <X size={15} />
            </button>
          </div>
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
          selectMode={selectMode}
          selectedIds={selectedIds}
          onSelect={toggleSelect}
        />
      ) : (
        <ApplicationList
          applications={visible}
          onOpen={setDetailId}
          selectMode={selectMode}
          selectedIds={selectedIds}
          onSelect={toggleSelect}
        />
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

      <BulkImportModal
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
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
