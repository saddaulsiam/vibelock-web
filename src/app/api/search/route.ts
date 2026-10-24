import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma/client";
import { ProductStatus } from "@prisma/client";
import { mapProductSummary } from "@/lib/catalog/mappers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";

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
