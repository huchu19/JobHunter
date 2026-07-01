import { randomBytes } from "crypto";
import type { NextRequest } from "next/server";
import { auth } from "@/app/auth";
import prisma from "@/app/lib/db";

// Resolves the acting user for an API request from one of two credentials:
//   1. a NextAuth session cookie (web app), or
//   2. an `Authorization: Bearer <token>` header (the Chrome extension, which
//      can't send cookies cross-origin from job boards).
// Returns the user id, or null when neither credential resolves to a user.

const BEARER_RE = /^Bearer\s+(.+)$/i;

/**
 * Pulls the bearer token out of an Authorization header value.
 * Pure/testable: no DB, no session — just header parsing.
 */
export function parseBearerToken(
  authHeader: string | null | undefined
): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(BEARER_RE);
  if (!match) return null;
  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

/** Generates a fresh opaque API token for a user (URL-safe, 32 bytes). */
export function generateApiToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Resolves the user id for a request. Tries the bearer token first (extension
 * path), then falls back to the session cookie (web path). Returns null when
 * unauthenticated.
 */
export async function getUserIdFromRequest(
  request: NextRequest
): Promise<string | null> {
  const token = parseBearerToken(request.headers.get("authorization"));
  if (token) {
    const user = await prisma.user.findUnique({
      where: { apiToken: token },
      select: { id: true },
    });
    if (user) return user.id;
    // A bearer token was supplied but didn't match — do not silently fall back
    // to a session; a bad token is an explicit 401.
    return null;
  }

  const session = await auth();
  return session?.user?.id ?? null;
}
