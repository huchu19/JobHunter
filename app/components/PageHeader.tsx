import type { ReactNode } from "react";

interface PageHeaderProps {
  /** Page title — short, plain (e.g. "Find Sponsors"), not a marketing line. */
  title: string;
  /** Optional one-line subtitle, hidden on small screens to stay compact. */
  subtitle?: ReactNode;
  /** Optional right-aligned slot for actions / links. */
  actions?: ReactNode;
}

/**
 * Compact, consistent work-surface header for dashboard pages. Replaces the old
 * tall marketing heroes (eyebrow + big two-tone headline + blurb) that pushed the
 * actual content far down the page. One row, fixed height, shrink-0 so it never
 * eats the scroll/board region below it.
 */
export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-8 py-4">
      <div className="flex items-baseline gap-3 min-w-0">
        <h1 className="display shrink-0 text-xl text-foreground">{title}</h1>
        {subtitle && (
          <p className="hidden truncate text-sm text-muted-2 sm:block">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
