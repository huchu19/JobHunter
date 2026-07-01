"use client";

import { useEffect, useState } from "react";
import { KeyRound, Copy, Check, RefreshCw } from "lucide-react";

// Personal API token panel: shows the user's extension token (generated on first
// view), with copy + rotate. The Chrome extension stores this token and sends it
// as `Authorization: Bearer <token>` so it can read your profile and post jobs
// to your board from any job site. Backed by /api/user/token.
export default function ApiTokenPanel() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/user/token")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setToken(data?.token ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function rotate() {
    if (!confirm("Rotate your token? The current one stops working immediately.")) {
      return;
    }
    setRotating(true);
    try {
      const res = await fetch("/api/user/token", { method: "POST" });
      const data = res.ok ? await res.json() : null;
      if (data?.token) setToken(data.token);
    } finally {
      setRotating(false);
    }
  }

  async function copy() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="card mt-6 p-6">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand-strong">
          <KeyRound size={16} strokeWidth={2.2} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Browser extension token
          </h2>
          <p className="text-xs text-muted">
            Paste this into the JobHunter Chrome extension to autofill forms as
            you and save jobs to your board.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-surface-muted px-3 py-2 font-mono text-xs text-foreground">
          {loading ? "Loading…" : (token ?? "Unavailable")}
        </code>
        <button
          onClick={copy}
          disabled={!token}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-surface-muted disabled:opacity-50"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          onClick={rotate}
          disabled={rotating || loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-surface-muted disabled:opacity-50"
        >
          <RefreshCw size={14} className={rotating ? "animate-spin" : ""} />
          Rotate
        </button>
      </div>

      <p className="mt-3 text-xs text-muted-2">
        Treat this like a password. Rotating it disconnects any extension still
        using the old token.
      </p>
    </section>
  );
}
