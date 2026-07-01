import { NextRequest } from "next/server";
import prisma from "@/app/lib/db";
import { getUserIdFromRequest } from "@/app/lib/auth";

// Serves and removes the signed-in user's stored resume file.
//   GET    → streams the original file (inline) for preview/download.
//   DELETE → removes the stored file + its bookkeeping from the profile.
// Scoped to the session/token user; never exposes another user's file.

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { resumeData: true, resumeMimeType: true, resumeFileName: true },
  });

  if (!profile?.resumeData) {
    return Response.json({ error: "No resume on file" }, { status: 404 });
  }

  const bytes = Buffer.from(profile.resumeData, "base64");
  const fileName = profile.resumeFileName || "resume";
  const contentType = profile.resumeMimeType || "application/octet-stream";
  const inline = contentType === "application/pdf";

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      // PDFs render inline in an iframe; everything else downloads.
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(
        fileName
      )}"`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
    },
  });
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.profile.updateMany({
    where: { userId },
    data: {
      resumeData: null,
      resumeMimeType: null,
      resumeFileName: null,
      resumeParsedAt: null,
    },
  });

  return Response.json({ success: true });
}
