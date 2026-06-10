import {
  ClipboardList,
  Send,
  Target,
  PartyPopper,
  MessageCircleReply,
  Ghost,
  CalendarClock,
  Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import prisma from "@/app/lib/db";
import {
  computeDashboardStats,
  type StatApplication,
} from "@/app/lib/applicationStats";

async function getApplications(): Promise<StatApplication[]> {
  try {
    return await prisma.application.findMany({
      select: {
        status: true,
        appliedAt: true,
        interviewAt: true,
        offerAt: true,
        rejectedAt: true,
        deadline: true,
        followUpDate: true,
      },
    });
  } catch {
    return [];
  }
}

interface StatCard {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
}

function StatCardComponent({ label, value, icon: Icon, hint }: StatCard) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="display mt-2 text-3xl text-foreground">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-2">{hint}</p>}
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-strong">
          <Icon size={20} strokeWidth={2.2} />
        </span>
      </div>
    </div>
  );
}

export default async function StatsBar() {
  const applications = await getApplications();
  const stats = computeDashboardStats(applications);

  const cards: StatCard[] = [
    { label: "Total tracked", value: stats.total, icon: ClipboardList },
    { label: "Applied this week", value: stats.appliedThisWeek, icon: Send },
    {
      label: "Interview rate",
      value: `${stats.interviewRate}%`,
      icon: Target,
      hint: "of applied jobs",
    },
    { label: "Offers", value: stats.offers, icon: PartyPopper },
    {
      label: "Response rate",
      value: `${stats.responseRate}%`,
      icon: MessageCircleReply,
      hint: "heard back (incl. rejections)",
    },
    {
      label: "Ghosted",
      value: stats.ghosted,
      icon: Ghost,
      hint: "21+ days, no reply",
    },
    {
      label: "Deadlines soon",
      value: stats.upcomingDeadlines,
      icon: CalendarClock,
      hint: "next 7 days",
    },
    {
      label: "Follow-ups due",
      value: stats.upcomingFollowUps,
      icon: Bell,
      hint: "next 7 days",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <StatCardComponent key={card.label} {...card} />
      ))}
    </div>
  );
}
