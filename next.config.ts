import type { NextConfig } from "next";

// CORS for the browser extension (Milestone 2 + 8). The extension's content
// scripts fetch `/api/profile` (autofill) and POST `/api/applications`
// (auto-capture) from third-party job-board origins, so ONLY those two routes
// are opened cross-origin. Every other /api/* route stays same-origin (no CORS
// header), closing the blanket `*` data leak from the single-user era.
//
// `*` origin is safe here because both endpoints now require a valid
// `Authorization: Bearer <token>` (per-user API token — see app/lib/auth.ts);
// they no longer rely on cookies, and an anonymous/cross-origin caller without a
// token gets a 401. Pattern from the bundled Next.js docs
// (node_modules/next/dist/docs/.../next-config-js/headers.md → "CORS").
const EXTENSION_CORS_HEADERS = [
  { key: "Access-Control-Allow-Origin", value: "*" },
  { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
  {
    key: "Access-Control-Allow-Headers",
    value: "Content-Type, Authorization",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/api/profile", headers: EXTENSION_CORS_HEADERS },
      { source: "/api/applications", headers: EXTENSION_CORS_HEADERS },
    ];
  },
};

export default nextConfig;
