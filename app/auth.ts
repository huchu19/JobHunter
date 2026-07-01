import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/app/lib/db";

// Auth.js (next-auth v5) configuration. Google OAuth only — no password storage.
// Uses the Prisma adapter, so sessions live in the DB (User/Account/Session
// models in schema.prisma) and `session.user.id` is the real DB user id.
//
// Per AGENTS.md "AI/integrations degrade gracefully": when the Google OAuth env
// vars are absent the provider list is empty, so the build still succeeds and
// sign-in simply has no providers (useful for local/CI without credentials).
const googleConfigured =
  !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: googleConfigured
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
      ]
    : [],
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    // The database strategy already attaches the DB user, but make `user.id`
    // explicit on the session so server components/routes can read it directly.
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
});
