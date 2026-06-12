import { NextRequest } from "next/server";
import prisma from "@/app/lib/db";
import {
  isRatingCategory,
  isValidStars,
} from "@/app/lib/companyRatings";

/**
 * Ratings for a company, addressed by (URL-encoded) company name. The Company
 * row is created lazily on the first rating, so rating works for any company
 * on the board without a separate "create company" step.
 *
 * SQLite Prisma has no case-insensitive `mode`, so the name lookup scans the
 * (small, user-rated-only) companies table in JS.
 */
async function findCompanyByName(name: string) {
  const target = name.trim().toLowerCase();
  if (!target) return null;
  const companies = await prisma.company.findMany({
    select: { id: true, name: true },
  });
  const match = companies.find((c) => c.name.toLowerCase() === target);
  if (!match) return null;
  return prisma.company.findUnique({ where: { id: match.id } });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const decoded = decodeURIComponent(name);
    const category = request.nextUrl.searchParams.get("category");

    const company = await findCompanyByName(decoded);
    if (!company) {
      // Not an error — the company just has no ratings yet.
      return Response.json({ company: null, ratings: [] });
    }

    const ratings = await prisma.rating.findMany({
      where: {
        companyId: company.id,
        ...(category && isRatingCategory(category) ? { category } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ company, ratings });
  } catch (error) {
    console.error("Error fetching ratings:", error);
    return Response.json(
      { error: "Failed to fetch ratings" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const decoded = decodeURIComponent(name).trim();
    if (!decoded) {
      return Response.json({ error: "Company name required" }, { status: 400 });
    }

    const body = await request.json();
    const stars =
      typeof body.rating === "number" ? body.rating : Number(body.rating);

    if (!isValidStars(stars)) {
      return Response.json(
        { error: "Rating must be an integer from 1 to 5" },
        { status: 400 }
      );
    }
    if (!isRatingCategory(body.category)) {
      return Response.json(
        {
          error:
            "Category must be one of work-culture, sponsorship, responsiveness",
        },
        { status: 400 }
      );
    }

    const comment =
      typeof body.comment === "string" && body.comment.trim()
        ? body.comment.trim()
        : null;

    const company =
      (await findCompanyByName(decoded)) ??
      (await prisma.company.create({ data: { name: decoded } }));

    const rating = await prisma.rating.create({
      data: {
        companyId: company.id,
        rating: stars,
        category: body.category,
        comment,
      },
    });

    return Response.json({ company, rating }, { status: 201 });
  } catch (error) {
    console.error("Error creating rating:", error);
    return Response.json(
      { error: "Failed to create rating" },
      { status: 500 }
    );
  }
}
