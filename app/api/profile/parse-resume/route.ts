import { NextRequest } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import prisma from "@/app/lib/db";
import { getAnthropic, ANTHROPIC_MODEL } from "@/app/lib/anthropic";
import { SINGLETON_ID } from "@/app/types/profile";

// JSON schema describing the fields we want Claude to extract from a resume.
// Mirrors the editable Profile fields. All optional — Claude omits what it can't find.
const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    fullName: { type: "string" },
    email: { type: "string" },
    phone: { type: "string" },
    location: { type: "string" },
    linkedinUrl: { type: "string" },
    githubUrl: { type: "string" },
    portfolioUrl: { type: "string" },
    websiteUrl: { type: "string" },
    workAuthorization: { type: "string" },
    needsSponsorship: { type: "boolean" },
    rightToWork: { type: "string" },
    noticePeriod: { type: "string" },
    salaryExpectation: { type: "string" },
    earliestStart: { type: "string" },
    yearsExperience: { type: "string" },
    currentTitle: { type: "string" },
    summary: { type: "string" },
    skills: { type: "string" },
    education: { type: "string" },
    workHistory: { type: "string" },
  },
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You extract structured data from a candidate's resume to pre-fill a reusable job-application profile.

Rules:
- Only return fields you can confidently determine from the resume. Omit anything you cannot find — do not guess or invent values.
- "skills" should be a comma-separated list of the candidate's key technical and professional skills.
- "education" should be a concise summary of degrees: "BSc Computer Science, University of X, 2023".
- "workHistory" should be a brief list of recent roles: "Software Engineer at Acme (2022–2024); Intern at Beta (2021)".
- "summary" is a 1–3 sentence professional summary suitable for an application "about you" field.
- "yearsExperience" is an approximate total, e.g. "3 years".
- Leave "needsSponsorship" and visa/work-authorization fields unset unless the resume explicitly states them.`;

export async function POST(request: NextRequest) {
  try {
    const anthropic = getAnthropic();
    if (!anthropic) {
      return Response.json(
        {
          error:
            "Resume parsing is unavailable — set ANTHROPIC_API_KEY to enable it. You can still fill the profile manually.",
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { text, pdfBase64, fileName } = body as {
      text?: string;
      pdfBase64?: string;
      fileName?: string;
    };

    if (!text?.trim() && !pdfBase64) {
      return Response.json(
        { error: "Provide resume text or a PDF to parse." },
        { status: 400 }
      );
    }

    // Build the user content: a PDF document block, or the pasted text.
    const userContent: Anthropic.ContentBlockParam[] = pdfBase64
      ? [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
          },
          { type: "text", text: "Extract the application profile from this resume." },
        ]
      : [
          {
            type: "text",
            text: `Extract the application profile from this resume:\n\n${text}`,
          },
        ];

    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      output_config: {
        format: {
          type: "json_schema",
          schema: EXTRACTION_SCHEMA,
        },
      },
      messages: [{ role: "user", content: userContent }],
    });

    const jsonBlock = response.content.find((b) => b.type === "text");
    const parsed = jsonBlock?.type === "text" ? JSON.parse(jsonBlock.text) : {};

    // Persist resume bookkeeping so re-parsing never needs a re-upload. We store
    // the source text when available; PDF text is left to the (saved) extraction.
    await prisma.profile.upsert({
      where: { id: SINGLETON_ID },
      update: {
        resumeText: text?.trim() || undefined,
        resumeFileName: fileName || undefined,
        resumeParsedAt: new Date(),
      },
      create: {
        id: SINGLETON_ID,
        resumeText: text?.trim() || null,
        resumeFileName: fileName || null,
        resumeParsedAt: new Date(),
      },
    });

    return Response.json({ parsed });
  } catch (error) {
    console.error("Error parsing resume:", error);
    return Response.json(
      { error: "Failed to parse resume" },
      { status: 500 }
    );
  }
}
