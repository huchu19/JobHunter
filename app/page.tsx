import Link from "next/link";
import {
  Compass,
  ArrowRight,
  ShieldCheck,
  LayoutDashboard,
  Sparkles,
  Briefcase,
  FileUser,
  Radio,
} from "lucide-react";

export const metadata = {
  title: "UK Sponsor Finder — track every visa-sponsored job application",
  description:
    "Search 34,000+ A-rated UK Skilled Worker sponsors, auto-verify every company you apply to against the live gov.uk register, and track it all on one board.",
};

const STATS = [
  { value: "34,128", label: "A-rated sponsors" },
  { value: "Live", label: "gov.uk register" },
  { value: "1 board", label: "every application" },
];

const FEATURES = [
  {
    icon: Compass,
    title: "Search the register",
    body: "Fuzzy search every A-rated Skilled Worker sponsor by name, sector, or area — straight from the gov.uk CSV, not a stale copy.",
  },
  {
    icon: ShieldCheck,
    title: "Auto-verify on save",
    body: "Every job you add is matched against the live register, so you never waste an application on a company that can't sponsor you.",
  },
  {
    icon: LayoutDashboard,
    title: "Track on one board",
    body: "Wishlist → applied → interview → offer. Deadlines, contacts, and a full timeline for each role, in a board that doesn't make you scroll forever.",
  },
  {
    icon: Sparkles,
    title: "Matches picked for you",
    body: "Your profile's skills and title, scored against the whole register — ranked by which sponsors are actually hiring right now.",
  },
  {
    icon: Briefcase,
    title: "Live roles, ready to save",
    body: "Open roles pulled from sponsors' own careers boards. Search, filter, and save straight to your board in one click.",
  },
  {
    icon: FileUser,
    title: "Fill applications once",
    body: "A reusable application profile plus one-paste job import and a browser extension that autofills the forms for you.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Find who can sponsor",
    body: "Search the register or let matching surface sponsors that fit your profile and are hiring.",
  },
  {
    n: "02",
    title: "Apply with confidence",
    body: "Every company is verified against gov.uk before you spend time on the application.",
  },
  {
    n: "03",
    title: "Track to offer",
    body: "Move each role across the board, never miss a deadline, and keep the whole pipeline in one place.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* ---- Top bar ---- */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-[color:var(--brand-contrast)]">
              <Compass size={18} strokeWidth={2.25} />
            </span>
            <span className="display text-base font-semibold tracking-tight">
              UK Sponsor Finder
            </span>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/guides"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:text-foreground sm:block"
            >
              Visa guide
            </Link>
            <Link
              href="/dashboard"
              className="btn-brand inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold"
            >
              Open app <ArrowRight size={15} strokeWidth={2.4} />
            </Link>
          </nav>
        </div>
      </header>

      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          {/* Copy */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
              <Radio size={13} className="text-brand" strokeWidth={2.5} />
              Live from the gov.uk Skilled Worker register
            </span>
            <h1 className="display mt-5 text-balance text-5xl leading-[1.04] text-foreground sm:text-6xl">
              Only apply where you can actually{" "}
              <span className="text-brand">be sponsored.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Search 34,000+ A-rated UK visa sponsors, auto-verify every job you
              apply to, and track the whole pipeline on one calm board — built for
              people who need a Skilled Worker visa.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="btn-brand inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold"
              >
                Open the dashboard <ArrowRight size={16} strokeWidth={2.4} />
              </Link>
              <Link
                href="/sponsors"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-surface-muted"
              >
                <Compass size={16} /> Search sponsors
              </Link>
            </div>

            <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-4">
              {STATS.map((s) => (
                <div key={s.label}>
                  <dt className="figure text-2xl font-semibold tabular-nums text-foreground">
                    {s.value}
                  </dt>
                  <dd className="text-xs uppercase tracking-wide text-muted-2">
                    {s.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Faux board preview — a slate slab hinting at the product. */}
          <div className="panel-ink relative rounded-2xl p-4 shadow-lg lg:p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-white/90">
                Your board
              </span>
              <span className="figure rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/70">
                78 tracked
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Wishlist", n: 29, dot: "#94a3b8" },
                { label: "Applied", n: 49, dot: "#7b7bf0" },
                { label: "Interview", n: 3, dot: "#34d399" },
              ].map((col) => (
                <div
                  key={col.label}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5"
                >
                  <div className="mb-2.5 flex items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: col.dot }}
                    />
                    <span className="text-[11px] font-semibold text-white/80">
                      {col.label}
                    </span>
                    <span className="figure ml-auto text-[11px] text-white/40">
                      {col.n}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: col.label === "Interview" ? 1 : 3 }).map(
                      (_, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-white/10 bg-white/[0.06] p-2"
                        >
                          <div className="h-1.5 w-3/4 rounded bg-white/25" />
                          <div className="mt-1.5 h-1.5 w-1/2 rounded bg-white/12" />
                          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand/20 px-1.5 py-0.5">
                            <ShieldCheck size={9} className="text-brand" />
                            <span className="text-[8px] font-semibold text-brand">
                              Verified
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---- Features ---- */}
      <section className="border-t border-border bg-surface-muted/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="eyebrow">What it does</p>
          <h2 className="display mt-2 max-w-2xl text-3xl text-foreground">
            Everything between “is this real?” and “I got the offer.”
          </h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-surface p-6">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-soft text-brand-strong">
                    <Icon size={19} strokeWidth={2.1} />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-foreground">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {f.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---- How it works ---- */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="eyebrow">How it works</p>
          <h2 className="display mt-2 text-3xl text-foreground">
            Three steps, one source of truth.
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="relative">
                <span className="figure text-sm font-semibold text-brand">
                  {step.n}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Closing CTA ---- */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="panel-ink flex flex-col items-start justify-between gap-6 rounded-2xl p-10 sm:flex-row sm:items-center">
            <div>
              <h2 className="display text-3xl text-white">
                Stop guessing who sponsors.
              </h2>
              <p className="mt-2 max-w-md text-[15px] text-white/70">
                Open the board, search the register, and start tracking — no
                account needed to look around.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="btn-brand inline-flex shrink-0 items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold"
            >
              Open the app <ArrowRight size={16} strokeWidth={2.4} />
            </Link>
          </div>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="mt-auto border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-2 sm:flex-row">
          <span>UK Sponsor Finder</span>
          <span>
            Sponsor data from the{" "}
            <a
              href="https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers"
              className="font-medium text-muted transition hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              gov.uk register of licensed sponsors
            </a>
            .
          </span>
        </div>
      </footer>
    </div>
  );
}
