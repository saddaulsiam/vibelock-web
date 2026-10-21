import Link from "next/link";
import { BannerForm } from "@/components/admin/banner-form";
import prisma from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/authorization";

export default async function NewBannerPage() {
  await requireRole("ADMIN");
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/admin/banners" className="text-sm font-medium hover:underline">
          ← Back to banners
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Create banner</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure where the campaign appears and which categories it targets.
        </p>
      </div>
      <div className="border bg-white p-5 sm:p-7">
        <BannerForm categories={categories} />
      </div>
    </div>
  );
}
