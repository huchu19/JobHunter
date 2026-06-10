import Fuse from "fuse.js";

/**
 * Fuzzy-matches a company name against the gov.uk sponsor register. Shared by
 * the applications POST (create) and PATCH (company edit) routes so matching is
 * never re-implemented per call site.
 *
 * Returns true when the company name resolves to a registered sponsor within
 * the fuzzy threshold.
 */
export function fuzzyMatchSponsor(
  companyName: string,
  sponsors: { name: string }[]
): boolean {
  if (!companyName.trim() || sponsors.length === 0) return false;

  const fuse = new Fuse(sponsors, {
    keys: ["name"],
    threshold: 0.3,
  });

  return fuse.search(companyName).length > 0;
}
