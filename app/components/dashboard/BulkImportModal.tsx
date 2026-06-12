"use client";

import { useState } from "react";
import { X, Loader2, Link2, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { fieldClass, labelClass } from "./formClasses";

interface ParsedJob {
  url: string;
  company: string;
  role: string;
  location: string;
  salary: string;
  notes: string;
  /** null = pending, true = saved, false = failed */
  saved: boolean | null;
  error?: string;
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function BulkImportModal({ isOpen, onClose, onSaved }: BulkImportModalProps) {
  const [rawUrls, setRawUrls] = useState("");
  const [parsing, setParsing] = useState(false);
  const [jobs, setJobs] = useState<ParsedJob[]>([]);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"input" | "preview">("input");

  const reset = () => {
    setRawUrls("");
    setParsing(false);
    setJobs([]);
    setSaving(false);
    setStep("input");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const parseUrls = async () => {
    const urls = rawUrls
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => u.startsWith("http"));

    if (urls.length === 0) return;
    setParsing(true);

    // Fire all parse requests in parallel
    const results = await Promise.all(
      urls.map(async (url): Promise<ParsedJob> => {
        try {
          const res = await fetch(`/api/parse-url?url=${encodeURIComponent(url)}`);
          const data = await res.json();
          return {
            url,
            company: data.company || "",
            role: data.role || "",
            location: data.location || "",
            salary: data.salary || "",
            notes: data.notes || "",
            saved: null,
          };
        } catch {
          return { url, company: "", role: "", location: "", salary: "", notes: "", saved: null };
        }
      })
    );

    setJobs(results);
    setParsing(false);
    setStep("preview");
  };

  const updateJob = (i: number, patch: Partial<ParsedJob>) => {
    setJobs((prev) => prev.map((j, idx) => (idx === i ? { ...j, ...patch } : j)));
  };

  const removeJob = (i: number) => {
    setJobs((prev) => prev.filter((_, idx) => idx !== i));
  };

  const saveAll = async () => {
    const pending = jobs.filter((j) => j.saved !== true && j.company && j.role);
    if (pending.length === 0) return;
    setSaving(true);

    await Promise.all(
      jobs.map(async (job, i) => {
        if (job.saved === true || !job.company || !job.role) return;
        try {
          const res = await fetch("/api/applications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              company: job.company.trim(),
              role: job.role.trim(),
              url: job.url,
              location: job.location.trim() || null,
              salary: job.salary.trim() || null,
              notes: job.notes.trim() || null,
              status: "wishlist",
              source: "manual",
            }),
          });
          if (!res.ok) throw new Error("Failed");
          updateJob(i, { saved: true });
        } catch {
          updateJob(i, { saved: false, error: "Failed to save" });
        }
      })
    );

    setSaving(false);
    onSaved();
  };

  const allSaved = jobs.length > 0 && jobs.every((j) => j.saved === true);
  const saveable = jobs.filter((j) => j.saved !== true && j.company && j.role);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleClose}
    >
      <div
        className="thin-scroll flex w-full max-w-2xl flex-col max-h-[90vh] rounded-2xl bg-surface shadow-[0_18px_48px_-12px_rgba(11,31,42,0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Bulk import jobs</h2>
            <p className="text-xs text-muted mt-0.5">
              Paste multiple job URLs — they&apos;ll be parsed in parallel and added to Wishlist.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-muted-2 transition hover:bg-surface-muted hover:text-foreground"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto thin-scroll flex-1 px-6 py-5 space-y-4">
          {step === "input" && (
            <>
              <div>
                <label className={labelClass}>
                  Job posting URLs
                </label>
                <textarea
                  value={rawUrls}
                  onChange={(e) => setRawUrls(e.target.value)}
                  rows={10}
                  placeholder={"https://jobs.company.com/role-1\nhttps://careers.company2.com/role-2\nhttps://greenhouse.io/..."}
                  className={`${fieldClass} font-mono text-xs`}
                />
                <p className="mt-1.5 text-xs text-muted">One URL per line (or comma-separated). Only lines starting with http are used.</p>
              </div>
            </>
          )}

          {step === "preview" && (
            <div className="space-y-3">
              {jobs.map((job, i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-3.5 transition-colors ${
                    job.saved === true
                      ? "border-success/30 bg-success/5"
                      : job.saved === false
                      ? "border-danger/30 bg-danger/5"
                      : "border-border bg-surface-muted"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-brand-strong hover:underline truncate"
                    >
                      <Link2 size={11} className="shrink-0" />
                      <span className="truncate">{job.url}</span>
                    </a>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {job.saved === true && (
                        <CheckCircle2 size={16} className="text-success" />
                      )}
                      {job.saved === false && (
                        <AlertCircle size={16} className="text-danger" />
                      )}
                      {job.saved !== true && (
                        <button
                          onClick={() => removeJob(i)}
                          className="rounded p-0.5 text-muted-2 hover:text-danger"
                          aria-label="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-0.5 block text-[11px] font-medium text-muted">Company *</label>
                      <input
                        type="text"
                        value={job.company}
                        onChange={(e) => updateJob(i, { company: e.target.value })}
                        disabled={job.saved === true}
                        className={`${fieldClass} text-xs disabled:opacity-60`}
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[11px] font-medium text-muted">Role *</label>
                      <input
                        type="text"
                        value={job.role}
                        onChange={(e) => updateJob(i, { role: e.target.value })}
                        disabled={job.saved === true}
                        className={`${fieldClass} text-xs disabled:opacity-60`}
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[11px] font-medium text-muted">Location</label>
                      <input
                        type="text"
                        value={job.location}
                        onChange={(e) => updateJob(i, { location: e.target.value })}
                        disabled={job.saved === true}
                        className={`${fieldClass} text-xs disabled:opacity-60`}
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[11px] font-medium text-muted">Salary</label>
                      <input
                        type="text"
                        value={job.salary}
                        onChange={(e) => updateJob(i, { salary: e.target.value })}
                        disabled={job.saved === true}
                        className={`${fieldClass} text-xs disabled:opacity-60`}
                      />
                    </div>
                  </div>

                  {(!job.company || !job.role) && job.saved !== true && (
                    <p className="mt-2 text-[11px] text-warning">Company and role required — fill them in to save this one.</p>
                  )}
                  {job.error && (
                    <p className="mt-2 text-[11px] text-danger">{job.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4 shrink-0">
          {step === "input" ? (
            <>
              <button
                onClick={handleClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={parseUrls}
                disabled={parsing || !rawUrls.trim()}
                className="btn-brand inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {parsing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Parsing…
                  </>
                ) : (
                  "Parse URLs"
                )}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setStep("input"); setJobs([]); }}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground"
                >
                  ← Back
                </button>
                <span className="text-xs text-muted">
                  {jobs.filter((j) => j.saved === true).length} / {jobs.length} saved
                </span>
              </div>
              {allSaved ? (
                <button
                  onClick={handleClose}
                  className="btn-brand rounded-lg px-4 py-2 text-sm font-semibold"
                >
                  Done
                </button>
              ) : (
                <button
                  onClick={saveAll}
                  disabled={saving || saveable.length === 0}
                  className="btn-brand inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Saving…
                    </>
                  ) : (
                    `Add ${saveable.length} job${saveable.length !== 1 ? "s" : ""} to Wishlist`
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
