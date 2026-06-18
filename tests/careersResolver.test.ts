import { describe, it, expect } from "vitest";
import {
  brandSlug,
  candidateDomains,
  detectAts,
  mergeResolution,
  atsTokenCandidates,
  atsBoardUrl,
  probeAtsBoards,
  probeCandidates,
} from "../app/lib/careersResolver";
import type { AtsType } from "../app/types/careers";

describe("brandSlug", () => {
  it("strips legal-form noise and parenthesised qualifiers", () => {
    expect(brandSlug("MONZO BANK LIMITED")).toBe("monzobank");
    expect(brandSlug("BYTEDANCE (UK) LTD")).toBe("bytedance");
    expect(brandSlug("Acme Technologies Ltd")).toBe("acme");
    expect(brandSlug("The Wise Company PLC")).toBe("wise");
  });

  it("keeps multi-word brands joined", () => {
    expect(brandSlug("Red Bull GmbH")).toBe("redbullgmbh"); // gmbh isn't a noise word — that's fine
    expect(brandSlug("Deliveroo")).toBe("deliveroo");
  });
});

describe("candidateDomains", () => {
  it("offers the full slug across common TLDs, most-likely first", () => {
    const domains = candidateDomains("Monzo Bank Limited");
    expect(domains[0]).toBe("monzobank.com");
    expect(domains).toContain("monzobank.co.uk");
  });

  it("also tries the first word alone for multi-word names", () => {
    const domains = candidateDomains("Bytedance UK Ltd");
    expect(domains).toContain("bytedance.com");
  });

  it("is bounded and deduplicated", () => {
    const domains = candidateDomains("Stripe Payments UK Limited");
    expect(domains.length).toBeLessThanOrEqual(6);
    expect(new Set(domains).size).toBe(domains.length);
  });
});

describe("detectAts", () => {
  it("recognises Greenhouse boards", () => {
    expect(detectAts("https://boards.greenhouse.io/monzo")).toEqual({
      atsType: "greenhouse",
      atsToken: "monzo",
    });
    expect(detectAts("https://monzo.greenhouse.io/")).toEqual({
      atsType: "greenhouse",
      atsToken: "monzo",
    });
  });

  it("recognises Lever and Ashby boards", () => {
    expect(detectAts("https://jobs.lever.co/deliveroo")).toEqual({
      atsType: "lever",
      atsToken: "deliveroo",
    });
    expect(detectAts("https://jobs.ashbyhq.com/ramp")).toEqual({
      atsType: "ashby",
      atsToken: "ramp",
    });
  });

  it("recognises Workday boards and keeps the full URL as the token", () => {
    const url = "https://acme.wd1.myworkdayjobs.com/en-US/Careers";
    expect(detectAts(url)).toEqual({ atsType: "workday", atsToken: url });
  });

  it("returns null for a plain marketing careers page or bad input", () => {
    expect(detectAts("https://monzo.com/careers")).toBeNull();
    expect(detectAts("not a url")).toBeNull();
  });
});

