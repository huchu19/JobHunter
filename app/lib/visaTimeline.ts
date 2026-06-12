/**
 * Deterministic UK Skilled Worker visa timeline estimates, shown on the
 * company research page. Figures follow published gov.uk service standards
 * (decision in ~3 weeks when applying from outside the UK, ~8 weeks inside),
 * padded with realistic employer-side lead times. Static data + pure helpers —
 * no AI, no network.
 */

export interface VisaStage {
  key: string;
  label: string;
  description: string;
  minWeeks: number;
  maxWeeks: number;
}

export const VISA_TIMELINE_STAGES: VisaStage[] = [
  {
    key: "offer-to-cos",
    label: "Certificate of Sponsorship assigned",
    description:
      "After accepting the offer, the employer assigns a CoS from their sponsor licence. Fast at licensed sponsors with CoS allocation in hand; slower if they must request more.",
    minWeeks: 1,
    maxWeeks: 4,
  },
  {
    key: "application",
    label: "Visa application submitted",
    description:
      "You apply online with the CoS reference, pay the fee and the Immigration Health Surcharge.",
    minWeeks: 0,
    maxWeeks: 1,
  },
  {
    key: "biometrics",
    label: "Identity verification / biometrics",
    description:
      "Most applicants verify identity via the UK Immigration: ID Check app; some need a visa application centre appointment.",
    minWeeks: 0,
    maxWeeks: 2,
  },
  {
    key: "decision",
    label: "Home Office decision",
    description:
      "Standard service: about 3 weeks applying from outside the UK, about 8 weeks from inside. Priority (5 working days) and super-priority (next working day) services can shorten this where available.",
    minWeeks: 3,
    maxWeeks: 8,
  },
];

/** Total end-to-end range across all stages, in weeks. */
export function estimateVisaTimeline(
  stages: VisaStage[] = VISA_TIMELINE_STAGES
): { minWeeks: number; maxWeeks: number } {
  return stages.reduce(
    (acc, s) => ({
      minWeeks: acc.minWeeks + s.minWeeks,
      maxWeeks: acc.maxWeeks + s.maxWeeks,
    }),
    { minWeeks: 0, maxWeeks: 0 }
  );
}

/** "4–15 weeks" (collapses to a single value when min === max). */
export function formatWeeksRange(minWeeks: number, maxWeeks: number): string {
  if (minWeeks === maxWeeks) {
    return `${minWeeks} week${minWeeks === 1 ? "" : "s"}`;
  }
  return `${minWeeks}–${maxWeeks} weeks`;
}
