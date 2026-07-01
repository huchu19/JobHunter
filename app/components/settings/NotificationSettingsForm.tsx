"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  BellRing,
  Loader2,
  Mail,
  Send,
  TriangleAlert,
} from "lucide-react";
import type {
  NotificationSettingsDTO,
  Reminder,
} from "@/app/types/notifications";
import {
  notificationPermission,
  requestNotificationPermission,
  showNotification,
} from "@/app/lib/browserNotify";
import { fieldClass, labelClass } from "@/app/components/dashboard/formClasses";

type ToggleKey =
  | "emailEnabled"
  | "weeklyDigest"
  | "followUpReminders"
  | "interviewAlerts"
  | "offerCelebration";

const TOGGLES: { key: ToggleKey; label: string; hint: string }[] = [
  {
    key: "weeklyDigest",
    label: "Weekly digest",
    hint: "A summary of your pipeline, pace, and what's due — once a week.",
  },
  {
    key: "followUpReminders",
    label: "Follow-up & deadline reminders",
    hint: "When a follow-up date arrives or an application deadline is within 48h.",
  },
  {
    key: "interviewAlerts",
    label: "Interview prep alerts",
    hint: "A nudge 24 hours before any scheduled interview.",
  },
  {
    key: "offerCelebration",
    label: "Offer celebrations",
    hint: "Because you'll want to hear about this one. 🎉",
  },
];

export default function NotificationSettingsForm() {
  const [settings, setSettings] = useState<NotificationSettingsDTO | null>(
    null
  );
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [permission, setPermission] = useState<string>("default");

  useEffect(() => {
    setPermission(notificationPermission());
    Promise.all([
      fetch("/api/settings").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/notifications/reminders").then((r) =>
        r.ok ? r.json() : null
      ),
    ])
      .then(([settingsData, remindersData]) => {
        if (settingsData?.settings) setSettings(settingsData.settings);
        if (remindersData?.reminders) setReminders(remindersData.reminders);
      })
      .catch(() => setError("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const update = (patch: Partial<NotificationSettingsDTO>) =>
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailEnabled: settings.emailEnabled,
          emailAddress: settings.emailAddress,
          weeklyDigest: settings.weeklyDigest,
          followUpReminders: settings.followUpReminders,
          interviewAlerts: settings.interviewAlerts,
          offerCelebration: settings.offerCelebration,
          browserEnabled: settings.browserEnabled,
        }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      const data = await res.json();
      setSettings(data.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleBrowserToggle = async (enabled: boolean) => {
    if (enabled) {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result !== "granted") {
        update({ browserEnabled: false });
        return;
      }
    }
    update({ browserEnabled: enabled });
  };

  if (loading) {
    return <div className="card p-8 text-sm text-muted">Loading settings…</div>;
  }
  if (!settings) {
    return (
      <div className="card p-8 text-sm font-medium text-danger">
        {error ?? "Failed to load settings"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-xl border border-danger/25 bg-danger/5 px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {/* Email notifications */}
      <div className="card p-6">
        <div className="flex items-center gap-2">
          <Mail size={17} className="text-brand-strong" />
          <h2 className="text-sm font-semibold text-foreground">
            Email notifications
          </h2>
        </div>

        {!settings.emailConfigured && (
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-foreground">
            <TriangleAlert size={15} className="mt-0.5 shrink-0 text-amber-500" />
            <span>
              No email transport configured — set <code>RESEND_API_KEY</code>{" "}
              in <code>.env</code> to enable delivery. Your preferences are
              saved either way and take effect as soon as a key is added.
            </span>
          </p>
        )}

        <label className="mt-4 flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.emailEnabled}
            onChange={(e) => update({ emailEnabled: e.target.checked })}
            className="h-4 w-4 accent-[var(--brand)]"
          />
          <span className="text-sm font-medium text-foreground">
            Enable email notifications
          </span>
        </label>

        <div className="mt-3">
          <label className={labelClass}>Send to</label>
          <input
            type="email"
            className={fieldClass}
            value={settings.emailAddress ?? ""}
            onChange={(e) => update({ emailAddress: e.target.value })}
            placeholder="you@example.com"
          />
        </div>

        <div className="mt-4 space-y-3">
          {TOGGLES.map((t) => (
            <label key={t.key} className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={settings[t.key]}
                onChange={(e) => update({ [t.key]: e.target.checked })}
                className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  {t.label}
                </span>
                <span className="block text-xs text-muted">{t.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Browser notifications */}
      <div className="card p-6">
        <div className="flex items-center gap-2">
          <BellRing size={17} className="text-brand-strong" />
          <h2 className="text-sm font-semibold text-foreground">
            Browser notifications
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted">
          Desktop alerts when a card moves stage — offers get a celebration.
        </p>

        <label className="mt-4 flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.browserEnabled}
            onChange={(e) => handleBrowserToggle(e.target.checked)}
            className="h-4 w-4 accent-[var(--brand)]"
          />
          <span className="text-sm font-medium text-foreground">
            Enable browser notifications
          </span>
        </label>

        {permission === "denied" && (
          <p className="mt-2 text-xs font-medium text-danger">
            Notifications are blocked in your browser settings — allow them for
            this site to use desktop alerts.
          </p>
        )}
        {permission === "unsupported" && (
          <p className="mt-2 text-xs text-muted">
            This browser doesn&apos;t support notifications.
          </p>
        )}

        <button
          onClick={() =>
            showNotification(
              "JobHunter",
              "Notifications are working — you'll hear about stage changes here."
            )
          }
          disabled={!settings.browserEnabled || permission !== "granted"}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:opacity-50"
        >
          <Bell size={14} /> Send test notification
        </button>
      </div>

      {/* Due now preview */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-foreground">
          Due right now
        </h2>
        <p className="mt-1 text-sm text-muted">
          What the daily job would send today, given your preferences.
        </p>
        {reminders.length === 0 ? (
          <p className="mt-3 text-sm text-muted-2">
            Nothing due — follow-ups, deadlines, and interviews will appear
            here as they approach.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {reminders.map((r, i) => (
              <li
                key={`${r.applicationId}-${r.type}-${i}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm text-foreground">
                  {r.message}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {new Date(r.dueAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-brand inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Send size={15} />
          )}
          {saved ? "Saved ✓" : "Save preferences"}
        </button>
      </div>
    </div>
  );
}
