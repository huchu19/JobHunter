import { ClipboardList, Send, Target, PartyPopper } from "lucide-react";
import type { LucideIcon } from "lucide-react";

async function getApplicationStats() {
  try {
    const response = await fetch("http://localhost:3000/api/applications", {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Failed to fetch");
    const data = await response.json();
    return data.applications || [];
  } catch {
    return [];
  }
}

function calculateStats(applications: any[]) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const total = applications.length;
  const applied = applications.filter((a) => a.appliedAt);
  const appliedThisWeek = applied.filter(
    (a) => new Date(a.appliedAt) > weekAgo
  ).length;

  const interviewed = applications.filter((a) => a.status === "interview");
  const offerred = applications.filter((a) => a.status === "offer");
  const interviewRate =
    applied.length > 0
      ? Math.round(
          ((interviewed.length + offerred.length) / applied.length) * 100
        )
      : 0;

  return { total, appliedThisWeek, interviewRate, offered: offerred.length };
}

interface StatCard {
  label: string;
  value: string | number;
  icon: LucideIcon;
}

function StatCardComponent({ label, value, icon: Icon }: StatCard) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="display mt-2 text-3xl text-foreground">{value}</p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-strong">
          <Icon size={20} strokeWidth={2.2} />
        </span>
      </div>
    </div>
  );
}

export default async function StatsBar() {
  const applications = await getApplicationStats();
  const stats = calculateStats(applications);

  const cards: StatCard[] = [
    { label: "Total tracked", value: stats.total, icon: ClipboardList },
    { label: "Applied this week", value: stats.appliedThisWeek, icon: Send },
    { label: "Interview rate", value: `${stats.interviewRate}%`, icon: Target },
    { label: "Offers", value: stats.offered, icon: PartyPopper },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <StatCardComponent key={card.label} {...card} />
      ))}
    </div>
  );
}
