"use client";

import { useEffect, useRef, useState } from "react";
import {
  Copy,
  Check,
  Upload,
  Sparkles,
  Loader2,
  FileText,
  Eye,
  Download,
  Trash2,
  RefreshCw,
  Plus,
  X,
} from "lucide-react";
import type {
  ParsedProfile,
  ProfileTextField,
  EducationEntry,
  ExperienceEntry,
  CertificationEntry,
  LanguageEntry,
  ProjectEntry,
} from "@/app/types/profile";
const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const ACCEPT = `${PDF_MIME},${DOCX_MIME},.pdf,.docx`;

interface ResumeMeta {
  hasResume: boolean;
  fileName: string | null;
  mimeType: string | null;
}

const fieldClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25";
const labelClass = "mb-1 block text-sm font-medium text-foreground";
const selectClass = fieldClass;

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
  highestQualification: "",
  willingToRelocate: "",
  drivingLicence: "",
  securityClearance: "",
  needsSponsorship: "",
};

const EMPTY_EDUCATION: EducationEntry = {
  institution: "",
  degree: "",
  field: "",
  grade: "",
  startYear: "",
  endYear: "",
};

const EMPTY_EXPERIENCE: ExperienceEntry = {
  company: "",
  title: "",
  startDate: "",
  endDate: "",
  current: false,
  location: "",
  description: "",
};

const EMPTY_CERT: CertificationEntry = {
  name: "",
  issuer: "",
  date: "",
  credentialUrl: "",
};

const EMPTY_LANGUAGE: LanguageEntry = { language: "", proficiency: "" };

const EMPTY_PROJECT: ProjectEntry = {
  name: "",
  description: "",
  url: "",
  technologies: "",
};

// ---- Small utilities ---------------------------------------------------------

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
        <><Check size={13} /> Copied</>
      ) : (
        <><Copy size={13} /> Copy</>
      )}
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-strong">
      {children}
    </h2>
  );
}

interface FieldProps {
  field: ProfileTextField;
  label: string;
  value: string;
  highlight?: boolean;
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

// ---- Generic entry-list editor -----------------------------------------------

interface EntryListProps<T extends object> {
  label: string;
  entries: T[];
  empty: T;
  highlight?: boolean;
  onChange: (entries: T[]) => void;
  renderEntry: (
    entry: T,
    index: number,
    update: (patch: Partial<T>) => void
  ) => React.ReactNode;
}

function EntryList<T extends object>({
  label,
  entries,
  empty,
  highlight,
  onChange,
  renderEntry,
}: EntryListProps<T>) {
  const add = () => onChange([...entries, { ...empty }]);
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<T>) =>
    onChange(entries.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className={labelClass + " mb-0"}>{label}</label>
          {highlight && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-strong">
              <Sparkles size={11} /> from resume
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-surface-muted"
        >
          <Plus size={12} /> Add
        </button>
      </div>

      {entries.length === 0 && (
        <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted">
          No entries yet — click Add.
        </p>
      )}

      <div className="space-y-3">
        {entries.map((entry, i) => (
          <div
            key={i}
            className="relative rounded-xl border border-border bg-surface-muted/40 p-4"
          >
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute right-3 top-3 rounded-lg p-1 text-muted-2 transition hover:bg-danger/10 hover:text-danger"
              aria-label="Remove"
            >
              <X size={14} />
            </button>
            {renderEntry(entry, i, (patch) => update(i, patch))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Entry sub-field helper --------------------------------------------------

function ef(
  label: string,
  value: string,
  onChange: (v: string) => void,
  opts?: { placeholder?: string; textarea?: boolean }
) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {opts?.textarea ? (
        <textarea
          value={value}
          rows={3}
          placeholder={opts.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={fieldClass}
        />
      ) : (
        <input
          type="text"
          value={value}
          placeholder={opts?.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={fieldClass}
        />
      )}
    </div>
  );
}

// ---- Per-entry-type field renderers ------------------------------------------

function EducationEntryFields(
  entry: EducationEntry,
  _i: number,
  update: (patch: Partial<EducationEntry>) => void
) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {ef("Institution", entry.institution, (v) => update({ institution: v }))}
      {ef("Degree type", entry.degree, (v) => update({ degree: v }), { placeholder: "BSc / MSc / PhD…" })}
      {ef("Field of study", entry.field, (v) => update({ field: v }))}
      {ef("Grade / GPA", entry.grade, (v) => update({ grade: v }), { placeholder: "e.g. First Class, 3.8 GPA" })}
      {ef("Start year", entry.startYear, (v) => update({ startYear: v }), { placeholder: "2019" })}
      {ef("End year", entry.endYear, (v) => update({ endYear: v }), { placeholder: "2023 (or Expected 2025)" })}
    </div>
  );
}

function ExperienceEntryFields(
  entry: ExperienceEntry,
  _i: number,
  update: (patch: Partial<ExperienceEntry>) => void
) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ef("Company", entry.company, (v) => update({ company: v }))}
        {ef("Job title", entry.title, (v) => update({ title: v }))}
        {ef("Start date", entry.startDate, (v) => update({ startDate: v }), { placeholder: "Jan 2022" })}
        <div>
          {ef("End date", entry.endDate, (v) => update({ endDate: v }), { placeholder: "Dec 2024" })}
          <label className="mt-1.5 flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={entry.current}
              onChange={(e) =>
                update({ current: e.target.checked, endDate: e.target.checked ? "" : entry.endDate })
              }
              className="rounded border-border"
            />
            Currently working here
          </label>
        </div>
        {ef("Location", entry.location, (v) => update({ location: v }), { placeholder: "London, UK / Remote" })}
      </div>
      {ef("Description", entry.description, (v) => update({ description: v }), {
        textarea: true,
        placeholder: "Key responsibilities and achievements…",
      })}
    </div>
  );
}

function CertificationEntryFields(
  entry: CertificationEntry,
  _i: number,
  update: (patch: Partial<CertificationEntry>) => void
) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {ef("Certification name", entry.name, (v) => update({ name: v }))}
      {ef("Issuing body", entry.issuer, (v) => update({ issuer: v }))}
      {ef("Date obtained", entry.date, (v) => update({ date: v }), { placeholder: "Jun 2023" })}
      {ef("Credential URL", entry.credentialUrl, (v) => update({ credentialUrl: v }), { placeholder: "https://…" })}
    </div>
  );
}

