import prisma from "@/app/lib/db";
import { fetchDetailedSponsorsFromCache } from "@/app/lib/sponsorCache";
import {
  extractProfileSignals,
  topSponsorMatches,
  compareSalary,
  type SponsorMatch,
} from "@/app/lib/sponsorMatcher";
import { getAnthropic, ANTHROPIC_MODEL } from "@/app/lib/anthropic";

/**
 * Top sponsors for the saved profile. Deterministic scoring
 * (`sponsorMatcher`, built on the techClassifier) is the always-available
 * base; when ANTHROPIC_API_KEY is set, Claude re-ranks the deterministic
 * shortlist and writes one-line "why" blurbs. Any AI failure falls back to
 * the deterministic order — the route never hard-fails on the key.
 */

const LIMIT = 10;
// Give the AI a wider shortlist to re-rank from.
const SHORTLIST = 25;

interface AiPick {
  name: string;
  why: string;
}

async function aiRerank(
  matches: SponsorMatch[],
  profileSummary: string
): Promise<SponsorMatch[] | null> {
  const anthropic = getAnthropic();
  if (!anthropic || matches.length === 0) return null;

  try {
    const list = matches
      .map((m, i) => `${i + 1}. ${m.sponsor.name} (signals: ${m.reasons.join("; ")})`)
      .join("\n");

    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `A job seeker needs a UK Skilled Worker visa sponsor. Their profile: ${profileSummary}

These licensed sponsors matched their profile by name-signal heuristics:
${list}

Pick the ${LIMIT} most promising for this candidate and order them best-first. Reply with JSON only: [{"name": "<exact name from the list>", "why": "<one short sentence>"}]`,
        },
      ],
    });

    const text = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]");
    if (jsonStart === -1 || jsonEnd === -1) return null;
    const picks = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as AiPick[];

    const byName = new Map(matches.map((m) => [m.sponsor.name.toLowerCase(), m]));
    const reranked: SponsorMatch[] = [];
    for (const pick of picks) {
      const match = byName.get(String(pick.name).toLowerCase());
      if (match) {
        reranked.push({
          ...match,
          reasons: pick.why ? [pick.why, ...match.reasons] : match.reasons,
        });
      }
    }
    return reranked.length > 0 ? reranked.slice(0, LIMIT) : null;
  } catch (error) {
    console.error("AI re-rank failed, using deterministic order:", error);
    return null;
  }
}

export async function GET() {
  try {
    const [profile, applications, sponsors] = await Promise.all([
      prisma.profile.findUnique({ where: { id: "singleton" } }),
      prisma.application.findMany({
        select: { company: true, salary: true },
      }),
      fetchDetailedSponsorsFromCache(),
    ]);

    const signals = extractProfileSignals(profile ?? {});
    const profileReady = signals.keywords.length > 0 || signals.isTechProfile;

    if (!profileReady || sponsors.length === 0) {
      return Response.json({
        matches: [],
        salary: compareSalary(signals.salaryMin, applications.map((a) => a.salary)),
        profileReady,
        sponsorsAvailable: sponsors.length > 0,
        aiEnhanced: false,
      });
    }

    const exclude = new Set(applications.map((a) => a.company));
    const shortlist = topSponsorMatches(signals, sponsors, {
      limit: SHORTLIST,
      exclude,
    });

    const profileSummary = [
      profile?.currentTitle,
      profile?.yearsExperience && `${profile.yearsExperience} yrs experience`,
      profile?.skills && `skills: ${profile.skills}`,
      profile?.salaryExpectation && `salary: ${profile.salaryExpectation}`,
    ]
      .filter(Boolean)
      .join(" · ");

    const reranked = await aiRerank(shortlist, profileSummary);
    const matches = (reranked ?? shortlist).slice(0, LIMIT);

    return Response.json({
      matches,
      salary: compareSalary(signals.salaryMin, applications.map((a) => a.salary)),
      profileReady: true,
      sponsorsAvailable: true,
      aiEnhanced: reranked !== null,
    });
  } catch (error) {
    console.error("Error computing matches:", error);
    return Response.json({ error: "Failed to compute matches" }, { status: 500 });
  }
}
