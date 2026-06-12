"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Compass,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  FileUser,
  BarChart3,
  BookOpen,
} from "lucide-react";
import ThemeToggle from "@/app/components/ThemeToggle";

interface NavLink {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const navLinks: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/sponsors", label: "Find Sponsors", icon: Compass },
  { href: "/guides", label: "Visa Guide", icon: BookOpen },
  { href: "/profile", label: "Application Profile", icon: FileUser },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-[76px]"
        } shrink-0 bg-surface border-r border-border transition-all duration-200 flex flex-col`}
      >
        {/* Brand */}
        <div className="h-[72px] flex items-center px-4 border-b border-border">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-brand to-brand-strong text-white shadow-[0_6px_16px_-6px_rgba(14,148,136,0.7)]">
              <Compass size={20} strokeWidth={2.25} />
            </span>
            {sidebarOpen && (
              <span className="font-bold tracking-tight text-[15px] leading-tight whitespace-nowrap">
                UK Sponsor Finder
              </span>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1.5">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                title={!sidebarOpen ? link.label : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-soft text-brand-strong"
                    : "text-muted hover:bg-surface-muted hover:text-foreground"
                } ${!sidebarOpen && "justify-center"}`}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.4 : 2}
                  className="shrink-0"
                />
                {sidebarOpen && <span>{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Theme + collapse toggles */}
        <div className="space-y-1 px-3">
          <ThemeToggle collapsed={!sidebarOpen} />
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-surface-muted hover:text-foreground transition-colors"
          >
            {sidebarOpen ? (
              <PanelLeftClose size={20} className="shrink-0" />
            ) : (
              <PanelLeftOpen size={20} className="mx-auto shrink-0" />
            )}
            {sidebarOpen && <span>Collapse</span>}
          </button>
        </div>

        {/* Live status */}
        <div className="mx-3 mb-4 mt-3 rounded-xl border border-border bg-surface-muted p-3">
          <div className="flex items-center gap-2">
            <span className="relative grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-strong">
              <Radio size={13} strokeWidth={2.5} />
            </span>
            {sidebarOpen && (
              <div className="leading-tight">
                <p className="text-[11px] font-bold tracking-wide text-foreground">
                  LIVE · GOV.UK
                </p>
                <p className="text-[11px] text-muted">Updated today</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="h-full">{children}</div>
      </main>
    </div>
  );
}