const PROFICIENCY_LEVELS = ["Native", "Fluent", "Conversational", "Basic"];

function LanguageEntryFields(
  entry: LanguageEntry,
  _i: number,
  update: (patch: Partial<LanguageEntry>) => void
) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {ef("Language", entry.language, (v) => update({ language: v }))}
      <div>
        <label className={labelClass}>Proficiency</label>
        <select
          value={entry.proficiency}
          onChange={(e) => update({ proficiency: e.target.value })}
          className={selectClass}
        >
          <option value="">Select…</option>
          {PROFICIENCY_LEVELS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ProjectEntryFields(
  entry: ProjectEntry,
  _i: number,
  update: (patch: Partial<ProjectEntry>) => void
) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ef("Project name", entry.name, (v) => update({ name: v }))}
        {ef("URL", entry.url, (v) => update({ url: v }), { placeholder: "https://…" })}
        {ef("Technologies", entry.technologies, (v) => update({ technologies: v }), {
          placeholder: "React, TypeScript, PostgreSQL…",
        })}
      </div>
      {ef("Description", entry.description, (v) => update({ description: v }), {
        textarea: true,
        placeholder: "What it does and your role…",
      })}
    </div>
  );
}

// ---- JSON parse helper -------------------------------------------------------

function parseJsonEntries<T>(json: string | null | undefined): T[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

// ---- Main form ---------------------------------------------------------------

export default function ProfileForm() {
  const [form, setForm] = useState<FormState>(EMPTY_STATE);
  const [autofilled, setAutofilled] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [resume, setResume] = useState<ResumeMeta>({
    hasResume: false,
    fileName: null,
    mimeType: null,
  });
  const [showPreview, setShowPreview] = useState(false);
  const [savingText, setSavingText] = useState(false);

  // Structured entry arrays
  const [educationEntries, setEducationEntries] = useState<EducationEntry[]>([]);
  const [experienceEntries, setExperienceEntries] = useState<ExperienceEntry[]>([]);
  const [certifications, setCertifications] = useState<CertificationEntry[]>([]);
  const [languages, setLanguages] = useState<LanguageEntry[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
          setResume({
            hasResume: !!p.hasResume,
            fileName: p.resumeFileName ?? null,
            mimeType: p.resumeMimeType ?? null,
          });
          setEducationEntries(parseJsonEntries<EducationEntry>(p.educationEntries));
          setExperienceEntries(parseJsonEntries<ExperienceEntry>(p.experienceEntries));
          setCertifications(parseJsonEntries<CertificationEntry>(p.certifications));
          setLanguages(parseJsonEntries<LanguageEntry>(p.languages));
          setProjects(parseJsonEntries<ProjectEntry>(p.projects));
        }
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (field: ProfileTextField, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const applyParsed = (parsed: ParsedProfile) => {
    const filled = new Set<string>();
    setForm((prev) => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(parsed)) {
        if (value === undefined || value === null) continue;
        if (key === "needsSponsorship") {
          next.needsSponsorship = value ? "yes" : "no";
          filled.add(key);
        } else if (key in EMPTY_STATE && typeof value === "string") {
          next[key as ProfileTextField] = value;
          filled.add(key);
        }
      }
      return next;
    });

    if (parsed.educationEntries?.length) {
      setEducationEntries(parsed.educationEntries);
      filled.add("educationEntries");
    }
    if (parsed.experienceEntries?.length) {
      setExperienceEntries(parsed.experienceEntries);
      filled.add("experienceEntries");
    }
    if (parsed.certifications?.length) {
      setCertifications(parsed.certifications);
      filled.add("certifications");
    }
    if (parsed.languages?.length) {
      setLanguages(parsed.languages);
      filled.add("languages");
    }
    if (parsed.projects?.length) {
      setProjects(parsed.projects);
      filled.add("projects");
    }

    setAutofilled(filled);
  };

  const parseResume = async (payload: {
    text?: string;
    fileBase64?: string;
    mimeType?: string;
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

      if (payload.fileBase64) {
        setResume({
          hasResume: true,
          fileName: payload.fileName ?? null,
          mimeType: payload.mimeType ?? null,
        });
        setShowPreview(false);
      }

      applyParsed(data.parsed || {});
      if (data.parseError) {
        setMessage(data.parseError);
      } else {
        setMessage("Resume parsed — review the highlighted fields and Save.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse resume");
    } finally {
      setParsing(false);
    }
  };

  const handleFile = (file: File) => {
    const mimeType =
      file.type ||
      (file.name.toLowerCase().endsWith(".docx") ? DOCX_MIME : PDF_MIME);
    if (mimeType !== PDF_MIME && mimeType !== DOCX_MIME) {
      setError("Unsupported file — please upload a PDF or DOCX.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      parseResume({ fileBase64: base64, mimeType, fileName: file.name });
    };
    reader.readAsDataURL(file);
  };

  const saveResumeText = async () => {
    setSavingText(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      setMessage("Resume text saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingText(false);
    }
  };

  const removeResume = async () => {
    if (!confirm("Remove the attached resume file? Your filled-in fields stay.")) return;
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/profile/resume", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove resume");
      setResume({ hasResume: false, fileName: null, mimeType: null });
      setShowPreview(false);
      setMessage("Resume file removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove resume");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = {};

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

      payload.educationEntries = educationEntries;
      payload.experienceEntries = experienceEntries;
      payload.certifications = certifications;
      payload.languages = languages;
      payload.projects = projects;

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
          Upload a PDF or DOCX and AI fills the fields below. The file is saved
          so you can preview, download, or replace it later.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />

        {resume.hasResume ? (
          <div className="mt-4 rounded-xl border border-border bg-surface-muted/50 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-strong">
                <FileText size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {resume.fileName || "Attached resume"}
                </p>
                <p className="text-xs text-muted">
                  {resume.mimeType === PDF_MIME
                    ? "PDF · preview available"
                    : "DOCX · download to view"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {resume.mimeType === PDF_MIME && (
                  <button
                    type="button"
                    onClick={() => setShowPreview((s) => !s)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface-muted"
                  >
                    <Eye size={14} /> {showPreview ? "Hide" : "Preview"}
                  </button>
                )}
                <a
                  href="/api/profile/resume"
                  download={resume.fileName || true}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface-muted"
                >
                  <Download size={14} /> Download
                </a>
                <button
                  type="button"
                  disabled={parsing}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface-muted disabled:opacity-50"
                >
                  <RefreshCw size={14} className={parsing ? "animate-spin" : ""} />
                  Replace
                </button>
                <button
                  type="button"
                  onClick={removeResume}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-surface px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/5"
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </div>

            {showPreview && resume.mimeType === PDF_MIME && (
              <iframe
                src="/api/profile/resume"
                title="Resume preview"
                className="mt-4 h-[600px] w-full rounded-lg border border-border bg-white"
              />
            )}
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-3">
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
              Upload PDF or DOCX
            </button>
          </div>
        )}

        <div className="mt-4">
          <label className={labelClass}>
            Resume text{" "}
            {resume.hasResume ? "(extracted — editable)" : "(paste to parse)"}
          </label>
          <textarea
            value={resumeText}
            rows={6}
            placeholder="Paste your resume here…"
            onChange={(e) => setResumeText(e.target.value)}
            className={fieldClass}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={parsing || !resumeText.trim()}
              onClick={() => parseResume({ text: resumeText })}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:opacity-50"
            >
              {parsing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              Parse text into fields
            </button>
            <button
              type="button"
              disabled={savingText}
              onClick={saveResumeText}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:opacity-50"
            >
              {savingText ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              Save text
            </button>
          </div>
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
              className={selectClass}
            >
              <option value="">Not specified</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Highest qualification</label>
            <select
              value={form.highestQualification}
              onChange={(e) => handleChange("highestQualification", e.target.value)}
              className={selectClass}
            >
              <option value="">Not specified</option>
              <option value="GCSE / A-level">GCSE / A-level</option>
              <option value="Bachelor's">Bachelor&apos;s</option>
              <option value="Master's">Master&apos;s</option>
              <option value="PhD">PhD</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Willing to relocate?</label>
            <select
              value={form.willingToRelocate}
              onChange={(e) => handleChange("willingToRelocate", e.target.value)}
              className={selectClass}
            >
              <option value="">Not specified</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Open to discussion">Open to discussion</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Driving licence?</label>
            <select
              value={form.drivingLicence}
              onChange={(e) => handleChange("drivingLicence", e.target.value)}
              className={selectClass}
            >
              <option value="">Not specified</option>
              <option value="Yes — UK full">Yes — UK full</option>
              <option value="Yes — international">Yes — international</option>
              <option value="No">No</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Security clearance</label>
            <select
              value={form.securityClearance}
              onChange={(e) => handleChange("securityClearance", e.target.value)}
              className={selectClass}
            >
              <option value="">Not specified</option>
              <option value="None">None</option>
              <option value="DBS Basic">DBS Basic</option>
              <option value="DBS Enhanced">DBS Enhanced</option>
              <option value="SC">SC (Security Check)</option>
              <option value="DV">DV (Developed Vetting)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary & skills */}
      <div className="space-y-4 rounded-card border border-border bg-surface p-6">
        <SectionTitle>Summary &amp; skills</SectionTitle>
        <Field field="summary" label="Professional summary" value={form.summary} highlight={has("summary")} textarea placeholder="A short 'tell us about yourself' blurb…" onChange={handleChange} />
        <Field field="skills" label="Skills" value={form.skills} highlight={has("skills")} textarea placeholder="Python, TypeScript, SQL, React…" onChange={handleChange} />
      </div>

      {/* Education */}
      <div className="rounded-card border border-border bg-surface p-6">
        <SectionTitle>Education</SectionTitle>
        <p className="mb-4 mt-1 text-sm text-muted">
          Each entry can be copy-pasted into individual ATS fields.
        </p>
        <EntryList
          label="Degrees / qualifications"
          entries={educationEntries}
          empty={EMPTY_EDUCATION}
          highlight={has("educationEntries")}
          onChange={setEducationEntries}
          renderEntry={EducationEntryFields}
        />
      </div>

      {/* Work experience */}
      <div className="rounded-card border border-border bg-surface p-6">
        <SectionTitle>Work experience</SectionTitle>
        <p className="mb-4 mt-1 text-sm text-muted">
          Add each role separately so you can paste titles, dates, and
          descriptions into ATS fields individually.
        </p>
        <EntryList
          label="Roles"
          entries={experienceEntries}
          empty={EMPTY_EXPERIENCE}
          highlight={has("experienceEntries")}
          onChange={setExperienceEntries}
          renderEntry={ExperienceEntryFields}
        />
      </div>

      {/* Certifications */}
      <div className="rounded-card border border-border bg-surface p-6">
        <SectionTitle>Certifications</SectionTitle>
        <EntryList
          label="Certifications &amp; courses"
          entries={certifications}
          empty={EMPTY_CERT}
          highlight={has("certifications")}
          onChange={setCertifications}
          renderEntry={CertificationEntryFields}
        />
      </div>

      {/* Languages */}
      <div className="rounded-card border border-border bg-surface p-6">
        <SectionTitle>Languages</SectionTitle>
        <EntryList
          label="Languages spoken"
          entries={languages}
          empty={EMPTY_LANGUAGE}
          highlight={has("languages")}
          onChange={setLanguages}
          renderEntry={LanguageEntryFields}
        />
      </div>

      {/* Projects */}
      <div className="rounded-card border border-border bg-surface p-6">
        <SectionTitle>Projects</SectionTitle>
        <EntryList
          label="Side projects &amp; portfolio"
          entries={projects}
          empty={EMPTY_PROJECT}
          highlight={has("projects")}
          onChange={setProjects}
          renderEntry={ProjectEntryFields}
        />
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
