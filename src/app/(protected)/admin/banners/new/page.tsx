import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BannerForm } from "@/components/admin/banner-form";
import { Card, CardContent } from "@/components/ui/card";
import prisma from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/authorization";

async function getBannerCategories() {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await prisma.category.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
    } catch (err) {
      if (attempt === 2) {
        console.error("Database connection error fetching categories:", err);
        return [];
      }
      // Wait for Neon serverless endpoint to wake up
      await new Promise((res) => setTimeout(res, 800));
    }
  }
  return [];
}

export default async function NewBannerPage() {
  await requireRole("ADMIN");

  const categories = await getBannerCategories();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header className="space-y-1.5">
        <Link
          href="/admin/banners"
          className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide transition-colors hover:text-[#101114]"
        >
          <ArrowLeft className="size-3.5" /> Back to banners
        </Link>
        <h2 className="text-2xl font-semibold tracking-tight text-[#101114] sm:text-3xl">
          Create banner
        </h2>
        <p className="text-muted-foreground text-xs">
          Configure where the campaign appears and which categories it targets.
        </p>
      </header>
      <Card className="overflow-visible rounded-sm border-[#101114]/10 bg-white shadow-none">
        <CardContent className="p-4 sm:p-6">
          <BannerForm categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
