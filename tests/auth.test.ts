import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the two modules getUserIdFromRequest depends on, so the test exercises
// pure resolution logic (token → user, session fallback, bad token = 401)
// without a real DB or NextAuth runtime.
const findUnique = vi.fn();
const authFn = vi.fn();

vi.mock("@/app/lib/db", () => ({
  default: { user: { findUnique: (...args: unknown[]) => findUnique(...args) } },
}));

vi.mock("@/app/auth", () => ({
  auth: (...args: unknown[]) => authFn(...args),
}));

import {
  parseBearerToken,
  generateApiToken,
  getUserIdFromRequest,
} from "../app/lib/auth";

/** Minimal NextRequest stand-in: only `headers.get` is used by the helper. */
function reqWithAuth(header: string | null) {
  return {
    headers: { get: (k: string) => (k === "authorization" ? header : null) },
  } as unknown as Parameters<typeof getUserIdFromRequest>[0];
}

describe("parseBearerToken", () => {
  it("extracts the token from a well-formed header", () => {
    expect(parseBearerToken("Bearer abc123")).toBe("abc123");
  });

  it("is case-insensitive on the scheme", () => {
    expect(parseBearerToken("bearer abc123")).toBe("abc123");
  });

  it("trims surrounding whitespace", () => {
    expect(parseBearerToken("Bearer   tok  ")).toBe("tok");
  });

  it("returns null for missing/empty/malformed headers", () => {
    expect(parseBearerToken(null)).toBeNull();
    expect(parseBearerToken(undefined)).toBeNull();
    expect(parseBearerToken("")).toBeNull();
    expect(parseBearerToken("Bearer ")).toBeNull();
    expect(parseBearerToken("Basic abc123")).toBeNull();
    expect(parseBearerToken("abc123")).toBeNull();
  });
});

describe("generateApiToken", () => {
  it("returns a long, URL-safe, unique token each call", () => {
    const a = generateApiToken();
    const b = generateApiToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(40);
    // base64url alphabet only — no +, /, or = padding.
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("getUserIdFromRequest", () => {
  beforeEach(() => {
    findUnique.mockReset();
    authFn.mockReset();
  });

  it("resolves the user from a valid bearer token (extension path)", async () => {
    findUnique.mockResolvedValue({ id: "user-A" });
    const id = await getUserIdFromRequest(reqWithAuth("Bearer good-token"));
    expect(id).toBe("user-A");
    expect(findUnique).toHaveBeenCalledWith({
      where: { apiToken: "good-token" },
      select: { id: true },
    });
    // A token was supplied, so the session must not be consulted.
    expect(authFn).not.toHaveBeenCalled();
  });

  it("returns null for a bad token without falling back to the session", async () => {
    findUnique.mockResolvedValue(null);
    const id = await getUserIdFromRequest(reqWithAuth("Bearer wrong-token"));
    expect(id).toBeNull();
    expect(authFn).not.toHaveBeenCalled();
  });

  it("falls back to the session cookie when no token is present", async () => {
    authFn.mockResolvedValue({ user: { id: "user-B" } });
    const id = await getUserIdFromRequest(reqWithAuth(null));
    expect(id).toBe("user-B");
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns null when neither a token nor a session resolves", async () => {
    authFn.mockResolvedValue(null);
    const id = await getUserIdFromRequest(reqWithAuth(null));
    expect(id).toBeNull();
  });
});
