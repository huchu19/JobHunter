import MatchesClient from "@/app/components/matches/MatchesClient";

export default function MatchesPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border bg-surface px-8 py-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-strong">
          Advanced Matching
        </p>
        <h1 className="display mt-2 text-3xl text-foreground">
          Sponsors picked <span className="text-gradient-brand">for you.</span>
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">
          Your profile's skills and title, scored against every A-rated
          Skilled Worker sponsor on the register. Companies you already track
          are excluded.
        </p>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl p-8">
          <MatchesClient />
        </div>
      </div>
    </div>
  );
}
