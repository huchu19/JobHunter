export const LONDON_POSTCODE_AREAS = [
  "EC1",
  "EC2",
  "EC3",
  "EC4",
  "WC1",
  "WC2",
  "E1",
  "E2",
  "N1",
  "N1C",
  "SE1",
  "SW1",
  "SW1A",
  "W1",
  "W1T",
  "W1F",
  "W2",
  "WC",
] as const;

export const LONDON_AREA_INFO: Record<string, { name: string; label: string }> =
  {
    EC1: { name: "EC1", label: "Old Street / Clerkenwell" },
    EC2: { name: "EC2", label: "Shoreditch / Liverpool Street" },
    EC3: { name: "EC3", label: "Bank / Monument" },
    EC4: { name: "EC4", label: "St Paul's / Blackfriars" },
    WC: { name: "WC", label: "Covent Garden / Holborn" },
    WC1: { name: "WC1", label: "Bloomsbury" },
    WC2: { name: "WC2", label: "Covent Garden" },
    E1: { name: "E1", label: "Whitechapel / Aldgate" },
    E2: { name: "E2", label: "Bethnal Green" },
    N1: { name: "N1", label: "Islington / Angel" },
    SE1: { name: "SE1", label: "Southwark / Waterloo" },
    SW1: { name: "SW1", label: "Westminster / Pimlico" },
    W1: { name: "W1", label: "Mayfair / Soho" },
    W2: { name: "W2", label: "Paddington / Bayswater" },
  };

export const NEAR_EC1V_AREAS = ["EC1", "EC2", "N1"];

export function buildPostcodeRegex(): RegExp {
  const areas = LONDON_POSTCODE_AREAS.join("|");
  return new RegExp(`\\b(${areas})\\b`, "i");
}
