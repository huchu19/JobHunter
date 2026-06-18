import PageHeader from "@/app/components/PageHeader";
import MatchesClient from "@/app/components/matches/MatchesClient";

export default function MatchesPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Matches"
        subtitle="Sponsors scored against your profile. Companies you already track are excluded."
      />

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl p-8">
          <MatchesClient />
        </div>
      </div>
    </div>
  );
}
