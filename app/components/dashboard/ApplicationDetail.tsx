"use client";

import { useEffect, useState } from "react";
import {
  X,
  BadgeCheck,
  Loader2,
  ExternalLink,
  Trash2,
  Plus,
} from "lucide-react";
import type {
  ApplicationDTO,
  ActivityDTO,
  ApplicationStatus,
  JobType,
  LocationType,
} from "@/app/types/application";
import Link from "next/link";
import { STATUSES, STATUS_META } from "@/app/lib/applicationStatus";
import { fieldClass, labelClass } from "./formClasses";
import PriorityStars from "./PriorityStars";
import ActivityTimeline from "./ActivityTimeline";
import RatingForm from "@/app/components/companies/RatingForm";

interface ApplicationDetailProps {
  applicationId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updated: ApplicationDTO) => void;
  onDeleted: (id: string) => void;
}

const LOCATION_TYPES: LocationType[] = [
  "london",
  "remote",
  "hybrid",
  "relocation",
];
const JOB_TYPES: JobType[] = ["grad", "intern", "contract"];

// Editable field set, with which control renders each.
type FieldKey =
  | "company"
  | "role"
  | "url"
  | "location"
  | "salary"
  | "contactName"
  | "contactEmail"
  | "rejectedReason"
  | "notes"
  | "jobDescription";

