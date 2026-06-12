import Link from "next/link";
import { ArrowRight, BookOpen, ExternalLink } from "lucide-react";
import { GUIDES } from "@/app/lib/guides";

const OFFICIAL_LINKS = [
  {
    label: "Skilled Worker visa overview",
    href: "https://www.gov.uk/skilled-worker-visa",
  },
  {
    label: "Register of licensed sponsors",
    href: "https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers",
  },
  {
    label: "Salary & job rules",
    href: "https://www.gov.uk/skilled-worker-visa/your-job",
  },
  {
    label: "Fees & healthcare surcharge",
    href: "https://www.gov.uk/skilled-worker-visa/how-much-it-costs",
  },
  {
    label: "Employer sponsorship guidance (UKVI)",
    href: "https://www.gov.uk/uk-visa-sponsorship-employers",
  },
];

export default function GuidesPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border bg-surface px-8 py-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-strong">
          Visa Sponsorship Guide
        </p>
        <h1 className="display mt-2 text-3xl text-foreground">
          Sponsorship, <span className="text-gradient-brand">demystified.</span>
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">
          How the Skilled Worker route actually works — timelines, eligibility,
          what sponsors are signing up for, and the mistakes that cost
          applicants offers. Checked against gov.uk, June 2026.
        </p>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl space-y-6 p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            {GUIDES.map((g) => (
              <Link
                key={g.slug}
                href={`/guides/${g.slug}`}
                className="card group flex flex-col p-5 transition hover:border-brand/40"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand-strong">
                  <BookOpen size={17} />
                </span>
                <h2 className="mt-3 text-base font-semibold text-foreground">
                  {g.title}
                </h2>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-muted">
                  {g.description}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-strong">
                  Read guide{" "}
                  <ArrowRight
                    size={14}
                    className="transition group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            ))}
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Official sources
            </h2>
            <p className="mt-1 text-sm text-muted">
              Rules and figures change — these gov.uk pages are always current.
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {OFFICIAL_LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-strong hover:underline"
                  >
                    <ExternalLink size={13} /> {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
