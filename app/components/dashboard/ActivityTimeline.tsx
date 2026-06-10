"use client";

import {
  GitCommitHorizontal,
  CalendarClock,
  MessageSquare,
  Bell,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActivityDTO } from "@/app/types/application";

const typeMeta: Record<string, { icon: LucideIcon; tint: string; label: string }> = {
  created: { icon: Plus, tint: "text-muted-2", label: "Created" },
  status_change: {
    icon: GitCommitHorizontal,
    tint: "text-brand-strong",
    label: "Status",
  },
  interview: { icon: CalendarClock, tint: "text-violet-500", label: "Interview" },
  note: { icon: MessageSquare, tint: "text-sky-500", label: "Note" },
  follow_up: { icon: Bell, tint: "text-amber-500", label: "Follow-up" },
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ActivityTimeline({
  activities,
}: {
  activities: ActivityDTO[];
}) {
  if (activities.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-2">
        No activity yet.
      </p>
    );
  }

  return (
    <ol className="space-y-0">
      {activities.map((activity, idx) => {
        const meta = typeMeta[activity.type] ?? typeMeta.note;
        const Icon = meta.icon;
        const isLast = idx === activities.length - 1;
        return (
          <li key={activity.id} className="relative flex gap-3 pb-4">
            {!isLast && (
              <span
                className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-border"
                aria-hidden
              />
            )}
            <span
              className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-surface ${meta.tint}`}
            >
              <Icon size={15} strokeWidth={2.2} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-medium text-foreground">
                {activity.title ||
                  (activity.type === "status_change"
                    ? `${activity.fromStatus} → ${activity.toStatus}`
                    : meta.label)}
              </p>
              {activity.notes && (
                <p className="mt-0.5 whitespace-pre-wrap text-[13px] text-muted">
                  {activity.notes}
                </p>
              )}
              <p className="mt-0.5 text-[11px] text-muted-2">
                {formatWhen(activity.occurredAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
