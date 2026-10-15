import "server-only";

import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

export async function getAdminBanners() {
  await requireRole("ADMIN");
  return prisma.banner.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { categories: { select: { id: true, name: true, slug: true } } },
  });
}

export async function getAdminBannerById(id: string) {
  await requireRole("ADMIN");
  return prisma.banner.findUnique({
    where: { id },
    include: { categories: { select: { id: true } } },
  });
}
