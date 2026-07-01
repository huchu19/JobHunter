import { NextRequest } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import prisma from "@/app/lib/db";
import { getAnthropic, ANTHROPIC_MODEL } from "@/app/lib/anthropic";
import {
  EXTRACTION_SCHEMA,
  RESUME_SYSTEM_PROMPT,
  coerceParsedProfile,
  parseResumeWithGemini,
  selectResumeProvider,
} from "@/app/lib/resumeParser";
import { type ParsedProfile } from "@/app/types/profile";
import { getUserIdFromRequest } from "@/app/lib/auth";

// Anthropic path: unchanged SDK usage, just isolated behind the provider switch.
async function parseWithAnthropic(input: {
  text?: string;
  pdfBase64?: string;
}): Promise<ParsedProfile> {
  const anthropic = getAnthropic();
  if (!anthropic) throw new Error("ANTHROPIC_API_KEY not configured");

  const userContent: Anthropic.ContentBlockParam[] = input.pdfBase64
    ? [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: input.pdfBase64,
          },
        },
        { type: "text", text: "Extract the application profile from this resume." },
      ]
    : [
        {
          type: "text",
          text: `Extract the application profile from this resume:\n\n${input.text}`,
        },
      ];

  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    system: RESUME_SYSTEM_PROMPT,
    output_config: {
      format: {
        type: "json_schema",
        schema: EXTRACTION_SCHEMA,
      },
    },
    messages: [{ role: "user", content: userContent }],
  });

  const jsonBlock = response.content.find((b) => b.type === "text");
  const raw = jsonBlock?.type === "text" ? JSON.parse(jsonBlock.text) : {};
  return coerceParsedProfile(raw);
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      text,
      pdfBase64,
      fileBase64,
      mimeType,
      fileName,
    } = body as {
      text?: string;
      pdfBase64?: string; // legacy field (extension) — a PDF as base64
      fileBase64?: string; // the uploaded file (PDF or DOCX) as base64
      mimeType?: string;
      fileName?: string;
    };

    // Normalise the uploaded file: the form sends fileBase64 + mimeType; the
    // extension still sends pdfBase64.
    const uploadBase64 = fileBase64 || pdfBase64;
    const uploadMime =
      mimeType || (pdfBase64 ? "application/pdf" : undefined);
    const isPdf = uploadMime === "application/pdf";
    const isDocx =
      uploadMime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    if (!text?.trim() && !uploadBase64) {
      return Response.json(
        { error: "Provide resume text or a file to parse." },
        { status: 400 }
      );
    }

    if (uploadBase64 && !isPdf && !isDocx) {
      return Response.json(
        { error: "Unsupported file type — upload a PDF or DOCX." },
        { status: 415 }
      );
    }

    // DOCX can't be read by the LLMs as binary, and never previews inline; pull
    // its text out with mammoth and feed that to the parser as text.
    let docxText: string | undefined;
    if (uploadBase64 && isDocx) {
      const mammoth = (await import("mammoth")).default;
      const { value } = await mammoth.extractRawText({
        buffer: Buffer.from(uploadBase64, "base64"),
      });
      docxText = value?.trim() || undefined;
    }

    // Persist the file + bookkeeping first, so attaching a resume works even
    // without an AI key (the user can still preview/download/replace it).
    const storedText = text?.trim() || docxText || undefined;
    const fileFields = uploadBase64
      ? { resumeData: uploadBase64, resumeMimeType: uploadMime ?? null }
      : {};
    await prisma.profile.upsert({
      where: { userId },
      update: {
        resumeText: storedText,
        resumeFileName: fileName || undefined,
        resumeParsedAt: new Date(),
        ...fileFields,
      },
      create: {
        userId,
        resumeText: storedText ?? null,
        resumeFileName: fileName || null,
        resumeParsedAt: new Date(),
        ...fileFields,
      },
    });

    // AI parsing is best-effort on top. No key → file is still saved; the
    // response says parsing was unavailable so the UI can prompt manual entry.
    const provider = selectResumeProvider();
    if (!provider) {
      return Response.json({
        parsed: {},
        provider: null,
        parseError:
          "AI resume parsing is unavailable — set ANTHROPIC_API_KEY or GEMINI_API_KEY to enable it. Your file was saved; fill the fields manually.",
      });
    }

    // PDFs go to the provider as the file itself; DOCX/text go as extracted text.
    const parseInput = isPdf
      ? { pdfBase64: uploadBase64 }
      : { text: storedText };

    const parsed =
      provider === "anthropic"
        ? await parseWithAnthropic(parseInput)
        : await parseResumeWithGemini(parseInput);

    return Response.json({ parsed, provider });
  } catch (error) {
    console.error("Error parsing resume:", error);
    return Response.json({ error: "Failed to parse resume" }, { status: 500 });
  }
}
