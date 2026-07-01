import type { DefaultSession } from "next-auth";

// Expose the DB user id on the session (set in app/auth.ts session callback),
// so server components and route handlers can read `session.user.id`.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
