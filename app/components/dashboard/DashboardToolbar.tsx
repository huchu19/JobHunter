"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import AddJobModal from "./AddJobModal";

// Client toolbar for the dashboard header: opens the Add-job modal, which also
// hosts the "Import from URL" flow. Refreshes the route on save so the server
// components (StatsBar, KanbanBoard) re-fetch.
export default function DashboardToolbar() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-brand inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
      >
        <Plus size={16} strokeWidth={2.4} /> Add job
      </button>

      <AddJobModal
        isOpen={open}
        showImport
        onClose={() => setOpen(false)}
        onSaved={() => router.refresh()}
      />
    </>
  );
}
