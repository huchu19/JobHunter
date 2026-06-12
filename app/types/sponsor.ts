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
  "Organisation Name": string;
  "Town/City": string;
  County: string;
  "Type & Rating": string;
  Route: string;
}
