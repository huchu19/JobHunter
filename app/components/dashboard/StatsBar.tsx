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
  icon: string;
  color: string;
}

function StatCardComponent({ label, value, icon, color }: StatCard) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}

export default async function StatsBar() {
  const applications = await getApplicationStats();
  const stats = calculateStats(applications);

  const cards: StatCard[] = [
    {
      label: "Total tracked",
      value: stats.total,
      icon: "📋",
      color: "text-blue-600",
    },
    {
      label: "Applied this week",
      value: stats.appliedThisWeek,
      icon: "✉️",
      color: "text-green-600",
    },
    {
      label: "Interview rate",
      value: `${stats.interviewRate}%`,
      icon: "🎯",
      color: "text-purple-600",
    },
    {
      label: "Offers",
      value: stats.offered,
      icon: "🎉",
      color: "text-orange-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <StatCardComponent key={card.label} {...card} />
      ))}
    </div>
  );
}
