import type { NextConfig } from "next";

// CORS for the browser extension (Milestone 2). The extension's content scripts
// fetch `/api/profile` (autofill) and POST `/api/applications` (auto-capture)
// from third-party job-board origins, so the app must opt those routes into
// cross-origin access. Pattern from the bundled Next.js docs
// (node_modules/next/dist/docs/.../next-config-js/headers.md → "CORS").
//
// The app is local-only and unauthenticated for now (accounts land in
// Milestone 8), so `*` is acceptable for a single-user localhost setup. Lock the
// origin down once auth exists.
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
