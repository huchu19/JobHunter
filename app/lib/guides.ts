import fs from "node:fs";
import path from "node:path";

/**
 * Registry + loader for the markdown-based /guides section. Content lives in
 * `content/guides/*.md`; only registered slugs can be loaded (no path
 * traversal). Server-only (fs).
 */

export interface GuideMeta {
  slug: string;
  title: string;
  description: string;
}

export const GUIDES: GuideMeta[] = [
  {
    slug: "visa-timeline",
    title: "The Skilled Worker visa timeline",
    description:
      "From accepted offer to visa in hand: every stage, how long each takes, and what slows them down.",
  },
  {
    slug: "eligibility-checklist",
    title: "Eligibility checklist",
    description:
      "Salary thresholds, English level, maintenance funds, documents — check you qualify before you apply.",
  },
  {
    slug: "sponsor-obligations",
    title: "What sponsors must do",
    description:
      "Licences, A-ratings, reporting duties, and what sponsorship costs employers — read offers like an insider.",
  },
  {
    slug: "common-mistakes",
    title: "Common mistakes",
    description:
      "Trading-name confusion, going-rate misses, timing traps, and money slip-ups that sink applications.",
  },
  {
    slug: "faq",
    title: "Sponsorship FAQ",
    description:
      "Costs, switching visas, changing employer, losing a job, dependants, and the road to settlement.",
  },
];

export function getGuide(slug: string): GuideMeta | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function loadGuideContent(slug: string): string | null {
  if (!getGuide(slug)) return null;
  const file = path.join(process.cwd(), "content", "guides", `${slug}.md`);
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}
