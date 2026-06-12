import NotificationSettingsForm from "@/app/components/settings/NotificationSettingsForm";

export default function SettingsPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border bg-surface px-8 py-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-strong">
          Settings
        </p>
        <h1 className="display mt-2 text-3xl text-foreground">
          Never miss a <span className="text-gradient-brand">follow-up.</span>
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">
          Reminders for follow-ups, deadlines, and interviews — by email and
          desktop notification. You choose what's worth interrupting you for.
        </p>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl p-8">
          <NotificationSettingsForm />
        </div>
      </div>
    </div>
  );
}