describe("mergeResolution", () => {
  it("prefers AI values but never clobbers a resolved guess", () => {
    const guess = {
      careersUrl: "https://monzo.com/careers",
      homepageUrl: "https://monzo.com",
      atsType: null,
      atsToken: null,
    };
    const ai = {
      careersUrl: "https://boards.greenhouse.io/monzo",
      homepageUrl: null,
      atsType: "greenhouse" as const,
      atsToken: "monzo",
      confidence: "high" as const,
    };
    const merged = mergeResolution("MONZO BANK LIMITED", guess, ai);
    // AI careers URL wins; homepage falls back to the guess (AI gave none).
    expect(merged.careersUrl).toBe("https://boards.greenhouse.io/monzo");
    expect(merged.homepageUrl).toBe("https://monzo.com");
    expect(merged.atsType).toBe("greenhouse");
    expect(merged.atsToken).toBe("monzo");
    expect(merged.confidence).toBe("high");
    expect(merged.status).toBe("ok");
    expect(merged.aiAssisted).toBe(true);
  });

  it("returns the deterministic guess unchanged when there is no AI", () => {
    const guess = {
      careersUrl: "https://jobs.lever.co/deliveroo",
      homepageUrl: "https://deliveroo.co.uk",
      atsType: "lever" as const,
      atsToken: "deliveroo",
    };
    const merged = mergeResolution("DELIVEROO", guess, null);
    expect(merged.careersUrl).toBe("https://jobs.lever.co/deliveroo");
    expect(merged.atsType).toBe("lever");
    expect(merged.confidence).toBe("high"); // a resolved careers URL ⇒ high
    expect(merged.status).toBe("ok");
    expect(merged.aiAssisted).toBe(false);
  });

  it("marks a fully empty result unresolved", () => {
    const merged = mergeResolution("OBSCURE CONSULTANCY LTD", null, null);
    expect(merged.status).toBe("unresolved");
    expect(merged.careersUrl).toBeNull();
    expect(merged.confidence).toBeNull();
  });

  it("keeps ATS type and token paired when only the homepage is known", () => {
    const guess = {
      careersUrl: null,
      homepageUrl: "https://acme.com",
      atsType: null,
      atsToken: null,
    };
    const ai = {
      careersUrl: "https://jobs.ashbyhq.com/acme",
      homepageUrl: null,
      atsType: "ashby" as const,
      atsToken: "acme",
      confidence: "high" as const,
    };
    const merged = mergeResolution("ACME LTD", guess, ai);
    expect(merged.atsType).toBe("ashby");
    expect(merged.atsToken).toBe("acme");
    expect(merged.status).toBe("ok");
  });
});

describe("atsTokenCandidates", () => {
  it("offers the joined slug, first word, and hyphenated variant", () => {
    const tokens = atsTokenCandidates("Monzo Bank Limited");
    expect(tokens).toContain("monzobank");
    expect(tokens).toContain("monzo");
    expect(tokens).toContain("monzo-bank");
  });

  it("returns just the slug for a single-word brand", () => {
    expect(atsTokenCandidates("Deliveroo")).toEqual(["deliveroo"]);
  });

  it("is empty when nothing meaningful survives noise removal", () => {
    expect(atsTokenCandidates("The UK Ltd")).toEqual([]);
  });
});

describe("atsBoardUrl", () => {
  it("builds the human-facing board URL per ATS", () => {
    expect(atsBoardUrl("greenhouse", "monzo")).toBe(
      "https://boards.greenhouse.io/monzo"
    );
    expect(atsBoardUrl("lever", "deliveroo")).toBe(
      "https://jobs.lever.co/deliveroo"
    );
    expect(atsBoardUrl("ashby", "ramp")).toBe("https://jobs.ashbyhq.com/ramp");
  });
});

describe("probeAtsBoards (injected verifier)", () => {
  it("returns the first ATS token that has open roles", async () => {
    // Verifier: only greenhouse/monzo has jobs.
    const verify = async (ats: AtsType, token: string) =>
      ats === "greenhouse" && token === "monzo" ? 7 : 0;
    const result = await probeAtsBoards("Monzo Bank Limited", verify);
    expect(result).toEqual({
      atsType: "greenhouse",
      atsToken: "monzo",
      careersUrl: "https://boards.greenhouse.io/monzo",
    });
  });

  it("returns null when no candidate board has roles", async () => {
    const verify = async () => 0;
    expect(await probeAtsBoards("Obscure Consultancy Ltd", verify)).toBeNull();
  });

  it("prefers an earlier token candidate when multiple match", async () => {
    // Both the joined slug and the first word "work", but joined comes first.
    const verify = async (ats: AtsType, token: string) =>
      ats === "lever" && (token === "acmebank" || token === "acme") ? 3 : 0;
    const result = await probeAtsBoards("Acme Bank Ltd", verify);
    expect(result?.atsToken).toBe("acmebank");
  });
});

describe("probeCandidates (ATS-first)", () => {
  it("short-circuits to a verified ATS board before any homepage probe", async () => {
    const verify = async (ats: AtsType, token: string) =>
      ats === "ashby" && token === "ramp" ? 12 : 0;
    const result = await probeCandidates("Ramp", verify);
    expect(result).toEqual({
      homepageUrl: null,
      careersUrl: "https://jobs.ashbyhq.com/ramp",
      ats: { atsType: "ashby", atsToken: "ramp" },
    });
  });
});
