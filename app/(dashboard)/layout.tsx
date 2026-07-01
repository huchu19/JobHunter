"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, Suspense } from "react";
import {
  LayoutDashboard,
  Compass,
  PanelLeftClose,
  PanelLeftOpen,
  FileUser,
  BarChart3,
  BookOpen,
  Briefcase,
  Settings,
  Sparkles,
} from "lucide-react";
import ThemeToggle from "@/app/components/ThemeToggle";
import Logo from "@/app/components/Logo";
import UserMenu from "@/app/components/UserMenu";
import SponsorStatus from "@/app/components/SponsorStatus";
import SponsorStatusFallback from "@/app/components/SponsorStatusFallback";

interface NavLink {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const navLinks: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/sponsors", label: "Find Sponsors", icon: Compass },
  { href: "/matches", label: "Matches", icon: Sparkles },
  { href: "/roles", label: "Live Roles", icon: Briefcase },
  { href: "/guides", label: "Visa Guide", icon: BookOpen },
  { href: "/profile", label: "Application Profile", icon: FileUser },
  { href: "/settings", label: "Settings", icon: Settings },
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
        {/* Brand — clicking returns to the root landing page */}
        <div className="h-[72px] flex items-center px-4 border-b border-border">
          <Link
            href="/"
            aria-label="JobHunter — back to home"
            className="flex items-center gap-2.5 overflow-hidden rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo className="h-9 w-9 shrink-0" />
            {sidebarOpen && (
              <span className="display text-[17px] font-semibold tracking-tight leading-tight whitespace-nowrap">
                JobHunter
              </span>
            )}
          </Link>
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
        {sidebarOpen && (
          <Suspense fallback={<SponsorStatusFallback />}>
            <SponsorStatus />
          </Suspense>
        )}

        {/* Account: signed-in email + sign out */}
        <UserMenu collapsed={!sidebarOpen} />
      </aside>

      {/* Main content. min-w-0/min-h-0 let flex children (e.g. the fixed-height
          dashboard + its internal-scroll board) constrain correctly; pages that
          want to scroll do so in their own region. */}
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="h-full min-h-0">{children}</div>
      </main>
    </div>
  );
}
