import { auth } from "@/app/auth";
import { NextResponse } from "next/server";

// Next.js 16 renamed `middleware` → `proxy` (runtime is nodejs, which is what the
// Prisma-adapter session lookup needs). We wrap the handler with next-auth's
// `auth()` so `req.auth` carries the session.
//
// Route protection policy:
//   • Public:  /  (marketing landing), /sign-in, /api/auth/* (OAuth), assets.
//   • Private: the (dashboard) pages — listed in PRIVATE_PREFIXES below.
// API data routes do their own per-request auth (session OR bearer token) in the
// handlers, so we don't block /api/* here (the extension posts cross-origin with
// a token and never carries a session cookie).
//
// We gate by an explicit private allowlist rather than "everything that isn't
// public". That distinction matters for unknown paths: a typo'd URL is not a
// private page, so it must fall through and render the 404 (app/not-found.tsx)
// instead of being redirected to sign-in.
const PRIVATE_PREFIXES = [
  "/dashboard",
  "/profile",
  "/sponsors",
  "/matches",
  "/roles",
  "/companies",
  "/analytics",
  "/settings",
  "/guides",
];

const isPrivate = (pathname: string) =>
  PRIVATE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Only gate known private pages. Public paths, assets, and unknown paths
  // (which should 404) all fall through to normal rendering.
  if (!isPrivate(pathname)) return NextResponse.next();

  if (!req.auth) {
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

// Match everything except Next internals and static files (anything with a dot,
// e.g. favicon.ico, *.png). Page routes are filtered inside the handler.
export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.).*)"],
};