// Convert an ISO timestamp to the yyyy-mm-dd value an <input type="date"> wants.
function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// Convert a date-input value back to an ISO string (or null when cleared).
function fromDateInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function ApplicationDetail({
  applicationId,
  isOpen,
  onClose,
  onSaved,
  onDeleted,
}: ApplicationDetailProps) {
  const [app, setApp] = useState<ApplicationDTO | null>(null);
  const [activities, setActivities] = useState<ActivityDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add-event form state.
  const [eventType, setEventType] = useState<"interview" | "note" | "follow_up">(
    "interview"
  );
  const [eventTitle, setEventTitle] = useState("");
  const [eventNotes, setEventNotes] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [addingEvent, setAddingEvent] = useState(false);

  useEffect(() => {
    if (!isOpen || !applicationId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/applications/${applicationId}`);
        if (!res.ok) throw new Error("Failed to load application");
        const data = await res.json();
        if (cancelled) return;
        const { activities: acts, ...rest } = data.application;
        setApp(rest as ApplicationDTO);
        setActivities((acts as ActivityDTO[]) || []);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, applicationId]);

  const update = (patch: Partial<ApplicationDTO>) =>
    setApp((prev) => (prev ? { ...prev, ...patch } : prev));

  const setText = (key: FieldKey, value: string) =>
    update({ [key]: value } as Partial<ApplicationDTO>);

  const handleSave = async () => {
    if (!app) return;
    if (!app.company.trim() || !app.role.trim()) {
      setError("Company and role are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: app.company.trim(),
          role: app.role.trim(),
          url: app.url,
          location: app.location,
          locationType: app.locationType,
          jobType: app.jobType,
          status: app.status,
          salary: app.salary,
          notes: app.notes,
          jobDescription: app.jobDescription,
          contactName: app.contactName,
          contactEmail: app.contactEmail,
          rejectedReason: app.rejectedReason,
          priority: app.priority,
          deadline: app.deadline,
          followUpDate: app.followUpDate,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      const data = await res.json();
      onSaved(data.application as ApplicationDTO);
      // Re-fetch activities since a status change may have logged one.
      const refreshed = await fetch(`/api/applications/${app.id}`);
      if (refreshed.ok) {
        const fresh = await refreshed.json();
        setActivities((fresh.application.activities as ActivityDTO[]) || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleAddEvent = async () => {
    if (!app) return;
    if (!eventTitle.trim() && !eventNotes.trim()) return;
    setAddingEvent(true);
    try {
      const res = await fetch(`/api/applications/${app.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: eventType,
          title: eventTitle.trim() || null,
          notes: eventNotes.trim() || null,
          occurredAt: fromDateInput(eventDate),
        }),
      });
      if (!res.ok) throw new Error("Failed to add event");
      const data = await res.json();
      setActivities((prev) =>
        [data.activity as ActivityDTO, ...prev].sort(
          (a, b) =>
            new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
        )
      );
      setEventTitle("");
      setEventNotes("");
      setEventDate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add event");
    } finally {
      setAddingEvent(false);
    }
  };

  const handleDelete = async () => {
    if (!app) return;
    if (!confirm(`Delete the application for ${app.company}?`)) return;
    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      onDeleted(app.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onClick={onClose}
    >
      <div
        className="thin-scroll h-full w-full max-w-xl overflow-y-auto bg-surface shadow-[0_18px_48px_-12px_rgba(11,31,42,0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-surface px-6 py-4">
          <div className="min-w-0">
            {loading || !app ? (
              <p className="text-lg font-semibold text-muted">Loading…</p>
            ) : (
              <>
                <h2 className="truncate text-lg font-semibold text-foreground">
                  {app.company}
                </h2>
                <p className="truncate text-sm text-muted">{app.role}</p>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-2 transition hover:bg-surface-muted hover:text-foreground"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <p className="mx-6 mt-4 rounded-xl border border-danger/25 bg-danger/5 px-3 py-2 text-sm font-medium text-danger">
            {error}
          </p>
        )}

        {app && !loading && (
          <div className="space-y-6 px-6 py-5">
            {/* Status + priority + verified row */}
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className={labelClass}>Stage</label>
                <select
                  value={app.status}
                  onChange={(e) => update({ status: e.target.value })}
                  className={`${fieldClass} capitalize`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_META[s as ApplicationStatus].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Priority</label>
                <div className="py-1.5">
                  <PriorityStars
                    value={app.priority}
                    onChange={(v) => update({ priority: v })}
                  />
                </div>
              </div>
              {app.sponsorVerified && (
                <span className="mt-5 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-strong ring-1 ring-inset ring-brand/20">
                  <BadgeCheck size={13} strokeWidth={2.4} /> Sponsor verified
                </span>
              )}
            </div>

            {/* Core fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Company *</label>
                <input
                  className={fieldClass}
                  value={app.company}
                  onChange={(e) => setText("company", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Role *</label>
                <input
                  className={fieldClass}
                  value={app.role}
                  onChange={(e) => setText("role", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Job posting URL</label>
              <div className="flex gap-2">
                <input
                  className={fieldClass}
                  value={app.url ?? ""}
                  onChange={(e) => setText("url", e.target.value)}
                  placeholder="https://…"
                />
                {app.url && (
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center rounded-lg border border-border px-3 text-brand-strong hover:bg-surface-muted"
                    aria-label="Open posting"
                  >
                    <ExternalLink size={15} />
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Location</label>
                <input
                  className={fieldClass}
                  value={app.location ?? ""}
                  onChange={(e) => setText("location", e.target.value)}
                  placeholder="e.g. London EC1"
                />
              </div>
              <div>
                <label className={labelClass}>Location type</label>
                <select
                  className={`${fieldClass} capitalize`}
                  value={app.locationType}
                  onChange={(e) => update({ locationType: e.target.value })}
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
                <label className={labelClass}>Job type</label>
                <select
                  className={`${fieldClass} capitalize`}
                  value={app.jobType}
                  onChange={(e) => update({ jobType: e.target.value })}
                >
                  {JOB_TYPES.map((t) => (
                    <option key={t} value={t} className="capitalize">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Salary</label>
                <input
                  className={fieldClass}
                  value={app.salary ?? ""}
                  onChange={(e) => setText("salary", e.target.value)}
                  placeholder="e.g. £60–80k"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Deadline</label>
                <input
                  type="date"
                  className={fieldClass}
                  value={toDateInput(app.deadline)}
                  onChange={(e) =>
                    update({ deadline: fromDateInput(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Follow-up date</label>
                <input
                  type="date"
                  className={fieldClass}
                  value={toDateInput(app.followUpDate)}
                  onChange={(e) =>
                    update({ followUpDate: fromDateInput(e.target.value) })
                  }
                />
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Contact name</label>
                <input
                  className={fieldClass}
                  value={app.contactName ?? ""}
                  onChange={(e) => setText("contactName", e.target.value)}
                  placeholder="Recruiter / hiring manager"
                />
              </div>
              <div>
                <label className={labelClass}>Contact email</label>
                <input
                  type="email"
                  className={fieldClass}
                  value={app.contactEmail ?? ""}
                  onChange={(e) => setText("contactEmail", e.target.value)}
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {app.status === "rejected" && (
              <div>
                <label className={labelClass}>Rejection reason</label>
                <input
                  className={fieldClass}
                  value={app.rejectedReason ?? ""}
                  onChange={(e) => setText("rejectedReason", e.target.value)}
                  placeholder="e.g. after interview, position filled, ghosted"
                />
              </div>
            )}

            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                className={fieldClass}
                rows={3}
                value={app.notes ?? ""}
                onChange={(e) => setText("notes", e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Job description</label>
              <textarea
                className={fieldClass}
                rows={5}
                value={app.jobDescription ?? ""}
                onChange={(e) => setText("jobDescription", e.target.value)}
                placeholder="Paste the full job description here for reference…"
              />
            </div>

            {/* Save row */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-danger transition hover:bg-danger/5"
              >
                <Trash2 size={15} /> Delete
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-brand inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {saving && <Loader2 size={15} className="animate-spin" />}
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>

            {/* Timeline */}
            <div className="border-t border-border pt-5">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Timeline
              </h3>

              {/* Add-event form */}
              <div className="mb-4 rounded-xl border border-border bg-surface-muted p-3">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className={`${fieldClass} capitalize`}
                    value={eventType}
                    onChange={(e) =>
                      setEventType(
                        e.target.value as "interview" | "note" | "follow_up"
                      )
                    }
                  >
                    <option value="interview">Interview</option>
                    <option value="follow_up">Follow-up</option>
                    <option value="note">Note</option>
                  </select>
                  <input
                    type="date"
                    className={fieldClass}
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </div>
                <input
                  className={`${fieldClass} mt-2`}
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Title (e.g. Phone screen, Tech round 2)"
                />
                <textarea
                  className={`${fieldClass} mt-2`}
                  rows={2}
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  placeholder="Notes (optional)"
                />
                <button
                  onClick={handleAddEvent}
                  disabled={
                    addingEvent || (!eventTitle.trim() && !eventNotes.trim())
                  }
                  className="btn-brand mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {addingEvent ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Plus size={15} />
                  )}
                  Add to timeline
                </button>
              </div>

              <ActivityTimeline activities={activities} />
            </div>

            {/* Company research + rating */}
            <div className="border-t border-border pt-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Rate {app.company}
                </h3>
                <Link
                  href={`/companies/${encodeURIComponent(app.company)}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand-strong hover:underline"
                >
                  Company research <ExternalLink size={13} />
                </Link>
              </div>
              <RatingForm companyName={app.company} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
