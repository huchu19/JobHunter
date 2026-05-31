"use client";

import { useEffect, useState } from "react";
import { X, BadgeCheck, Link2, Loader2 } from "lucide-react";
import type {
  ApplicationStatus,
  JobType,
  LocationType,
} from "@/app/types/application";

const fieldClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25";
const labelClass = "mb-1 block text-sm font-medium text-foreground";

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialCompany?: string;
  initialUrl?: string;
  initialRole?: string;
  initialLocation?: string;
  initialLocationType?: LocationType;
  initialJobType?: JobType;
  initialSalary?: string;
  initialNotes?: string;
  sponsorVerified?: boolean;
  // When true, show the "Import from URL" bar at the top of the modal.
  showImport?: boolean;
}

const LOCATION_TYPES: LocationType[] = [
  "london",
  "remote",
  "hybrid",
  "relocation",
];
const JOB_TYPES: JobType[] = ["grad", "intern", "contract"];
const STATUSES: ApplicationStatus[] = [
  "wishlist",
  "applied",
  "interview",
  "offer",
  "rejected",
];

export default function AddJobModal({
  isOpen,
  onClose,
  onSaved,
  initialCompany = "",
  initialUrl = "",
  initialRole = "",
  initialLocation = "",
  initialLocationType = "london",
  initialJobType = "grad",
  initialSalary = "",
  initialNotes = "",
  sponsorVerified = false,
  showImport = false,
}: AddJobModalProps) {
  const [company, setCompany] = useState(initialCompany);
  const [role, setRole] = useState(initialRole);
  const [url, setUrl] = useState(initialUrl);
  const [location, setLocation] = useState(initialLocation);
  const [locationType, setLocationType] =
    useState<LocationType>(initialLocationType);
  const [jobType, setJobType] = useState<JobType>(initialJobType);
  const [status, setStatus] = useState<ApplicationStatus>("wishlist");
  const [salary, setSalary] = useState(initialSalary);
  const [notes, setNotes] = useState(initialNotes);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Import-from-URL state.
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importNote, setImportNote] = useState<string | null>(null);

  // Reset the form whenever the modal is (re)opened with new initial values.
  useEffect(() => {
    if (isOpen) {
      setCompany(initialCompany);
      setRole(initialRole);
      setUrl(initialUrl);
      setLocation(initialLocation);
      setLocationType(initialLocationType);
      setJobType(initialJobType);
      setStatus("wishlist");
      setSalary(initialSalary);
      setNotes(initialNotes);
      setError(null);
      setSubmitting(false);
      setImportUrl("");
      setImporting(false);
      setImportNote(null);
    }
    // Re-seed only when the modal opens or its initial values change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    initialCompany,
    initialUrl,
    initialRole,
    initialLocation,
    initialLocationType,
    initialJobType,
    initialSalary,
    initialNotes,
  ]);

  // Fetch listing details from a pasted URL and prefill the form fields.
  const handleImport = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportNote(null);
    setError(null);
    try {
      const res = await fetch(
        `/api/parse-url?url=${encodeURIComponent(importUrl.trim())}`
      );
      const data = await res.json();
      if (data.company) setCompany(data.company);
      if (data.role) setRole(data.role);
      setUrl(importUrl.trim());
      if (data.location) setLocation(data.location);
      if (data.locationType) setLocationType(data.locationType);
      if (data.jobType) setJobType(data.jobType);
      if (data.salary) setSalary(data.salary);
      if (data.notes) setNotes(data.notes);

      if (data.company || data.role) {
        setImportNote("Imported — review the fields below and save.");
      } else {
        setImportNote(
          "Couldn't read this page automatically. Fill the fields in manually."
        );
      }
    } catch {
      setImportNote("Failed to fetch that URL. Fill the fields in manually.");
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!company.trim() || !role.trim()) {
      setError("Company and role are required.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company.trim(),
          role: role.trim(),
          url: url.trim() || null,
          location: location.trim() || null,
          locationType,
          jobType,
          status,
          salary: salary.trim() || null,
          notes: notes.trim() || null,
          source: "manual",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save application");
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="thin-scroll w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-surface shadow-[0_18px_48px_-12px_rgba(11,31,42,0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Add job</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-2 transition hover:bg-surface-muted hover:text-foreground"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {showImport && (
            <div className="rounded-xl border border-border bg-surface-muted p-3">
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Link2 size={15} className="text-brand-strong" /> Import from URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleImport();
                    }
                  }}
                  placeholder="Paste a job posting link…"
                  className={fieldClass}
                />
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={importing || !importUrl.trim()}
                  className="btn-brand inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {importing ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    "Import"
                  )}
                </button>
              </div>
              {importNote && (
                <p className="mt-2 text-xs text-muted">{importNote}</p>
              )}
            </div>
          )}

          {sponsorVerified && (
            <div className="flex items-center gap-2 rounded-xl border border-brand/20 bg-brand-soft px-3 py-2 text-sm font-medium text-brand-strong">
              <BadgeCheck size={16} strokeWidth={2.4} /> Verified sponsor
            </div>
          )}

          <div>
            <label className={labelClass}>
              Company *
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Role *
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Software Engineer"
              required
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Job posting URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. London EC1"
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Location type
              </label>
              <select
                value={locationType}
                onChange={(e) =>
                  setLocationType(e.target.value as LocationType)
                }
                className={`${fieldClass} capitalize`}
              >
                {LOCATION_TYPES.map((t) => (
                  <option key={t} value={t} className="capitalize">
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Job type
              </label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value as JobType)}
                className={`${fieldClass} capitalize`}
              >
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t} className="capitalize">
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Status
              </label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as ApplicationStatus)
                }
                className={`${fieldClass} capitalize`}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Salary
            </label>
            <input
              type="text"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="e.g. £60-80k"
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={fieldClass}
            />
          </div>

          {error && (
            <p className="rounded-xl border border-danger/25 bg-danger/5 px-3 py-2 text-sm font-medium text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-brand rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
