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
  createdAt: Date;
  updatedAt: Date;
}

export type ApplicationStatus =
  | "wishlist"
  | "applied"
  | "interview"
  | "offer"
  | "rejected";

export type LocationType = "london" | "remote" | "hybrid" | "relocation";
export type JobType = "grad" | "intern" | "contract";
