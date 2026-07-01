import { describe, it, expect, afterEach, vi } from "vitest";
import {
  coerceParsedProfile,
  extractJsonObject,
  selectResumeProvider,
  parseResumeWithGemini,
} from "../app/lib/resumeParser";

describe("selectResumeProvider", () => {
  const original = {
    anthropic: process.env.ANTHROPIC_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
  };

  afterEach(() => {
    // Restore whatever the environment had so tests don't leak into each other.
    if (original.anthropic === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = original.anthropic;
    if (original.gemini === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = original.gemini;
  });

  it("prefers Anthropic when its key is set", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-xxx";
    process.env.GEMINI_API_KEY = "g-xxx";
    expect(selectResumeProvider()).toBe("anthropic");
  });

  it("falls back to Gemini when only its key is set", () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.GEMINI_API_KEY = "g-xxx";
    expect(selectResumeProvider()).toBe("gemini");
  });

  it("returns null when neither key is set", () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GEMINI_API_KEY;
    expect(selectResumeProvider()).toBeNull();
  });

  it("treats blank/whitespace keys as unset", () => {
    process.env.ANTHROPIC_API_KEY = "   ";
    process.env.GEMINI_API_KEY = "";
    expect(selectResumeProvider()).toBeNull();
  });
});

describe("coerceParsedProfile", () => {
  it("keeps known text fields, trimmed", () => {
    const out = coerceParsedProfile({
      fullName: "  Ada Lovelace  ",
      email: "ada@example.com",
      skills: "Python, Rust",
    });
    expect(out).toEqual({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      skills: "Python, Rust",
    });
  });

  it("coerces the needsSponsorship boolean only when it is a real boolean", () => {
    expect(coerceParsedProfile({ needsSponsorship: true })).toEqual({
      needsSponsorship: true,
    });
    expect(coerceParsedProfile({ needsSponsorship: false })).toEqual({
      needsSponsorship: false,
    });
    // A stringy "yes" is not a boolean — drop it rather than guess.
    expect(coerceParsedProfile({ needsSponsorship: "yes" })).toEqual({});
  });

  it("drops unknown keys, empty strings, and wrong-typed values", () => {
    const out = coerceParsedProfile({
      fullName: "Grace",
      email: "   ",
      phone: 12345,
      hackerField: "drop me",
      yearsExperience: "5 years",
    });
    expect(out).toEqual({ fullName: "Grace", yearsExperience: "5 years" });
  });

  it("returns an empty object for non-object input", () => {
    expect(coerceParsedProfile(null)).toEqual({});
    expect(coerceParsedProfile("nope")).toEqual({});
    expect(coerceParsedProfile(undefined)).toEqual({});
  });
});

describe("extractJsonObject", () => {
  it("pulls a bare JSON object out", () => {
    expect(extractJsonObject('{"fullName":"Ada"}')).toBe('{"fullName":"Ada"}');
  });

  it("strips ```json fences and surrounding prose", () => {
    const text = 'Here you go:\n```json\n{"email":"a@b.c"}\n```\nThanks!';
    expect(extractJsonObject(text)).toBe('{"email":"a@b.c"}');
  });

  it("returns null when there is no object", () => {
    expect(extractJsonObject("no json here")).toBeNull();
    expect(extractJsonObject("")).toBeNull();
  });
});

describe("parseResumeWithGemini request shape", () => {
  const originalKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function stubFetchOk(modelText: string) {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: modelText }] } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
  }

  function bodyOf(fetchMock: ReturnType<typeof stubFetchOk>) {
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    return JSON.parse(init.body as string);
  }

  it("never sends `additionalProperties` in the Gemini responseSchema (the HTTP 400 cause)", async () => {
    process.env.GEMINI_API_KEY = "g-test";
    const fetchMock = stubFetchOk('{"fullName":"Jane Doe"}');

    await parseResumeWithGemini({ text: "Jane Doe, Engineer" });

    const schema = bodyOf(fetchMock).generationConfig.responseSchema;
    expect(schema).toBeDefined();
    expect("additionalProperties" in schema).toBe(false);
    // The properties themselves are still present, so extraction is constrained.
    expect(schema.properties.fullName).toEqual({ type: "string" });
  });

  it("sends a PDF as inlineData and coerces the parsed result", async () => {
    process.env.GEMINI_API_KEY = "g-test";
    const fetchMock = stubFetchOk('{"fullName":"  Ada  ","bogus":"x"}');

    const parsed = await parseResumeWithGemini({ pdfBase64: "AAAA" });

    const parts = bodyOf(fetchMock).contents[0].parts;
    expect(parts.some((p: { inlineData?: unknown }) => p.inlineData)).toBe(true);
    // coerceParsedProfile runs on the output: trimmed, unknown keys dropped.
    expect(parsed).toEqual({ fullName: "Ada" });
  });
});
