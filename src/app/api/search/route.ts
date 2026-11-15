import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma/client";
import { ProductStatus } from "@prisma/client";
import { mapProductSummary } from "@/lib/catalog/mappers";
import { checkRateLimit, getIp } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100, "Search query must not exceed 100 characters")
    .optional()
    .default(""),
});

export async function GET(request: NextRequest) {
  try {
    const realIp = request.headers.get("x-real-ip")?.trim();
    const forwardedFor = request.headers.get("x-forwarded-for");
    const forwardedParts = forwardedFor
      ? forwardedFor.split(",").map((p) => p.trim()).filter(Boolean)
      : [];
    const lastForwarded =
      forwardedParts.length > 0 ? forwardedParts[forwardedParts.length - 1] : null;

    const clientIp =
      (realIp && realIp.length > 0 ? realIp : null) ||
      lastForwarded ||
      (await getIp()) ||
      "anonymous";

    try {
      await checkRateLimit("search", clientIp, { skipIp: true });
    } catch (rateLimitErr) {
      if (rateLimitErr instanceof Error && rateLimitErr.message === "RATE_LIMIT_EXCEEDED") {
        return NextResponse.json(
          { error: "Too many requests. Please slow down." },
          { status: 429 }
        );
      }
      throw rateLimitErr;
    }

    const { searchParams } = new URL(request.url);
    const rawQ = searchParams.get("q");

    const parseResult = searchQuerySchema.safeParse({ q: rawQ ?? "" });
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid search query. Maximum length is 100 characters." },
        { status: 400 }
      );
    }

    const q = parseResult.data.q;

    if (!q) {
      return NextResponse.json({ products: [] });
    }

    const products = await prisma.product.findMany({
      where: {
        status: ProductStatus.PUBLISHED,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { categories: { some: { name: { contains: q, mode: "insensitive" } } } },
        ],
      },
      include: {
        images: true,
        categories: true,
        variants: {
          include: {
            inventoryTransactions: { select: { quantity: true } },
            inventoryReservations: {
              select: { quantity: true, expiresAt: true },
              where: { status: "RESERVED" as const },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    const mapped = products.map(mapProductSummary);

    return NextResponse.json({ products: mapped });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
