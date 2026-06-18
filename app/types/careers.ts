/**
 * Types for careers-page resolution and in-app job listings. Shared between the
 * resolver/listings APIs and the components that render them.
 */

/** Applicant-tracking systems we can pull live listings from (or "other"). */
export type AtsType =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workday"
  | "smartrecruiters"
  | "other";

/** How sure the resolver is about a careers URL. */
export type Confidence = "high" | "low";

/**
 * A resolved careers destination for a registered company name. `careersUrl` is
 * the best link to open; when `atsType`/`atsToken` are present we can also fetch
 * the open roles via that ATS's public API.
 */
export interface CareersResolution {
  name: string;
  careersUrl: string | null;
  homepageUrl: string | null;
  atsType: AtsType | null;
  atsToken: string | null;
  confidence: Confidence | null;
  /** "ok" once anything is found; "unresolved" when even the guess came up empty. */
  status: "ok" | "unresolved";
  /** Whether the AI web-search layer contributed (false = deterministic only). */
  aiAssisted: boolean;
}

/** One open role, normalised across ATS providers. */
export interface Listing {
  title: string;
  location: string | null;
  url: string;
  /** ISO date the role was posted, when the ATS exposes it. */
  postedAt: string | null;
}

/** Response shape of the listings API. */
export interface ListingsResult {
  /** Live roles pulled from the ATS; empty when none / no ATS support. */
  listings: Listing[];
  /** Where the careers button should point when we can't list roles in-app. */
  careersUrl: string | null;
  atsType: AtsType | null;
  /** True when listings came from a real ATS feed (vs. only the fallback link). */
  fromAts: boolean;
}

/** A listing tagged with its company, for the aggregated roles feed. */
export interface FeedRole extends Listing {
  company: string;
  atsType: AtsType;
  /** Whether the company is on the user's tracked board / sponsor matches. */
  tracked: boolean;
}

/** Response shape of the unified roles feed API. */
export interface RolesFeedResult {
  roles: FeedRole[];
  /** Companies whose feeds contributed, with role counts (for filter chips). */
  companies: { name: string; count: number; tracked: boolean }[];
  generatedAt: string;
}
