import Link from "next/link";
import { ArrowRight, Compass, Home, ShieldQuestion } from "lucide-react";
import Logo from "@/app/components/Logo";

export const metadata = {
  title: "Page not found — JobHunter",
  description: "That page isn’t on the board.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* ---- Top bar ---- */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="h-8 w-8" />
            <span className="display text-base font-semibold tracking-tight">
              JobHunter
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="btn-brand inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Open app <ArrowRight size={15} strokeWidth={2.4} />
          </Link>
        </div>
      </header>

      {/* ---- 404 body ---- */}
      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-[1fr_0.85fr]">
          {/* Copy */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
              <ShieldQuestion size={13} className="text-brand" strokeWidth={2.5} />
              Error 404
            </span>
            <h1 className="display mt-5 text-balance text-5xl leading-[1.04] text-foreground sm:text-6xl">
              This role isn’t on the <span className="text-brand">board.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
              The page you’re after has moved, expired, or never existed — a bit
              like a job posting that vanishes the moment you click apply. Let’s
              get you back to something real.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="btn-brand inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold"
              >
                <Home size={16} strokeWidth={2.4} /> Back home
              </Link>
              <Link
                href="/sponsors"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-surface-muted"
              >
                <Compass size={16} /> Search sponsors
              </Link>
            </div>
          </div>

          {/* Faux board slab — the "missing" card, matching the homepage hero. */}
          <div className="panel-ink relative rounded-2xl p-5 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-white/90">
                Where you wanted to go
              </span>
              <span className="figure rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/70">
                404
              </span>
            </div>
            <div className="space-y-2.5">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="rounded-lg border border-white/10 bg-white/[0.06] p-3"
                >
                  <div className="h-2 w-3/4 rounded bg-white/25" />
                  <div className="mt-2 h-2 w-1/2 rounded bg-white/12" />
                </div>
              ))}
              {/* the missing slot */}
              <div className="grid place-items-center rounded-lg border border-dashed border-white/20 bg-white/[0.02] p-6 text-center">
                <span className="figure text-3xl font-semibold text-white/30">
                  404
                </span>
                <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-white/40">
                  Not found
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ---- Footer ---- */}
      <footer className="mt-auto border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-6 py-8 text-sm text-muted-2">
          <span>JobHunter</span>
        </div>
      </footer>
    </div>
  );
}
