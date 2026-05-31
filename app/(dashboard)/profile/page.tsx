import ProfileForm from "@/app/components/profile/ProfileForm";

export default function ProfilePage() {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border bg-surface px-8 py-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-strong">
          Application Profile
        </p>
        <h1 className="display mt-2 text-3xl text-foreground">
          Fill it once,{" "}
          <span className="text-gradient-brand">reuse everywhere.</span>
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">
          Upload your resume to auto-fill the common questions every application
          asks. Each answer has a copy button so you can paste it straight into
          any job form.
        </p>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl space-y-8 p-8">
          <ProfileForm />
        </div>
      </div>
    </div>
  );
}
