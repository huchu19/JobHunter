"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, User as UserIcon } from "lucide-react";

interface Props {
  /** Collapsed sidebar — show the avatar only, hide the email + label. */
  collapsed?: boolean;
}

// Sidebar footer account block: shows the signed-in user's email and a sign-out
// button. Reads the session from next-auth's built-in /api/auth/session endpoint
// so we don't need a SessionProvider wrapping the whole tree.
export default function UserMenu({ collapsed = false }: Props) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active) setEmail(data?.user?.email ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-3 mb-3 mt-1 rounded-xl border border-border bg-surface-muted p-2">
      <div
        className={`flex items-center gap-2 px-1 py-1 ${
          collapsed ? "justify-center" : ""
        }`}
        title={email ?? undefined}
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-strong">
          <UserIcon size={14} strokeWidth={2.4} />
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">
            {email ?? "Signed in"}
          </span>
        )}
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        title={collapsed ? "Sign out" : undefined}
        className={`mt-1 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <LogOut size={18} className="shrink-0" />
        {!collapsed && <span>Sign out</span>}
      </button>
    </div>
  );
}
