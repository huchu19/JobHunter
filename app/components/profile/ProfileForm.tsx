"use client";

import { useEffect, useRef, useState } from "react";
import {
  Copy,
  Check,
  Upload,
  Sparkles,
  Loader2,
  FileText,
} from "lucide-react";
import type { ParsedProfile, ProfileTextField } from "@/app/types/profile";

const fieldClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25";
const labelClass = "mb-1 block text-sm font-medium text-foreground";

// Empty string state for every editable text field.
type FormState = Record<ProfileTextField, string> & {
  needsSponsorship: "" | "yes" | "no";
};

const EMPTY_STATE: FormState = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  linkedinUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  websiteUrl: "",
  workAuthorization: "",
  rightToWork: "",
  noticePeriod: "",
  salaryExpectation: "",
  earliestStart: "",
  yearsExperience: "",
  currentTitle: "",
  summary: "",
  skills: "",
  education: "",
  workHistory: "",
  needsSponsorship: "",
};

// Small copy-to-clipboard button shown next to each answer.
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  if (!value.trim()) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-2 transition hover:bg-surface-muted hover:text-foreground"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <>
          <Check size={13} /> Copied
        </>
      ) : (
        <>
          <Copy size={13} /> Copy
        </>
      )}
    </button>
  );
}

interface FieldProps {
  field: ProfileTextField;
  label: string;
  value: string;
  highlight: boolean;
  textarea?: boolean;
  placeholder?: string;
  onChange: (field: ProfileTextField, value: string) => void;
}

function Field({
  field,
  label,
  value,
  highlight,
  textarea,
  placeholder,
  onChange,
}: FieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className={labelClass}>{label}</label>
        <div className="flex items-center gap-1">
          {highlight && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-strong">
              <Sparkles size={11} /> from resume
            </span>
          )}
          <CopyButton value={value} />
        </div>
      </div>
      {textarea ? (
        <textarea
          value={value}
          rows={3}
          placeholder={placeholder}
          onChange={(e) => onChange(field, e.target.value)}
          className={fieldClass}
        />
      ) : (
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(field, e.target.value)}
          className={fieldClass}
        />
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-strong">
      {children}
    </h2>
  );
}

