export interface Application {
  id: string;
  company: string;
  role: string;
  url: string | null;
  location: string | null;
  locationType: string;
  jobType: string;
  status: string;
  appliedAt: Date | null;
  notes: string | null;
  salary: string | null;
  source: string | null;
  sponsorVerified: boolean;
  priority: number;
  deadline: Date | null;
  followUpDate: Date | null;
  interviewAt: Date | null;
  offerAt: Date | null;
  rejectedAt: Date | null;
  rejectedReason: string | null;
  contactName: string | null;
  contactEmail: string | null;
  jobDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ApplicationStatus =
  | "wishlist"
  | "applied"
  | "shortlisted"
  | "interview"
  | "offer"
  | "rejected";

export type LocationType = "london" | "remote" | "hybrid" | "relocation";
export type JobType = "grad" | "intern" | "contract";

/** Interest / priority rating. 0 = unset, 1..5 = increasing interest. */
export type Priority = 0 | 1 | 2 | 3 | 4 | 5;

export type ActivityType =
  | "created"
  | "status_change"
  | "interview"
  | "note"
  | "follow_up";

export interface Activity {
  id: string;
  applicationId: string;
  type: string;
  fromStatus: string | null;
  toStatus: string | null;
  title: string | null;
  notes: string | null;
  occurredAt: Date;
  createdAt: Date;
}

/**
 * Client-side shape of an Activity. Dates arrive as ISO strings over JSON.
 */
export interface ActivityDTO {
  id: string;
  applicationId: string;
  type: string;
  fromStatus: string | null;
  toStatus: string | null;
  title: string | null;
  notes: string | null;
  occurredAt: string;
  createdAt: string;
}

/**
 * Client-side shape of an Application. The API serialises `Date` fields to ISO
 * strings over JSON, so client components consume this variant instead of the
 * `Date`-typed `Application`.
 */
export interface ApplicationDTO {
  id: string;
  company: string;
  role: string;
  url: string | null;
  location: string | null;
  locationType: string;
  jobType: string;
  status: string;
  appliedAt: string | null;
  notes: string | null;
  salary: string | null;
  source: string | null;
  sponsorVerified: boolean;
  priority: number;
  deadline: string | null;
  followUpDate: string | null;
  interviewAt: string | null;
  offerAt: string | null;
  rejectedAt: string | null;
  rejectedReason: string | null;
  contactName: string | null;
  contactEmail: string | null;
  jobDescription: string | null;
  createdAt: string;
  updatedAt: string;
  /** Present only when fetched from GET /api/applications/[id]. */
  activities?: ActivityDTO[];
}
