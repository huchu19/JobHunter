/**
 * Google Gemini config, mirroring the Anthropic singleton in app/lib/anthropic.ts.
 * We call the Gemini REST API directly via fetch (no SDK dependency — same
 * approach as the Resend transport in app/lib/email.ts), so this module just
 * gates on the key and exposes the model + endpoint.
 *
 * Returns null when GEMINI_API_KEY is unset so callers degrade gracefully
 * (careers resolution falls back to the deterministic domain probe).
 *
 * Chosen over Anthropic for the careers AI layer because Gemini has a genuine
 * free tier (Google AI Studio). Search grounding ("google_search" tool) is
 * built into the same key — no separate search credential.
 */

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

/** The API key, or null when unset. */
export function getGeminiKey(): string | null {
  const key = process.env.GEMINI_API_KEY;
  return key && key.trim() ? key : null;
}

/** generateContent endpoint for the configured model + key, or null without a key. */
export function geminiGenerateUrl(): string | null {
  const key = getGeminiKey();
  if (!key) return null;
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
    key
  )}`;
}
