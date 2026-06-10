"use client";

import { useCallback, useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  type Theme,
  THEMES,
  applyTheme,
  getStoredTheme,
  resolveTheme,
  setStoredTheme,
} from "@/app/lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

const NEXT: Record<Theme, Theme> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const META: Record<Theme, { label: string; icon: typeof Sun }> = {
  light: { label: "Light", icon: Sun },
  dark: { label: "Dark", icon: Moon },
  system: { label: "System", icon: Monitor },
};

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia(DARK_QUERY).matches
  );
}

/**
 * Sidebar theme switch. Cycles Light → Dark → System and keeps the resolved
 * theme on <html> in sync. In System mode it tracks live OS-preference changes.
 * The pre-paint script in app/layout.tsx has already applied the correct class,
 * so the only job here on mount is to read the stored preference into state.
 */
export default function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const [theme, setTheme] = useState<Theme>("system");
  // Avoid rendering a possibly-wrong icon before we've read localStorage.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(getStoredTheme(window.localStorage));
    setMounted(true);
  }, []);

  // While in System mode, follow OS changes immediately.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () =>
      applyTheme(document.documentElement, mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const cycle = useCallback(() => {
    setTheme((current) => {
      const next = NEXT[current];
      setStoredTheme(window.localStorage, next);
      applyTheme(document.documentElement, resolveTheme(next, systemPrefersDark()));
      return next;
    });
  }, []);

  const active = META[theme];
  const Icon = active.icon;
  // SSR/first paint: neutral icon + label so markup matches before hydration.
  const label = mounted ? active.label : META.system.label;
  const RenderIcon = mounted ? Icon : META.system.icon;

  const title = `Theme: ${label} — click to switch to ${META[NEXT[theme]].label}`;

  return (
    <button
      type="button"
      onClick={cycle}
      title={collapsed ? title : undefined}
      aria-label={title}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground ${
        collapsed ? "justify-center" : ""
      }`}
    >
      <RenderIcon size={20} className="shrink-0" />
      {!collapsed && (
        <span className="flex items-center gap-1.5">
          Theme
          <span className="text-muted-2">·</span>
          <span className="text-foreground">{label}</span>
        </span>
      )}
    </button>
  );
}

export { THEMES };
