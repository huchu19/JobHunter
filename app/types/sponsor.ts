export interface Sponsor {
  name: string;
  city: string;
  rating: string;
  route: string;
  isTech?: boolean;
  techScore?: number;
  matchedTerms?: string[];
}

export interface RawSponsorRow {
  "Sponsor Licence Number": string;
  "Organisation Name": string;
  TierRating: string;
  "Migrant Classification": string;
  "Sponsor Status": string;
}
