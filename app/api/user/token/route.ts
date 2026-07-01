import { auth } from "@/app/auth";
import prisma from "@/app/lib/db";
import { generateApiToken } from "@/app/lib/auth";

// Personal API token for the Chrome extension. Session-only (you must be signed
// into the web app to see/rotate your token). The extension then sends this as
// `Authorization: Bearer <token>` on its cross-origin calls.
//
//   GET  → returns the current token, generating one on first access.
//   POST → rotates the token (invalidates the old one).

async function ensureToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { apiToken: true },
  });
  if (user?.apiToken) return user.apiToken;
  const token = generateApiToken();
  await prisma.user.update({ where: { id: userId }, data: { apiToken: token } });
  return token;
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = await ensureToken(userId);
  return Response.json({ token });
}

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = generateApiToken();
  await prisma.user.update({ where: { id: userId }, data: { apiToken: token } });
  return Response.json({ token });
}
