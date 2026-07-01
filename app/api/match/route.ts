import prisma from "@/app/lib/db";
import { fetchDetailedSponsorsFromCache } from "@/app/lib/sponsorCache";
import {
  extractProfileSignals,
  topSponsorMatches,
  compareSalary,
} from "@/app/lib/sponsorMatcher";
import {
  baseSources,
  resolveSources,
  fetchRolesForSources,
} from "@/app/lib/gatherRoles";
import { scoreRoles, rankEmployers } from "@/app/lib/roleMatcher";
import type { FeedSource } from "@/app/lib/rolesFeed";
import { auth } from "@/app/auth";

/**
 * Matches, reworked: instead of scoring 35k sponsor *names* (which surfaced
 * tiny consultancies), we rank the **real open roles** the user can apply to,
 * grouped into best-fit employers. Roles come from the careers feed (curated
 * scale-up pool + tracked companies); when that yields too few strong matches,
 * we expand on demand by resolving extra profile-shortlisted sponsors.
 */

const LIMIT = 10;
const MIN_EMPLOYERS = 6; // expand if the feed alone gives fewer than this
const EXPAND_RESOLVE = 8; // how many extra sponsors to resolve when expanding

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [profile, applications] = await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      prisma.application.findMany({
        where: { userId },
        select: { company: true, salary: true },
      }),
    ]);

    const signals = extractProfileSignals(profile ?? {});
    const profileReady = signals.keywords.length > 0 || signals.isTechProfile;
    const salary = compareSalary(
      signals.salaryMin,
      applications.map((a) => a.salary)
    );

    if (!profileReady) {
      return Response.json({
        employers: [],
        salary,
        profileReady: false,
        expanded: false,
      });
    }

    // 1. Base roles: curated pool + tracked companies.
    const sources = await baseSources();
    let roles = await fetchRolesForSources(sources);
    let scored = scoreRoles(signals, roles);
    let employers = rankEmployers(scored, { limit: LIMIT });

    // 2. On-demand expansion: if the feed didn't surface enough strong-fit
    //    employers, pull extra sponsors the deterministic matcher likes (that
    //    aren't already covered), resolve them, and fetch their roles.
    let expanded = false;
    if (employers.length < MIN_EMPLOYERS) {
      const have = new Set(sources.map((s) => s.name.toLowerCase()));
      const sponsors = await fetchDetailedSponsorsFromCache().catch(() => []);
      const extraNames = topSponsorMatches(signals, sponsors, { limit: 30 })
        .map((m) => m.sponsor.name)
        .filter((n) => !have.has(n.toLowerCase()))
        .slice(0, EXPAND_RESOLVE);

      if (extraNames.length > 0) {
        const extraSources: FeedSource[] = await resolveSources(
          extraNames,
          false
        );
        if (extraSources.length > 0) {
          roles = roles.concat(await fetchRolesForSources(extraSources));
          scored = scoreRoles(signals, roles);
          employers = rankEmployers(scored, { limit: LIMIT });
          expanded = true;
        }
      }
    }

    return Response.json({
      employers,
      salary,
      profileReady: true,
      expanded,
    });
  } catch (error) {
    console.error("Error computing matches:", error);
    return Response.json({ error: "Failed to compute matches" }, { status: 500 });
  }
}
