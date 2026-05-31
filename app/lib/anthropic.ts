import Anthropic from "@anthropic-ai/sdk";

// Singleton Anthropic client, mirroring the Prisma singleton in app/lib/db.ts.
// Returns null when ANTHROPIC_API_KEY is unset so callers can degrade gracefully
// (resume parsing falls back to manual entry; URL import falls back to regex).
let anthropic: Anthropic | null | undefined;

export function getAnthropic(): Anthropic | null {
  if (anthropic !== undefined) return anthropic;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  anthropic = apiKey ? new Anthropic({ apiKey }) : null;
  return anthropic;
}

export const ANTHROPIC_MODEL = "claude-opus-4-8";
