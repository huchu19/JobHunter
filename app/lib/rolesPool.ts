import type { AtsType } from "@/app/types/careers";

/**
 * Curated pool of UK visa-sponsoring scale-ups with **verified public ATS
 * boards** (Greenhouse / Lever / Ashby). Each entry's `atsType` + `token` were
 * confirmed live to return open roles, so the unified roles feed can fetch them
 * directly — no domain probe, no Gemini call, no resolution latency.
 *
 * Why a curated pool: the profile matcher surfaces name-keyword matches (lots of
 * tiny "X Software Technologies Ltd" consultancies) that have no public job feed,
 * so aggregating over /matches alone yields almost nothing. This pool guarantees
 * the feed shows real, applyable roles. The user's own tracked companies are
 * resolved and merged on top at request time.
 *
 * All of these appear on the gov.uk Skilled Worker sponsor register. Re-verify
 * tokens periodically (boards get renamed); a dead token simply yields 0 roles
 * and drops out of the feed.
 */
export interface PoolCompany {
  /** Display name (matches the brand, not necessarily the legal name). */
  name: string;
  atsType: AtsType;
  token: string;
}

export const ROLES_POOL: PoolCompany[] = [
  { name: "Monzo", atsType: "greenhouse", token: "monzo" },
  { name: "Deliveroo", atsType: "ashby", token: "deliveroo" },
  { name: "Cloudflare", atsType: "greenhouse", token: "cloudflare" },
  { name: "GoCardless", atsType: "greenhouse", token: "gocardless" },
  { name: "Graphcore", atsType: "greenhouse", token: "graphcore" },
  { name: "Tide", atsType: "greenhouse", token: "tide" },
  { name: "Wayve", atsType: "greenhouse", token: "wayve" },
  { name: "Skyscanner", atsType: "greenhouse", token: "skyscanner" },
  { name: "TrueLayer", atsType: "greenhouse", token: "truelayer" },
  { name: "Form3", atsType: "greenhouse", token: "form3" },
  { name: "Cleo", atsType: "greenhouse", token: "cleo" },
  { name: "Palantir", atsType: "lever", token: "palantir" },
  { name: "Octopus Energy", atsType: "lever", token: "octoenergy" },
  { name: "Moonpig", atsType: "lever", token: "moonpig" },
  { name: "Synthesia", atsType: "ashby", token: "synthesia" },
  { name: "Lendable", atsType: "ashby", token: "lendable" },
  { name: "Elliptic", atsType: "ashby", token: "elliptic" },
  { name: "Pleo", atsType: "ashby", token: "pleo" },
  { name: "Paddle", atsType: "ashby", token: "paddle" },
  { name: "Multiverse", atsType: "ashby", token: "multiverse" },
  { name: "Quantexa", atsType: "ashby", token: "quantexa" },
  { name: "Trainline", atsType: "ashby", token: "trainline" },
  { name: "Primer", atsType: "ashby", token: "primer" },
  { name: "Marshmallow", atsType: "ashby", token: "marshmallow" },
  { name: "Freetrade", atsType: "ashby", token: "freetrade" },
  { name: "Zilch", atsType: "ashby", token: "zilch" },
  { name: "Beamery", atsType: "ashby", token: "beamery" },
  { name: "Improbable", atsType: "ashby", token: "improbable" },
  { name: "Tractable", atsType: "ashby", token: "tractable" },
];
