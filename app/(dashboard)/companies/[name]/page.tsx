import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  Clock,
  Briefcase,
} from "lucide-react";
import prisma from "@/app/lib/db";
import { fuzzyMatchSponsor } from "@/app/lib/sponsorMatch";
import { fetchSponsorsFromCache } from "@/app/lib/sponsorCache";
import {
  VISA_TIMELINE_STAGES,
  estimateVisaTimeline,
  formatWeeksRange,
} from "@/app/lib/visaTimeline";
import {
  linkedInJobsUrl,
  googleCareersUrl,
  glassdoorSearchUrl,
  googleSalaryUrl,
} from "@/app/lib/companyLinks";
import { STATUS_META } from "@/app/lib/applicationStatus";
import type { ApplicationStatus } from "@/app/types/application";
import type { RatingDTO } from "@/app/types/company";
import CompanyRatingsPanel from "@/app/components/companies/CompanyRatingsPanel";

/**
 * Company research page: aggregated community ratings, the user's own
 * application history with the company ("sponsorship history"), salary
 * intel collected from tracked applications, external research links, and a
 * deterministic Skilled Worker visa timeline estimate.
 */

async function getCompanyData(name: string) {
  const target = name.trim().toLowerCase();

  const [companies, applications] = await Promise.all([
    prisma.company.findMany({ select: { id: true, name: true } }),
    prisma.application.findMany({
      select: {
        id: true,
        company: true,
        role: true,
        status: true,
        salary: true,
        sponsorVerified: true,
        appliedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // SQLite Prisma has no case-insensitive mode — match in JS.
  const company = companies.find((c) => c.name.toLowerCase() === target);
  const ratings = company
    ? await prisma.rating.findMany({
        where: { companyId: company.id },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const companyApps = applications.filter(
    (a) => a.company.toLowerCase() === target
  );

  return { ratings, companyApps };
}

/** Sponsor check: trust an already-verified application, else fuzzy-match. */
async function checkSponsor(
  name: string,
  appVerified: boolean
): Promise<boolean> {
  if (appVerified) return true;
  try {
    const sponsors = await fetchSponsorsFromCache();
    return fuzzyMatchSponsor(name, sponsors);
  } catch {
    return false;
  }
}

async function CompanyContent({ name }: { name: string }) {
  const { ratings, companyApps } = await getCompanyData(name);
  const sponsorVerified = await checkSponsor(
    name,
    companyApps.some((a) => a.sponsorVerified)
  );

  const salaries = Array.from(
    new Set(
      companyApps
        .map((a) => a.salary?.trim())
        .filter((s): s is string => !!s)
    )
  );

  const ratingDTOs: RatingDTO[] = ratings.map((r) => ({
    id: r.id,
    companyId: r.companyId,
    rating: r.rating,
    comment: r.comment,
    category: r.category,
    createdAt: r.createdAt.toISOString(),
  }));

  const total = estimateVisaTimeline();

  const researchLinks = [
    { label: "Glassdoor reviews & salaries", href: glassdoorSearchUrl(name) },
    { label: "Salary & benefits search", href: googleSalaryUrl(name) },
    { label: "LinkedIn jobs", href: linkedInJobsUrl(name) },
    { label: "Careers page search", href: googleCareersUrl(name) },
  ];

  return (
    <div className="space-y-6">
      {/* Sponsor + at-a-glance row */}
      <div className="flex flex-wrap items-center gap-3">
        {sponsorVerified ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand-strong ring-1 ring-inset ring-brand/20">
            <BadgeCheck size={15} strokeWidth={2.4} /> Licensed sponsor
            (gov.uk register match)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-sm font-medium text-muted ring-1 ring-inset ring-border">
            No sponsor register match found
          </span>
        )}
        {companyApps.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-sm font-medium text-muted ring-1 ring-inset ring-border">
            <Briefcase size={14} /> {companyApps.length} tracked application
            {companyApps.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ratings (client panel with filter + form) */}
        <CompanyRatingsPanel companyName={name} initialRatings={ratingDTOs} />

        <div className="space-y-6">
          {/* Your application history */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-foreground">
              Your applications here
            </h2>
            {companyApps.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                You haven&apos;t tracked any applications to this company yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {companyApps.map((a) => {
                  const meta = STATUS_META[a.status as ApplicationStatus];
                  return (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
                    >
                      <span className="min-w-0 truncate text-sm font-medium text-foreground">
                        {a.role}
                      </span>
                      <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-semibold capitalize text-muted">
                        {meta?.label ?? a.status}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {salaries.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Salary intel from your tracked roles
                </h3>
                <ul className="mt-1.5 flex flex-wrap gap-2">
                  {salaries.map((s) => (
                    <li
                      key={s}
                      className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-strong"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Research links */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-foreground">
              Research links
            </h2>
            <ul className="mt-3 space-y-2">
              {researchLinks.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-strong hover:underline"
                  >
                    <ExternalLink size={14} /> {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Visa timeline estimate */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Skilled Worker visa timeline estimate
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand-strong">
            <Clock size={13} /> Typically{" "}
            {formatWeeksRange(total.minWeeks, total.maxWeeks)} end-to-end
          </span>
        </div>
        <ol className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {VISA_TIMELINE_STAGES.map((stage, i) => (
            <li
              key={stage.key}
              className="rounded-xl border border-border bg-surface px-4 py-3"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-brand-strong">
                Step {i + 1} ·{" "}
                {formatWeeksRange(stage.minWeeks, stage.maxWeeks)}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {stage.label}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {stage.description}
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted-2">
          Estimates based on published gov.uk service standards; actual times
          vary by employer and application route.
        </p>
      </div>
    </div>
  );
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: raw } = await params;
  const name = decodeURIComponent(raw);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border bg-surface px-8 py-7">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-foreground"
        >
          <ArrowLeft size={15} /> Back to dashboard
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-brand-strong">
          Company research
        </p>
        <h1 className="display mt-2 text-3xl text-foreground">{name}</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">
          Community ratings, your application history, salary intel, and what a
          Skilled Worker visa typically takes here.
        </p>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl p-8">
          <Suspense
            fallback={
              <div className="card p-8 text-sm text-muted">
                Loading company research…
              </div>
            }
          >
            <CompanyContent name={name} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
