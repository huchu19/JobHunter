"use client";

import { BadgeCheck, ExternalLink, Star } from "lucide-react";
import type { ApplicationDTO } from "@/app/types/application";
import { STATUS_META } from "@/app/lib/applicationStatus";

interface ApplicationListProps {
  applications: ApplicationDTO[];
  onOpen: (id: string) => void;
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
}

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status as keyof typeof STATUS_META];
  const accent = meta?.accent ?? "#94a3b8";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: `${accent}22`, color: accent }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: accent }}
      />
      {meta?.label ?? status}
    </span>
  );
}

export default function ApplicationList({
  applications,
  onOpen,
  selectMode,
  selectedIds,
  onSelect,
}: ApplicationListProps) {
  if (applications.length === 0) {
    return (
      <div className="card py-12 text-center text-sm text-muted">
        No applications match your filters.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="thin-scroll overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-2">
              {selectMode && <th className="w-10 px-4 py-3" />}
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Applied</th>
              <th className="px-4 py-3">Deadline</th>
              <th className="px-4 py-3">Follow-up</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => {
              const overdueDeadline =
                app.deadline &&
                new Date(app.deadline).getTime() < Date.now() &&
                app.status !== "offer" &&
                app.status !== "rejected";
              const isSelected = selectedIds?.has(app.id);
              return (
                <tr
                  key={app.id}
                  onClick={() => selectMode ? onSelect?.(app.id) : onOpen(app.id)}
                  className={`cursor-pointer border-b border-border last:border-0 transition ${
                    isSelected ? "bg-brand-soft" : "hover:bg-surface-muted"
                  }`}
                >
                  {selectMode && (
                    <td className="px-4 py-3">
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded border-2 transition ${
                          isSelected ? "border-brand bg-brand text-white" : "border-border"
                        }`}
                      >
                        {isSelected && <span className="text-[9px] font-bold leading-none">✓</span>}
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      {app.company}
                      {app.sponsorVerified && (
                        <BadgeCheck
                          size={14}
                          className="text-brand-strong"
                          strokeWidth={2.4}
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{app.role}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={app.status} />
                  </td>
                  <td className="px-4 py-3">
                    {app.priority > 0 ? (
                      <span className="inline-flex items-center gap-0.5">
                        {Array.from({ length: app.priority }).map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            className="text-amber-400"
                            fill="currentColor"
                            strokeWidth={2}
                          />
                        ))}
                      </span>
                    ) : (
                      <span className="text-muted-2">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {shortDate(app.appliedAt)}
                  </td>
                  <td
                    className={`px-4 py-3 ${
                      overdueDeadline ? "font-medium text-danger" : "text-muted"
                    }`}
                  >
                    {shortDate(app.deadline)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {shortDate(app.followUpDate)}
                  </td>
                  <td className="px-4 py-3 capitalize text-muted">
                    {app.location || app.locationType}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {app.url && (
                      <a
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex text-muted-2 hover:text-brand-strong"
                        aria-label="Open posting"
                      >
                        <ExternalLink size={15} />
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
