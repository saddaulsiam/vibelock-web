import "server-only";

import { BannerPlacement, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma/client";

const publicBannerSelect = {
  id: true,
  title: true,
  imageUrl: true,
  mobileImageUrl: true,
  linkUrl: true,
} satisfies Prisma.BannerSelect;

export type PublicPromoBanner = Prisma.BannerGetPayload<{ select: typeof publicBannerSelect }>;

export async function getCategoryPromoBanner(
  categorySlug: string
): Promise<PublicPromoBanner | null> {
  return prisma.banner.findFirst({
    where: {
      isActive: true,
      placement: { in: [BannerPlacement.CATEGORY, BannerPlacement.BOTH] },
      OR: [{ categories: { none: {} } }, { categories: { some: { slug: categorySlug } } }],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: publicBannerSelect,
  });
}

export async function getSearchPromoBanner(
  categorySlugs: string[] = []
): Promise<PublicPromoBanner | null> {
  const uniqueSlugs = Array.from(new Set(categorySlugs.map((slug) => slug.trim()).filter(Boolean)));
  return prisma.banner.findFirst({
    where: {
      isActive: true,
      placement: { in: [BannerPlacement.SEARCH, BannerPlacement.BOTH] },
      OR: [
        { categories: { none: {} } },
        ...(uniqueSlugs.length ? [{ categories: { some: { slug: { in: uniqueSlugs } } } }] : []),
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: publicBannerSelect,
  });
}