export default function ProfileForm() {
  const [form, setForm] = useState<FormState>(EMPTY_STATE);
  const [autofilled, setAutofilled] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumeText, setResumeText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load the saved profile on mount.
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        const p = data.profile;
        if (p) {
          setForm((prev) => {
            const next = { ...prev };
            for (const key of Object.keys(EMPTY_STATE) as (keyof FormState)[]) {
              if (key === "needsSponsorship") continue;
              if (p[key]) next[key] = p[key];
            }
            next.needsSponsorship =
              p.needsSponsorship === true
                ? "yes"
                : p.needsSponsorship === false
                ? "no"
                : "";
            return next;
          });
          if (p.resumeText) setResumeText(p.resumeText);
        }
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (field: ProfileTextField, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Apply Claude's extracted fields onto the form, marking which were filled.
  const applyParsed = (parsed: ParsedProfile) => {
    const filled = new Set<string>();
    setForm((prev) => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(parsed)) {
        if (value === undefined || value === null) continue;
        if (key === "needsSponsorship") {
          next.needsSponsorship = value ? "yes" : "no";
          filled.add(key);
        } else if (key in EMPTY_STATE) {
          next[key as ProfileTextField] = String(value);
          filled.add(key);
        }
      }
      return next;
    });
    setAutofilled(filled);
  };

  const parseResume = async (payload: {
    text?: string;
    pdfBase64?: string;
    fileName?: string;
  }) => {
    setParsing(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/profile/parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse resume");
      applyParsed(data.parsed || {});
      setMessage("Resume parsed — review the highlighted fields and Save.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse resume");
    } finally {
      setParsing(false);
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result is a data URL: "data:application/pdf;base64,XXXX"
      const base64 = result.split(",")[1];
      parseResume({ pdfBase64: base64, fileName: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload: Record<string, string | boolean | null> = {};
      for (const key of Object.keys(EMPTY_STATE) as (keyof FormState)[]) {
        if (key === "needsSponsorship") continue;
        payload[key] = form[key];
      }
      payload.needsSponsorship =
        form.needsSponsorship === "yes"
          ? true
          : form.needsSponsorship === "no"
          ? false
          : null;

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      setMessage("Profile saved.");
      setAutofilled(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-card border border-border bg-surface p-8 text-sm text-muted">
        Loading profile…
      </div>
    );
  }

  const has = (field: string) => autofilled.has(field);

  return (
    <div className="space-y-8">
      {/* Resume upload / paste */}
      <div className="rounded-card border border-border bg-surface p-6">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-brand-strong" />
          <SectionTitle>Auto-fill from resume</SectionTitle>
        </div>
        <p className="mt-2 text-sm text-muted">
          Upload a PDF or paste your resume text. Claude extracts the common
          fields below for you to review.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={parsing}
            onClick={() => fileInputRef.current?.click()}
            className="btn-brand inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {parsing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            Upload PDF resume
          </button>
        </div>

        <div className="mt-4">
          <label className={labelClass}>…or paste resume text</label>
          <textarea
            value={resumeText}
            rows={5}
            placeholder="Paste your resume here…"
            onChange={(e) => setResumeText(e.target.value)}
            className={fieldClass}
          />
          <button
            type="button"
            disabled={parsing || !resumeText.trim()}
            onClick={() => parseResume({ text: resumeText })}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:opacity-50"
          >
            {parsing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            Parse pasted text
          </button>
        </div>
      </div>

      {/* Contact */}
      <div className="space-y-4 rounded-card border border-border bg-surface p-6">
        <SectionTitle>Contact</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field field="fullName" label="Full name" value={form.fullName} highlight={has("fullName")} onChange={handleChange} />
          <Field field="email" label="Email" value={form.email} highlight={has("email")} onChange={handleChange} />
          <Field field="phone" label="Phone" value={form.phone} highlight={has("phone")} onChange={handleChange} />
          <Field field="location" label="Location" value={form.location} highlight={has("location")} onChange={handleChange} />
          <Field field="linkedinUrl" label="LinkedIn" value={form.linkedinUrl} highlight={has("linkedinUrl")} onChange={handleChange} />
          <Field field="githubUrl" label="GitHub" value={form.githubUrl} highlight={has("githubUrl")} onChange={handleChange} />
          <Field field="portfolioUrl" label="Portfolio" value={form.portfolioUrl} highlight={has("portfolioUrl")} onChange={handleChange} />
          <Field field="websiteUrl" label="Website" value={form.websiteUrl} highlight={has("websiteUrl")} onChange={handleChange} />
        </div>
      </div>

      {/* Common application answers */}
      <div className="space-y-4 rounded-card border border-border bg-surface p-6">
        <SectionTitle>Common answers</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field field="currentTitle" label="Current title" value={form.currentTitle} highlight={has("currentTitle")} onChange={handleChange} />
          <Field field="yearsExperience" label="Years of experience" value={form.yearsExperience} highlight={has("yearsExperience")} onChange={handleChange} />
          <Field field="workAuthorization" label="Work authorization" value={form.workAuthorization} highlight={has("workAuthorization")} placeholder="e.g. UK Skilled Worker visa required" onChange={handleChange} />
          <Field field="rightToWork" label="Right to work" value={form.rightToWork} highlight={has("rightToWork")} onChange={handleChange} />
          <Field field="noticePeriod" label="Notice period" value={form.noticePeriod} highlight={has("noticePeriod")} placeholder="e.g. 1 month" onChange={handleChange} />
          <Field field="earliestStart" label="Earliest start date" value={form.earliestStart} highlight={has("earliestStart")} onChange={handleChange} />
          <Field field="salaryExpectation" label="Salary expectation" value={form.salaryExpectation} highlight={has("salaryExpectation")} placeholder="e.g. £60–80k" onChange={handleChange} />

          <div>
            <label className={labelClass}>Require sponsorship?</label>
            <select
              value={form.needsSponsorship}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  needsSponsorship: e.target.value as FormState["needsSponsorship"],
                }))
              }
              className={fieldClass}
            >
              <option value="">Not specified</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>
      </div>

      {/* Free-text blocks */}
      <div className="space-y-4 rounded-card border border-border bg-surface p-6">
        <SectionTitle>Application text</SectionTitle>
        <Field field="summary" label="Professional summary" value={form.summary} highlight={has("summary")} textarea placeholder="A short 'tell us about yourself' blurb…" onChange={handleChange} />
        <Field field="skills" label="Skills" value={form.skills} highlight={has("skills")} textarea onChange={handleChange} />
        <Field field="education" label="Education" value={form.education} highlight={has("education")} textarea onChange={handleChange} />
        <Field field="workHistory" label="Work history" value={form.workHistory} highlight={has("workHistory")} textarea onChange={handleChange} />
      </div>

      {message && (
        <p className="rounded-xl border border-brand/20 bg-brand-soft px-3 py-2 text-sm font-medium text-brand-strong">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-danger/25 bg-danger/5 px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-background/80 py-4 backdrop-blur">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="btn-brand rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}
